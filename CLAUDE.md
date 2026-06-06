# Project: ReguMate

## Overview
AI 기반 법령 인용 검증 및 규정 준수 지원 서비스

## Tech Stack
- Language: TypeScript
- Framework: Next.js 15 (App Router)
- Database: Firebase (Firestore)
- AI: Genkit (Google GenAI)
- UI: Radix UI + Tailwind CSS

## Project Structure
```
src/
├── ai/            # Genkit AI 흐름 및 프롬프트
├── app/           # Next.js App Router 페이지
├── components/    # UI 컴포넌트
├── contexts/      # React Context
├── firebase/      # Firebase 설정 및 클라이언트
├── hooks/         # 커스텀 훅
└── lib/           # 유틸리티 함수
```

## Code Style Rules
- 커밋 메시지는 한글로 작성
- 모든 함수에 JSDoc 주석 추가
- console.log 대신 logger 사용
- 테스트 코드 필수 작성

## Commands
- `npm run dev` - 개발 서버 실행 (port 3000)
- `npm run build` - 프로덕션 빌드
- `npm run lint` - ESLint 검사
- `npm run typecheck` - TypeScript 타입 검사
- `npm run genkit:dev` - Genkit AI 개발 서버 실행

## Important Notes
- 한국 법령 원문은 반드시 그대로 복사 (항번호 혼동/단서 누락 방지)
- AI 인용 결과는 실제 법령과 대조 검증 후 커밋
- 검증 실패 시 상태를 명확히 표기 (검증 실패 명확 표기)
- main 브랜치에 실험적 변경사항 직접 적용 금지

## Branch: cksung9009-mainbranch
cksung9009의 메인 작업 브랜치. 안정성 우선.
