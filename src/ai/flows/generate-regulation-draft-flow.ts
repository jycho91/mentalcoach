'use server';
/**
 * @fileOverview A Genkit flow for generating draft revisions to company regulations in a comparison format.
 *
 * - generateRegulationDraft - A function that generates draft revisions based on new directives.
 * - GenerateRegulationDraftInput - The input type for the generateRegulationDraft function.
 * - GenerateRegulationDraftOutput - The return type for the generateRegulationDraft function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ComparisonItemSchema = z.object({
  section: z.string().describe('The section or article name/number (e.g., "제 12조 (비용 청구)")'),
  before: z.string().describe('The original text of the section before revision.'),
  after: z.string().describe('The revised text of the section.'),
});

const GenerateRegulationDraftInputSchema = z.object({
  newLawDirective: z.string().describe('The text of the new legal requirement or internal directive that necessitates a regulation revision.'),
  existingRegulationContent: z.string().optional().describe('The current content of the existing company regulation that needs to be revised.'),
  previousDraft: z.string().optional().describe('The previous version of the draft revision, if this is an upgrade request.'),
  upgradeRequest: z.string().optional().describe('Additional requirements or feedback for upgrading the previous draft.'),
});
export type GenerateRegulationDraftInput = z.infer<typeof GenerateRegulationDraftInputSchema>;

const GenerateRegulationDraftOutputSchema = z.object({
  comparisonTable: z.array(ComparisonItemSchema).describe('A table comparing the original and revised sections of the regulation.'),
  summaryOfChanges: z.array(z.string()).describe('A bullet-point list summarizing the key changes proposed.'),
  rationale: z.string().describe('A brief explanation of the rationale behind the proposed changes.'),
});
export type GenerateRegulationDraftOutput = z.infer<typeof GenerateRegulationDraftOutputSchema>;

export async function generateRegulationDraft(input: GenerateRegulationDraftInput): Promise<GenerateRegulationDraftOutput> {
  try {
    return await generateRegulationDraftFlow(input);
  } catch (e: unknown) {
    console.error('generateRegulationDraft Flow Error:', e);
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes('429') || message.includes('QUOTA')) {
      throw new Error('AI 서비스 사용량이 일시적으로 초과되었습니다. 약 1분 후 다시 시도해 주세요.');
    }
    throw e;
  }
}

const prompt = ai.definePrompt({
  name: 'generateRegulationDraftPrompt',
  input: {schema: GenerateRegulationDraftInputSchema},
  output: {schema: GenerateRegulationDraftOutputSchema},
  prompt: `You are an expert compliance officer. Your task is to generate a 'Before vs. After' comparison for a regulation revision based on a new directive.

Instead of the full text, focus ONLY on the sections that need to be changed or added.
Identify the specific articles or sections from the existing content that are affected.

--- Start of Context ---
New Law/Directive:
{{{newLawDirective}}}

{{#if existingRegulationContent}}
Existing Regulation Content (for context):
{{{existingRegulationContent}}}
{{/if}}

{{#if previousDraft}}
--- Previous Draft Version ---
The following is the previous version of the draft that needs to be upgraded:
{{{previousDraft}}}

{{#if upgradeRequest}}
User's Upgrade Request:
{{{upgradeRequest}}}
{{/if}}

IMPORTANT: This is an UPGRADE request. You must:
1. Use the previous draft as the base
2. Apply the user's upgrade request to improve it
3. Keep the good parts from the previous draft
4. Only modify what the upgrade request asks for
--- End of Previous Draft ---
{{/if}}
--- End of Context ---

Instructions for output:
1.  **comparisonTable**:
    - Identify which sections/articles need modification.
    - If a section is NEW, put "N/A (신설)" in the 'before' field.
    - If a section is modified, provide the exact original text (if available in context) in 'before' and the revised version in 'after'.
{{#if previousDraft}}
    - For upgrades: 'before' should be the previous draft version, 'after' should be the upgraded version.
{{/if}}
2.  **summaryOfChanges**: Summarize the core impact.
3.  **rationale**: Explain the legal or internal basis for these specific changes.

Ensure the output is in Korean.

Example output structure:
{
  "comparisonTable": [
    {
      "section": "제 45조 (직장 내 괴롭힘 예방 교육)",
      "before": "① 회사는 직장 내 괴롭힘 예방을 위해 연 1회 교육을 실시한다.",
      "after": "① 회사는 직장 내 괴롭힘 예방 및 대처를 위해 상시근로자를 대상으로 월 1회, 2시간 이상의 심화 교육을 의무적으로 실시한다."
    }
  ],
  "summaryOfChanges": ["교육 주기 단축 (연 1회 -> 월 1회)", "교육 시간 명시 (2시간 이상)"],
  "rationale": "고용노동부 최신 지침에 따른 의무 교육 강화 대응"
}
`,
});

const generateRegulationDraftFlow = ai.defineFlow(
  {
    name: 'generateRegulationDraftFlow',
    inputSchema: GenerateRegulationDraftInputSchema,
    outputSchema: GenerateRegulationDraftOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('AI가 개정안 비교표를 생성하지 못했습니다.');
    }
    return output!;
  }
);
