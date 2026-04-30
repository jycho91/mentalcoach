/**
 * RegulMate 코어 도메인 타입
 *
 * 설계 원칙: AI가 찾아주고 → 사람이 선택하고 → AI가 작성.
 * 모든 모델은 사용자가 검토·수정·승인할 수 있도록 구조화된 텍스트로 보관.
 */

import { z } from "zod";

// ──────────────────────────────────────────────
// 1. 사내 규정 (Internal Rule)
// ──────────────────────────────────────────────

export const RuleCategory = z.enum([
  "HR",
  "PRIVACY",
  "SAFETY",
  "SECURITY",
  "FINANCE",
  "PROCUREMENT",
  "ETHICS",
  "OTHER",
]);
export type RuleCategory = z.infer<typeof RuleCategory>;

export const RuleArticleSchema = z.object({
  number: z.string(), // "제12조"
  title: z.string(), // "근로시간"
  body: z.string(),
});
export type RuleArticle = z.infer<typeof RuleArticleSchema>;

export const RuleSchema = z.object({
  id: z.string(),
  title: z.string(), // "취업규칙"
  category: RuleCategory,
  ownerDept: z.string(), // "인사팀"
  lastRevisedAt: z.string(), // ISO date
  articles: z.array(RuleArticleSchema),
  summary: z.string(),
});
export type Rule = z.infer<typeof RuleSchema>;

// ──────────────────────────────────────────────
// 2. 법령 변경 이벤트 (Law Change)
// ──────────────────────────────────────────────

export const LawChangeSchema = z.object({
  id: z.string(),
  lawName: z.string(), // "근로기준법"
  articleNumber: z.string(), // "제50조"
  articleTitle: z.string(), // "근로시간"
  effectiveDate: z.string(), // ISO date
  summary: z.string(), // 핵심 변경사항 1-2줄
  oldText: z.string(),
  newText: z.string(),
  source: z.literal("KOREA_LAW_MCP").or(z.literal("CACHED")).or(z.literal("MOCK")),
});
export type LawChange = z.infer<typeof LawChangeSchema>;

// ──────────────────────────────────────────────
// 3. 매칭 결과 (Affected Rule)
// ──────────────────────────────────────────────

export const AffectedRuleSchema = z.object({
  ruleId: z.string(),
  ruleTitle: z.string(),
  articleNumber: z.string(), // "제12조"
  articleTitle: z.string(),
  similarity: z.number(), // 0-1
  rationale: z.string(), // "왜 바꿔야 하는가"
  legalBasis: z.string(), // 근거 법 조문
  lawChangeId: z.string(),
});
export type AffectedRule = z.infer<typeof AffectedRuleSchema>;

// ──────────────────────────────────────────────
// 4. 스캔 결과 (Scan)
// ──────────────────────────────────────────────

export const ScanSchema = z.object({
  id: z.string(),
  startedAt: z.string(),
  finishedAt: z.string(),
  lawChanges: z.array(LawChangeSchema),
  affected: z.array(AffectedRuleSchema),
  source: z.literal("LIVE").or(z.literal("MOCK")),
});
export type Scan = z.infer<typeof ScanSchema>;

// ──────────────────────────────────────────────
// 5. 개정안 패키지 (Amendment Package)
// ──────────────────────────────────────────────

export const DiffRowSchema = z.object({
  articleNumber: z.string(), // "제12조"
  oldText: z.string(),
  newText: z.string(),
  changeNote: z.string(), // 이번 줄의 변경 포인트 한 줄 요약
});
export type DiffRow = z.infer<typeof DiffRowSchema>;

export const PrecedentSchema = z.object({
  caseId: z.string(), // "대법원 2022다12345"
  date: z.string(),
  summary: z.string(),
  relevance: z.string(), // 본 개정안과의 관련성
});
export type Precedent = z.infer<typeof PrecedentSchema>;

export const AmendmentPackageSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  ruleTitle: z.string(),
  lawChangeId: z.string(),
  lawChangeSummary: z.string(),
  generatedAt: z.string(),
  // 결재 패키지 4종
  reasoning: z.string(), // 개정 사유 (서술형)
  highlights: z.array(z.string()), // 주요 골자 (불릿)
  diffTable: z.array(DiffRowSchema), // 신구조문대비표
  precedents: z.array(PrecedentSchema), // 판례 검증
  // 신뢰도 / 메타
  confidence: z.number(), // 0-1
  source: z.literal("GEMINI").or(z.literal("MOCK")),
});
export type AmendmentPackage = z.infer<typeof AmendmentPackageSchema>;
