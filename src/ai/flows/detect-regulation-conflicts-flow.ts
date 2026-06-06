'use server';
/**
 * @fileOverview 내부 규정 간 충돌을 탐지하는 Genkit Flow
 *
 * - detectRegulationConflicts - 사내 규정들 간의 충돌을 분석하는 함수
 * - ConflictType - 충돌 유형 (LOGIC | NUMERIC | SEMANTIC)
 * - ConflictSeverity - 충돌 심각도 (HIGH | MEDIUM | LOW)
 * - ConflictItem - 개별 충돌 항목
 * - ConflictScanResult - 충돌 스캔 결과
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// ─── 공개 타입 ────────────────────────────────────────────────────────────────

/** 충돌 유형: LOGIC(논리 충돌), NUMERIC(수치 비일관성), SEMANTIC(의미 중복) */
export type ConflictType = 'LOGIC' | 'NUMERIC' | 'SEMANTIC';

/** 충돌 심각도: HIGH(즉시 해소), MEDIUM(검토 필요), LOW(참고 수준) */
export type ConflictSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

/** 개별 충돌 항목 */
export interface ConflictItem {
  type: ConflictType;
  regulationAId: string;
  regulationAName: string;
  regulationBId: string;
  regulationBName: string;
  /** 충돌 조항 원문 */
  conflictingTexts: { a: string; b: string };
  /** 충돌 내용 설명 */
  description: string;
  /** 중재안 */
  arbitration: string;
  severity: ConflictSeverity;
}

/** 충돌 스캔 전체 결과 */
export interface ConflictScanResult {
  conflicts: ConflictItem[];
  summary: string;
  scanTimestamp: string;
  regulationCount: number;
}

// ─── Zod 스키마 (내부) ────────────────────────────────────────────────────────

const RegulationInfoSchema = z.object({
  id: z.string().describe('사내 규정의 고유 ID'),
  fileName: z.string().describe('사내 규정의 파일명 또는 명칭'),
  content: z.string().describe('사내 규정의 전체 내용'),
});

const DetectRegulationConflictsInputSchema = z.object({
  regulations: z.array(RegulationInfoSchema).describe('충돌 탐지 대상 사내 규정 목록'),
});
export type DetectRegulationConflictsInput = z.infer<typeof DetectRegulationConflictsInputSchema>;

const ConflictItemSchema = z.object({
  type: z.enum(['LOGIC', 'NUMERIC', 'SEMANTIC']).describe(
    '충돌 유형: LOGIC(논리 충돌), NUMERIC(수치 비일관성), SEMANTIC(의미 중복)'
  ),
  regulationAId: z.string().describe('충돌하는 규정 A의 ID'),
  regulationAName: z.string().describe('충돌하는 규정 A의 명칭'),
  regulationBId: z.string().describe('충돌하는 규정 B의 ID'),
  regulationBName: z.string().describe('충돌하는 규정 B의 명칭'),
  conflictingTexts: z.object({
    a: z.string().describe('규정 A의 충돌 조항 원문'),
    b: z.string().describe('규정 B의 충돌 조항 원문'),
  }).describe('충돌하는 조항 원문'),
  description: z.string().describe('충돌 내용 설명 (2-3문장)'),
  arbitration: z.string().describe('충돌 해소를 위한 중재안 (반드시 포함)'),
  severity: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe(
    '충돌 심각도: HIGH(즉시 해소 필요), MEDIUM(검토 필요), LOW(참고 수준)'
  ),
});

const ConflictScanResultSchema = z.object({
  conflicts: z.array(ConflictItemSchema).describe('탐지된 충돌 목록 (없으면 빈 배열)'),
  summary: z.string().describe('전체 스캔 결과에 대한 종합 요약 (2-3문장)'),
  scanTimestamp: z.string().describe('스캔이 수행된 시점 (ISO 형식)'),
  regulationCount: z.number().describe('분석 대상 규정 수'),
});

// ─── 공개 함수 ────────────────────────────────────────────────────────────────

/**
 * 규정 간 충돌 탐지 함수
 * 사내 규정들 간의 논리적·수치적·의미적 충돌을 분석합니다.
 * @throws {"비교할 규정이 2개 이상 필요합니다"} 규정이 1개 이하일 때
 */
export async function detectRegulationConflicts(
  input: DetectRegulationConflictsInput
): Promise<ConflictScanResult> {
  if (input.regulations.length < 2) {
    throw new Error('비교할 규정이 2개 이상 필요합니다');
  }
  try {
    const result = await detectRegulationConflictsFlow(input);
    return {
      ...result,
      scanTimestamp: new Date().toISOString(),
      regulationCount: input.regulations.length,
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('비교할 규정이 2개 이상 필요합니다')) throw e;
    console.error('detectRegulationConflicts Flow Error:', e);
    if (message.includes('429') || message.includes('QUOTA')) {
      throw new Error(
        'AI 서비스 사용량이 일시적으로 초과되었습니다. 약 1분 후 다시 시도해 주세요.'
      );
    }
    throw e;
  }
}

// ─── Genkit 프롬프트 ──────────────────────────────────────────────────────────

