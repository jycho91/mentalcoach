---
title: User Interview — Kim Jihyun (MSD Korea, Vaccine PM)
tags: [user-research, mom-test, msd-korea, pharma, persona]
category: decision
created: 2026-05-28
updated: 2026-05-30
---

# User Interview — Kim Jihyun (MSD Korea, Vaccine PM)

## Context
Mom Test style interview conducted 2026-05-28 before HW8.
MSD Korea = Merck Sharp & Dohme Korea (다국적 제약회사).
Role: Vaccine Product Manager — responsible for product compliance, not pure R&D.

## What she actually said (verbatim fragments)

> "법령이 바뀌면 저희가 SOP를 고쳐야 하는데, 어떤 SOP가 영향을 받는지 파악하는 게 제일 힘들어요."

> "신구조문대비표 만드는 건 그다음 문제고, 먼저 '우리 어떤 규정 건드려야 해?' 를 알아야죠."

## Three validated insights

### Insight 1: The bottleneck is triage, not drafting
**What I assumed:** Users want faster amendment draft generation.
**What she said:** The real bottleneck is knowing WHICH SOPs are affected. She spends ~60% of compliance time on triage, only ~40% on actual drafting.
**Product change:** Added Step 1.5 (SOP Impact Mapper) between law scan and draft generation.

### Insight 2: Trust threshold for AI output is "one review layer"
She won't use AI output that goes directly to legal filing. But she WILL use it as a first draft if:
- It clearly flags itself as AI-generated
- A one-sentence legal disclaimer is visible
- The source law citation is traceable
**Product change:** Added legal notice banner + source citation in Word export.

### Insight 3: Pharma-specific regulation density is extreme
MSD Korea tracks: 약사법, 의약품 등의 안전에 관한 규칙, 의약품 광고 심의 기준, GMP 가이드라인, 공정경쟁규약 + 개인정보보호법 + 산업안전보건법.
그냥 법령 변경이 아니라 "어느 레벨(법/시행령/고시/가이드라인)"이 바뀌었는지도 중요.
**Hidden insight:** The taxonomy of Korean pharma regulation has 4+ tiers. A simple "law name → SOP" mapping misses 60% of real changes.

## What she didn't say (but revealed by behavior)
- She uses a personal Excel spreadsheet to track regulation changes. Not an official tool.
- The compliance team at MSD Korea is 2 people for all of Korea operations.
- She shared the Excel template unprompted — "you can just use this as your schema."

## Follow-up questions to ask next time
- [ ] What's the worst-case story of a regulation change that almost caused a compliance incident?
- [ ] Who else (outside compliance) sees the amendment table before it's filed?
- [ ] Would she pay ₩50,000/month? ₩200,000/month?

## See also
- [[regulmate-project]] — how these insights shaped the product
- [[sop-impact-mapper]] — the feature built from Insight 1
- [[korean-regulation-landscape]] — the 4-tier taxonomy
