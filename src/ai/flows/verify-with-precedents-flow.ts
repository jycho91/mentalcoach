'use server';
/**
 * @fileOverview 판례 교차검증 Genkit 플로우
 *
 * - verifyWithPrecedentsFlow - 개정안에 대한 판례 교차검증을 수행합니다.
 * - PrecedentCitation - 개별 판례 인용 타입
 * - PrecedentReport - 판례 교차검증 결과 타입
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { searchPrecedents } from '@/lib/law-go-kr-client';

// ─── 타입 정의 ─────────────────────────────────────────────────────────────────

export interface PrecedentCitation {
  caseNumber: string;
  caseName: string;
  court: string;
  date: string;
  summary: string;
  /** 왜 이 판례가 관련있는지 */
  relevance: string;
}

export interface PrecedentReport {
  /** 개정안을 지지하는 판례 */
  supportingPrecedents: PrecedentCitation[];
  /** 충돌 가능성 있는 판례 */
  conflictingPrecedents: PrecedentCitation[];
  legalRiskAssessment: 'LOW' | 'MEDIUM' | 'HIGH';
  /** AI 생성 결과, 법적 자문 아님. 반드시 법무 담당자 검토 필요. */
  disclaimer: string;
}

// ─── Zod 스키마 ────────────────────────────────────────────────────────────────

const VerifyWithPrecedentsInputSchema = z.object({
  draftContent: z.string().describe('검증할 개정안 내용'),
  relatedLawArticles: z.array(z.string()).describe('관련 법령 조문 목록'),
  regulationName: z.string().describe('개정 대상 규정명'),
});

const PrecedentCitationSchema = z.object({
  caseNumber: z.string().describe('사건번호'),
  caseName: z.string().describe('사건명'),
  court: z.string().describe('법원명'),
  date: z.string().describe('선고일자'),
  summary: z.string().describe('판시사항 요약'),
  relevance: z.string().describe('이 판례가 개정안과 관련 있는 이유'),
});

const ClassifyOutputSchema = z.object({
  supportingPrecedents: z.array(PrecedentCitationSchema).describe('개정안을 지지하는 판례 목록'),
  conflictingPrecedents: z.array(PrecedentCitationSchema).describe('개정안과 충돌 가능성 있는 판례 목록'),
});

const PrecedentReportSchema = z.object({
  supportingPrecedents: z.array(PrecedentCitationSchema).describe('개정안을 지지하는 판례 목록'),
  conflictingPrecedents: z.array(PrecedentCitationSchema).describe('개정안과 충돌 가능성 있는 판례 목록'),
  legalRiskAssessment: z.enum(['LOW', 'MEDIUM', 'HIGH']).describe('법적 리스크 평가'),
  disclaimer: z.string().describe('면책 고지'),
});

// ─── 판례 분류 프롬프트 ─────────────────────────────────────────────────────────

const classifyPrecedentsPrompt = ai.definePrompt({
  name: 'classifyPrecedentsPrompt',
  input: {
    schema: z.object({
      draftContent: z.string(),
      regulationName: z.string(),
      precedentsJson: z.string(),
    }),
  },
  output: { schema: ClassifyOutputSchema },
  prompt: `당신은 기업 법무 전문가입니다. 제공된 회사 규정 개정안과 판례 데이터를 분석하여 판례 교차검증 보고서를 작성해주세요.

규정명: {{{regulationName}}}

개정안 내용:
{{{draftContent}}}

검색된 판례 목록 (JSON):
{{{precedentsJson}}}

지시사항:
1. 각 판례를 분석하여 개정안을 지지하는 판례(supportingPrecedents)와 충돌 가능성이 있는 판례(conflictingPrecedents)로 분류하세요.
2. 판례가 법원의 해석 방향이나 요건이 개정안의 방향과 일치하면 supportingPrecedents에 포함하세요.
3. 판례가 개정안의 내용이나 요건과 상충하거나 더 엄격한/완화된 기준을 제시하면 conflictingPrecedents에 포함하세요.
4. 각 판례에 대해 개정안과의 관련성(relevance)을 구체적으로 한국어로 설명하세요.
5. 판례 정보(caseNumber, caseName, court, date, summary)는 제공된 JSON 데이터를 그대로 활용하세요.

모든 출력은 한국어로 작성하세요.`,
});

// ─── Flow 정의 ─────────────────────────────────────────────────────────────────

const verifyWithPrecedentsFlowDef = ai.defineFlow(
  {
    name: 'verifyWithPrecedentsFlow',
    inputSchema: VerifyWithPrecedentsInputSchema,
    outputSchema: PrecedentReportSchema,
  },
  async (input) => {
    // Step 1: searchPrecedents로 관련 판례 검색
    const keyword = input.regulationName;
    const lawName =
      input.relatedLawArticles.length > 0
        ? input.relatedLawArticles.join(', ')
        : input.regulationName;

    const searchResult = await searchPrecedents(keyword, lawName);

    // Step 2: AI가 판례를 분석하여 지지/충돌 분류
    const { output } = await classifyPrecedentsPrompt({
      draftContent: input.draftContent,
      regulationName: input.regulationName,
      precedentsJson: JSON.stringify(searchResult.precedents, null, 2),
    });

    if (!output) {
      throw new Error('AI가 판례 교차검증 결과를 생성하지 못했습니다.');
    }

    // Step 3: 충돌 판례 수에 따라 legalRiskAssessment 계산
    const conflictCount = output.conflictingPrecedents.length;
    const legalRiskAssessment: 'LOW' | 'MEDIUM' | 'HIGH' =
      conflictCount === 0 ? 'LOW' : conflictCount === 1 ? 'MEDIUM' : 'HIGH';

    return {
      ...output,
      legalRiskAssessment,
      disclaimer:
        '본 결과는 AI가 생성한 참고 자료이며 법적 자문이 아닙니다. 반드시 법무 담당자의 검토가 필요합니다.',
    };
  }
);

/**
 * 개정안에 대한 판례 교차검증을 수행합니다.
 *
 * @param input - 검증 입력 (개정안 내용, 관련 법령 조문, 규정명)
 * @returns PrecedentReport - 지지/충돌 판례 및 법적 리스크 평가 결과
 */
export async function verifyWithPrecedentsFlow(input: {
  draftContent: string;
  relatedLawArticles: string[];
  regulationName: string;
}): Promise<PrecedentReport> {
  try {
    return await verifyWithPrecedentsFlowDef(input);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('429') || message.includes('QUOTA')) {
      throw new Error(
        'AI 서비스 사용량이 일시적으로 초과되었습니다. 약 1분 후 다시 시도해 주세요.'
      );
    }
    throw e;
  }
}
