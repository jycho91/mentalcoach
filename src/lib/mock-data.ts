/**
 * RegulMate 데모 mock 데이터
 *
 * - 10개 사내 규정 (design doc Demo Data Setup 항목 그대로)
 * - 3개 법령 개정 이벤트 (실제 최근 개정 흐름을 단순화)
 * - 3개 사전 생성 개정안 패키지 (Step 2 출력)
 *
 * API 키가 없는 상태에서도 Demo Day 시나리오가 그대로 돌아가도록 설계.
 */

import type {
  AffectedRule,
  AmendmentPackage,
  LawChange,
  Rule,
  Scan,
} from "./types";

// ──────────────────────────────────────────────
// 1. 사내 규정 10건
// ──────────────────────────────────────────────

export const MOCK_RULES: Rule[] = [
  {
    id: "rule-employment",
    title: "취업규칙",
    category: "HR",
    ownerDept: "인사팀",
    lastRevisedAt: "2024-03-15",
    summary: "근로시간, 휴가, 임금, 복무, 안전보건, 징계 등 근로기준법에 따른 필수 기재사항을 규정.",
    articles: [
      {
        number: "제12조",
        title: "근로시간",
        body: "사원의 1주 근로시간은 휴게시간을 제외하고 40시간을 원칙으로 하며, 1일 8시간을 초과하지 아니한다. 다만 당사자 합의에 따라 1주 12시간을 한도로 연장근로를 할 수 있다.",
      },
      {
        number: "제18조",
        title: "연차유급휴가",
        body: "1년간 80% 이상 출근한 사원에게는 15일의 유급휴가를 부여한다.",
      },
      {
        number: "제35조",
        title: "징계의 종류",
        body: "징계는 견책, 감봉, 정직, 강등, 해고로 구분한다.",
      },
    ],
  },
  {
    id: "rule-privacy",
    title: "개인정보처리방침",
    category: "PRIVACY",
    ownerDept: "법무팀",
    lastRevisedAt: "2024-09-01",
    summary: "개인정보 수집·이용·제공·보유기간·파기 절차를 정한 회사 표준 방침.",
    articles: [
      {
        number: "제5조",
        title: "수집 항목",
        body: "회사는 채용·인사 관리 목적으로 성명, 생년월일, 연락처, 이메일, 학력 정보를 수집한다.",
      },
      {
        number: "제8조",
        title: "보유 및 이용기간",
        body: "수집된 개인정보는 수집·이용 목적이 달성된 후에는 지체 없이 파기한다. 단, 관계 법령에 따라 보존할 필요가 있는 경우 5년간 보존한다.",
      },
    ],
  },
  {
    id: "rule-safety",
    title: "안전보건관리규정",
    category: "SAFETY",
    ownerDept: "안전관리팀",
    lastRevisedAt: "2024-01-20",
    summary: "산업안전보건법·중대재해처벌법에 따른 안전보건관리체계, 위험성 평가, 사고 대응 절차.",
    articles: [
      {
        number: "제6조",
        title: "안전보건관리책임자의 직무",
        body: "안전보건관리책임자는 사업장의 안전보건에 관한 사항을 총괄·관리하며, 분기 1회 이상 안전점검을 실시한다.",
      },
      {
        number: "제14조",
        title: "위험성 평가",
        body: "회사는 연 1회 이상 위험성 평가를 실시하고 그 결과를 기록·보존한다.",
      },
    ],
  },
  {
    id: "rule-security",
    title: "보안규정",
    category: "SECURITY",
    ownerDept: "정보보안팀",
    lastRevisedAt: "2023-11-10",
    summary: "출입통제, 문서보안, 외부 반출 통제 등 물리·문서 보안 절차.",
    articles: [
      { number: "제3조", title: "보안등급", body: "회사 정보는 1급(극비), 2급(기밀), 3급(일반)으로 구분한다." },
      { number: "제9조", title: "외부 반출", body: "기밀 이상 등급 자료는 보안책임자 승인 없이 외부로 반출할 수 없다." },
    ],
  },
  {
    id: "rule-conduct",
    title: "복무규정",
    category: "HR",
    ownerDept: "인사팀",
    lastRevisedAt: "2024-02-05",
    summary: "출퇴근, 휴가 신청, 외근, 재택근무 등 일상 복무에 관한 규정.",
    articles: [
      { number: "제4조", title: "근무시간 및 출퇴근", body: "근무시간은 09:00부터 18:00까지로 하며, 휴게시간은 12:00부터 13:00까지 1시간으로 한다." },
      { number: "제11조", title: "재택근무", body: "재택근무는 부서장 승인을 받아 주 2일 이내에서 실시할 수 있다." },
    ],
  },
  {
    id: "rule-compensation",
    title: "연봉계약 가이드라인",
    category: "HR",
    ownerDept: "보상팀",
    lastRevisedAt: "2024-12-01",
    summary: "연봉 산정, 인센티브, 복리후생, 퇴직금의 기본 원칙.",
    articles: [
      { number: "제2조", title: "연봉 구성", body: "연봉은 기본급, 직책수당, 성과급으로 구성한다." },
      { number: "제7조", title: "성과급", body: "성과급은 회사 영업이익과 개인 KPI를 종합 평가하여 연 1회 지급한다." },
    ],
  },
  {
    id: "rule-discipline",
    title: "징계규정",
    category: "HR",
    ownerDept: "인사팀",
    lastRevisedAt: "2023-08-22",
    summary: "징계 사유, 절차, 양정 기준 및 재심 절차.",
    articles: [
      { number: "제7조", title: "징계 사유", body: "사원이 회사 규정을 위반하거나 직무를 태만히 한 경우 징계할 수 있다." },
      { number: "제13조", title: "징계위원회", body: "징계위원회는 위원장 1인을 포함한 5인 이내로 구성한다." },
    ],
  },
  {
    id: "rule-severance",
    title: "퇴직금 규정",
    category: "FINANCE",
    ownerDept: "재무팀",
    lastRevisedAt: "2024-04-18",
    summary: "퇴직금 산정, 지급, DB/DC 운용 기준.",
    articles: [
      { number: "제3조", title: "산정 기준", body: "퇴직금은 계속근로기간 1년에 대하여 30일분 이상의 평균임금을 지급한다." },
    ],
  },
  {
    id: "rule-info-security",
    title: "정보보안 규정",
    category: "SECURITY",
    ownerDept: "정보보안팀",
    lastRevisedAt: "2024-06-30",
    summary: "정보자산 분류, 접근통제, 암호화, 사고 대응 등 정보보안 기준.",
    articles: [
      { number: "제5조", title: "접근통제", body: "정보자산에 대한 접근권한은 업무수행에 필요한 최소한으로 부여한다." },
      { number: "제17조", title: "보안사고 신고", body: "보안사고를 인지한 사원은 즉시 정보보안책임자에게 신고하여야 한다." },
    ],
  },
  {
    id: "rule-subcontract",
    title: "하도급 관리 규정",
    category: "PROCUREMENT",
    ownerDept: "구매팀",
    lastRevisedAt: "2023-10-12",
    summary: "수급사업자 선정, 계약, 대금 지급, 분쟁 처리 등 하도급법 준수 절차.",
    articles: [
      { number: "제6조", title: "선정 기준", body: "수급사업자 선정 시 가격, 품질, 납기, 재무건전성을 종합 평가한다." },
      { number: "제12조", title: "대금 지급", body: "수급사업자에 대한 대금은 목적물 수령일로부터 60일 이내에 지급한다." },
    ],
  },
];

