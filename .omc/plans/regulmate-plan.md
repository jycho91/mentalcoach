# ReguMate 구현 계획 (RALPLAN-DR)

> 작성일: 2026-06-06 | 브랜치: cksung9009-mainbranch | 상태: pending approval
> Planner → Architect(ITERATE) → Critic(ITERATE) → 최종 수정 완료

---

## 1. RALPLAN-DR 요약

### 설계 원칙

**P1 — 재현율 우선 (Zero-Miss Recall) — 커버리지 불변식으로 구현**
스캔 누락률 0%는 통계적 KPI가 아닌 **코드 수준 불변식**으로 구현한다. 모든 입력 규정 ID가 출력에 반드시 등장해야 하며, 영향 없는 규정은 `NONE` 레벨로 포함한다 (기존 프롬프트의 "제외" 지시 제거). Flow 완료 후 `input.regulations.map(r=>r.id) ⊆ output ids` 를 코드로 단언(assert)하고, 누락 시 에러 toast + 콘솔 하드 에러로 처리한다.

> **⚠️ 기존 코드 수정 필수:** `auto-compliance-scan-flow.ts:104` "문제가 없는 규정은 결과에서 제외하십시오", `detect-law-impact-flow.ts:100` "영향받지 않는 규정은 결과에서 제외하십시오" — 두 지시를 제거하고 NONE 포함 방식으로 교체.

**P2 — 법령 원문 불변**
AI flow는 법령 텍스트를 요약/변형하지 않고 `sourceArticle`에 원문 그대로 인용한다.

**P3 — 점진적 통합 (기존 플로우 불변)**
미구현 기능은 기존 flow에 영향 없이 독립 파일로 추가한다. 특히 `GenerateRegulationDraftOutputSchema`는 수정하지 않는다. `PrecedentReport` 타입은 `verify-with-precedents-flow.ts`에 정의하고, 컴포넌트/컨텍스트 레이어에서 조합한다.

**P4 — 브라우저 메모리 격리**
모든 데이터는 `SessionContext`에만 존재한다. API key는 `'use server'` 안에서만 참조된다. Phase 4 배치는 `sessionStorage`에 규정별 체크포인트를 저장해 복원력을 확보한다.

**P5 — 초안 책임 분리**
AI 출력에는 항상 "AI 생성 초안 — 법무 담당자 검토 필수" 레이블 포함. 판례 검증 리포트에는 `disclaimer: string` 구조화 필드로 "법적 자문 아님" 면책 문구를 포함한다.

---

### 핵심 결정 드라이버

**DD1 — law.go.kr 연동 방식**
별도 MCP 서버 구축보다 `src/lib/law-go-kr-client.ts` (순수 REST 클라이언트) + 얇은 Genkit tool 래퍼 구조 채택. 발표 일정에 현실적이며 추후 MCP 서버로 이전 시 클라이언트 재사용 가능.

**DD2 — 판례 검증 통합 구조**
개정안 생성 후 "판례 검증" 버튼을 별도로 제공하는 2-step 방식. 재사용성·비용 절감에 유리하며, 기존 `revision-drafter.tsx`의 탭/이터레이션 패턴과 일관성 유지.

**DD3 — 신규 기능 UI 진입점**
현재 6개 nav item에 2개 추가 시 과밀. "핵심 모듈" / "부수 모듈" 섹션 헤더로 분리 (`Separator` 컴포넌트 활용).

---

### 구현 옵션

#### Option A — client 분리 + Genkit Tool 래퍼 ✅ 채택

```
src/lib/law-go-kr-client.ts (순수 REST)
    ↓ 래핑
src/ai/tools/law-go-kr-tool.ts (Genkit defineTool)
    ↓ 사용
'use server' Genkit flows → law.go.kr REST API
```

**장점:** 추가 서버 불필요, 기존 패턴 일관성, MCP 이전 시 client 재사용, 독립 테스트 가능
**단점:** API 키 발급 대기 → mock fallback으로 해결

#### Option B — 전용 MCP 서버 구축 (기각)
표준 프로토콜, 장기 아키텍처에 유리. 발표 일정 대비 구현 기간 과다.

#### Option C — AI 내부 지식 Fallback (임시)
API 키 발급 전 Option A의 fallback으로만 활용. 단독 사용 시 최신 판례 미반영 + 스펙 미충족.

