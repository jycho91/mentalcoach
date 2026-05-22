'use server';
/**
 * @fileOverview 법령 개정이 사내 규정에 미치는 영향을 분석하는 Genkit Flow
 *
 * - detectLawImpact - 법령 텍스트와 사내 규정들을 분석하여 영향받는 규정을 찾아내는 함수
 * - DetectLawImpactInput - detectLawImpact 함수의 입력 타입
 * - DetectLawImpactOutput - detectLawImpact 함수의 출력 타입
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// 입력 스키마: 규정 정보
const RegulationInfoSchema = z.object({
  id: z.string().describe('사내 규정의 고유 ID'),
  fileName: z.string().describe('사내 규정의 파일명 또는 명칭'),
  content: z.string().describe('사내 규정의 전체 내용'),
});

// 입력 스키마
const DetectLawImpactInputSchema = z.object({
  newLawText: z.string().describe('새롭게 개정되거나 제정된 법령의 전체 텍스트'),
  regulations: z.array(RegulationInfoSchema).describe('스캔 대상이 되는 사내 규정 목록'),
});
export type DetectLawImpactInput = z.infer<typeof DetectLawImpactInputSchema>;

// 출력 스키마: 영향받는 규정 정보
const ImpactedRegulationSchema = z.object({
  regulationId: z.string().describe('영향받는 사내 규정의 ID'),
  regulationName: z.string().describe('영향받는 사내 규정의 명칭'),
  impactLevel: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('영향도 수준. HIGH: 즉시 개정 필요, MEDIUM: 검토 필요, LOW: 참고 수준'),
  reason: z.string().describe('해당 규정이 영향받는 구체적인 사유'),
  sourceArticle: z.string().describe('개정 필요성의 법적 근거가 되는 조문 (정확히 인용)'),
  diff: z.string().describe('현행 규정 vs 개정 법령의 핵심 차이점'),
});

// 출력 스키마
const DetectLawImpactOutputSchema = z.object({
  impactedRegulations: z.array(ImpactedRegulationSchema).describe('영향받는 규정들의 목록'),
  summary: z.string().describe('전체 스캔 결과에 대한 종합 요약'),
  scanTimestamp: z.string().describe('스캔이 수행된 시점 (ISO 형식)'),
});
export type DetectLawImpactOutput = z.infer<typeof DetectLawImpactOutputSchema>;

/**
 * 법령 영향 분석 함수
 * 법령 텍스트와 사내 규정들을 분석하여 영향받는 규정을 찾아냅니다.
 */
export async function detectLawImpact(input: DetectLawImpactInput): Promise<DetectLawImpactOutput> {
  try {
    const result = await detectLawImpactFlow(input);
    return {
      ...result,
      scanTimestamp: new Date().toISOString(),
    };
  } catch (e: unknown) {
    console.error('detectLawImpact Flow Error:', e);
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('429') || message.includes('QUOTA')) {
      throw new Error('AI 서비스 사용량이 일시적으로 초과되었습니다. 약 1분 후 다시 시도해 주세요.');
    }
    throw e;
  }
}

const prompt = ai.definePrompt({
  name: 'detectLawImpactPrompt',
  input: {schema: DetectLawImpactInputSchema},
  output: {schema: DetectLawImpactOutputSchema},
  prompt: `당신은 기업의 법무/컴플라이언스 전문가입니다. 새로운 법령이 사내 규정에 미치는 영향을 분석합니다.

--- 분석 대상 법령 ---
{{{newLawText}}}
--- 법령 끝 ---

--- 사내 규정 목록 ---
{{#each regulations}}
=== 규정 ID: {{id}} / 명칭: {{fileName}} ===
{{{content}}}

{{/each}}
--- 규정 목록 끝 ---

분석 지침:

1. 각 규정을 순차적으로 검토하여 법령과의 충돌/미준수 가능성을 파악하십시오.

2. 영향도(impactLevel)를 다음 기준으로 구분하십시오:
   - HIGH: 법령 위반 가능성이 있어 즉시 개정 필수
   - MEDIUM: 직접 위반은 아니나 내용 보완/명확화 필요
   - LOW: 직접적 충돌 없으나 참고적 검토 권장

3. reason(개정 필요 사유): 왜 이 규정이 개정되어야 하는지 구체적으로 설명하십시오.

4. sourceArticle(법적 근거): "제X조 제Y항에 따르면..."과 같이 법령 조문을 정확히 인용하십시오.

5. diff(차이점): 현행 규정과 개정 법령의 핵심 차이를 간략히 정리하십시오.
   예: "현행: 연 1회 교육 → 개정 법령: 월 1회 교육"

6. 영향받지 않는 규정은 결과에서 제외하십시오.

7. summary: 전체 분석 결과를 2-3문장으로 요약하십시오.

반드시 한국어로 답변하십시오.

예시 출력:
{
  "impactedRegulations": [
    {
      "regulationId": "abc123",
      "regulationName": "취업규칙",
      "impactLevel": "HIGH",
      "reason": "현행 취업규칙의 직장 내 괴롭힘 예방교육 조항이 개정 법령의 교육 주기 및 시간 기준을 충족하지 못함",
      "sourceArticle": "제76조의2 제2항 제1호: '상시근로자 50인 이상 사업장: 월 1회 이상, 회당 2시간 이상'",
      "diff": "현행: 연 1회 1시간 교육 → 개정 법령: 월 1회 2시간 이상 교육"
    }
  ],
  "summary": "총 3개 규정 중 1개 규정(취업규칙)이 개정 법령의 영향을 받습니다. 직장 내 괴롭힘 예방교육 관련 조항의 즉시 개정이 필요합니다.",
  "scanTimestamp": ""
}
`,
});

const detectLawImpactFlow = ai.defineFlow(
  {
    name: 'detectLawImpactFlow',
    inputSchema: DetectLawImpactInputSchema,
    outputSchema: DetectLawImpactOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('AI가 법령 영향 분석을 수행하지 못했습니다.');
    }
    return output;
  }
);
