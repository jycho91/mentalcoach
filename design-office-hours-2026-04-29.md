# RegulMate — Office Hours Design Doc
**Date:** 2026-04-29 | **Branch:** cksung9009-regulmate | **Mode:** MBA Demo

---

## TL;DR

RegulMate is a Korean B2B compliance automation tool. Law changes in Korea → matching against your internal rules → AI-drafted amendment package for human approval. Two-step pipeline: Detect (live) + Draft (polished pre-gen). Demo approach: Hybrid C.

The real moat is the only end-to-end pipeline connected to Korea's official legal infrastructure (국가법령정보센터 + 대법원 판례 DB). Global players (NAVEX, SAI360, Regology) don't have it.

---

## Problem

Korean companies face hundreds of law amendments per year. When a law changes:

1. **Nobody knows it happened** — monitoring 국가법령정보센터 manually is impossible at scale.
2. **Nobody knows which internal rules are affected** — rules are siloed across HR, legal, security, finance, each team managing their own docs.
3. **Updating the rules is a 3-day document job** — 신구조문대비표, 개정사유서, 주요골자 must all be written by hand for each change.
4. **Leadership exposure is growing** — 중대재해처벌법 means compliance failures are personal liability, not just corporate fines.

---

## Target User & Buyer

| Role | Description | How They Feel |
|------|-------------|---------------|
| **Anchor user** | Department manager (HR, security, finance) who owns internal rules for their function | Compliance is a side job. A law change means 3 extra days of document work on top of their actual job. |
| **Buyer** | 준법감시인 / 법무팀 head at enterprise or mid-market company | Responsible for the whole portfolio. Fined if something slips. Has budget for tools. |

**Go-to-market note:** Department manager is the user who feels the pain. Legal/compliance team is the buyer who signs the contract. Bottom-up motion: dept manager adopts → proves ROI → compliance team rolls out enterprise-wide.

---

## Solution: Two-Step Pipeline

### Step 1: Detecting (Scan Mode) — LIVE IN DEMO

```
[Law amendment event detected via korean-law-mcp]
    ↓ polls open.law.go.kr via MCP
[Semantic matching against company's internal rules]
    ↓ embedding-based similarity match
[Output: affected rules list + specific legal rationale]

Example output:
→ "취업규칙 제12조 — 근로기준법 제50조 개정으로 근로시간 기준 변경.
   현행 규정이 구법 기준이므로 개정 필요."
→ "개인정보처리규정 제8조 — 개인정보보호법 시행령 제30조 개정.
   보유기간 조항 불일치 감지."
```

**User action:** Review the list, select which rule to update.

### Step 2: Amendment Generation + Precedent Check — PRE-GENERATED IN DEMO

```
[User selects a rule from the affected list]
    ↓
[LLM intensive analysis: selected rule × relevant legislation]
    ↓
[대법원 판례 DB cross-check]
    ↓
[Output: Approval-Ready Package]
    - 개정 사유
    - 주요 골자
    - 신구조문대비표 (old vs. new provisions, side-by-side)
    - 판례 검증 리포트
```

**Design principle:** AI finds → human selects → AI writes → human approves. Never fully automated. Preserves legal trust.

---

## Technical Architecture (Approach C: Hybrid)

### What to Build

```
Layer 1: Law Data (open source, don't build)
  → Use: chrisryugj/korean-law-mcp
  → 41 법제처 APIs wrapped as 16 MCP tools
  → Covers: laws, precedents, 행정규칙, 법령해석례
  → Install: npm + API key from open.law.go.kr

Layer 2: Internal Rule Storage (build this)
  → Load 10 internal rules as text files or DB records
  → Generate embeddings for each rule (OpenAI ada-002 or similar)
  → Store embeddings for similarity search

Layer 3: Matching Engine (build this — core differentiator)
  → On law change event: embed the changed article text
  → Cosine similarity search against internal rule embeddings
  → Threshold filter (e.g., >0.75 similarity) → affected list
  → LLM call: "Given this law change and this internal rule, explain
    why amendment is needed and cite the specific article."

Layer 4: Amendment Generator (build OR pre-generate for demo)
  → For demo: pre-generate output for 3 selected scenarios
  → For real: LLM prompt that takes (old rule + law change + precedents)
    → outputs structured amendment package

Layer 5: UI (build minimal for demo)
  → Simple web UI: rule list view, scan button, affected list, output panel
  → No auth needed for demo. Single-user.
```

### Demo Data Setup (before demo day)