// ──────────────────────────────────────────────
// 2. 법령 개정 이벤트 3건
// ──────────────────────────────────────────────

export const MOCK_LAW_CHANGES: LawChange[] = [
  {
    id: "law-labor-50",
    lawName: "근로기준법",
    articleNumber: "제50조",
    articleTitle: "근로시간",
    effectiveDate: "2026-04-01",
    source: "MOCK",
    summary:
      "주 52시간제 운영 유연화. 특정 업종에 한해 노사 합의 시 월 단위 정산 허용. 11시간 연속 휴식 의무 신설.",
    oldText:
      "1주 간의 근로시간은 휴게시간을 제외하고 40시간을 초과할 수 없다. 1일의 근로시간은 휴게시간을 제외하고 8시간을 초과할 수 없다.",
    newText:
      "1주 간의 근로시간은 휴게시간을 제외하고 40시간을 초과할 수 없다. 1일의 근로시간은 휴게시간을 제외하고 8시간을 초과할 수 없다. 다만, 노사 합의가 있는 경우 월 단위로 정산할 수 있으며, 이 경우에도 1일의 근로 종료 후 다음 근로 개시 전까지 11시간 이상의 연속 휴식시간을 보장하여야 한다.",
  },
  {
    id: "law-privacy-30",
    lawName: "개인정보보호법 시행령",
    articleNumber: "제30조",
    articleTitle: "개인정보의 보유·이용기간",
    effectiveDate: "2026-03-15",
    source: "MOCK",
    summary:
      "개인정보 보유·이용기간 명시 의무 강화. 채용 미선발자 정보는 6개월 이내 파기 명문화.",
    oldText:
      "개인정보처리자는 개인정보의 수집·이용 목적이 달성되면 지체 없이 개인정보를 파기하여야 한다.",
    newText:
      "개인정보처리자는 개인정보의 수집·이용 목적이 달성되면 지체 없이 개인정보를 파기하여야 한다. 채용 절차에서 수집한 미선발자의 개인정보는 채용 종료일로부터 6개월 이내에 파기하여야 하며, 보유 기간을 정보주체에게 명시하여야 한다.",
  },
  {
    id: "law-serious-accident",
    lawName: "중대재해처벌법 시행규칙",
    articleNumber: "제4조",
    articleTitle: "안전보건관리체계 구축 의무",
    effectiveDate: "2026-02-20",
    source: "MOCK",
    summary:
      "안전보건 점검 주기 분기 1회 → 월 1회로 강화. 결과의 경영책임자 보고·서명 의무 신설.",
    oldText:
      "사업주 또는 경영책임자등은 분기 1회 이상 안전보건 점검을 실시하고 그 결과를 기록·보존하여야 한다.",
    newText:
      "사업주 또는 경영책임자등은 월 1회 이상 안전보건 점검을 실시하고 그 결과를 기록·보존하여야 한다. 점검 결과는 경영책임자에게 보고하고 서명을 받아야 하며, 보고 후 14일 이내에 개선 조치를 이행하여야 한다.",
  },
];

