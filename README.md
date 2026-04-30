# RegulMate (레귤메이트)

> **법령이 바뀌면, 우리 회사 규정이 스스로 바뀐다.**
> 실시간 법령-사내규정 동기화 컴플라이언스 자동화 SaaS — P0 MVP

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)](https://www.typescriptlang.org)
[![Genkit](https://img.shields.io/badge/Genkit-1.28-4285F4)](https://firebase.google.com/docs/genkit)
[![Firebase](https://img.shields.io/badge/Firebase-AppHosting-FFCA28)](https://firebase.google.com/docs/app-hosting)

---

## 👋 팀원에게 — 가장 빠르게 둘러보는 법

> **`demo.html` 파일 하나만 더블클릭하면 됩니다.** 설치도, 계정도, 터미널도 필요 없습니다.

### A. 로컬에서 바로 열기 (30초)

1. 이 레포를 다운로드 또는 클론
2. 루트 폴더의 **[`demo.html`](./demo.html)** 더블클릭
3. 기본 브라우저(Chrome/Edge/Safari 무엇이든)에서 그대로 실행

작동 흐름:

- 사내 규정 10건 카드 그리드
- 우상단 **`최근 법령 개정 스캔`** 버튼 클릭
- 영향 규정 3건이 매칭됨 (취업규칙·개인정보처리방침·안전보건관리규정)
- 카드의 **`개정안 추천`** 클릭
- 결재 패키지 4탭 (개정 사유 · 주요 골자 · 신구조문대비표 · 판례 검증)

> Next.js 앱과 동일한 mock 데이터를 사용해 동일한 사용자 흐름을 그대로 재현합니다. 인터넷 연결만 있으면 (Tailwind/Pretendard/Lucide CDN 로드용) 어디서든 동작합니다.

### B. 팀에게 공유 링크로 보내기 (60초)

`demo.html`을 공개 URL로 만들고 싶을 때 — 가장 빠른 길:

#### Netlify Drop (계정 없이도 즉시 배포)

1. https://app.netlify.com/drop 접속
2. **`demo.html` 파일을 브라우저 창에 드래그**
3. `https://[랜덤이름].netlify.app` 형태의 공개 URL이 즉시 발급
4. 팀 슬랙·카톡에 그 URL을 공유

> 무료, 가입 불필요, HTTPS 자동. 발표 직전에도 30초면 끝.

#### GitHub Pages (레포 공개 시)

레포가 GitHub에 올라가 있고 public이면:

1. 레포 → Settings → Pages
2. Source: `main` 브랜치 / root
3. 저장하면 `https://[username].github.io/[repo]/demo.html`로 자동 공개

### C. Next.js 앱 전체를 공개 URL로 (스캔 API까지 포함)

`demo.html`은 단일 정적 파일이지만, Next.js 앱은 API 라우트와 Genkit 통합을 모두 갖추고 있습니다. 본격 시연용은 아래 ↓ "🌐 배포 — Firebase App Hosting" 섹션 참고.

---

## 🎯 MVP 데모 흐름 (4분)

1. **대시보드** — 사내 규정 10건 사전 로드 (취업규칙, 개인정보처리방침, 안전보건관리규정, …)
2. **`최근 법령 개정 스캔` 클릭** — Korea Law MCP가 국가법령정보센터 폴링 (라이브 또는 캐시)
3. **영향 규정 3건 자동 매칭** — 임베딩 유사도 + 규정별 개정 필요 사유와 근거 법 조문
4. **규정 선택 → `개정안 추천`** — Step 2 진입
5. **결재용 패키지 4종 출력**
   - 📄 개정 사유서 (서술형)
   - 📋 주요 골자 (불릿)
   - 📊 신구조문대비표 (현행 ↔ 개정안)
   - ⚖️ 판례 교차 검증 (대법원 판례 DB)

---

## 🏗️ 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | Next.js 15.5.9 (App Router), React 19, TypeScript strict |
| UI | Tailwind CSS, shadcn/ui (new-york), Radix UI, Lucide |
| AI | Genkit 1.28 + Google Gemini 2.5 Flash |
| 백엔드 | Firebase (Auth + Firestore) — 자체 서버 없음 |
| 인증 | Firebase Anonymous Auth (자동 로그인) |
| 폼 검증 | react-hook-form + Zod |
| PDF 파싱 | pdfjs-dist 4.10 (브라우저 사이드) |
| 배포 | Firebase App Hosting (asia-northeast3) / Vercel |

---

## 🚀 빠른 시작

> **그냥 둘러보고 싶다면** → 위 "👋 팀원에게" 섹션의 `demo.html`로.
> **개발자로서 코드를 만지고 싶다면** ↓ 아래 명령어로.

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 (선택) — 없어도 mock 데이터로 모두 돌아갑니다
cp .env.local.example .env.local

# 3. 개발 서버
npm run dev
# → http://localhost:3000
```

> 🔑 **Demo Mode**: `.env.local`이 없거나 `NEXT_PUBLIC_DEMO_MODE=1`이면
> Genkit/Gemini 호출 없이 사전 생성된 mock 패키지를 그대로 반환합니다.
> Demo Day 시나리오가 API 키 없이도 그대로 돌아가도록 설계되었습니다.

---

## 🔑 환경변수

`.env.local.example` 참조. 모두 **선택**입니다:

| 키 | 용도 |
|---|---|
| `GOOGLE_GENAI_API_KEY` | Gemini 2.5 Flash 호출 (없으면 mock) |
| `NEXT_PUBLIC_FIREBASE_*` | Firestore + Anonymous Auth (없으면 in-memory) |
| `KOREA_LAW_API_KEY` | open.law.go.kr API (1-2일 발급, 없으면 cached fixtures) |
| `NEXT_PUBLIC_DEMO_MODE` | `"1"`이면 강제로 mock 모드 |

---

## 🗂️ 프로젝트 구조

```
.
├── src/
│   ├── app/
│   │   ├── layout.tsx              # 루트 레이아웃 + AuthProvider
│   │   ├── page.tsx                # 대시보드 (사내 규정 10건 + 스캔 버튼)
│   │   ├── scan/page.tsx           # 스캔 결과 (영향 규정 + 사유)
│   │   ├── amendments/[ruleId]/    # 결재 패키지 4종 탭 뷰
│   │   ├── api/
│   │   │   ├── scan/route.ts       # POST /api/scan
│   │   │   └── amendments/[ruleId]/route.ts
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                     # shadcn/ui 베이스
│   │   ├── auth-provider.tsx       # Firebase Anonymous Auth wrapper
│   │   ├── site-header.tsx
│   │   ├── scan-runner.tsx         # 클라이언트 스캔 액션
│   │   └── diff-table.tsx          # 신구조문대비표 컴포넌트
│   └── lib/
│       ├── types.ts                # Zod 스키마 + 도메인 타입
│       ├── mock-data.ts            # 10 rules + 3 law changes + 3 amendments
│       ├── utils.ts                # cn(), 날짜 포맷
│       ├── firebase/client.ts      # 안전한 Firebase 초기화
│       └── genkit/
│           ├── index.ts            # Genkit + Gemini 설정
│           └── flows/
│               ├── match-rules.ts  # Step 1: 디텍팅
│               └── draft-amendment.ts  # Step 2: 개정안 + 판례
├── demo.html                       # 🎯 팀원용 단일파일 인터랙티브 데모 (설치 불필요)
├── public/
│   └── marketing.html              # 정적 마케팅 페이지 (별도 SLC 페이지)
├── firebase.json / apphosting.yaml / firestore.rules
└── components.json                 # shadcn/ui 설정
```

---

## 🧠 설계 원칙

> **AI가 알아서 다 바꾸는 게 아니라, AI가 찾아주고 → 사람이 선택하고 → AI가 작성한다.**

- 데이터 매칭은 자동 (임베딩)
- 어떤 규정을 손볼지는 사람이 결정 (Step 1 → Step 2 사이의 사용자 선택)
- 결재 패키지는 AI가 초안, 결재는 사람이 승인
- 마지막 결정은 항상 사람의 손에 — 법무·준법감시 실무 신뢰선 유지

---

## 🌐 배포 — Firebase App Hosting

```bash
# 1. Firebase CLI
npm i -g firebase-tools
firebase login

# 2. 프로젝트 연결
firebase use --add

# 3. App Hosting 백엔드 생성 (asia-northeast3)
firebase apphosting:backends:create

# 4. Secret 등록 (Gemini key)
firebase apphosting:secrets:set GOOGLE_GENAI_API_KEY

# 5. 배포 (git push만으로 자동 빌드/배포)
git push
```

`apphosting.yaml`에서 환경변수, secret, autoscale 정책을 관리합니다.

### Vercel 대안

```bash
npm i -g vercel
vercel
# 환경변수는 dashboard에서 설정
```

---

## 📋 P0 / P1 / P2 로드맵

| 우선순위 | 기능 | 상태 |
|---|---|---|
| **P0** | 법령 개정 디텍팅 (스캔 모드) | ✅ MVP |
| **P0** | 개정안 자동 생성 + 판례 검증 | ✅ MVP (mock) |
| **P0.5** | 연쇄 영향 탐지 (도미노 체크) | 다음 |
| **P1** | 내부 규정 간 충돌 탐지 | 후순위 |
| **P1** | 통합 컴플라이언스 챗봇 | 후순위 |
| **P2** | 경영 방향성 기반 일괄 정렬 | 장기 |

---

## 📚 기획 문서

| 문서 | 내용 |
|---|---|
| [MANIFESTO.md](./MANIFESTO.md) | 비전 / One-liner / 핵심 가치 |
| [PROPOSAL.md](./PROPOSAL.md) | 상세 기획서 |
| [PREMORTEM.md](./PREMORTEM.md) | 사전부검 |
| [WHYTREE.md](./WHYTREE.md) | Why-tree 문제 분해 |
| [design-office-hours-2026-04-29.md](./design-office-hours-2026-04-29.md) | 데모 설계 노트 |

---

## ⚠️ 주의 사항 (PREMORTEM 요약)

- 라이브 스캔 데모 실패 → cached fallback 모드 항상 준비 (`NEXT_PUBLIC_DEMO_MODE=1`)
- "ChatGPT로 안 되나?" → 국가법령정보센터 어제 변경분을 ChatGPT는 모름. RegulMate는 안다.
- 매칭 품질 → MVP의 3개 시나리오는 hand-tuned, scale-out은 P0 후속

---

*RegulMate · MBA Term Project — 2026*
