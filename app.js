/* ============================================================
   RegulMate Demo App — app.js
   All data is mock/demo — no external API calls required.
   ============================================================ */

'use strict';

// ── Date ────────────────────────────────────────────────────
document.getElementById('topbar-date').textContent =
  new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

// ── State ───────────────────────────────────────────────────
let activeView       = 'dashboard';
let selectedRegId    = null;
let checkedPolicies  = new Set();

// ── Mock Data ───────────────────────────────────────────────
const REGULATIONS = [
  {
    id: 'lsa-50',
    law: '근로기준법',
    article: '제50조',
    title: '법정 근로시간 단계적 단축',
    date: '2026.04.15',
    effectiveDate: '2026.07.01',
    severity: 'high',
    severityLabel: '높은 영향',
    description: '주 최대 근로시간이 52시간에서 48시간으로 단계적 단축되며, 연장근로 허용 한도가 조정됩니다.',
    changeDetail: '근로기준법 제50조 제2항 개정으로 1주 연장근로 한도가 현행 12시간에서 8시간으로 단계적 단축됩니다 (1년차 10시간, 2년차 8시간). 5인 이상 사업장 전면 적용, 위반 시 2년 이하 징역 또는 2천만 원 이하 벌금.',
    source: '법제처 법령정보센터 2026-0415-0012',
    affectedCount: 3,
    policies: [
      {
        id: 'p-es-12',
        name: '취업규칙',
        article: '제12조',
        topic: '근로시간',
        severity: 'high',
        severityLabel: '즉시 개정 필요',
        reason: '법정 근로시간 및 연장근로 한도를 직접 규정하고 있어 개정 법령과 즉각적으로 충돌합니다. 방치 시 법령 위반에 해당합니다.',
        checked: true,
      },
      {
        id: 'p-comp-5',
        name: '임금 및 보상 규정',
        article: '제5조',
        topic: '연장근로수당',
        severity: 'med',
        severityLabel: '검토 권고',
        reason: '연장근로 한도 축소로 연장수당 산정 기준 및 지급 상한이 재검토되어야 합니다.',
        checked: true,
      },
      {
        id: 'p-att-8',
        name: '복무규정',
        article: '제8조',
        topic: '근태관리',
        severity: 'low',
        severityLabel: '정합성 확인',
        reason: '근로시간 정의 조항을 참조하고 있어 상위 규정 개정 시 정합성 검토가 권고됩니다.',
        checked: false,
      },
    ],
    domino: [
      { from: '취업규칙 제12조', to: '파견근로자 관리 지침 제4조', reason: '파견 근로자 근로시간 기준 조항이 취업규칙을 인용' },
      { from: '임금 및 보상 규정 제5조', to: '경영성과급 지급 기준 제2조', reason: '연장근로 기여 지표 산정에 영향' },
    ],
    package: {
      rationale: `근로기준법 제50조 제2항이 2026년 4월 15일 개정·공포됨에 따라, 1주 연장근로 허용 한도가 현행 12시간에서 8시간(시행 1년차 10시간)으로 단계적으로 단축됩니다. 당사 취업규칙 제12조 제2항은 현행 법령(구법)의 12시간 기준을 그대로 명시하고 있어, 개정 법령 시행일인 2026년 7월 1일 이후 법령 위반 상태에 놓이게 됩니다. 이에 관련 조항을 법령에 부합하도록 개정합니다.`,
      keyChanges: [
        '취업규칙 제12조 제2항: 연장근로 한도 "1주 12시간" → "1주 10시간 (2027.07.01부터 1주 8시간)"으로 단계적 조정',
        '임금 및 보상 규정 제5조 제1항: 연장수당 지급 기준 시간 상한을 연장근로 한도에 연동하도록 문구 개정',
        '부칙 신설: 적용 단계 및 기산일 명확화, 기존 계약에 대한 경과 조치 규정',
      ],
      diffTable: [
        {
          label: '취업규칙\n제12조 ②',
          before: '사용자는 제1항에도 불구하고 근로자와 합의한 경우 <mark>1주 12시간</mark>을 한도로 연장근로를 시킬 수 있다.',
          after: '사용자는 제1항에도 불구하고 근로자와 합의한 경우 <mark>1주 10시간</mark>을 한도로 연장근로를 시킬 수 있다. 다만, 2027년 7월 1일부터는 <mark>1주 8시간</mark>으로 한다.',
        },
        {
          label: '보상 규정\n제5조 ①',
          before: '연장근로수당은 법정 한도 <mark>12시간 이내</mark>의 연장근로에 대하여 통상임금의 150%를 지급한다.',
          after: '연장근로수당은 법정 허용 한도 이내의 연장근로에 대하여 통상임금의 150%를 지급한다. <mark>(허용 한도는 근로기준법 제50조에 따른다)</mark>',
        },
        {
          label: '부칙\n(신설)',
          before: '(해당 없음)',
          after: '<mark>제1조(시행일)</mark> 이 규정은 2026년 7월 1일부터 시행한다.\n<mark>제2조(경과조치)</mark> 이 규정 시행 전에 체결된 근로계약에 대해서는 당사자 합의 후 재체결 절차를 거쳐야 한다.',
        },
      ],
      caseLaw: [
        {
          cite: '대법원 2023다12345 (2023.08.15)',
          summary: '연장근로 한도 초과에 따른 임금 반환 청구 사건. 법원은 사전 합의 여부와 무관하게 법정 한도를 초과한 연장근로 지시 자체가 위법임을 확인.',
          relevance: '개정 후 한도 초과 지시 시 동일한 법리가 적용될 수 있어 규정 선제 개정 필요성 뒷받침.',
        },
        {
          cite: '서울고법 2024나98765 (2024.02.28)',
          summary: '취업규칙 조항이 법령에 위반된 경우 해당 조항은 무효이며, 법령이 직접 적용된다는 판례.',
          relevance: '취업규칙 미개정 시 제12조 제2항 자체가 무효 처리될 수 있어 분쟁 발생 위험.',
        },
      ],
      nextSteps: ['법무·HR 검토', '노사 협의', '결재 상정', '개정 고지'],
    },
  },
  {
    id: 'pipa-29',
    law: '개인정보 보호법',
    article: '제29조',
    title: '처리방침 공개 및 고지 의무 강화',
    date: '2026.03.28',
    effectiveDate: '2026.06.01',
    severity: 'med',
    severityLabel: '보통 영향',
    description: '개인정보 처리방침의 필수 기재 항목이 확대되고, 변경 시 30일 전 사전 고지 의무가 신설되었습니다.',
    changeDetail: '개인정보 보호법 제29조 개정으로 처리방침에 제3자 제공 내역, 국외이전 현황, 보유기간 근거를 명시적으로 기재해야 합니다. 또한 처리방침 변경 시 최소 30일 전 개인정보 주체에게 사전 고지해야 합니다.',
    source: '개인정보보호위원회 고시 2026-003',
    affectedCount: 2,
    policies: [
      {
        id: 'p-pp-full',
        name: '개인정보처리방침',
        article: '전문',
        topic: '처리방침',
        severity: 'high',
        severityLabel: '즉시 개정 필요',
        reason: '필수 기재 항목 미포함으로 법령 위반 상태. 제3자 제공 내역 및 국외이전 현황 추가 필요.',
        checked: true,
      },
      {
        id: 'p-sec-14',
        name: '정보보안 규정',
        article: '제14조',
        topic: '개인정보 관리',
        severity: 'low',
        severityLabel: '정합성 확인',
        reason: '처리방침 변경 절차 관련 내부 승인 프로세스에 30일 사전 고지 절차 반영 필요.',
        checked: false,
      },
    ],
    domino: [
      { from: '개인정보처리방침', to: '마케팅 동의서 양식', reason: '처리방침 버전 참조 문구 포함' },
    ],
    package: null,
  },
  {
    id: 'isha-38',
    law: '산업안전보건법 시행규칙',
    article: '제38조',
    title: '위험성 평가 주기 단축',
    date: '2026.03.10',
    effectiveDate: '2026.05.15',
    severity: 'low',
    severityLabel: '낮은 영향',
    description: '상시근로자 50인 이상 사업장의 위험성 평가 최소 실시 주기가 2년에서 1년으로 단축되었습니다.',
    changeDetail: '산업안전보건법 시행규칙 제38조 개정으로 위험성 평가 정기 실시 주기가 2년에서 1년으로 단축됩니다. 50인 이상 사업장은 연 1회 이상 실시 및 결과 보고 의무가 생깁니다.',
    source: '고용노동부 고시 2026-산안-007',
    affectedCount: 2,
    policies: [
      {
        id: 'p-sh-6',
        name: '안전보건관리규정',
        article: '제6조',
        topic: '위험성 평가',
        severity: 'med',
        severityLabel: '검토 권고',
        reason: '현행 규정이 "2년 주기" 위험성 평가를 명시하고 있어 개정된 시행규칙과 불일치.',
        checked: true,
      },
      {
        id: 'p-risk-3',
        name: '위험성평가 절차서',
        article: '제3조',
        topic: '실시 절차',
        severity: 'low',
        severityLabel: '정합성 확인',
        reason: '평가 주기 및 결과 보고 일정이 상위 규정 개정에 연동되어야 합니다.',
        checked: false,
      },
    ],
    domino: [],
    package: null,
  },
];

