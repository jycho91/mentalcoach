/**
 * Genkit 도구(tools) 정의 — Gemini 가 답변 생성 중 호출해
 * 한국 법령정보센터에서 실제 법령 데이터를 조회하도록 한다.
 *
 * 목적: AI 환각 방지. 가짜 법령·조문 인용을 줄이기 위해
 * 모델이 사실을 확인할 수 있는 도구를 손에 쥐여준다.
 */

import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import { searchLaw, getLawText } from '@/lib/law-api';

// ============================================================================
// searchLaw — 법령 존재 확인 / 기본 정보 조회
// ============================================================================

export const searchLawTool = ai.defineTool(
  {
    name: 'searchLaw',
    description:
      '한국 법령정보센터에서 법령을 이름으로 검색한다. ' +
      '특정 법령이 실제 존재하는지 확인하거나, 시행일자/소관부처 등 기본 정보를 알고 싶을 때 호출. ' +
      '결과로 법령일련번호(mst)도 받는데, 이 mst는 getLawText 로 본문을 가져올 때 필요하다. ' +
      '예시 입력: "근로기준법", "개인정보보호법", "산업안전보건법".',
    inputSchema: z.object({
      query: z.string().describe('검색할 법령 이름 또는 키워드'),
    }),
    outputSchema: z.array(
      z.object({
        lawId: z.string(),
        mst: z.string(),
        name: z.string(),
        ministry: z.string(),
        effectiveDate: z.string(),
        status: z.string(),
      })
    ),
  },
  async (input) => {
    console.log(`🔍 [searchLawTool] 호출됨 → query="${input.query}"`);
    try {
      const results = await searchLaw(input.query, 5);
      console.log(
        `✅ [searchLawTool] 결과 ${results.length}건: ${results.map((r) => r.name).join(', ') || '(없음)'}`
      );
      return results.map(({ lawId, mst, name, ministry, effectiveDate, status }) => ({
        lawId,
        mst,
        name,
        ministry,
        effectiveDate,
        status,
      }));
    } catch (e) {
      console.error('❌ [searchLawTool] 법령 검색 실패:', e);
      return [];
    }
  }
);

// ============================================================================
// getLawText — 법령 본문(조문) 조회
// ============================================================================

export const getLawTextTool = ai.defineTool(
  {
    name: 'getLawText',
    description:
      '특정 법령의 조문 본문을 가져온다. ' +
      '먼저 searchLaw 로 mst 값을 얻은 다음 그 mst 를 넘겨야 한다. ' +
      '인용하려는 조항이 실제로 그 법령에 있는지, 본문이 정확히 무엇인지 확인할 때 사용.',
    inputSchema: z.object({
      mst: z
        .string()
        .describe('법령일련번호 (searchLaw 결과 객체의 mst 필드값)'),
    }),
    outputSchema: z.object({
      name: z.string(),
      fullText: z.string(),
    }),
  },
  async (input) => {
    console.log(`📖 [getLawTextTool] 호출됨 → mst="${input.mst}"`);
    try {
      const result = await getLawText(input.mst);
      console.log(
        `✅ [getLawTextTool] "${result.name}" 본문 ${result.fullText.length}자 수신`
      );
      return result;
    } catch (e) {
      console.error('❌ [getLawTextTool] 법령 본문 조회 실패:', e);
      return { name: '', fullText: '' };
    }
  }
);

// 흐름에서 한 번에 가져다 쓰기 편하라고 묶음으로 export
export const lawTools = [searchLawTool, getLawTextTool];
