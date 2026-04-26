'use server';
/**
 * @fileOverview 규정 개정안에 대한 경영진 보고용 요약서를 생성하는 Genkit 플로우입니다.
 *
 * - summarizeRegulationRevision - 요약서 생성 프로세스를 처리하는 함수입니다.
 * - SummarizeRegulationRevisionInput - 입력 타입 스키마입니다.
 * - SummarizeRegulationRevisionOutput - 출력 타입 스키마입니다.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeRegulationRevisionInputSchema = z.object({
  revisedRegulation: z.string().describe('분석할 개정 규정의 전체 텍스트 또는 개정 문구입니다.'),
});
export type SummarizeRegulationRevisionInput = z.infer<typeof SummarizeRegulationRevisionInputSchema>;

const SummarizeRegulationRevisionOutputSchema = z.object({
  limitationOfCurrentRule: z.string().describe('이번 개정을 필요하게 만든 현행 규칙의 한계점 또는 문제점에 대한 요약입니다.'),
  reasonForRevision: z.string().describe('제안된 개정에 대한 사유와 정당성에 대한 요약입니다.'),
  keyChanges: z.array(z.string()).describe('개정된 규정에서 도입된 가장 중요한 핵심 변경 사항들의 목록입니다. 각 항목은 짧고 명확해야 합니다.'),
});
export type SummarizeRegulationRevisionOutput = z.infer<typeof SummarizeRegulationRevisionOutputSchema>;

export async function summarizeRegulationRevision(
  input: SummarizeRegulationRevisionInput
): Promise<SummarizeRegulationRevisionOutput> {
  try {
    return await summarizeRegulationRevisionFlow(input);
  } catch (e: unknown) {
    console.error('summarizeRegulationRevision Flow Error:', e);
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('429') || message.includes('QUOTA')) {
      throw new Error('AI 서비스 사용량이 일시적으로 초과되었습니다. 잠시 후 다시 시도해 주세요.');
    }
    throw e;
  }
}

const summarizeRegulationRevisionPrompt = ai.definePrompt({
  name: 'summarizeRegulationRevisionPrompt',
  input: {schema: SummarizeRegulationRevisionInputSchema},
  output: {schema: SummarizeRegulationRevisionOutputSchema},
  prompt: `당신은 기업의 규정 및 정책을 분석하는 'ReguMate 컴플라이언스 전문 분석가'입니다.

사용자가 제안한 규정 개정안(또는 개정 문구)을 분석하여 경영진 보고용 '개정 근거 요약서'를 작성해야 합니다.

요약서에는 다음 내용이 반드시 포함되어야 합니다:
1. **현행 규칙의 한계 및 문제점**: 기존 규정이 현재 상황에서 어떤 한계가 있는지, 왜 개정이 필요한지 설명합니다.
2. **개정 사유 및 필요성**: 이번 개정을 통해 얻고자 하는 목적과 정당성을 설명합니다.
3. **개정 주요 골자**: 개정안의 가장 핵심적인 변경 사항들을 목록 형태로 정리합니다.

**반드시 모든 응답을 한국어로 작성하십시오.**

분석할 개정 내용:
{{{revisedRegulation}}}`,
});

const summarizeRegulationRevisionFlow = ai.defineFlow(
  {
    name: 'summarizeRegulationRevisionFlow',
    inputSchema: SummarizeRegulationRevisionInputSchema,
    outputSchema: SummarizeRegulationRevisionOutputSchema,
  },
  async (input) => {
    const {output} = await summarizeRegulationRevisionPrompt(input);
    if (!output) {
      throw new Error('AI가 요약 보고서를 생성하지 못했습니다.');
    }
    return output!;
  }
);
