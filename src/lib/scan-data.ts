// 법령 영향 스캔 결과를 Firestore에 저장하기 위한 데이터 타입 및 빌더.
// 저장 데이터에 undefined 값이 들어가면 Firestore가 거부하므로,
// 여기서 빈 값을 안전하게 처리한다. (관련 회귀 테스트: scan-data.test.ts)

export interface ScanImpact {
  regulationId: string;
  regulationName: string;
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  sourceArticle: string;
  diff: string;
}

export interface LawImpactScan {
  userId: string;
  scannedAt: string;
  lawText: string;
  lawName?: string;
  regulationCount: number;
  impactedCount: number;
  impacts: ScanImpact[];
  summary: string;
}

export interface BuildScanDataParams {
  userId: string;
  lawText: string;
  lawName?: string;
  regulationCount: number;
  impactedRegulations: Array<{
    regulationId: string;
    regulationName: string;
    impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    reason: string;
    sourceArticle?: string;
    diff?: string;
  }>;
  summary?: string;
  /** 테스트에서 시간을 고정하기 위한 선택적 값. 없으면 현재 시각 사용. */
  scannedAt?: string;
}

/**
 * 스캔 결과를 Firestore 저장용 객체로 변환한다.
 * - lawName이 비어 있으면 필드를 아예 넣지 않는다 (undefined 거부 회피).
 * - impacts의 sourceArticle/diff, summary가 비어 있으면 빈 문자열로 대체한다.
 */
export function buildScanData(params: BuildScanDataParams): LawImpactScan {
  const {
    userId,
    lawText,
    lawName,
    regulationCount,
    impactedRegulations,
    summary,
    scannedAt,
  } = params;

  return {
    userId,
    scannedAt: scannedAt ?? new Date().toISOString(),
    lawText,
    // 법령 이름이 있을 때만 포함 (undefined는 Firestore가 거부함)
    ...(lawName ? { lawName } : {}),
    regulationCount,
    impactedCount: impactedRegulations.length,
    impacts: impactedRegulations.map((r) => ({
      regulationId: r.regulationId,
      regulationName: r.regulationName,
      impactLevel: r.impactLevel,
      reason: r.reason,
      sourceArticle: r.sourceArticle ?? '',
      diff: r.diff ?? '',
    })),
    summary: summary ?? '',
  };
}