// ── Navigation ───────────────────────────────────────────────
function goTo(viewName) {
  if (viewName === 'analysis' && !selectedRegId) return;
  if (viewName === 'package' && !selectedRegId) return;

  document.getElementById(`view-${activeView}`).classList.remove('active');
  document.getElementById(`view-${viewName}`).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.goto === viewName);
  });

  activeView = viewName;
  updateBreadcrumb();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateBreadcrumb() {
  const bc = document.getElementById('breadcrumb');
  const reg = REGULATIONS.find(r => r.id === selectedRegId);

  if (activeView === 'dashboard') {
    bc.innerHTML = '<span>대시보드</span>';
  } else if (activeView === 'analysis' && reg) {
    bc.innerHTML = `<a class="bc-link" onclick="goTo('dashboard')">대시보드</a>
      <span class="bc-sep">›</span>
      <span>${reg.law} ${reg.article} 영향 분석</span>`;
  } else if (activeView === 'package' && reg) {
    bc.innerHTML = `<a class="bc-link" onclick="goTo('dashboard')">대시보드</a>
      <span class="bc-sep">›</span>
      <a class="bc-link" onclick="goTo('analysis')">${reg.law} ${reg.article}</a>
      <span class="bc-sep">›</span>
      <span>개정 패키지</span>`;
  }
}

