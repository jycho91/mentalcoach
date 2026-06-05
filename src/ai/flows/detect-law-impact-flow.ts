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
import {lawTools} from '@/ai/tools/law-tools';
import {runPromptWithRetry} from '@/ai/flows/_run-with-retry';

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
  tools: lawTools,
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

🔍 **사용 가능한 도구**
- searchLaw(query): 한국 법령정보센터 검색 → 실제 존재 여부와 mst 확인.
- getLawText(mst): 해당 법령의 실제 조문 본문을 그대로 받음.

🚨 **환각 방지 — STRICT MODE 규칙 (어기면 답변 무효)**

**규칙 1. 인용 가능한 텍스트의 출처는 단 두 군데뿐입니다.**
- (a) "분석 대상 법령" 블록 안의 원문, 또는
- (b) getLawText 도구가 반환한 본문 텍스트.
- 위 두 출처 어디에도 없는 문장·조문번호·문구는 sourceArticle 에 절대 쓰지 마십시오.

**규칙 2. 조문 번호 환각 금지.**
- "제○조" 같은 표기를 만들기 전, getLawText 응답 본문에서 그 조문 번호 문자열이 실제로 발견되는지 확인.
- 응답에 그 조문 번호가 없으면 그 표현 자체를 만들지 마십시오. 비슷한 조문이라도 추측 금지.

**규칙 3. 패러프레이즈 금지.**
- getLawText 가 돌려준 본문의 숫자(예: 시간·일수·인원 기준), 일자, 기준치는 절대 임의로 바꾸지 말고 원문 그대로 인용.
- 의미를 풀어 설명하더라도, 핵심 조항 인용 부분은 원문 표현을 직접 사용.

**규칙 4. 검증 실패 시 처리.**
- 검증할 수 없는 조항이면 sourceArticle 에 정확히 "[미검증]" 으로 표기하고,
  reason 에 "관련 법령 조항을 법령 DB에서 직접 확인하지 못했습니다" 라고 명시.
- 검증 실패가 잦은 항목은 결과에서 아예 제외하는 것이 낫습니다.

**규칙 5. "분석 대상 법령" 안에 이미 있는 조문**
- 이미 입력으로 주어진 텍스트에 명시된 조문만 인용할 때는 도구 호출 없이 그대로 사용해도 됩니다.
- 단, "분석 대상 법령" 에 없는 다른 법령·조항을 추가로 언급하려면 반드시 도구로 검증.

**규칙 6. 조항 간 참조(인용) 추적 — 중요.**
- 한 조항이 다른 조항을 가리키는 경우(예: 제4항이 "제2항의 기간은 근속기간에 포함한다"고 함), 반드시 그 가리키는 대상 조항(제2항)을 getLawText 본문에서 찾아 실제 내용(예: 기간 상한)을 확인한 뒤 인용하십시오.
- "전부/전체/모두" 같은 두루뭉술한 표현 대신, 참조된 조항의 구체적 수치(예: "1년, 요건 충족 시 최대 1년 6개월")를 명시하십시오.

**규칙 7. 법정 의무와 회사 재량 구분.**
- 법이 강제하는 것은 법에 명시된 범위뿐입니다. 예: 법정 육아휴직 상한이 최대 1년 6개월이면, 근속기간 산입 의무도 그 범위까지입니다.
- 회사가 법정 상한을 넘어 자율적으로 부여한 부분(예: 3년 휴직 중 1.5년 초과분)은 법적 의무가 아니라 회사 재량입니다. 이를 "법령 위반"으로 단정하지 마십시오.
- reason 은 "법은 [법정 상한]까지 X를 요구하는데, 현행 규정은 [구체적 차이]로 이에 미달한다" 형태로 작성하십시오.

**규칙 8. 조문의 모든 항을 빠짐없이 대조 — 매우 중요.**
- 관련 법령 조문(예: 제18조의2)을 검토할 때, 그 조의 **모든 항(①②③④...)을 하나씩** 사내 규정과 대조하십시오.
- 한 조에 변경/위반 사항이 여러 개면, 일부만 짚지 말고 **전부** 찾아내십시오.
  (예: 배우자 출산휴가가 "제1항: 일수 20일"과 "제4항: 분할 3회" 둘 다 바뀌었다면, 두 가지 모두 지적)
- 특히 숫자(일수·횟수·기간·금액·인원)가 현행 규정과 다른 항은 **빠짐없이 모두** 개정 대상으로 포함하십시오.
- 하나라도 누락하면 결재 문서로서 신뢰를 잃습니다. 조문을 위에서 아래까지 끝까지 훑으십시오.

❌ **나쁜 예 (절대 금지)**
- getLawText 호출 없이 "근로기준법 제○조의○" 같은 그럴듯한 조항 번호를 만들어 sourceArticle 에 적기.
- getLawText 응답에는 "60시간" 인데 sourceArticle 에는 "52시간"으로 바꿔 적기.
- 아래 "예시 출력" 의 조문번호·문구를 검증 없이 그대로 모방하기.

✅ **좋은 예**
- searchLaw("근로기준법") → mst 확인 → getLawText(mst) → 응답 본문에 "제○조(○○)" 가 실제로 있음 → sourceArticle 에 그 문구를 원문 그대로 인용.
- getLawText 응답에 해당 조문이 없음 → sourceArticle="[미검증]" + reason 에 미검증 사실 명시.

분석 지침:

1. 각 규정을 순차적으로 검토하여 법령과의 충돌/미준수 가능성을 파악하십시오.

2. 영향도(impactLevel)를 다음 기준으로 구분하십시오:
   - HIGH: 법령 위반 가능성이 있어 즉시 개정 필수
   - MEDIUM: 직접 위반은 아니나 내용 보완/명확화 필요
   - LOW: 직접적 충돌 없으나 참고적 검토 권장

3. reason(개정 필요 사유): 왜 이 규정이 개정되어야 하는지 구체적으로 설명하십시오.

4. sourceArticle(법적 근거): "제X조 제Y항에 따르면..."과 같이 법령 조문을 정확히 인용하십시오. (위 환각 방지 원칙 준수)

5. diff(차이점): 현행 규정과 개정 법령의 핵심 차이를 간략히 정리하십시오.
   예: "현행: 연 1회 교육 → 개정 법령: 월 1회 교육"

6. 영향받지 않는 규정은 결과에서 제외하십시오.

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
      "diff": "현행: <원문> → 개정: <원문>"
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

const detectLawImpactFlow = ai.defineFlow(
  {
    name: 'detectLawImpactFlow',
    inputSchema: DetectLawImpactInputSchema,
    outputSchema: DetectLawImpactOutputSchema,
  },
  async (input) => {
    // maxTurns: 도구로 여러 법령을 검증할 수 있도록 상향.
    // runPromptWithRetry: 모델이 빈 응답(null)을 줄 경우 자동 재시도.
    return await runPromptWithRetry(prompt, input, {maxTurns: 20});
  }
);
