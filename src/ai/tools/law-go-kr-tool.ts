/**
 * @fileOverview law.go.kr 판례 검색 Genkit Tool
 *
 * `searchPrecedents` tool: 법령 관련 판례를 law.go.kr에서 검색합니다.
 * Genkit flow 내에서 AI 에이전트가 호출할 수 있는 도구로 등록됩니다.
 */

import { z } from 'genkit';
import { ai } from '@/ai/genkit';
import { searchPrecedents } from '@/lib/law-go-kr-client';

/** Tool 입력 Zod 스키마 */
const SearchPrecedentsInputSchema = z.object({
  keyword: z.string().describe('판례 검색에 사용할 키워드 (예: "부당해고", "최저임금")'),
  lawName: z.string().describe('검색과 함께 사용할 관련 법령명 (예: "근로기준법", "최저임금법")'),
});

/** Tool 출력 — 개별 판례 Zod 스키마 */
const PrecedentSchema = z.object({
  caseNumber: z.string().describe('판례일련번호 또는 사건번호'),
  caseName: z.string().describe('사건명'),
  court: z.string().describe('법원명'),
  date: z.string().describe('선고일자'),
  summary: z.string().describe('판시사항 또는 판결요지 (요약)'),
  relatedLaws: z.array(z.string()).describe('관련 법령 목록'),
  verdict: z.string().describe('판결내용 (간략)'),
});

/** Tool 출력 Zod 스키마 */
const SearchPrecedentsOutputSchema = z.object({
  precedents: z.array(PrecedentSchema).describe('검색된 판례 목록'),
  totalCount: z.number().describe('전체 검색 결과 수'),
  isMock: z.boolean().describe('API key 미설정으로 mock 데이터를 반환한 경우 true'),
});

/**
 * Genkit tool: 법령 관련 판례를 law.go.kr에서 검색합니다.
 *
 * flow 내에서 `tools` 배열에 포함시켜 AI 에이전트가 사용할 수 있도록 합니다.
 */
export const searchPrecedentsTool = ai.defineTool(
  {
    name: 'searchPrecedents',
    description: '법령 관련 판례를 law.go.kr에서 검색합니다',
    inputSchema: SearchPrecedentsInputSchema,
    outputSchema: SearchPrecedentsOutputSchema,
  },
  async ({ keyword, lawName }) => {
    return searchPrecedents(keyword, lawName);
  }
);
