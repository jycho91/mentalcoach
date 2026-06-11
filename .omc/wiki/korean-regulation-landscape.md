---
title: Korean Regulation Landscape — Pharma Compliance
tags: [korean-law, pharma, compliance, msd-korea, regulation-tiers]
category: pattern
created: 2026-05-30
updated: 2026-05-30
---

# Korean Regulation Landscape — Pharma Compliance

## The 4-Tier Hierarchy (tacit knowledge from Kim Jihyun interview)

Korean pharma companies must track ALL four tiers — a change at any tier can trigger SOP updates.

```
Tier 1: 법률 (Acts)          — 국회 입법, 관보 공포
    ↓
Tier 2: 시행령 (Enforcement Decrees) — 대통령령, 상위법 위임
    ↓
Tier 3: 시행규칙/고시 (Ministerial Rules/Notices) — 식약처/복지부 고시
    ↓
Tier 4: 가이드라인/지침 (Guidelines)  — 비구속적이지만 실무 기준
```

**Key trap:** Most compliance tools (and our current prototype) only monitor Tier 1-2. But ~70% of operational SOP changes in pharma are triggered by Tier 3-4 changes (식약처 고시, GMP 가이드라인).

## The laws RegulMate currently covers (prototype v1)

| Law | Tier | Affected SOP | Typical Change Frequency |
|-----|------|-------------|--------------------------|
| 근로기준법 제50조 | 1 | 취업규칙 제12조 | ~1회/2년 |
| 산업안전보건법 제38조 | 1 | 안전보건관리규정 제8조 | ~1회/3년 |
| 개인정보보호법 제29조 | 1 | 개인정보처리규정 제15조 | ~2회/년 |

## Laws NOT yet covered but high-demand for pharma (roadmap)

- **약사법 제68조** (의약품 광고 규제) — MKT팀 SOP와 직결, 2023년 개정 이후 문의 多
- **의약품 등의 안전에 관한 규칙** — GMP SOP에 영향
- **의약품 광고 심의 기준 고시** — Tier 3, 현행 데모에 없음 → 가장 자주 바뀌는 항목
- **공정경쟁규약** (한국제약바이오협회) — 리베이트 방지, 영업팀 SOP에 영향

## RegulMate's SOP classification logic

현행 분류 규칙 (`src/sop-logic.js`):
```javascript
/MKT|광고|마케팅/  → 영향 가능성 높음 (badge-high)
/HR|취업규칙/       → 검토 필요 (badge-mid)
else               → 무관 (badge-low)
```

**Known gaps:**
1. Keyword-only matching — doesn't understand that "안전관리규정"과 "안전보건규정" are different
2. No tier-awareness — treats 고시 change same as 법률 change
3. No multi-law cross-reference — one SOP can be affected by multiple law changes simultaneously

## Competitive landscape (what Kim Jihyun uses today)
- **현재 도구:** 개인 Excel + 관보 수동 검색
- **경쟁자:** 법제처 국가법령정보센터 (무료, UI 나쁨), 렉스코드(LexCode, 유료), 네이버 법령검색
- **우리의 차별점:** 법령 변경 → 사내 SOP 매핑 + 신구조문대비표 자동 초안

## See also
- [[regulmate-project]] — product context
- [[user-interview-kim-jihyun]] — primary user source for this landscape
- [[sop-impact-mapper]] — classification implementation
