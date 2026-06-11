---
title: Self-Interview — RegulMate Tacit Knowledge (2026-05-30)
tags: [tacit-knowledge, self-interview, product-strategy, kaist-hw9]
category: session-log
created: 2026-05-30
updated: 2026-05-30
source: self-interview (5 questions format from Karpathy LLM wiki pattern)
---

# Self-Interview — RegulMate 암묵지 추출

*Format: "Ask me 5 questions about X that aren't written down, then file the answers."*
*Topic: RegulMate 제품 전략 + MSD Korea 컨텍스트에서의 규정 컴플라이언스*

---

## Q1: 규정 컴플라이언스 시장에서 RegulMate가 살아남을 수 있는 가장 현실적인 시나리오는?

실제로는 **full-stack automation이 아닌 "compliance officer의 초안 보조"** 포지셔닝이 현실적이다.

이유:
- 한국 기업의 법무팀/컴플라이언스팀은 AI 아웃풋을 그대로 법적 문서로 제출하지 않는다 (내부 통제 이유)
- 그러나 "초안 작성 시간 80% 단축" 정도는 당장 ROI가 명확함
- 진입 경로: 중소기업 (컴플라이언스 인력 1-2명) → 대기업 법무팀 벤더 계약
- **가장 빠른 PMF 경로:** 노무법인/법무법인이 고객사 대신 RegulMate를 사용하는 B2B2B 모델

---

## Q2: Kim Jihyun이 말하지 않은 것 중 가장 중요한 것은?

**그녀의 Excel이 이미 "나쁜 RegulMate"다.**

Excel에는:
- 추적하는 법령 목록 (약 15개)
- 마지막 확인 날짜
- 영향받는 SOP 이름
- 담당자 코멘트

이게 의미하는 것: 정보 구조는 이미 검증됐다. 우리가 해야 할 것은 "Excel을 자동화"가 아니라 "Excel이 자동으로 업데이트되게" 만드는 것. → **법령 모니터링 API + Excel 아웃풋** 경로가 초기 제품보다 더 빠른 adoption일 수 있다.

---

## Q3: "신구조문대비표"라는 형식이 진짜 bottleneck인가, 아니면 더 깊은 문제가 있나?

신구조문대비표는 **법원 제출용 형식**이지, 사내 의사결정용 형식이 아니다.

현장에서 진짜 필요한 것:
- "이 법 바뀌면 우리 뭐 바꿔야 해?" (영향 요약, 1페이지)
- "언제까지 바꿔야 해?" (시행일 + 처벌 조항)
- "누가 서명해야 해?" (결재선)

신구조문대비표는 그 이후 단계 — 실제로는 **영향 요약 → 결재 → 신구조문대비표** 순서가 맞다. 현재 프로토타입은 3단계만 다룬다.

---

## Q4: KAIST MBA 수업 컨텍스트에서 RegulMate의 "Is AI Native?" 30% 점수를 극대화하려면?

단순히 AI를 쓰는 게 아니라 **"AI 없이는 불가능한 작업"** 을 보여줘야 한다.

현재 프로토타입의 AI-native 정도: **낮음** (규칙 기반 분류 + 하드코딩된 데이터)

진짜 AI-native가 되려면:
1. 실시간 법령 변경 감지 (관보 API or 법제처 API)
2. LLM 기반 신구조문대비표 초안 생성 (현재는 하드코딩)
3. 회사별 SOP 매핑 학습 (fine-tuning or RAG)

**Final demo까지 현실적으로 할 수 있는 것:** #1 (관보 RSS) + #2 (Claude API로 신구조문대비표 초안)

---

## Q5: 이 프로젝트에서 내가 가장 과소평가한 것은?

**한국어 법령 텍스트의 특수성.**

법령 텍스트에는:
- 한자 혼용 (제1항 第1項)
- 조문 번호 체계 (제12조제2항제1호가목)
- "다만, ~의 경우에는 그러하지 아니하다" 같은 부정 조건문
- 괄호 안 부연 설명이 법적 효력을 가짐

LLM이 이 텍스트를 처리할 때 자연어 이해와 법적 해석이 혼동될 위험이 크다.
**필요한 것:** 법령 텍스트 전처리 파이프라인 (조문 단위로 파싱, 부정 조건 분리, 번호 체계 정규화)

---

## Hidden insights summary

1. **진짜 경쟁자는 Excel이다.** 다른 SaaS가 아니라.
2. **신구조문대비표는 결과물이 아니라 중간 단계다.** 영향 요약 → 결재 → 신구조문대비표 순서.
3. **법령 텍스트 파싱이 기술적 핵심이다.** UI/UX가 아니라.
4. **B2B2B (법무법인 경유) 가 더 빠른 PMF 경로일 수 있다.**
5. **AI-native 증명 = 실시간 감지 + LLM 초안 생성.** 현재는 둘 다 없다.

## See also
- [[regulmate-project]]
- [[user-interview-kim-jihyun]]
- [[korean-regulation-landscape]]