// ──────────────────────────────────────────────
// 3. 매칭 결과 (스캔 출력)
// ──────────────────────────────────────────────

export const MOCK_AFFECTED_RULES: AffectedRule[] = [
  {
    ruleId: "rule-employment",
    ruleTitle: "취업규칙",
    articleNumber: "제12조",
    articleTitle: "근로시간",
    similarity: 0.91,
    lawChangeId: "law-labor-50",
    rationale:
      "근로기준법 제50조 개정으로 1일 근로 종료 후 11시간 이상의 연속 휴식이 의무화되었습니다. 현행 취업규칙 제12조는 연장근로 한도만 규정하고 휴식시간 보장 조항이 없어 개정이 필요합니다.",
    legalBasis: "근로기준법 제50조, 산업안전보건법 제5조 (사업주의 의무)",
  },
  {
    ruleId: "rule-privacy",
    ruleTitle: "개인정보처리방침",
    articleNumber: "제8조",
    articleTitle: "보유 및 이용기간",
    similarity: 0.87,
    lawChangeId: "law-privacy-30",
    rationale:
      "개인정보보호법 시행령 제30조 개정으로 채용 미선발자 정보는 채용 종료일로부터 6개월 이내 파기 의무가 신설되었습니다. 현행 방침은 일반 보존 기간만 규정하여 채용 절차 특례에 부합하지 않습니다.",
    legalBasis: "개인정보보호법 시행령 제30조, 동법 제21조 (개인정보의 파기)",
  },
  {
    ruleId: "rule-safety",
    ruleTitle: "안전보건관리규정",
    articleNumber: "제6조",
    articleTitle: "안전보건관리책임자의 직무",
    similarity: 0.94,
    lawChangeId: "law-serious-accident",
    rationale:
      "중대재해처벌법 시행규칙 제4조 개정으로 안전보건 점검 주기가 분기 1회에서 월 1회로 강화되고, 경영책임자 보고·서명 의무가 신설되었습니다. 현행 규정은 분기 1회 기준으로 작성되어 있어 즉시 개정이 필요합니다.",
    legalBasis: "중대재해처벌법 제4조, 동법 시행규칙 제4조",
  },
];

