'use server';
/**
 * @fileOverview 경영 방향성 기반 전사 규정 일괄 정렬 Genkit 흐름
 *
 * - alignPolicyCommitment - 단일 규정에 대해 선택된 커미트먼트 방향으로 개정안 생성
 * - AlignPolicyCommitmentInput - 입력 타입
 * - AlignPolicyCommitmentOutput - 출력 타입
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { POLICY_COMMITMENTS } from './policy-commitments-data';
export type { PolicyCommitmentId } from './policy-commitments-data';

// ─── Zod 스키마 정의 ──────────────────────────────────────────────────────────

const ComparisonItemSchema = z.object({
  section: z.string().describe('조항명 또는 조항 번호 (예: "제 5조 (복리후생)")'),
  before: z.string().describe('개정 전 원문. 신설 조항이면 "N/A (신설)" 사용'),
  after: z.string().describe('개정 후 문안'),
  changeReason: z.string().describe('해당 조항의 구체적인 변경 이유'),
});

const AlignPolicyCommitmentInputSchema = z.object({
  commitmentLabels: z.array(z.string()).describe('선택된 경영 커미트먼트 레이블 목록 (예: ["ESG 경영", "안전 최우선"])'),
  commitmentDescriptions: z.array(z.string()).describe('선택된 커미트먼트별 방향 설명 목록'),
  regulationName: z.string().describe('규정명 (파일명)'),
  regulationContent: z.string().describe('규정 원문 내용'),
});

const AlignPolicyCommitmentOutputSchema = z.object({
  comparisonTable: z.array(ComparisonItemSchema).describe('신구조문대비표: 변경이 필요한 조항만 포함'),
  summary: z.array(z.string()).describe('주요 변경사항 요약 (불릿 포인트 목록)'),
  rationale: z.string().describe('개정 근거 및 경영 방향성과의 연관성 설명'),
});

export type AlignPolicyCommitmentInput = z.infer<typeof AlignPolicyCommitmentInputSchema>;
export type AlignPolicyCommitmentOutput = z.infer<typeof AlignPolicyCommitmentOutputSchema>;

/** 단일 규정의 정렬 결과 (규정 메타데이터 포함) */
export interface RegulationAlignmentResult {
  regulationId: string;
  regulationName: string;
  comparisonTable: Array<{ section: string; before: string; after: string; changeReason: string }>;
  summary: string[];
  rationale: string;
}

// ─── Genkit 프롬프트 정의 ─────────────────────────────────────────────────────

const alignmentPrompt = ai.definePrompt({
  name: 'alignPolicyCommitmentPrompt',
  input: { schema: AlignPolicyCommitmentInputSchema },
  output: { schema: AlignPolicyCommitmentOutputSchema },
  prompt: `당신은 기업 인사·법무 전문가입니다. 회사의 경영 방향성 커미트먼트를 기반으로 기존 사내 규정을 개정하는 신구조문대비표를 작성합니다.

⚠️ 중요 면책: 이 결과는 AI가 생성한 초안으로, 실제 적용 전 반드시 법무 담당자 및 해당 부서의 검토가 필요합니다.

--- 경영 방향성 커미트먼트 ---
{{#each commitmentLabels}}
- {{this}}: {{lookup ../commitmentDescriptions @index}}
{{/each}}

--- 검토 대상 규정 ---
규정명: {{regulationName}}

규정 원문:
{{{regulationContent}}}
--- 규정 원문 끝 ---

작업 지침:
1. 위 경영 방향성 커미트먼트에 비추어 현행 규정의 개정이 필요한 조항을 식별하세요.
2. 변경이 필요 없는 조항은 포함하지 마세요. 변경이 필요한 조항만 신구조문대비표에 포함하세요.
3. 신설 조항이 필요하면 before 필드에 "N/A (신설)"을 사용하세요.
4. 각 조항 변경 이유(changeReason)는 어떤 커미트먼트와 연관되는지 명확히 설명하세요.
5. 모든 출력은 한국어로 작성하세요.

출력 형식:
- comparisonTable: 개정이 필요한 조항별 신구조문대비표
- summary: 전체 개정의 핵심 변경사항 (불릿 포인트, 3~7개)
- rationale: 이번 개정이 선택된 경영 방향성과 어떻게 연결되는지 설명 (2~4문장)
`,
});

// ─── Genkit 플로우 정의 ───────────────────────────────────────────────────────

const alignPolicyCommitmentFlow = ai.defineFlow(
  {
    name: 'alignPolicyCommitmentFlow',
    inputSchema: AlignPolicyCommitmentInputSchema,
    outputSchema: AlignPolicyCommitmentOutputSchema,
  },
  async (input) => {
    const { output } = await alignmentPrompt(input);
    if (!output) {
      throw new Error('AI가 정책 정렬 개정안을 생성하지 못했습니다.');
    }
    return output;
  }
);

// ─── 공개 함수 ────────────────────────────────────────────────────────────────

/**
 * 단일 규정에 대해 선택된 경영 커미트먼트 방향으로 개정안을 생성합니다.
 * 규정당 순차 호출을 전제로 설계되어 있습니다 (병렬 X, rate limit 회피).
 *
 * @param selectedCommitmentIds - 선택된 커미트먼트 ID 배열
 * @param regulationId - 규정 ID (컴포넌트 상태 추적용)
 * @param regulationName - 규정명
 * @param regulationContent - 규정 원문 내용
 * @returns 신구조문대비표 및 개정 요약
 */
export async function alignPolicyCommitment(params: {
  selectedCommitmentIds: string[];
  regulationId: string;
  regulationName: string;
  regulationContent: string;
}): Promise<RegulationAlignmentResult> {
  const { selectedCommitmentIds, regulationId, regulationName, regulationContent } = params;

  const selectedCommitments = POLICY_COMMITMENTS.filter((c) =>
    selectedCommitmentIds.includes(c.id)
  );

  if (selectedCommitments.length === 0) {
    throw new Error('경영 커미트먼트를 하나 이상 선택해주세요.');
  }

  try {
    const output = await alignPolicyCommitmentFlow({
      commitmentLabels: selectedCommitments.map((c) => c.label),
      commitmentDescriptions: selectedCommitments.map((c) => c.description),
      regulationName,
      regulationContent: regulationContent || '규정 원문이 등록되지 않았습니다.',
    });

    return {
      regulationId,
      regulationName,
      comparisonTable: output.comparisonTable,
      summary: output.summary,
      rationale: output.rationale,
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('429') || message.includes('QUOTA')) {
      throw new Error('AI 서비스 사용량이 일시적으로 초과되었습니다. 약 1분 후 다시 시도해 주세요.');
    }
    throw e;
  }
}
