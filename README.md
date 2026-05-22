# RegulMate (formerly mentalcoach)

> 🚀 **데모 배포**: https://regulmate.vercel.app

이 프로젝트는 mentalcoach(마음코치)에서 **RegulMate(레귤메이트)** 로 피봇되었습니다.

## 📌 현재 진행 상황
- 팀원 각자 브랜치에서 [MANIFESTO](./MANIFESTO.md) 기반으로 개발 진행
- **데모데이에서 시연 후 피드백 반영하여 추가 개발 예정**

## 새로운 방향
- **RegulMate**: 사내 규정 컴플라이언스 자동화 SaaS
- 법령 개정 모니터링 → 사내 규정 영향 분석 → 개정안 초안 작성까지의 컴플라이언스 프로세스를 End-to-End 자동화
- **타겟 고객**: 컴플라이언스 의무는 있으나 전담 인력이 부족한 스타트업·중소·중견기업 규정 담당팀 (필요시 인사·노무, 안전 등으로 분야 세분화)

## 핵심 기능 (MVP)
| 기능 | 설명 |
|---|---|
| 📡 법령 개정 디텍팅 | 법령 개정 감지 → 영향받는 사내 규정 + 개정 필요 사유/법적 근거 자동 추출 |
| 📝 개정안 자동 생성 | 선택한 규정의 개정 사유 / 신구조문대비표 / 판례 교차검증 리포트 생성 |
| 🤖 컴플라이언스 챗봇 | 규정 + 판례를 엮은 실시간 행동 가이드 응답 |

## 기술 스택
- **Frontend/Backend**: Next.js 15, TypeScript
- **AI**: Google Genkit + Gemini, 국가법령정보센터 연동(Korea Law MCP)
- **DB/Auth**: Firebase (Firestore)
- **배포**: Vercel

## 코드 위치
- **최신 통합 코드**: `main` 브랜치 (현재 데모 배포 버전)
- **팀원별 개발 브랜치**: `feature/*` (각자 기능 개발 진행 예정)
- **기존 mentalcoach 코드**: [`archive/mentalcoach`](https://github.com/jycho91/mentalcoach/tree/archive/mentalcoach) 브랜치에 보존

## 기획 문서

| 문서 | 내용 |
|---|---|
| [MANIFESTO.md](./MANIFESTO.md) | 프로젝트 비전 / One-liner / 핵심 가치 |
| [PROPOSAL.md](./PROPOSAL.md) | 상세 기획서 (문제 정의 / 솔루션 / 비즈니스 모델) |
| [PREMORTEM.md](./PREMORTEM.md) | 사전부검 — 실패 시나리오 분석 |
| [WHYTREE.md](./WHYTREE.md) | Why-tree — 문제 본질 분해 |