---

## 2. 단계별 구현 계획

### Phase 0: 환경 준비 (~2시간)

- law.go.kr Open API 신청 (판례 검색 `target=prec`, 법령 조문 `target=lsScJo`)
- `.env.local`에 `LAW_GO_KR_API_KEY`, `LAW_GO_KR_API_URL` 추가

### Phase 1: law.go.kr Genkit Tool (Day 1~2)

**신규:** `src/lib/law-go-kr-client.ts` (순수 REST 클라이언트, Genkit 의존 없음)
- `searchPrecedents(keyword: string, lawName: string): Promise<Precedent[]>` 함수
- law.go.kr REST 호출 (`?OC=키&target=prec&type=JSON&query=키워드&display=5`)
- 응답 파싱: `판례정보 → { caseNumber, caseName, summary, relatedLaws, verdict }`
- 오류 처리, mock fallback (API key 미설정 시 명시적 fallback 메시지 반환)

**신규:** `src/ai/tools/law-go-kr-tool.ts` (얇은 Genkit 래퍼)
- `ai.defineTool()`로 `law-go-kr-client.ts` 래핑
- Zod 스키마로 I/O 정의

### Phase 1.5: 커버리지 불변식 적용 (P1 핵심 — Day 2)

**수정:** `src/ai/flows/auto-compliance-scan-flow.ts`
- `line 104` "문제가 없는 규정은 결과에서 제외하십시오" 지시 제거
- 프롬프트 교체: "모든 입력 규정에 대해 HIGH/MEDIUM/LOW/NONE 중 하나를 반드시 반환할 것. 영향 없는 규정은 NONE으로 포함."
- 출력 enum에 `'NONE'` 추가
- Flow 반환 직전 단언: `inputIds.every(id => outputIds.has(id))` → false이면 에러 toast + `console.error`

**수정:** `src/ai/flows/detect-law-impact-flow.ts`
- `line 100` "영향받지 않는 규정은 결과에서 제외하십시오" 지시 제거 (동일 방식 적용)
- `ImpactLevel` enum에 `'NONE'` 추가

**수정:** `src/contexts/session-context.tsx`
- `SessionScanImpact.impactLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'` — NONE 추가
- `impactedCount` 계산: `filter(r => r.impactLevel !== 'NONE').length` (NONE 제외)

**수정:** `src/components/law-impact-detector.tsx`
- `impactedCount` 배지: NONE 제외된 수치 표시
- `getImpactLabel` / 배지 렌더: NONE 전용 라벨 "영향 없음" 추가
- NONE 항목은 별도 섹션("영향 없는 규정 N건")으로 표시, 기존 영향 목록과 분리

### Phase 2: 1-B 판례 교차검증 Flow (Day 2~3)

**신규:** `src/ai/flows/verify-with-precedents-flow.ts`
- 입력: `{ draftContent: string, relatedLawArticles: string[], regulationName: string }`
- `PrecedentReport` 타입 정의 (이 파일에서 export):
  ```ts
  { supportingPrecedents, conflictingPrecedents, legalRiskAssessment: 'LOW'|'MEDIUM'|'HIGH', disclaimer }
  ```
- `searchPrecedents` tool 사용하여 판례 검색

**수정:** `src/contexts/session-context.tsx`
- `precedentReports: Record<draftId, PrecedentReport>` 상태 추가
- `setPrecedentReport(draftId, report)` 액션 추가

**수정:** `src/components/revision-drafter.tsx`
- "판례 교차검증" 버튼 추가 (개정안 결과 탭 하단)
- 클릭 시 `verifyWithPrecedentsFlow` 호출, 결과 `setPrecedentReport`로 저장
- 지지 판례 카드 + 충돌 판례 카드 + 리스크 배지 표시
- `handleDownload` 시그니처 수정: `draftId`를 받아 `precedentReports[draftId]` 조회 후 리포트 섹션 직렬화 포함

> **P3 준수:** `generate-regulation-draft-flow.ts` 출력 스키마 수정 없음. PrecedentReport는 별도 상태(`precedentReports`)로 관리.

### Phase 3: 6번 챗봇 판례 연동 (Day 3~4)

**수정:** `src/ai/flows/answer-compliance-question.ts`
- `searchPrecedents` tool 등록
- `AnswerComplianceQuestionOutputSchema`에 `precedentCitations?: PrecedentCitation[]` 추가