const prompt = ai.definePrompt({
  name: 'detectRegulationConflictsPrompt',
  input: {schema: DetectRegulationConflictsInputSchema},
  output: {schema: ConflictScanResultSchema},
  prompt: `당신은 기업의 법무/컴플라이언스 전문가입니다. 사내 규정들 간의 충돌을 탐지하고 중재안을 제시합니다.

--- 분석 대상 사내 규정 목록 ---
{{#each regulations}}
=== 규정 ID: {{id}} / 명칭: {{fileName}} ===
{{{content}}}

{{/each}}
--- 규정 목록 끝 ---

분석 지침:

1. 다음 세 가지 유형의 충돌을 탐지하십시오:
   - LOGIC(논리 충돌): 두 규정이 동일 사항에 대해 서로 반대되는 규칙을 정하는 경우
   - NUMERIC(수치 비일관성): 두 규정이 동일 기준에 대해 서로 다른 수치를 정하는 경우
   - SEMANTIC(의미 중복): 두 규정이 동일 사항을 서로 다른 표현으로 중복 정의하여 혼란을 야기하는 경우

2. 각 충돌에 대해 다음을 반드시 포함하십시오:
   - conflictingTexts.a / b: 충돌하는 조항 원문을 정확히 인용
   - description: 충돌 내용을 구체적으로 설명 (2-3문장)
   - arbitration: 충돌 해소를 위한 실행 가능한 중재안 제시 (절대 생략 금지)
   - severity: HIGH(즉시 해소 필요), MEDIUM(검토 필요), LOW(참고 수준)

3. 충돌이 없을 경우 conflicts를 빈 배열로 반환하십시오.

4. summary: 전체 분석 결과를 2-3문장으로 요약하십시오.

⚠️ AI 분석 결과입니다. 실제 적용 전 담당자 최종 판단이 필요합니다.

반드시 한국어로 답변하십시오.

예시 출력 (LOGIC 충돌 1건):
{
  "conflicts": [
    {
      "type": "LOGIC",
      "regulationAId": "reg001",
      "regulationAName": "인사규정",
      "regulationBId": "reg002",
      "regulationBName": "팀 운영규정",
      "conflictingTexts": {
        "a": "제15조 제2항: 직원 징계는 반드시 인사위원회 의결을 거쳐야 한다.",
        "b": "제8조: 팀장은 팀원에 대한 경고 및 견책 처분을 단독으로 결정할 수 있다."
      },
      "description": "인사규정 제15조는 모든 징계에 인사위원회 의결을 요구하나, 팀 운영규정 제8조는 팀장이 단독으로 경고·견책을 결정할 수 있다고 규정합니다. 경고·견책이 징계에 해당하는지에 따라 두 규정이 직접 충돌합니다.",
      "arbitration": "인사규정 제15조에 단서 조항을 추가하여 '경고·견책은 팀장 결재 후 인사위원회에 사후 보고'하는 방식으로 절충하거나, 팀 운영규정 제8조를 삭제하고 인사규정으로 일원화할 것을 권장합니다.",
      "severity": "HIGH"
    }
  ],
  "summary": "총 2개 규정 분석 결과 1건의 충돌이 발견되었습니다. 징계 절차에 관한 논리 충돌로 즉각적인 조항 통합 또는 단서 조항 추가가 필요합니다.",
  "scanTimestamp": "",
  "regulationCount": 2
}

예시 출력 (NUMERIC 충돌 1건):
{
  "conflicts": [
    {
      "type": "NUMERIC",
      "regulationAId": "reg003",
      "regulationAName": "복리후생규정",
      "regulationBId": "reg004",
      "regulationBName": "근로계약서 표준양식",
      "conflictingTexts": {
        "a": "제7조: 정규직 직원의 연차휴가는 연 15일로 한다.",
        "b": "제3조 제2항: 갑은 을에게 연간 20일의 유급휴가를 부여한다."
      },
      "description": "복리후생규정 제7조는 연차 15일을 규정하나, 근로계약서 표준양식 제3조는 20일을 명시합니다. 두 문서가 동일 직원에게 적용될 경우 서로 다른 기준이 적용되어 분쟁의 소지가 있습니다.",
      "arbitration": "근로기준법 최저 기준(15일) 이상으로 통일하되, 실제 부여 일수를 복리후생규정과 근로계약서 표준양식에서 동일하게 20일로 통일하거나, 복리후생규정을 '법정 최저 기준 이상'으로 개정하고 계약서를 기준 문서로 지정하십시오.",
      "severity": "MEDIUM"
    }
  ],
  "summary": "총 2개 규정 분석 결과 1건의 수치 비일관성이 발견되었습니다. 연차 일수가 문서마다 상이하여 노무 분쟁 위험이 있으므로 통일이 필요합니다.",
  "scanTimestamp": "",
  "regulationCount": 2
}
`,
});

// ─── Genkit Flow ──────────────────────────────────────────────────────────────

const detectRegulationConflictsFlow = ai.defineFlow(
  {
    name: 'detectRegulationConflictsFlow',
    inputSchema: DetectRegulationConflictsInputSchema,
    outputSchema: ConflictScanResultSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('AI가 규정 충돌 분석을 수행하지 못했습니다.');
    }
    return output;
  }
);
