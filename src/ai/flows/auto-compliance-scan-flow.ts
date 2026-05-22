'use server';
/**
 * @fileOverview AI 자동 컴플라이언스 스캔 Flow
 *
 * 법령 텍스트 입력 없이, AI가 사내 규정을 검토하여
 * 현행 법령에 어긋나는 부분을 자동으로 찾아냅니다.
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
const AutoComplianceScanInputSchema = z.object({
  regulations: z.array(RegulationInfoSchema).describe('스캔 대상이 되는 사내 규정 목록'),
});
export type AutoComplianceScanInput = z.infer<typeof AutoComplianceScanInputSchema>;

// 출력 스키마: 문제가 발견된 규정 정보
const ComplianceIssueSchema = z.object({
  regulationId: z.string().describe('문제가 발견된 사내 규정의 ID'),
  regulationName: z.string().describe('문제가 발견된 사내 규정의 명칭'),
  impactLevel: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe('심각도. HIGH: 법령 위반 가능성, MEDIUM: 개선 권고, LOW: 참고 수준'),
  reason: z.string().describe('해당 규정에서 발견된 문제점과 개정 필요 사유'),
  sourceArticle: z.string().describe('관련 법령 조문 (가능한 정확히 인용)'),
  diff: z.string().describe('현행 규정 vs 법령 요구사항의 차이점'),
});

// 출력 스키마
const AutoComplianceScanOutputSchema = z.object({
  impactedRegulations: z.array(ComplianceIssueSchema).describe('문제가 발견된 규정들의 목록'),
  summary: z.string().describe('전체 스캔 결과에 대한 종합 요약'),
  scanTimestamp: z.string().describe('스캔이 수행된 시점 (ISO 형식)'),
});
export type AutoComplianceScanOutput = z.infer<typeof AutoComplianceScanOutputSchema>;

/**
 * AI 자동 컴플라이언스 스캔 함수
 * 사내 규정들을 검토하여 현행 법령에 어긋나는 부분을 찾아냅니다.
 */
export async function autoComplianceScan(input: AutoComplianceScanInput): Promise<AutoComplianceScanOutput> {
  try {
    const result = await autoComplianceScanFlow(input);
    return {
      ...result,
      scanTimestamp: new Date().toISOString(),
    };
  } catch (e: unknown) {
    console.error('autoComplianceScan Flow Error:', e);
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('429') || message.includes('QUOTA')) {
      throw new Error('AI 서비스 사용량이 일시적으로 초과되었습니다. 약 1분 후 다시 시도해 주세요.');
    }
    throw e;
  }
}

const prompt = ai.definePrompt({
  name: 'autoComplianceScanPrompt',
  input: {schema: AutoComplianceScanInputSchema},
  output: {schema: AutoComplianceScanOutputSchema},
  prompt: `당신은 대한민국 법률 및 컴플라이언스 전문가입니다.
아래 사내 규정들을 검토하여 현행 법령에 어긋나거나 개정이 필요한 부분을 찾아주세요.

--- 검토 대상 법률 영역 ---
- 근로기준법 (근로시간, 휴가, 임금, 해고 등)
- 남녀고용평등법 (성희롱 예방, 육아휴직 등)
- 직장 내 괴롭힘 관련 규정
- 개인정보보호법 (개인정보 수집/이용/보관)
- 산업안전보건법 (안전교육, 작업환경)
- 기타 노동관계법령

--- 사내 규정 목록 ---
{{#each regulations}}
=== 규정 ID: {{id}} / 명칭: {{fileName}} ===
{{{content}}}

{{/each}}
--- 규정 목록 끝 ---

분석 지침:

1. 각 규정을 순차적으로 검토하여 현행 법령과의 충돌/미준수 가능성을 파악하십시오.

2. 심각도(impactLevel)를 다음 기준으로 구분하십시오:
   - HIGH: 명백한 법령 위반 가능성, 즉시 개정 필요
   - MEDIUM: 법령 기준 미달 또는 모호한 표현, 개선 권고
   - LOW: 직접적 위반은 아니나 최신 법령 반영 권장

3. reason(개정 필요 사유): 왜 이 규정이 문제인지, 어떤 부분이 법령에 어긋나는지 구체적으로 설명하십시오.

4. sourceArticle(관련 법령): 해당 문제와 관련된 법령 조문을 가능한 정확하게 인용하십시오.
   예: "근로기준법 제50조(근로시간)에 따르면 1주 근로시간은 휴게시간을 제외하고 40시간을 초과할 수 없다."

5. diff(차이점): 현행 규정과 법령 요구사항의 핵심 차이를 간략히 정리하십시오.
   예: "현행 규정: 주 52시간 / 법령 요구: 주 40시간 (연장근로 포함 52시간)"

6. 문제가 없는 규정은 결과에서 제외하십시오.

7. summary: 전체 분석 결과를 2-3문장으로 요약하십시오.

반드시 한국어로 답변하십시오.

예시 출력:
{
  "impactedRegulations": [
    {
      "regulationId": "abc123",
      "regulationName": "취업규칙",
      "impactLevel": "HIGH",
      "reason": "현행 취업규칙에 직장 내 괴롭힘 예방교육 관련 조항이 누락되어 있음. 2019년 개정 근로기준법에 따라 모든 사업장은 직장 내 괴롭힘 예방 및 대응 조치를 취업규칙에 명시해야 함.",
      "sourceArticle": "근로기준법 제93조 제11호: 취업규칙에 '직장 내 괴롭힘의 예방 및 발생 시 조치 등에 관한 사항'을 필수 기재",
      "diff": "현행 규정: 직장 내 괴롭힘 관련 조항 없음 / 법령 요구: 예방교육, 신고절차, 조치사항 명시 필요"
    }
  ],
  "summary": "총 3개 규정 중 1개 규정(취업규칙)에서 법령 위반 가능성이 발견되었습니다. 직장 내 괴롭힘 관련 조항의 신설이 시급합니다.",
  "scanTimestamp": ""
}
`,
});

const autoComplianceScanFlow = ai.defineFlow(
  {
    name: 'autoComplianceScanFlow',
    inputSchema: AutoComplianceScanInputSchema,
    outputSchema: AutoComplianceScanOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('AI가 컴플라이언스 스캔을 수행하지 못했습니다.');
    }
    return output;
  }
);
