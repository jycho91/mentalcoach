'use server';
/**
 * @fileOverview AI 자동 컴플라이언스 스캔 Flow
 *
 * 법령 텍스트 입력 없이, AI가 사내 규정을 검토하여
 * 현행 법령에 어긋나는 부분을 자동으로 찾아냅니다.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {lawTools} from '@/ai/tools/law-tools';

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
  tools: lawTools,
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

🔍 **사용 가능한 도구**
- searchLaw(query): 한국 법령정보센터 검색 → 실제 존재 여부와 mst 확인.
- getLawText(mst): 해당 법령의 실제 조문 본문을 그대로 받음.

🚨 **환각 방지 — STRICT MODE 규칙 (어기면 답변 무효)**
**자동 스캔은 입력 법령 텍스트가 없기 때문에 모든 법령 인용은 반드시 도구로 검증해야 합니다.**

**규칙 1. 인용 가능한 텍스트의 출처는 단 하나 — getLawText 응답 본문뿐입니다.**
- getLawText 가 돌려준 본문에 실제로 존재하는 문장·조문번호만 sourceArticle 에 사용.
- 그 외의 어떤 텍스트도 만들지 마십시오.

**규칙 2. 조문 번호 환각 금지.**
- "제○조" 같은 표기를 만들기 전, getLawText 응답 본문에서 그 조문 번호 문자열이 실제로 발견되는지 확인.
- 응답에 그 조문 번호가 없으면 그 표현 자체를 만들지 마십시오.

**규칙 3. 패러프레이즈 금지.**
- 본문의 숫자(시간·일수·인원 기준), 일자, 기준치는 절대 임의로 바꾸지 말고 원문 그대로 인용.

**규칙 4. 검증 실패 시 처리.**
- 검증할 수 없는 조항이면 sourceArticle="[미검증]", reason 에 "관련 법령 조항을 법령 DB에서 직접 확인하지 못했습니다" 명시.
- 검증 실패가 잦은 항목은 결과에서 제외하는 것이 낫습니다.

**규칙 5. 시행일자 확인.**
- searchLaw 결과의 effectiveDate 가 미래(현재 시점 이후)이거나 너무 오래된 법령은 신중히 사용.

❌ **나쁜 예 (절대 금지)**
- getLawText 호출 없이 "○○법 제○조" 같은 그럴듯한 조항 번호를 만들기.
- getLawText 응답 숫자를 임의로 바꿔 적기 (예: 본문 "60시간" → 인용 "52시간").
- 아래 "예시 출력" 의 조문번호·문구를 검증 없이 그대로 모방하기.

✅ **좋은 예**
- searchLaw("근로기준법") → mst 확인 → getLawText(mst) → 본문에 "제○조(○○)" 가 실제로 있음 → sourceArticle 에 그 문구 원문 그대로 인용.
- getLawText 응답에 해당 조문이 없음 → sourceArticle="[미검증]" + reason 에 미검증 사실 명시.

분석 지침:

1. 각 규정을 순차적으로 검토하여 현행 법령과의 충돌/미준수 가능성을 파악하십시오.

2. 심각도(impactLevel)를 다음 기준으로 구분하십시오:
   - HIGH: 명백한 법령 위반 가능성, 즉시 개정 필요
   - MEDIUM: 법령 기준 미달 또는 모호한 표현, 개선 권고
   - LOW: 직접적 위반은 아니나 최신 법령 반영 권장

3. reason(개정 필요 사유): 왜 이 규정이 문제인지, 어떤 부분이 법령에 어긋나는지 구체적으로 설명하십시오.

4. sourceArticle(관련 법령): 해당 문제와 관련된 법령 조문을 정확하게 인용하십시오. (위 환각 방지 원칙 준수 — 반드시 도구로 검증된 조문만)
   예: "근로기준법 제50조(근로시간)에 따르면 1주 근로시간은 휴게시간을 제외하고 40시간을 초과할 수 없다."

5. diff(차이점): 현행 규정과 법령 요구사항의 핵심 차이를 간략히 정리하십시오.
   예: "현행 규정: 주 52시간 / 법령 요구: 주 40시간 (연장근로 포함 52시간)"

6. 문제가 없는 규정은 결과에서 제외하십시오.

7. summary: 전체 분석 결과를 2-3문장으로 요약하십시오.

반드시 한국어로 답변하십시오.

예시 출력 (형식만 참고. sourceArticle 안의 조문번호/문구는 절대 그대로 모방하지 말 것 — 반드시 도구로 검증한 실제 본문만 사용):

[검증 성공 예]
{
  "impactedRegulations": [
    {
      "regulationId": "<규정ID>",
      "regulationName": "<규정명>",
      "impactLevel": "HIGH",
      "reason": "<구체적 사유>",
      "sourceArticle": "<getLawText 응답에서 실제로 발견된 조문번호와 원문 일부를 그대로 인용>",
      "diff": "현행 규정: <원문> / 법령 요구: <원문>"
    }
  ],
  "summary": "<2-3문장 요약>",
  "scanTimestamp": ""
}

[검증 실패 예]
{
  "impactedRegulations": [
    {
      "regulationId": "<규정ID>",
      "regulationName": "<규정명>",
      "impactLevel": "MEDIUM",
      "reason": "관련 법령 조항을 법령 DB에서 직접 확인하지 못했습니다.",
      "sourceArticle": "[미검증]",
      "diff": ""
    }
  ],
  "summary": "...",
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
    // maxTurns: AI가 여러 규정/법령을 도구로 검증하려면 호출 횟수가 많이 필요.
    // 기본값(5)으로는 부족해 중단되므로 넉넉히 상향.
    const {output} = await prompt(input, {maxTurns: 20});
    if (!output) {
      throw new Error('AI가 컴플라이언스 스캔을 수행하지 못했습니다.');
    }
    return output;
  }
);
