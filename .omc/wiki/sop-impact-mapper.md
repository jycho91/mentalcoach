---
title: SOP Impact Mapper — Step 1.5 Design & Lessons
tags: [feature, sop, classification, product-design, kaist-hw8]
category: decision
created: 2026-05-28
updated: 2026-05-30
---

# SOP Impact Mapper — Step 1.5

## What it is
A gate between "law scan result" and "draft generation" that lets users identify which internal SOPs are affected before spending time on amendment drafts.

Workflow: **법령 스캔 → Step 1.5 SOP 영향도 분석 → 신구조문대비표 생성**

## The insight that created it
Kim Jihyun's interview quote (2026-05-28):
> "어떤 SOP가 영향을 받는지 파악하는 게 제일 힘들어요. 신구조문대비표 만드는 건 그다음 문제고."

Before the interview, Step 1.5 didn't exist. The product went directly from law scan to draft generation — which maps to my assumption ("users want faster drafts"), not the user's reality ("users first need triage").

## Implementation

### Classification logic (pure JS, testable)
```javascript
// src/sop-logic.js
export function classifySop(name) {
  if (/MKT|광고|마케팅/.test(name)) → impact-high / "영향 가능성 높음"
  if (/HR|취업규칙/.test(name))      → impact-mid  / "검토 필요"
  else                               → impact-low  / "무관"
}
```

### UX flow
1. User types SOP names (Enter to add tags)
2. "🔎 영향도 분석 실행" button → 1.2s simulated analysis
3. Color-coded result rows (red / yellow / green)
4. Legal disclaimer: "AI 생성 초안, 법무팀 검토 필요"
5. "✅ 확인 완료 — 신구조문대비표 생성하기" → proceeds to results

## Test coverage
23 passing tests in `tests/sop-logic.test.js` covering:
- All 3 impact tiers
- Edge cases: empty string, whitespace, case-sensitivity (lowercase `mkt` → low)
- Priority: MKT wins over HR when both match
- `formatText` with/without `<add>` tags

## Known limitations
- Keyword-matching only — no semantic understanding
- No memory of previous classifications per regulation
- Doesn't handle SOP codes (e.g., "SOP-QA-001") — user must know the keyword

## Lesson: the spec-to-code loop
Running /health before HW8's test infra showed 0/10 on tests — a measurable signal that "it works" and "it's tested" are different claims. Tests forced extracting `classifySop()` from DOM-coupled code into a pure function, which revealed the classification logic is more fragile than it looked embedded in the HTML.

## See also
- [[regulmate-project]] — product context
- [[user-interview-kim-jihyun]] — origin of this feature
- [[korean-regulation-landscape]] — why the current keywords are insufficient