// ── Render Dashboard ─────────────────────────────────────────
function renderDashboard() {
  const list = document.getElementById('reg-list');
  list.innerHTML = REGULATIONS.map(reg => `
    <article class="reg-card">
      <div class="reg-card-left">
        <div class="reg-card-top">
          <span class="severity-badge ${reg.severity}">${reg.severityLabel}</span>
          <span class="reg-law-title">${reg.law} ${reg.article} — ${reg.title}</span>
        </div>
        <p class="reg-desc">${reg.description}</p>
        <div class="reg-card-meta">
          <span>📅 감지일 ${reg.date}</span>
          <span>⏰ 시행일 ${reg.effectiveDate}</span>
          <span>📌 출처: ${reg.source}</span>
        </div>
      </div>
      <div class="reg-card-right">
        <div class="affected-count">사내 규정 <strong>${reg.affectedCount}건</strong> 영향</div>
        <button class="btn btn-primary btn-sm" onclick="openAnalysis('${reg.id}')">
          분석 시작 →
        </button>
      </div>
    </article>
  `).join('');
}

// ── Open Analysis ─────────────────────────────────────────────
function openAnalysis(regId) {
  selectedRegId = regId;
  const reg = REGULATIONS.find(r => r.id === regId);

  // Reset checked state from defaults
  checkedPolicies = new Set(reg.policies.filter(p => p.checked).map(p => p.id));

  // Enable nav
  document.getElementById('nav-analysis').removeAttribute('disabled');

  // Title / sub
  document.getElementById('analysis-title').textContent = `${reg.law} ${reg.article} — 영향 분석`;
  document.getElementById('analysis-sub').textContent = `개정 시행일: ${reg.effectiveDate} · 출처: ${reg.source}`;

  // Law card
  document.getElementById('law-card').innerHTML = `
    <div class="law-card-header">
      <div>
        <div class="law-name">${reg.law} ${reg.article} &nbsp; ${reg.title}</div>
        <div class="law-meta" style="margin-top:6px">
          <div class="law-meta-item">📅 감지일 <strong>${reg.date}</strong></div>
          <div class="law-meta-item">⏰ 시행일 <strong>${reg.effectiveDate}</strong></div>
          <div class="law-meta-item">영향 규정 <strong>${reg.affectedCount}건</strong></div>
        </div>
      </div>
      <span class="severity-badge ${reg.severity}" style="align-self:flex-start">${reg.severityLabel}</span>
    </div>
    <div class="law-change-box">
      <strong>개정 내용</strong><br>${reg.changeDetail}
    </div>
  `;

  // Policy list
  renderPolicyList(reg);

  // Domino
  const dominoBody = document.getElementById('domino-body');
  if (reg.domino.length === 0) {
    dominoBody.innerHTML = '<p style="padding:12px 0;font-size:13px;color:var(--ink-faint)">연쇄 영향이 감지된 규정이 없습니다.</p>';
  } else {
    dominoBody.innerHTML = reg.domino.map(d => `
      <div class="domino-item">
        <span class="domino-arrow">↳</span>
        <div>
          <strong>${d.from}</strong> → <strong>${d.to}</strong>
          <div style="font-size:12.5px;color:var(--ink-soft);margin-top:3px">${d.reason}</div>
        </div>
      </div>
    `).join('');
  }

  // Badge
  const badge = document.getElementById('analysis-badge');
  badge.textContent = reg.affectedCount;
  badge.style.display = '';

  goTo('analysis');
}

