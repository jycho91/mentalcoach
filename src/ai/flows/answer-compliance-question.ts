'use server';
/**
 * @fileOverview 사내 정책 및 규정 지식 베이스를 바탕으로 답변을 생성하는 Genkit 플로우입니다.
 * 규정 간의 상호 연관성(Cross-Impact) 분석 능력이 대폭 강화되었습니다.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnswerComplianceQuestionInputSchema = z.object({
  question: z.string().describe('사용자가 입력한 사내 정책 또는 규정에 관한 질문입니다.'),
  knowledgeBaseContent: z.array(z.string()).describe('라이브러리에서 추출된 관련 규정 텍스트 본문 배열입니다.'),
  strictness: z.number().min(0).max(100).describe('검색 및 답변의 정확도 설정값(0-100)입니다.'),
});

const AnswerComplianceQuestionOutputSchema = z.object({
  answer: z.string().describe('제공된 지식 베이스를 바탕으로 생성된 답변입니다.'),
  documentReference: z.string().optional().describe('답변의 근거가 된 구체적인 규정 명칭 또는 섹션입니다.'),
  crossImpactAnalysis: z.string().optional().describe('규정 간 상호 연관성 및 간접 영향 분석 내용입니다.'),
});

const answerComplianceQuestionPrompt = ai.definePrompt({
  name: 'answerComplianceQuestionPrompt',
  input: { schema: AnswerComplianceQuestionInputSchema },
  output: { schema: AnswerComplianceQuestionOutputSchema },
  prompt: `당신은 사내 규정을 분석하고 답변하는 'ReguMate 컴플라이언스 어시스턴트'입니다.

제공된 **사내 규정 데이터**를 기반으로 사용자의 질문에 답변하십시오.

--- [규정 데이터] ---
{{#each knowledgeBaseContent}}
{{{this}}}
{{/each}}
--- [규정 데이터 끝] ---

질문: {{{question}}}

[답변 형식 - 반드시 준수]
답변을 다음과 같이 체계적으로 구성하십시오:

**📋 요약**
질문에 대한 핵심 답변을 1-2문장으로 먼저 제시

**📌 관련 규정**
• [규정명] 제X조: 관련 내용 요약
• [규정명] 제X조: 관련 내용 요약
(관련 규정이 여러 개면 모두 나열)

**💡 상세 설명**
• 첫 번째 포인트
• 두 번째 포인트
• 세 번째 포인트
(불렛 포인트로 상세 내용 정리)

[답변 지침]
- 반드시 규정 데이터에서 찾은 내용을 근거로 답변
- 규정명과 조항 번호를 명시
- 데이터에 없는 내용은 "해당 내용은 제공된 규정에서 확인되지 않습니다"로 답변
- 반드시 한국어로 답변

'crossImpactAnalysis' 필드에는 관련될 수 있는 다른 규정이나 추가 검토가 필요한 사항을 기술하십시오.`,
});

export async function answerComplianceQuestion(input: z.infer<typeof AnswerComplianceQuestionInputSchema>) {
  try {
    const { output } = await answerComplianceQuestionPrompt(input);
    if (!output) {
      throw new Error('AI가 답변을 생성하지 못했습니다.');
    }
    return output;
  } catch (e: unknown) {
    console.error('answerComplianceQuestion Flow Error:', e);
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('429') || message.includes('QUOTA')) {
      throw new Error('AI 서비스 할당량이 초과되었습니다. 잠시 후 다시 시도해 주세요.');
    }
    throw e;
  }
}