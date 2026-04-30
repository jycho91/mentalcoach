/**
 * 매칭 엔진 — Step 1 (디텍팅 / 스캔 모드)
 *
 * 입력: 법령 변경 + 사내 규정 리스트
 * 출력: 영향받는 규정 + 사유 + 근거 법 조문
 *
 * 동작 우선순위:
 *   1. KOREA_LAW_API_KEY 있음 → 실제 법령 개정 목록 스캔 (LIVE)
 *   2. 없음 → mock 데이터 (MOCK)
 */

import { MOCK_DEMO_SCAN, MOCK_RULES } from "@/lib/mock-data";
import {
  fetchRecentLaws,
  formatKoreaDate,
  type KoreaLawListItem,
} from "@/lib/korea-law-api";
import type { LawChange, AffectedRule, Scan } from "@/lib/types";

// ──────────────────────────────────────────────
// 사내 규정별 관련 법령 키워드 맵
// (실제 운영: Gemini 임베딩 유사도로 대체 가능)
// ──────────────────────────────────────────────
const RULE_LAW_KEYWORDS: Record<string, string[]> = {
  "rule-employment":   ["근로기준법", "근로기준", "근로시간", "연차", "휴가", "임금"],
  "rule-privacy":      ["개인정보", "개인정보보호법", "개인정보 보호"],
  "rule-safety":       ["산업안전", "중대재해", "안전보건", "산업안전보건법"],
  "rule-security":     ["정보통신망", "정보보호", "전자금융"],
  "rule-finance":      ["법인세", "부가가치세", "회계", "외부감사"],
  "rule-procurement":  ["하도급", "공정거래", "하도급법"],
  "rule-conduct":      ["근로기준법", "복무", "취업규칙"],
  "rule-severance":    ["퇴직급여", "근로자퇴직급여", "퇴직금"],
  "rule-compensation": ["최저임금", "임금", "근로기준법"],
  "rule-ethics":       ["청탁금지", "부정청탁", "이해충돌"],
};

function matchRuleToLaw(ruleId: string, law: KoreaLawListItem): boolean {
  const keywords = RULE_LAW_KEYWORDS[ruleId] ?? [];
  const lawName = law.법령명_한글 ?? "";
  return keywords.some((kw) => lawName.includes(kw));
}

function buildRationale(law: KoreaLawListItem, ruleTitle: string): string {
  const effDate = formatKoreaDate(law.시행일자);
  return (
    `${law.소관부처명}이 관할하는 「${law.법령명_한글}」이 ${effDate} 시행됨에 따라 ` +
    `「${ruleTitle}」의 관련 조항이 현행 법령과 불일치할 수 있습니다. ` +
    `개정 내용을 검토하여 사내 규정 반영 여부를 확인하시기 바랍니다.`
  );
}

// ──────────────────────────────────────────────
// 메인 스캔 함수
// ──────────────────────────────────────────────
export type MatchRulesInput = {
  lawChanges?: LawChange[];
};

export async function runScan(_input?: MatchRulesInput): Promise<Scan> {
  const hasApiKey = Boolean(process.env.KOREA_LAW_API_KEY);

  // ── MOCK 모드 ──────────────────────────────
  if (!hasApiKey) {
    await new Promise((r) => setTimeout(r, 1200));
    return {
      ...MOCK_DEMO_SCAN,
      startedAt: new Date(Date.now() - 1200).toISOString(),
      finishedAt: new Date().toISOString(),
    };
  }

  // ── LIVE 모드 ─────────────────────────────
  const startedAt = new Date().toISOString();

  // 1. 최근 90일 개정 법령 목록
  const recentLaws = await fetchRecentLaws(90, 30);

  // 2. LawChange 타입으로 변환
  const lawChanges: LawChange[] = recentLaws.map((law) => ({
    id: `law-${law.법령ID}`,
    lawName: law.법령명_한글,
    articleNumber: "",
    articleTitle: law.법령구분명,
    effectiveDate: formatKoreaDate(law.시행일자),
    summary: `「${law.법령명_한글}」 개정 — ${law.소관부처명} 소관, 시행 ${formatKoreaDate(law.시행일자)}`,
    oldText: "",
    newText: "",
    source: "KOREA_LAW_MCP" as const,
  }));

  // 3. 사내 규정과 키워드 매칭
  const affected: AffectedRule[] = [];

  for (const rule of MOCK_RULES) {
    for (const law of recentLaws) {
      if (!matchRuleToLaw(rule.id, law)) continue;
      // 규정당 가장 먼저 매칭된 법령만 포함
      if (affected.some((a) => a.ruleId === rule.id)) continue;

      affected.push({
        ruleId: rule.id,
        ruleTitle: rule.title,
        articleNumber: rule.articles[0]?.number ?? "",
        articleTitle: rule.articles[0]?.title ?? "",
        similarity: 0.85,
        rationale: buildRationale(law, rule.title),
        legalBasis: `「${law.법령명_한글}」 (시행 ${formatKoreaDate(law.시행일자)}, ${law.소관부처명})`,
        lawChangeId: `law-${law.법령ID}`,
      });
    }
  }

  return {
    id: `scan-${Date.now()}`,
    startedAt,
    finishedAt: new Date().toISOString(),
    source: "LIVE",
    lawChanges,
    affected,
  };
}
