import { describe, it, expect } from 'vitest';
import { buildScanData } from './scan-data';

// 며칠 전 데모를 멈췄던 버그(빈 값 저장 시 Firestore 거부)를 막는 회귀 테스트.
describe('buildScanData', () => {
  const baseParams = {
    userId: 'user-123',
    lawText: '근로기준법 제1조 ...',
    regulationCount: 5,
    impactedRegulations: [
      {
        regulationId: 'reg-1',
        regulationName: '취업규칙',
        impactLevel: 'MEDIUM' as const,
        reason: '근로시간 기준 변경',
        // sourceArticle, diff 일부러 누락 (AI가 안 줄 수 있는 상황 재현)
      },
    ],
    scannedAt: '2026-05-26T00:00:00.000Z',
  };

  it('법령 이름이 없어도 undefined 필드 없이 저장 데이터를 만든다', () => {
    const result = buildScanData(baseParams);

    // 핵심: lawName 키 자체가 없어야 한다 (값이 undefined면 Firestore가 거부)
    expect('lawName' in result).toBe(false);

    // 누락된 sourceArticle/diff는 빈 문자열로 채워진다
    expect(result.impacts[0].sourceArticle).toBe('');
    expect(result.impacts[0].diff).toBe('');

    // summary가 없으면 빈 문자열
    expect(result.summary).toBe('');

    // 객체 전체에 undefined 값이 하나도 없어야 한다
    const hasUndefined = JSON.stringify(result).includes('undefined');
    expect(hasUndefined).toBe(false);
    expect(result.impactedCount).toBe(1);
  });

  it('법령 이름이 있으면 lawName 필드를 포함한다', () => {
    const result = buildScanData({ ...baseParams, lawName: '근로기준법' });

    expect(result.lawName).toBe('근로기준법');
  });
});