function renderPolicyList(reg) {
  const list = document.getElementById('policy-list');
  list.innerHTML = reg.policies.map(p => `
    <div class="policy-item ${checkedPolicies.has(p.id) ? 'checked' : ''}"
         onclick="togglePolicy('${p.id}', '${reg.id}')">
      <div class="policy-checkbox">
        ${checkedPolicies.has(p.id) ? '<svg viewBox="0 0 20 20" fill="currentColor" style="width:12px;height:12px"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>' : ''}
      </div>
      <div class="policy-item-body">
        <div class="policy-item-top">
          <span class="policy-name">${p.name}</span>
          <span class="policy-article">${p.article}</span>
          <span class="policy-topic">${p.topic}</span>
          <span class="severity-badge ${p.severity}" style="margin-left:auto">${p.severityLabel}</span>
        </div>
        <p class="policy-reason">${p.reason}</p>
      </div>
    </div>
  `).join('');
}

function togglePolicy(policyId, regId) {
  if (checkedPolicies.has(policyId)) {
    checkedPolicies.delete(policyId);
  } else {
    checkedPolicies.add(policyId);
  }
  const reg = REGULATIONS.find(r => r.id === regId);
  renderPolicyList(reg);

  const btn = document.getElementById('gen-package-btn');
  btn.disabled = checkedPolicies.size === 0;
  btn.style.opacity = checkedPolicies.size === 0 ? '0.5' : '1';
}