// ──────────────────────────────────────────────
// 4. 사전 생성 개정안 패키지 3건
// ──────────────────────────────────────────────

export const MOCK_AMENDMENT_PACKAGES: Record<string, AmendmentPackage> = {
  "rule-employment": {
    id: "amd-employment",
    ruleId: "rule-employment",
    ruleTitle: "취업규칙",
    lawChangeId: "law-labor-50",
    lawChangeSummary: "근로기준법 제50조 — 11시간 연속 휴식 의무 신설",
    generatedAt: "2026-04-29T10:30:00+09:00",
    confidence: 0.93,
    source: "MOCK",
    reasoning: `근로기준법 제50조 개정(2026.04.01 시행)으로 1일 근로 종료 후 다음 근로 개시 전까지 11시간 이상의 연속 휴식시간 보장이 의무화되었다. 또한 노사 합의 시 월 단위 근로시간 정산이 새로 허용되었다.

현행 취업규칙 제12조는 1주 12시간 한도의 연장근로만 규정하고 있어, 개정 법령이 요구하는 (1) 11시간 연속 휴식 보장과 (2) 월 단위 정산 절차에 대한 근거 조항이 부재한 상태이다.

이에 따라 본 개정안은 취업규칙 제12조에 휴식시간 보장 조항과 월 단위 정산 합의 절차를 추가하여 개정 근로기준법과의 정합성을 확보하고, 이를 위반할 경우 발생할 수 있는 행정처분 및 과태료 리스크를 사전에 차단하고자 한다.`,
    highlights: [
      "1일 근로 종료 후 다음 근로 개시 전까지 11시간 이상 연속 휴식시간 보장 명문화",
      "노사 합의에 의한 월 단위 근로시간 정산 절차 신설 (서면 합의 의무)",
      "기존 1주 12시간 연장근로 한도는 유지하되 휴식시간 보장과 동시 적용",
      "시행일: 2026년 5월 1일 (근로기준법 개정 시행일 후 1개월 유예)",
    ],
    diffTable: [
      {
        articleNumber: "제12조 (근로시간)",
        oldText:
          "사원의 1주 근로시간은 휴게시간을 제외하고 40시간을 원칙으로 하며, 1일 8시간을 초과하지 아니한다. 다만 당사자 합의에 따라 1주 12시간을 한도로 연장근로를 할 수 있다.",
        newText:
          "① 사원의 1주 근로시간은 휴게시간을 제외하고 40시간을 원칙으로 하며, 1일 8시간을 초과하지 아니한다.\n② 당사자 합의에 따라 1주 12시간을 한도로 연장근로를 할 수 있다.\n③ 1일의 근로 종료 후 다음 근로 개시 전까지 11시간 이상의 연속 휴식시간을 보장한다.\n④ 노사 서면 합의가 있는 경우 월 단위로 근로시간을 정산할 수 있다.",
        changeNote: "11시간 연속 휴식 의무화 + 월 단위 정산 근거 조항 신설",
      },
    ],
    precedents: [
      {
        caseId: "대법원 2021다303691",
        date: "2023-06-29",
        summary:
          "휴식시간을 충분히 보장하지 않은 채 연속 야간근무를 시킨 사례에서, 사용자는 산업안전보건법상 안전배려의무 위반 책임을 진다고 판시.",
        relevance:
          "11시간 연속 휴식 보장은 단순 행정 의무를 넘어 사용자 안전배려의무의 구체적 구현임을 시사. 본 개정안의 휴식시간 조항이 안전배려의무 이행 근거로 작동.",
      },
      {
        caseId: "대법원 2019도14674",
        date: "2022-11-10",
        summary:
          "근로시간 정산을 서면 합의 없이 운영한 사용자에게 근로기준법 위반죄 인정.",
        relevance:
          "월 단위 정산 도입 시 반드시 노사 서면 합의 절차를 명문화해야 함. 본 개정안 제4항이 이 요건을 충족.",
      },
    ],
  },

  "rule-privacy": {
    id: "amd-privacy",
    ruleId: "rule-privacy",
    ruleTitle: "개인정보처리방침",
    lawChangeId: "law-privacy-30",
    lawChangeSummary: "개인정보보호법 시행령 제30조 — 채용 미선발자 정보 6개월 내 파기",
    generatedAt: "2026-04-29T10:31:00+09:00",
    confidence: 0.91,
    source: "MOCK",
    reasoning: `개인정보보호법 시행령 제30조 개정(2026.03.15 시행)으로 채용 절차에서 수집한 미선발자 개인정보의 보유·파기 기준이 강화되었다. 구체적으로 (1) 채용 종료일로부터 6개월 이내 파기 의무, (2) 보유 기간의 정보주체 명시 의무가 신설되었다.

현행 개인정보처리방침 제8조는 "수집·이용 목적이 달성된 후 지체 없이 파기"하되 관계 법령에 따라 5년 보존을 허용하는 일반 조항만 두고 있어, 채용 미선발자에 대한 특례를 반영하지 못한 상태이다.

본 개정안은 채용 미선발자에 대한 별도 파기 기준 항을 신설하고, 정보주체 고지 의무를 명문화하여 개정 법령과의 완전한 정합성을 확보한다.`,
    highlights: [
      "채용 미선발자 개인정보 — 채용 종료일로부터 6개월 이내 파기 의무 신설",
      "보유 기간을 정보주체(지원자)에게 사전 고지하는 절차 명문화",
      "채용 동의서 양식에 보유 기간·파기 기준 별도 표기 추가",
      "시행일: 2026년 5월 1일",
    ],
    diffTable: [
      {
        articleNumber: "제8조 (보유 및 이용기간)",
        oldText:
          "수집된 개인정보는 수집·이용 목적이 달성된 후에는 지체 없이 파기한다. 단, 관계 법령에 따라 보존할 필요가 있는 경우 5년간 보존한다.",
        newText:
          "① 수집된 개인정보는 수집·이용 목적이 달성된 후에는 지체 없이 파기한다. 단, 관계 법령에 따라 보존할 필요가 있는 경우 5년간 보존한다.\n② 채용 절차에서 수집한 미선발자의 개인정보는 채용 종료일로부터 6개월 이내에 파기한다.\n③ 회사는 제2항의 보유 기간을 채용 동의서에 명시하여 정보주체에게 사전 고지한다.",
        changeNote: "채용 미선발자 6개월 파기 + 보유기간 사전 고지 의무 추가",
      },
    ],
    precedents: [
      {
        caseId: "대법원 2020두48109",
        date: "2022-04-14",
        summary:
          "보유 기간을 정보주체에게 명확히 고지하지 않고 채용 자료를 장기 보관한 사용자에게 개인정보보호법 위반 과태료 부과를 적법하다고 판시.",
        relevance:
          "본 개정안 제3항(사전 고지 의무)이 동 판례에서 요구하는 절차적 적법성을 충족.",
      },
    ],
  },

  "rule-safety": {
    id: "amd-safety",
    ruleId: "rule-safety",
    ruleTitle: "안전보건관리규정",
    lawChangeId: "law-serious-accident",
    lawChangeSummary: "중대재해처벌법 시행규칙 제4조 — 점검 주기 월 1회 + 경영책임자 보고 의무",
    generatedAt: "2026-04-29T10:32:00+09:00",
    confidence: 0.96,
    source: "MOCK",
    reasoning: `중대재해처벌법 시행규칙 제4조 개정(2026.02.20 시행)으로 안전보건 점검 주기가 기존 분기 1회에서 월 1회로 강화되었으며, 점검 결과를 경영책임자에게 보고하고 서명을 받는 의무, 그리고 보고 후 14일 이내 개선 조치 이행 의무가 신설되었다.

현행 안전보건관리규정 제6조는 분기 1회 기준으로 작성되어 있고 경영책임자 보고·서명 절차가 명시되지 않아, 개정 법령 시행 즉시 위반 상태가 된다. 중대재해처벌법은 경영책임자 개인의 형사책임을 묻는 법률이므로 즉시 개정이 필요하다.

본 개정안은 점검 주기, 보고 절차, 개선 조치 기한을 모두 개정 시행규칙과 일치시키고, 추가로 분기 종합점검 항을 신설하여 더 강화된 내부통제를 구축한다.`,
    highlights: [
      "안전보건 점검 주기: 분기 1회 → 월 1회로 강화",
      "점검 결과의 경영책임자 보고 및 서명 의무 신설",
      "보고 후 14일 이내 개선 조치 이행 의무 명문화",
      "분기 1회 종합점검 항 추가 신설 (선제적 내부통제)",
      "시행일: 2026년 5월 1일",
    ],
    diffTable: [
      {
        articleNumber: "제6조 (안전보건관리책임자의 직무)",
        oldText:
          "안전보건관리책임자는 사업장의 안전보건에 관한 사항을 총괄·관리하며, 분기 1회 이상 안전점검을 실시한다.",
        newText:
          "① 안전보건관리책임자는 사업장의 안전보건에 관한 사항을 총괄·관리한다.\n② 안전보건관리책임자는 월 1회 이상 안전점검을 실시하고, 그 결과를 경영책임자에게 보고하여 서명을 받는다.\n③ 보고된 개선사항은 보고일로부터 14일 이내에 이행하여야 하며, 이행 결과를 기록·보존한다.\n④ 안전보건관리책임자는 분기 1회 종합점검을 추가로 실시한다.",
        changeNote: "월 1회 점검 + 경영책임자 보고/서명 + 14일 개선 조치 + 분기 종합점검",
      },
    ],
    precedents: [
      {
        caseId: "대법원 2023도8819",
        date: "2024-01-25",
        summary:
          "안전보건 점검 결과를 경영책임자에게 보고하지 않고 형식적으로 운영한 사례에서 중대재해처벌법상 경영책임자의 안전보건 확보의무 위반 인정.",
        relevance:
          "본 개정안 제2항(보고·서명 의무)이 경영책임자 의무 이행의 직접적 증빙이 됨. 형사 리스크 차단의 핵심 조항.",
      },
      {
        caseId: "헌법재판소 2022헌가1",
        date: "2023-09-26",
        summary:
          "중대재해처벌법상 경영책임자의 안전보건 확보의무 조항에 대한 합헌 결정.",
        relevance:
          "법령 자체의 합헌성이 확정된 만큼, 사내 규정 개정 지연은 정당화 사유가 되지 않음.",
      },
    ],
  },
};

// ──────────────────────────────────────────────
// 5. 데모 시나리오 (전체 묶음)
// ──────────────────────────────────────────────

export const MOCK_DEMO_SCAN: Scan = {
  id: "scan-demo-1",
  startedAt: "2026-04-29T10:25:00+09:00",
  finishedAt: "2026-04-29T10:25:14+09:00",
  source: "MOCK",
  lawChanges: MOCK_LAW_CHANGES,
  affected: MOCK_AFFECTED_RULES,
};

// ──────────────────────────────────────────────
// 헬퍼
// ──────────────────────────────────────────────

export function getRule(ruleId: string): Rule | undefined {
  return MOCK_RULES.find((r) => r.id === ruleId);
}

export function getLawChange(lawChangeId: string): LawChange | undefined {
  return MOCK_LAW_CHANGES.find((l) => l.id === lawChangeId);
}

export function getAmendmentPackage(ruleId: string): AmendmentPackage | undefined {
  return MOCK_AMENDMENT_PACKAGES[ruleId];
}

export function getAffectedRule(ruleId: string): AffectedRule | undefined {
  return MOCK_AFFECTED_RULES.find((a) => a.ruleId === ruleId);
}
