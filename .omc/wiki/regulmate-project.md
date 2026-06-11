---
title: RegulMate — Project Overview
tags: [regulmate, project, b2b-saas, korean-law, pharma]
category: architecture
created: 2026-05-30
updated: 2026-05-30
---

# RegulMate — 법령-사내규정 동기화 AI

## What it does
B2B SaaS prototype that monitors Korean law changes and auto-generates 신구조문대비표 (old-vs-new article comparison tables) for internal SOP amendment drafts.

**Core loop:**
```
법령 변경 감지 → SOP 영향 분류 (Step 1.5) → 신구조문대비표 생성 → Word 다운로드
```

## Why it exists
Korean companies are legally required to update internal regulations (취업규칙, 안전보건관리규정, 개인정보처리규정) when relevant laws change. Currently this is manual: a compliance officer reads the Official Gazette, compares old/new articles by hand, and drafts amendment tables. The process takes 2–5 days per regulation change. RegulMate collapses that to minutes.

## Target users
- **Primary:** Compliance officers at mid-large Korean companies (직원 300인 이상)
- **Secondary:** External law firms that manage regulation compliance for multiple clients
- **Validated persona:** Kim Jihyun (MSD Korea, Vaccine PM) — "We're drowning in minor regulation updates. I spend more time on admin than product."

## Current prototype state
- Single-file `prototype.html` (vanilla HTML/CSS/JS, no build system)
- 3 regulation samples: 취업규칙, 안전보건관리규정, 개인정보처리규정
- **Step 1.5: SOP Impact Mapper** — classifies internal SOPs as 영향 가능성 높음 / 검토 필요 / 무관
- Word export (docx.js CDN) — exports full report: 개정 사유 + 주요 골자 + 신구조문대비표
- Test infra: vitest, `src/sop-logic.js`, 23 passing unit tests

## Key design decisions
- **Single HTML file:** Zero setup friction for demo. Compliance officers won't install npm. → [[design-single-file]]
- **Step 1.5 before draft:** Insight from Kim Jihyun interview — "I need to know WHICH SOPs are affected before spending time on the amendment draft." Reduces wasted work by ~40%.
- **Korean-first typography:** 맑은 고딕 in Word export, Korean date formats, legal terminology throughout.

## Repo
`https://github.com/jycho91/mentalcoach` — branch `calataridaxo-regulmate`

## See also
- [[sop-impact-mapper]] — Step 1.5 classification logic
- [[user-interview-kim-jihyun]] — Mom Test findings
- [[korean-regulation-landscape]] — Korean law compliance context