// ── Package Generation ────────────────────────────────────────
function startPackageGeneration() {
  if (checkedPolicies.size === 0) {
    showToast('개정할 규정을 하나 이상 선택하세요.');
    return;
  }

  // Enable nav item
  document.getElementById('nav-package').removeAttribute('disabled');

  // Reset package view
  const pkgContent = document.getElementById('pkg-content');
  const pkgLoading = document.getElementById('pkg-loading');
  pkgContent.style.display = 'none';
  pkgContent.innerHTML = '';
  pkgLoading.style.display = 'flex';
  document.getElementById('package-actions-top').style.display = 'none';

  // Reset loading steps
  ['ls-1','ls-2','ls-3','ls-4'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('active','done');
  });

  goTo('package');

  // Simulate loading steps
  const steps = ['ls-1','ls-2','ls-3','ls-4'];
  const delays = [0, 900, 1800, 2700];

  steps.forEach((id, i) => {
    setTimeout(() => {
      if (i > 0) {
        document.getElementById(steps[i-1]).classList.remove('active');
        document.getElementById(steps[i-1]).classList.add('done');
      }
      document.getElementById(id).classList.add('active');
    }, delays[i]);
  });

  // Show content after 3.8s
  setTimeout(() => {
    document.getElementById(steps[steps.length-1]).classList.remove('active');
    document.getElementById(steps[steps.length-1]).classList.add('done');

    setTimeout(() => {
      pkgLoading.style.display = 'none';
      renderPackage();
    }, 400);
  }, 3600);
}

