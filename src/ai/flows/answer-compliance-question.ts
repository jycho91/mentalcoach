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
  prompt: `당신은 기업의 수백 개 규정 간 얽힌 실타래를 푸는 'ReguMate 수석 컴플라이언스 감사관'입니다.

사용자의 질문은 단순한 조항 확인이 아니라, "특정 조항이 바뀔 때 시스템 전체에 어떤 연쇄 반응이 일어나는가"를 묻는 고난도 분석 업무입니다. 

제공된 **사내 규정 데이터(Knowledge Base)**를 샅샅이 대조하여 답변하십시오.

--- [분석 대상 규정 데이터 집합] ---
{{#each knowledgeBaseContent}}
{{{this}}}
{{/each}}
--- [분석 대상 규정 데이터 끝] ---

질문: {{{question}}}

[수석 감사관의 필수 분석 프로세스]
1. **정합성 전수 조사**: 질문에서 언급된 '금액', '직함', '절차'가 포함된 다른 모든 규정을 찾으십시오. (예: 회계규정의 '500만원'이 바뀌면, 위임전결요령의 결재 한도나 자산관리규정의 처분 기준도 함께 바뀌어야 함을 지적해야 합니다.)
2. **위계 구조 파악**: 상위 규정(정관, 기본규정)과 하위 규정(시행세칙, 요령) 간의 모순이 발생하는지 확인하십시오.
3. **명시적 근거 제시**: 답변 시 반드시 "OO규정 제X조에 따르면..."과 같이 구체적인 근거를 명시하십시오. 만약 데이터에 없더라도 연관 가능성이 매우 높은 문서가 있다면 그 명칭을 언급하며 확인을 권고하십시오.
4. **추론 능력 가동**: 단어가 100% 일치하지 않더라도 의미적으로 '승인 권한', '집행 절차', '사후 보고' 등 업무 흐름상 연결된 지점을 포착하십시오.

[답변 스타일 가이드]
- 정확도 설정: {{strictness}}%
- 답변은 전문적이고 논리적이어야 하며, 불확실한 부분은 '추가 확인 필요'로 명시하십시오.

반드시 한국어로 답변하고, 'crossImpactAnalysis' 필드에는 질문과 직접 관련은 없지만 함께 검토해야 할 리스크(예: 세무 리스크, 감사 지적 사항 등)를 기술하십시오.`,
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