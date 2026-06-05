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
import {runPromptWithRetry} from '@/ai/flows/_run-with-retry';

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
  // temperature 0.3: 무작위성 낮춰 변경점 누락 줄이되 과도하게 경직되지 않게
  config: {temperature: 0.3},
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

**규칙 3. 조문은 원문 그대로 복사 (VERBATIM) — 재구성 절대 금지.**
- sourceArticle 에 조문을 적을 때, getLawText 본문의 해당 항(項)을 **글자 그대로 복사**. 요약·재작성 금지.
- **항 번호(①②③④...)도 본문 그대로.** 번호를 바꾸거나(예: ②항인데 ④항) 다른 항 내용과 섞지 말 것.
- "다만, ..." 같은 단서 문장이 있으면 **그 단서까지 빠짐없이 포함**해 복사. (예: "1년 이내로 한다. 다만, ...6개월 이내에서 추가로..." 에서 '다만' 이하 생략 금지)
- 숫자·일자·기준치는 원문 그대로. 임의 변경 금지.

**규칙 4. 검증 실패 시 처리.**
- 검증할 수 없는 조항이면 sourceArticle="[미검증]", reason 에 "관련 법령 조항을 법령 DB에서 직접 확인하지 못했습니다" 명시.
- 검증 실패가 잦은 항목은 결과에서 제외하는 것이 낫습니다.

**규칙 5. 시행일자 확인.**
- searchLaw 결과의 effectiveDate 가 미래(현재 시점 이후)이거나 너무 오래된 법령은 신중히 사용.

**규칙 6. 조항 간 참조(인용) 추적 — 중요.**
- 한 조항이 다른 조항을 가리키는 경우(예: 제4항이 "제2항의 기간은 근속기간에 포함한다"고 함), 반드시 그 가리키는 대상 조항(제2항)을 getLawText 본문에서 찾아 실제 내용(예: 기간 상한)을 확인한 뒤 인용하십시오.
- "전부/전체/모두" 같은 두루뭉술한 표현 대신, 참조된 조항의 구체적 수치(예: "1년, 요건 충족 시 최대 1년 6개월")를 명시하십시오.

**규칙 7. 법정 의무와 회사 재량 구분.**
- 법이 강제하는 것은 법에 명시된 범위뿐입니다. 예: 법정 육아휴직 상한이 최대 1년 6개월이면, 근속기간 산입 의무도 그 범위까지입니다.
- 회사가 법정 상한을 넘어 자율적으로 부여한 부분은 법적 의무가 아니라 회사 재량이므로 "법령 위반"으로 단정하지 마십시오.
- reason 은 "법은 [법정 상한]까지 X를 요구하는데, 현행 규정은 [구체적 차이]로 이에 미달한다" 형태로 작성하십시오.

❌ **나쁜 예 (절대 금지)**
- getLawText 호출 없이 "○○법 제○조" 같은 그럴듯한 조항 번호를 만들기.
- getLawText 응답 숫자를 임의로 바꿔 적기 (예: 본문 "60시간" → 인용 "52시간").
- 아래 "예시 출력" 의 조문번호·문구를 검증 없이 그대로 모방하기.

✅ **좋은 예**
- searchLaw("근로기준법") → mst 확인 → getLawText(mst) → 본문에 "제○조(○○)" 가 실제로 있음 → sourceArticle 에 그 문구 원문 그대로 인용.
- getLawText 응답에 해당 조문이 없음 → sourceArticle="[미검증]" + reason 에 미검증 사실 명시.

분석 지침:

1. 각 규정을 순차적으로 검토하여 현행 법령과의 충돌/미준수 가능성을 파악하십시오.

2. 심각도(impactLevel)를 다음 **객관적 기준**으로 판정하십시오. (주관적 느낌이 아니라 아래 규칙을 기계적으로 적용)
   - HIGH (즉시 개정 필요): 법이 정한 **구체적 의무 기준(일수·횟수·금액·기간·비율 등 숫자, 또는 필수 기재/조치 의무)**을 현행 규정이 충족하지 못함 = 명백한 미달·위반.
       예: 법은 난임치료휴가 "연간 6일"인데 현행 규정이 "3일" → 숫자 미달이므로 무조건 HIGH.
   - MEDIUM (검토 필요): 숫자·필수의무 위반은 아니지만, 표현이 모호하거나 개정 법령 취지를 충분히 반영하지 못해 보완이 권장되는 경우.
   - LOW (참고): 법적 위반은 없고 최신 문구 반영이 권장되는 정도.
   ※ 핵심 원칙: **법에 명시된 숫자/필수의무를 현행 규정이 못 맞추면 망설이지 말고 HIGH**. "위반 가능성" 같은 모호한 표현으로 MEDIUM으로 낮추지 마십시오.

3. reason(개정 필요 사유): 왜 이 규정이 문제인지, 어떤 부분이 법령에 어긋나는지 구체적으로 설명하십시오.

4. sourceArticle(관련 법령): 해당 문제와 관련된 법령 조문을 정확하게 인용하십시오. (위 환각 방지 원칙 준수 — 반드시 도구로 검증된 조문만)
   예: "근로기준법 제50조(근로시간)에 따르면 1주 근로시간은 휴게시간을 제외하고 40시간을 초과할 수 없다."

5. diff(차이점): 현행 규정과 법령 요구사항의 핵심 차이를 정리하십시오.
   ★ 매우 중요 — 한 규정에 바뀌는 항목이 여러 개면, diff 한 칸 안에 번호를 매겨 **전부** 나열하십시오. 절대 하나만 적고 끝내지 마십시오.
   예(1개): "현행: 주 52시간 / 법령: 주 40시간"
   예(여러 개): "1) 휴가일수: 현행 10일 → 법령 20일  2) 분할횟수: 현행 1회 → 법령 3회"
   → 법령 조문의 모든 항을 현행 규정과 대조해, 숫자(일수·횟수·기간 등)가 다른 항목은 빠짐없이 모두 담으십시오.

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
    // maxTurns: 도구로 여러 법령을 검증할 수 있도록 상향.
    // runPromptWithRetry: 모델이 빈 응답(null)을 줄 경우 자동 재시도.
    return await runPromptWithRetry(prompt, input, {maxTurns: 20});
  }
);