**수정:** `src/components/compliance-chatbot.tsx`
- AI 메시지 버블 하단에 "관련 판례" 접이식 섹션 추가 (판례 없으면 미표시)

### Phase 4: 4번 경영 방향성 정렬 (Day 4~5)

**신규:** `src/ai/flows/align-policy-commitment-flow.ts`
- 정책 커미트먼트 카탈로그: ESG, 다양성·포용성, 안전 우선, 윤리경영, 디지털 전환
- 입력: `{ selectedCommitments: string[], regulations: RegulationInfo[] }`
- 출력: 규정별 신구조문대비표 + 개정 사유 (순차 호출, rate limit 회피)

**신규:** `src/components/policy-alignment.tsx`
- 정책 커미트먼트 체크박스 선택 UI
- 일괄 생성 버튼 (미선택 시 비활성화)
- 규정별 진행 상태 UI (완료/진행 중/대기)
- `sessionStorage`에 규정별 완료 상태 체크포인트 저장 (새로고침 후 부분 완료 복원)

**수정:** `src/app/page.tsx` — `View` 타입에 `'policy-alignment'` 추가, 부수 모듈 섹션 nav item 추가

### Phase 5: 5번 충돌 탐지 (Day 5~6)

**신규:** `src/ai/flows/detect-regulation-conflicts-flow.ts`
- 탐지 유형: `'LOGIC' | 'NUMERIC' | 'SEMANTIC'`
- 출력: `{ conflicts: ConflictItem[], summary: string, scanTimestamp: string }`
- `ConflictItem`: `{ type, regulationAId, regulationAName, regulationBId, regulationBName, conflictingTexts: {a,b}, description, arbitration, severity }`
- few-shot 예시 포함 (타입별 1건씩)

**신규:** `src/components/conflict-detector.tsx`
- 충돌 유형별 필터 탭 (전체/논리 충돌/수치 비일관성/의미 중복)
- 충돌 카드: 규정A ↔ 규정B, 충돌 조항 원문, 중재안
- 규정 1개 상태에서 "2개 이상 필요" 안내

**수정:** `src/contexts/session-context.tsx` — `conflictScans: ConflictScan[]` 추가
**수정:** `src/app/page.tsx` — `View` 타입에 `'conflict-detector'` 추가, nav item 추가

---

## 3. 수용 기준 (Acceptance Criteria)

### AC-1A (스캔 커버리지 불변식)
- [ ] 규정 N개 업로드 후 스캔 실행 → 출력에 N개 규정 ID 모두 존재 (HIGH/MEDIUM/LOW/NONE 중 하나)
- [ ] 법령과 무관한 규정은 `NONE` 레벨로 출력에 포함됨
- [ ] 규정 0개 상태에서 스캔 → 오류 toast, API 미호출
- [ ] 입력 ID 중 출력에서 누락된 ID가 있으면 → 에러 toast + 콘솔 하드 에러 (`input ⊆ output` 불변식)
- [ ] NONE 항목은 메인 영향 목록과 별도 섹션으로 표시됨

### AC-1B (판례 검증)
- [ ] 개정안 생성 후 "판례 교차검증" 버튼 클릭 → 최소 1건 판례 포함
- [ ] `legalRiskAssessment` 값 반드시 존재
- [ ] 개정안 다운로드 파일에 판례 리포트 섹션 포함
- [ ] API key 미설정 시 fallback 메시지 표시 + 정상 동작

### AC-6 (챗봇 판례 연동)
- [ ] "연장근로 한도 기준은?" → 사내 규정 인용 + 판례 인용 모두 포함
- [ ] 규정 0개 상태 → 안내 메시지 반환

### AC-4 (경영 방향성 정렬)
- [ ] ESG 선택 + 생성 → N개 규정 모두 개정안 생성 (N ≥ 1)
- [ ] 커미트먼트 미선택 시 생성 버튼 비활성화
- [ ] 배치 도중 새로고침 → 완료된 규정 상태 복원됨 (sessionStorage)
- [ ] 일괄 다운로드 → 모든 완료 규정 신구조문대비표 포함