function renderPackage() {
  const reg = REGULATIONS.find(r => r.id === selectedRegId);
  const pkgContent = document.getElementById('pkg-content');
  const selectedPols = reg.policies.filter(p => checkedPolicies.has(p.id));

  // Update sub title
  document.getElementById('package-sub').textContent =
    `${reg.law} ${reg.article} 기반 · 대상 규정 ${selectedPols.length}건 · AI 생성 초안`;

  let html = '';

  // ── Rationale ──
  const rationale = reg.package
    ? reg.package.rationale
    : `${reg.law} ${reg.article} 개정에 따라 ${selectedPols.map(p=>p.name+' '+p.article).join(', ')}의 관련 조항이 현행 법령과 불일치하여 개정이 필요합니다. 상세 내용은 법무·준법 담당자의 검토 후 확정하시기 바랍니다.`;

  html += `
    <div class="pkg-section">
      <div class="pkg-section-head">
        <div class="pkg-section-title"><span class="icon">📋</span> 개정 사유서</div>
      </div>
      <div class="pkg-section-body">
        <p class="rationale-text">${rationale}</p>
      </div>
    </div>
  `;

  // ── Key changes ──
  const keyChanges = reg.package
    ? reg.package.keyChanges
    : selectedPols.map(p => `${p.name} ${p.article} (${p.topic}): ${p.reason}`);

  html += `
    <div class="pkg-section">
      <div class="pkg-section-head">
        <div class="pkg-section-title"><span class="icon">✏️</span> 주요 개정 골자</div>
      </div>
      <div class="pkg-section-body">
        <ul class="key-changes-list">
          ${keyChanges.map((item, i) => `
            <li>
              <span class="kc-bullet">${i+1}</span>
              <span>${item}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;

  // ── Diff table ──
  if (reg.package && reg.package.diffTable) {
    const rows = reg.package.diffTable.map(row => `
      <tr>
        <td class="col-label" style="white-space:pre-line">${row.label}</td>
        <td class="col-before">${row.before.replace(/<mark>/g,'<span class="diff-highlight">').replace(/<\/mark>/g,'</span>')}</td>
        <td class="col-after">${row.after.replace(/\n/g,'<br>').replace(/<mark>/g,'<span class="diff-highlight">').replace(/<\/mark>/g,'</span>')}</td>
      </tr>
    `).join('');

    html += `
      <div class="pkg-section">
        <div class="pkg-section-head">
          <div class="pkg-section-title"><span class="icon">⚖️</span> 신구조문대비표</div>
        </div>
        <div class="pkg-section-body" style="overflow-x:auto;padding:0">
          <table class="diff-table">
            <thead>
              <tr>
                <th>조항</th>
                <th>현행</th>
                <th>개정안</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ── Case law ──
  const caseLaw = reg.package
    ? reg.package.caseLaw
    : [{
        cite: '관련 판례는 법무팀 검토 후 추가됩니다',
        summary: '이 섹션은 데모에서 선택된 규정에 대한 관련 판례가 자동으로 연결됩니다.',
        relevance: '실제 서비스에서는 국가법령정보공동시스템 연계로 자동 제공됩니다.'
      }];

  html += `
    <div class="pkg-section">
      <div class="pkg-section-head">
        <div class="pkg-section-title"><span class="icon">⚖️</span> 관련 판례 및 해석례</div>
      </div>
      <div class="pkg-section-body">
        <div class="case-list">
          ${caseLaw.map(c => `
            <div class="case-item">
              <div class="case-cite">${c.cite}</div>
              <div class="case-summary">${c.summary}</div>
              <div class="case-relevance">→ ${c.relevance}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // ── Next steps ──
  const steps = reg.package ? reg.package.nextSteps : ['법무 검토', '유관부서 협의', '결재 상정', '시행 고지'];
  html += `
    <div class="pkg-section">
      <div class="pkg-section-head">
        <div class="pkg-section-title"><span class="icon">🚀</span> 다음 단계</div>
      </div>
      <div class="pkg-section-body">
        <div class="next-steps">
          ${steps.map((s, i) => `
            <div class="next-step-card">
              <div class="ns-num">Step ${i+1}</div>
              <div class="ns-text">${s}</div>
            </div>
          `).join('')}
        </div>
        <p style="font-size:12px;color:var(--ink-faint);margin-top:16px">
          * 이 문서는 AI가 생성한 초안입니다. 법무·준법 담당자의 검토 후 결재 요청하시기 바랍니다.
        </p>
      </div>
    </div>
  `;

  pkgContent.innerHTML = html;
  pkgContent.style.display = 'block';
  document.getElementById('package-actions-top').style.display = 'flex';

  // Package badge
  const badge = document.getElementById('package-badge');
  badge.textContent = selectedPols.length;
  badge.style.display = '';

  showToast('개정 패키지 생성이 완료되었습니다 ✓');
}

// ── Mock Export ───────────────────────────────────────────────
function mockExport(type) {
  if (type === 'word') {
    showToast('Word 파일 다운로드 준비 중… (데모에서는 미지원)');
  } else if (type === 'approval') {
    showToast('결재 요청이 전송되었습니다. (데모 모드)');
  }
}

// ── Toast ─────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ── Chat widget ───────────────────────────────────────────────
const CHAT_RESPONSES = {
  '근로시간': '근로기준법 제50조 개정으로 1주 연장근로 한도가 12시간 → 10시간(→ 8시간)으로 단축됩니다. 취업규칙 제12조 즉시 개정이 필요합니다.',
  '개인정보': '개인정보 보호법 제29조 개정으로 처리방침에 제3자 제공 내역, 국외이전 현황을 명시해야 하며, 변경 시 30일 전 사전 고지 의무가 생깁니다.',
  '위험성평가': '산업안전보건법 시행규칙 제38조 개정으로 50인 이상 사업장은 위험성 평가를 연 1회 이상 실시해야 합니다 (기존 2년 주기).',
  '영향': '현재 감지된 3건의 법령 개정이 사내 규정 8건에 영향을 미치고 있습니다. 대시보드에서 각 법령을 클릭해 상세 분석을 확인하세요.',
  '판례': '관련 판례는 개정 패키지 생성 시 자동으로 포함됩니다. 실제 서비스에서는 국가법령정보공동시스템과 연계됩니다.',
};

function toggleChat() {
  const panel = document.getElementById('chat-panel');
  panel.classList.toggle('open');
}

function sendChat() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  const msgs = document.getElementById('chat-messages');
  msgs.innerHTML += `<div class="chat-msg user">${escapeHtml(text)}</div>`;
  input.value = '';

  setTimeout(() => {
    const key = Object.keys(CHAT_RESPONSES).find(k => text.includes(k));
    const reply = key
      ? CHAT_RESPONSES[key]
      : '죄송합니다, 해당 질문에 대한 데모 응답이 준비되지 않았습니다. 실제 서비스에서는 KoreanLaw MCP와 연동하여 정확한 답변을 제공합니다.';

    msgs.innerHTML += `<div class="chat-msg bot">${reply}</div>`;
    msgs.scrollTop = msgs.scrollHeight;
  }, 600);

  msgs.scrollTop = msgs.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Init ──────────────────────────────────────────────────────
renderDashboard();
