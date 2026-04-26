# 마음 코치 프로젝트

## 기술 스택
- HTML + CSS + JavaScript (단일 페이지 앱)
- AI API: Google Gemini API (무료 티어 활용)
- localStorage로 데이터 저장
- 서버 없음, 프론트엔드만
- 배포: GitHub Pages 또는 Vercel (무료)

## 참고 문서
- 개발 브리핑: docs/마음코치_개발브리핑_v2.md
- 베이스 HTML (팀원 초안): index_team.html

## 핵심 규칙 (반드시 지킬 것)
- API 키를 코드에 하드코딩 금지 — 설정 화면에서 입력받아 localStorage 저장
- 모바일 퍼스트 (최대 너비 680px)

## API 구조 (반드시 지킬 것)
- IS_TEST_MODE 변수로 테스트/실제 분기 — 모든 AI 호출 함수에 적용
- IS_TEST_MODE = true: 가짜 응답 반환 (API 키 없어도 전체 동작)
- IS_TEST_MODE = false: 실제 Gemini API 호출
- 설정 화면에서 토글로 전환 가능
- AI 호출이 필요한 기능 목록:
  1. 마음 대화 (공감/코칭 모드) → Gemini 텍스트
  2. 주간 리포트 생성 → Gemini 텍스트
  3. 심화 리포트 생성 → Gemini 텍스트
  4. 심층 분석 생성 → Gemini 텍스트
  5. 음성 입력 → Web Speech API (브라우저 내장, API 키 불필요)
- 각 함수는 callGemini() 하나로 통일해서 나중에 API 교체 쉽게

## Git
- 기능 완성되면 커밋할지 물어볼 것
- 커밋과 푸시는 절대 한 번에 하지 말 것 — 반드시 따로 따로 승인받을 것
- 커밋 승인 후 → 푸시할지 별도로 물어볼 것
- 커밋 메시지는 한국어로 작성할 것