Pre-load 10 internal rules covering:
1. 취업규칙 (Employment Rules)
2. 개인정보처리방침 (Privacy Policy)
3. 안전보건관리규정 (Safety Management)
4. 보안규정 (Security Policy)
5. 복무규정 (Conduct Policy)
6. 연봉계약서 기준 (Compensation Guidelines)
7. 징계규정 (Disciplinary Policy)
8. 퇴직금 규정 (Severance Policy)
9. 정보보안 규정 (Info Security Policy)
10. 하도급 관리 규정 (Subcontracting Policy)

Pre-generate amendment packages for 3 real recent law changes:
- **근로기준법 제50조** (working hours) → 취업규칙
- **개인정보보호법 시행령 제30조** (data retention) → 개인정보처리방침
- **중대재해처벌법** (serious accident liability) → 안전보건관리규정

---

## Demo Scenario (Demo Day Script)

```
1. [Slide] One-liner: "법령이 바뀌면, 우리 회사 규정이 스스로 바뀐다."

2. [Live] Show the 10 internal rules loaded in the system.

3. [Live] Click "최근 법령 개정 스캔" — MCP polls 국가법령정보센터.
   → Scan runs LIVE (this is where the tech credibility lands)
   → Output: "3건의 영향받는 규정 발견"
       - 취업규칙 제12조 (근로기준법 제50조 개정)
       - 개인정보처리규정 제8조 (개인정보보호법 시행령 제30조 개정)
       - 안전보건관리규정 제6조 (중대재해처벌법 시행규칙 개정)

4. [Pre-gen] User selects 취업규칙 → clicks "개정안 추천"
   → Amendment package loads (pre-generated, polished)
   → Show: 개정 사유 + 주요 골자 + 신구조문대비표 + 판례 검증

5. [Slide] Business model + roadmap. Done.
```

**Total demo time target:** Under 4 minutes. Everything shown in steps 3-4 is the product. Don't narrate — let the output speak.

---

## Competitive Position

| Competitor | Coverage | Korea law integration | Korean output formats |
|------------|----------|----------------------|-----------------------|
| NAVEX | Global | ❌ | ❌ |
| SAI360 | Global | ❌ | ❌ |
| Regology | Global | ❌ | ❌ |
| **RegulMate** | Korea | ✅ MCP-based real-time | ✅ 신구조문대비표 etc. |

**Moat:** Infrastructure gap, not feature gap. Building an API wrapper for 법제처 is not the same as having a product that's been tuned for 신구조문대비표 format, 대법원 판례 cross-check, and Korean compliance officer workflow.

---

## Premises Agreed

1. **User vs. Buyer gap is real.** Department manager is anchor user; 준법감시인/법무팀 is the buyer. Demo persona should be the compliance team head, not a dept manager, to match buyer authority.
2. **Both steps are needed.** 1-A alone is a fancy alert. 1-B (draft package) is where the 3-day time savings lives. Keep both.
3. **MCP foundation exists.** Don't build the law data layer — use `chrisryugj/korean-law-mcp`. Build the matching + generation layer on top.

---

## Key Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Live scan fails on demo day | Med | Test 20x before. Have cached fallback ready. |
| Panel asks "can I try it?" | High | "It requires API key setup — here's the repo." Show GitHub live. |
| "Why can't ChatGPT do this?" | High | "ChatGPT doesn't know what 국가법령정보센터 changed yesterday. This does." |
| Matching quality is poor | Med | Hand-tune the 3 demo scenarios in advance. |
| 대법원 판례 integration not built | High | Frame it as "precedent-ready architecture" in slides. Show output referencing real cases manually. |

---

## Next Steps (Priority Order)

- [ ] **Today:** Get API key from [open.law.go.kr](https://open.law.go.kr) — takes 1-2 business days to approve.
- [ ] **Install:** `chrisryugj/korean-law-mcp` locally. Verify it can pull recent law changes.
- [ ] **Build:** Embedding pipeline for 10 internal rules.
- [ ] **Build:** Matching engine (law change → affected rule detection).
- [ ] **Pre-generate:** 3 amendment packages for 취업규칙, 개인정보처리규정, 안전보건관리규정.
- [ ] **Build:** Minimal demo UI (scan button → affected list → output panel).
- [ ] **Dry run:** Full demo 3x before presentation day.
- [ ] **Slide:** 1 slide on competitive landscape. 1 slide on business model. Don't over-slide.

---

## Assignment (One Thing)

**Before anything else: apply for the open.law.go.kr API key today.**
Everything else depends on it. The approval takes time you don't have.
Go to [https://open.law.go.kr](https://open.law.go.kr) → 오픈API → 신청.

---

*Generated by gstack /office-hours | RegulMate MBA Demo Session | 2026-04-29*