### AC-5 (충돌 탐지)
- [ ] 수치 충돌 규정 2개 업로드 → `NUMERIC` 충돌 최소 1건
- [ ] 의미 중복 규정 2개 업로드 → `SEMANTIC` 충돌 최소 1건
- [ ] 모든 충돌 항목에 `arbitration` 필드 존재
- [ ] 규정 1개만 있을 시 → "2개 이상 필요" 안내 표시

### 검증 게이트 (각 Phase 완료 시)
- `npm run typecheck` 통과 (Phase 1.5 완료 후 특히 중요 — NONE 타입 전파 검증)
- `npm run lint` 통과
- `npm run build` 통과

---

## 4. 리스크 및 의존성

| 리스크 | 영향도 | 완화 방안 |
|---|---|---|
| law.go.kr API 키 발급 지연 | 높음 | mock fallback으로 Phase 1 먼저 구현, 키 발급 후 환경변수만 추가 |
| Phase 4 배치 도중 브라우저 새로고침 | 중간 | `sessionStorage` 체크포인트 + 규정별 진행 UI (부분 완료 명시) |
| 판례 검색 결과 품질 | 중간 | 법령 조문명 + 규정명 조합 키워드로 관련도 향상 |
| Gemini 할당량 초과 | 중간 | Phase 4 일괄 개정안은 규정당 순차 호출 (병렬 X) |
| AI 충돌 탐지 오탐/미탐 | 중간 | few-shot 예시 + "AI 분석 결과, 담당자 최종 판단 필요" 면책 문구 |
| NONE 타입 추가 시 컴파일 에러 | 중간 | Phase 1.5 완료 직후 `npm run typecheck` 게이트 |
| nav item 과밀 (8개) | 낮음 | 핵심/부수 섹션 `Separator` 분리 |

### 의존성 그래프

```
[Phase 0] API 키 신청
    ↓
[Phase 1] law-go-kr-client.ts + tool
    ↓
[Phase 1.5] 커버리지 불변식 (P1 핵심)
    ↓               ↓
[Phase 2]       [Phase 3]
1-B 판례 검증   챗봇 판례 연동

[Phase 4] 경영 방향성 정렬  ← Phase 1과 독립 (병렬 가능)
[Phase 5] 충돌 탐지        ← Phase 1과 독립 (병렬 가능)
```

---

## 5. 파일 변경 요약

### 신규 생성
| 파일 | Phase | 설명 |
|---|---|---|
| `src/lib/law-go-kr-client.ts` | 1 | 순수 REST 클라이언트 |
| `src/ai/tools/law-go-kr-tool.ts` | 1 | Genkit tool 래퍼 |
| `src/ai/flows/verify-with-precedents-flow.ts` | 2 | 판례 교차검증 flow + PrecedentReport 타입 |
| `src/ai/flows/align-policy-commitment-flow.ts` | 4 | 경영 방향성 정렬 flow |
| `src/ai/flows/detect-regulation-conflicts-flow.ts` | 5 | 규정 간 충돌 탐지 flow |
| `src/components/policy-alignment.tsx` | 4 | 경영 방향성 정렬 UI |
| `src/components/conflict-detector.tsx` | 5 | 충돌 탐지 UI |

### 수정
| 파일 | Phase | 변경 내용 |
|---|---|---|
| `src/ai/flows/auto-compliance-scan-flow.ts` | 1.5 | "제외" 지시 제거, NONE enum 추가, 커버리지 단언 |
| `src/ai/flows/detect-law-impact-flow.ts` | 1.5 | 동일: "제외" 지시 제거, NONE 추가, 단언 |
| `src/contexts/session-context.tsx` | 1.5, 2, 5 | NONE 타입, `precedentReports`, `conflictScans` 추가 |
| `src/components/law-impact-detector.tsx` | 1.5 | NONE 배지/라벨, impactedCount 분리 |
| `src/ai/flows/answer-compliance-question.ts` | 3 | tool 통합, `precedentCitations?` 출력 추가 |
| `src/components/revision-drafter.tsx` | 2 | 판례 검증 버튼, 결과 섹션, handleDownload 수정 |
| `src/components/compliance-chatbot.tsx` | 3 | 판례 인용 접이식 섹션 |
| `src/app/page.tsx` | 4, 5 | View 타입, nav items, 섹션 분리 |
| `.env.local` | 0 | API key 추가 |

> **수정하지 않는 파일:** `src/ai/flows/generate-regulation-draft-flow.ts` (P3 준수)
