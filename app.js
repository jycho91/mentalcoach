// ============================================
// 마음 코치 앱
// ============================================

// ============================================
// 섹션 1: 상수 & 기본 설정
// ============================================
const DEFAULT_SETTINGS = {
  mode: null, // null이면 온보딩 필요
  onboardingDone: false,
  darkMode: false,
  apiKey: ''
};

const TRACKED_KEYWORDS = ['항상', '절대', '또', '어차피', '못', '안 돼', '최악', '매번', '절대로', '맨날'];
const EMOTION_KEYWORDS = ['힘들', '불안', '화가', '슬프', '기쁘', '좋았', '감사', '우울', '짜증', '외로', '행복', '편안', '걱정'];

// ============================================
// 섹션 2: 데이터 레이어 (localStorage)
// ============================================
function loadData(key) {
  try {
    const raw = localStorage.getItem('mindcoach_' + key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('데이터 로드 실패:', key, e);
    return null;
  }
}

function saveData(key, value) {
  try {
    localStorage.setItem('mindcoach_' + key, JSON.stringify(value));
  } catch (e) {
    console.error('데이터 저장 실패:', key, e);
  }
}

function getSettings() {
  return loadData('settings') || { ...DEFAULT_SETTINGS };
}

function saveSettings(settings) {
  saveData('settings', settings);
}

function getDailyRecords() {
  return loadData('dailyRecords') || {};
}

function saveDailyRecords(records) {
  saveData('dailyRecords', records);
}

function getConversations() {
  return loadData('conversations') || {};
}

function saveConversations(convos) {
  saveData('conversations', convos);
}

function getWeeklyReports() {
  return loadData('weeklyReports') || {};
}

function saveWeeklyReports(reports) {
  saveData('weeklyReports', reports);
}

function getSessionBriefings() {
  return loadData('sessionBriefings') || {};
}

function saveSessionBriefings(briefings) {
  saveData('sessionBriefings', briefings);
}

function getTasks() {
  return loadData('tasks') || [];
}

function saveTasks(tasks) {
  saveData('tasks', tasks);
}

// ============================================
// 섹션 3: 정량 계산 함수
// ============================================
function calculateQuantitativeData() {
  const records = getDailyRecords();
  const tasks = getTasks();
  const weekDates = getWeekDates();

  // 과제별 이행률
  const taskAdherence = {};
  let totalDone = 0;
  let totalCount = 0;

  tasks.forEach(task => {
    let done = 0;
    let recorded = 0;
    weekDates.forEach(date => {
      const rec = records[date];
      if (rec && rec.tasks) {
        const t = rec.tasks.find(rt => rt.id === task.id);
        if (t) {
          recorded++;
          if (t.done) done++;
        }
      }
    });
    taskAdherence[task.text] = { done, recorded, label: `${done}/${recorded}일` };
    totalDone += done;
    totalCount += recorded;
  });

  const overallAdherence = totalCount > 0
    ? Math.round((totalDone / totalCount) * 100) + '%'
    : '기록 없음';

  return { taskAdherence, overallAdherence, totalDone, totalCount };
}

function calculateExpressionFrequency() {
  const records = getDailyRecords();
  const conversations = getConversations();
  const weekDates = getWeekDates();

  // 1주일치 텍스트 모으기
  let allText = '';
  weekDates.forEach(date => {
    const rec = records[date];
    if (rec && rec.freeText) allText += ' ' + rec.freeText;
    if (rec && rec.tasks) {
      rec.tasks.forEach(t => {
        if (t.note) allText += ' ' + t.note;
      });
    }
    const convos = conversations[date];
    if (convos) {
      convos.forEach(msg => {
        if (msg.role === 'user') allText += ' ' + msg.content;
      });
    }
  });

  // 키워드 빈도 계산
  const keywordFreq = {};
  TRACKED_KEYWORDS.forEach(kw => {
    const regex = new RegExp(kw, 'g');
    const matches = allText.match(regex);
    if (matches && matches.length > 0) {
      keywordFreq[kw] = matches.length;
    }
  });

  const emotionFreq = {};
  EMOTION_KEYWORDS.forEach(kw => {
    const regex = new RegExp(kw, 'g');
    const matches = allText.match(regex);
    if (matches && matches.length > 0) {
      emotionFreq[kw] = matches.length;
    }
  });

  return { keywordFreq, emotionFreq };
}

// ============================================
// 섹션 4: API 호출
// ============================================
async function callClaude(systemPrompt, userMessage, maxTokens = 1000) {
  const settings = getSettings();

  if (!settings.apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    if (response.status === 401) throw new Error('API_KEY_INVALID');
    if (response.status === 429) throw new Error('RATE_LIMIT');
    throw new Error('API_ERROR: ' + response.status + ' ' + errBody);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function generateWeeklyReport() {
  const records = getDailyRecords();
  const conversations = getConversations();
  const weekDates = getWeekDates();
  const settings = getSettings();

  // 1주일 데이터 수집
  const weekData = {};
  weekDates.forEach(date => {
    weekData[date] = {
      record: records[date] || null,
      conversations: conversations[date] || []
    };
  });

  // 기록이 하나도 없으면 중단
  const hasData = weekDates.some(d => records[d] && records[d].freeText);
  if (!hasData) throw new Error('NO_DATA');

  const systemPrompt = '당신은 사용자의 감정 기록을 분석하는 따뜻한 코치입니다. 사용자의 1주일간 기록을 분석하여 반복되는 사고 습관을 감지하고, 일상적인 언어로 부드럽게 알려주세요. 절대로 \'인지 왜곡\', \'파국화\', \'흑백사고\' 같은 임상 전문 용어를 사용하지 마세요. 대신 구체적인 표현 예시를 들어 \'이런 습관이 보여요\'라고 설명하세요. 이것은 진단이 아니라 자기 인식을 돕는 것입니다.';

  let userContent = '아래는 사용자의 최근 1주일 기록입니다:\n\n';
  userContent += JSON.stringify(weekData, null, 2);

  if (settings.mode === 'counseling') {
    const quant = calculateQuantitativeData();
    userContent += '\n\n과제 이행 데이터:\n' + JSON.stringify(quant, null, 2);
  }

  userContent += '\n\n이 기록을 분석하여 다음을 JSON 형태로 제공하세요:\n';
  userContent += '{\n';
  userContent += '  "summary": "주간 감정 흐름 요약 (3~4문장, 따뜻한 톤)",\n';
  userContent += '  "frequentExpressions": ["자주 쓴 표현1", "표현2", ...],\n';
  userContent += '  "patterns": [{"pattern": "사고 습관 설명(일상 언어)", "examples": ["실제 표현 예시"]}],\n';
  userContent += '  "reframing": ["리프레이밍 제안1 (부드러운 질문 형태)", ...],\n';
  userContent += '  "emotionKeywords": {"감정1": 빈도수, ...}';

  if (settings.mode === 'counseling') {
    userContent += ',\n  "taskInsight": "과제 이행과 감정의 교차 분석 (있으면)"';
  }

  userContent += '\n}\nJSON만 출력하세요. 다른 텍스트는 포함하지 마세요.';

  const result = await callClaude(systemPrompt, userContent, 1500);
  return parseJsonResponse(result);
}

async function generateSessionBriefing() {
  const records = getDailyRecords();
  const conversations = getConversations();
  const weekDates = getWeekDates();

  const weekData = {};
  weekDates.forEach(date => {
    weekData[date] = {
      record: records[date] || null,
      conversations: conversations[date] || []
    };
  });

  const hasData = weekDates.some(d => records[d] && records[d].freeText);
  if (!hasData) throw new Error('NO_DATA');

  const quant = calculateQuantitativeData();
  const freq = calculateExpressionFrequency();

  const dataStr = JSON.stringify(weekData, null, 2);
  const quantStr = JSON.stringify(quant, null, 2);

  // 내담자용 프롬프트
  const clientSystem = '당신은 따뜻하고 공감적인 심리 코치입니다. 내담자가 다음 상담 세션을 주도적으로 준비할 수 있도록 도와주세요. 절대로 진단하거나 판단하지 마세요. 임상 전문 용어를 사용하지 마세요. 격려와 부드러운 제안 톤을 유지하세요.';
  const clientUser = `아래는 내담자의 최근 1주일 기록입니다:\n\n${dataStr}\n\n과제 이행 데이터:\n${quantStr}\n\n다음을 포함한 세션 준비 브리핑을 작성하세요:\n1. 이번 주 감정 흐름 요약 (따뜻한 톤, 전문 용어 없이)\n2. 다음 세션에서 꺼내볼 만한 주제 제안 2~3개\n3. 과제 이행 요약 (격려 톤)\n4. 반복 패턴 관련 부드러운 관찰\n\n마크다운 형식으로 작성하세요.`;

  // 상담사용 프롬프트
  const counselorSystem = '당신은 임상 심리 어시스턴트입니다. 상담사가 세션을 효율적으로 준비할 수 있도록 객관적이고 건조한 임상 톤으로 보고하세요. CBT 전문 용어(인지 왜곡, 파국화, 흑백사고, 과일반화 등)를 적극 사용하세요. 단, 정량적 수치(이행률, 빈도)는 별도로 제공될 예정이므로, 당신은 패턴 해석과 세션 어젠다 제안에 집중하세요.';
  const counselorUser = `아래는 내담자의 최근 1주일 기록입니다:\n\n${dataStr}\n\n과제 이행 데이터:\n${quantStr}\n\n다음을 포함한 임상 브리핑을 작성하세요:\n1. 감정 패턴 해석 (인지 왜곡 유형 명시)\n2. 미완료 과제의 맥락 분석 (회피, 동기 저하 등 임상적 해석)\n3. 세션 어젠다 제안 (긴급/중간/낮음 분류)\n4. 주의 필요 사항 (있을 경우)\n\n마크다운 형식으로 작성하세요.`;

  // 병렬 호출
  const [clientView, counselorView] = await Promise.all([
    callClaude(clientSystem, clientUser, 1000),
    callClaude(counselorSystem, counselorUser, 1000)
  ]);

  return { clientView, counselorView, quantitativeData: { ...quant, expressionFrequency: freq } };
}

function parseJsonResponse(text) {
  try {
    // JSON 블록 추출 시도
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return { rawText: text };
  } catch (e) {
    return { rawText: text };
  }
}

// ============================================
// 섹션 5: 라우터 & 네비게이션
// ============================================
function router() {
  const settings = getSettings();

  // 온보딩 미완료 시 강제 이동
  if (!settings.onboardingDone) {
    renderOnboarding();
    updateTabBar(null);
    return;
  }

  const hash = location.hash.replace('#', '') || 'record';

  // 상담 모드가 아닌데 상담 전용 탭이면 리다이렉트
  if (settings.mode !== 'counseling' && (hash === 'session' || hash === 'timeline')) {
    location.hash = '#record';
    return;
  }

  switch (hash) {
    case 'record':   renderRecordPage(); break;
    case 'chat':     renderChatPage(); break;
    case 'report':   renderReportPage(); break;
    case 'session':  renderSessionPage(); break;
    case 'timeline': renderTimelinePage(); break;
    default:         renderRecordPage(); break;
  }

  updateTabBar(hash);
}

function updateTabBar(activeTab) {
  const settings = getSettings();
  const tabBar = document.getElementById('tab-bar');
  const tabs = tabBar.querySelectorAll('.tab-btn');

  // 온보딩 중이면 탭바 숨김
  if (!settings.onboardingDone) {
    tabBar.classList.add('hidden');
    return;
  }

  tabBar.classList.remove('hidden');

  tabs.forEach(tab => {
    const tabName = tab.dataset.tab;
    tab.classList.toggle('active', tabName === activeTab);

    // 상담 모드가 아니면 session, timeline 탭 숨김
    if (tabName === 'session' || tabName === 'timeline') {
      tab.classList.toggle('hidden', settings.mode !== 'counseling');
    }
  });
}

// ============================================
// 섹션 6: 페이지 렌더 함수
// ============================================

// --- 온보딩 ---
function renderOnboarding() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="onboarding">
      <div class="onboarding-logo">&#127793;</div>
      <div class="onboarding-title">마음 코치</div>
      <div class="onboarding-question">현재 상담을 받고 계세요?</div>
      <div class="onboarding-buttons">
        <button class="btn btn-primary" data-action="onboard-yes">네</button>
        <button class="btn btn-secondary" data-action="onboard-no">아니요</button>
      </div>
      <div class="onboarding-hint">나중에 설정에서 변경할 수 있어요</div>
    </div>
  `;
}

function handleOnboarding(mode) {
  const settings = getSettings();
  settings.mode = mode;
  settings.onboardingDone = true;
  saveSettings(settings);
  location.hash = '#record';
  router();
}

// --- 오늘 기록 ---
function renderRecordPage() {
  const app = document.getElementById('app');
  const today = getTodayKey();
  const records = getDailyRecords();
  const existing = records[today] || {};
  const settings = getSettings();
  const tasks = getTasks();

  let tasksHtml = '';
  if (settings.mode === 'counseling' && tasks.length > 0) {
    const existingTasks = existing.tasks || [];
    const taskItems = tasks.map(task => {
      const saved = existingTasks.find(t => t.id === task.id);
      const isDone = saved ? saved.done : false;
      const note = saved ? saved.note || '' : '';
      return `
        <li class="task-item">
          <button class="task-checkbox ${isDone ? 'done' : ''}" data-task-id="${task.id}">
            ${isDone ? '&#10003;' : ''}
          </button>
          <div class="task-content">
            <div class="task-text ${isDone ? 'done' : ''}">${escapeHtml(task.text)}</div>
            ${!isDone ? `<input class="task-note-input" data-task-note="${task.id}" placeholder="어떤 점이 어려웠나요? (선택)" value="${escapeHtml(note)}">` : ''}
          </div>
        </li>
      `;
    }).join('');

    tasksHtml = `
      <div class="card" style="margin-top: 4px;">
        <div class="form-label">오늘의 과제</div>
        <ul class="task-list">${taskItems}</ul>
      </div>
    `;
  }

  app.innerHTML = `
    <div class="page-header">
      <div class="page-title">${formatDateKorean(today)}</div>
      <button class="settings-btn" data-action="open-settings">&#9881;</button>
    </div>
    <div class="card">
      <div class="form-group">
        <label class="form-label">오늘 어땠어요?</label>
        <textarea class="form-textarea" id="free-text" placeholder="오늘 하루를 자유롭게 적어보세요...">${escapeHtml(existing.freeText || '')}</textarea>
      </div>
    </div>
    ${tasksHtml}
    <button class="btn btn-primary btn-full btn-lg" data-action="save-record" style="margin-top: 8px;">
      오늘 기록 저장
    </button>
  `;
}

function saveRecord() {
  const freeText = document.getElementById('free-text').value.trim();
  const today = getTodayKey();
  const records = getDailyRecords();
  const settings = getSettings();
  const tasks = getTasks();

  const taskData = [];
  if (settings.mode === 'counseling') {
    tasks.forEach(task => {
      const checkbox = document.querySelector(`.task-checkbox[data-task-id="${task.id}"]`);
      const noteInput = document.querySelector(`[data-task-note="${task.id}"]`);
      taskData.push({
        id: task.id,
        text: task.text,
        done: checkbox ? checkbox.classList.contains('done') : false,
        note: noteInput ? noteInput.value.trim() : ''
      });
    });
  }

  records[today] = {
    freeText,
    tasks: taskData,
    createdAt: new Date().toISOString()
  };

  saveDailyRecords(records);
  showToast('저장했어요');
}

function toggleTask(taskId) {
  const checkbox = document.querySelector(`.task-checkbox[data-task-id="${taskId}"]`);
  if (!checkbox) return;

  const isDone = checkbox.classList.contains('done');
  const taskItem = checkbox.closest('.task-item');
  const taskText = taskItem.querySelector('.task-text');

  if (isDone) {
    checkbox.classList.remove('done');
    checkbox.innerHTML = '';
    taskText.classList.remove('done');
    // 메모 입력란 추가
    const taskContent = taskItem.querySelector('.task-content');
    if (!taskItem.querySelector('.task-note-input')) {
      const input = document.createElement('input');
      input.className = 'task-note-input';
      input.dataset.taskNote = taskId;
      input.placeholder = '어떤 점이 어려웠나요? (선택)';
      taskContent.appendChild(input);
    }
  } else {
    checkbox.classList.add('done');
    checkbox.innerHTML = '&#10003;';
    taskText.classList.add('done');
    // 메모 입력란 제거
    const noteInput = taskItem.querySelector('.task-note-input');
    if (noteInput) noteInput.remove();
  }
}

// --- AI 대화 (P1 - 플레이스홀더) ---
function renderChatPage() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="page-header">
      <div class="page-title">AI 대화</div>
      <button class="settings-btn" data-action="open-settings">&#9881;</button>
    </div>
    <div class="empty-state">
      <div class="empty-state-icon">&#128172;</div>
      <div class="empty-state-text">AI 대화 기능은 곧 추가될 예정이에요</div>
    </div>
  `;
}

// --- 주간 리포트 ---
function renderReportPage() {
  const app = document.getElementById('app');
  const weekKey = getWeekKey();
  const reports = getWeeklyReports();
  const existing = reports[weekKey];

  let contentHtml;
  if (existing) {
    contentHtml = renderReportContent(existing);
  } else {
    contentHtml = `
      <div class="empty-state">
        <div class="empty-state-icon">&#128202;</div>
        <div class="empty-state-text">이번 주 기록을 분석해서<br>사고 습관을 알려드릴게요</div>
      </div>
      <button class="btn btn-primary btn-full btn-lg" data-action="generate-report" style="margin-top: 16px;">
        리포트 생성하기
      </button>
    `;
  }

  app.innerHTML = `
    <div class="page-header">
      <div class="page-title">주간 리포트</div>
      <button class="settings-btn" data-action="open-settings">&#9881;</button>
    </div>
    ${contentHtml}
  `;
}

function renderReportContent(report) {
  const settings = getSettings();

  // rawText인 경우 (JSON 파싱 실패)
  if (report.rawText) {
    return `
      <div class="card">
        <div style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(report.rawText)}</div>
      </div>
      <button class="btn btn-secondary btn-full" data-action="generate-report" style="margin-top: 8px;">
        다시 생성하기
      </button>
    `;
  }

  let html = '';

  // 주간 감정 흐름 요약
  if (report.summary) {
    html += `
      <div class="card report-section">
        <div class="report-section-title">&#128172; 이번 주 감정 흐름</div>
        <div style="line-height: 1.7; font-size: 15px;">${escapeHtml(report.summary)}</div>
      </div>
    `;
  }

  // 자주 쓴 표현
  if (report.frequentExpressions && report.frequentExpressions.length > 0) {
    const chips = report.frequentExpressions.map(e => `<span class="chip">${escapeHtml(e)}</span>`).join('');
    html += `
      <div class="card report-section">
        <div class="report-section-title">&#128269; 자주 쓴 표현</div>
        <div>${chips}</div>
      </div>
    `;
  }

  // 사고 습관 패턴
  if (report.patterns && report.patterns.length > 0) {
    const patternCards = report.patterns.map(p => {
      const examples = p.examples ? p.examples.map(e => `"${escapeHtml(e)}"`).join(', ') : '';
      return `
        <div class="quote-card">
          <div style="margin-bottom: 6px;">${escapeHtml(p.pattern)}</div>
          ${examples ? `<div style="font-size: 13px; color: var(--color-text-secondary);">예시: ${examples}</div>` : ''}
        </div>
      `;
    }).join('');

    html += `
      <div class="card report-section">
        <div class="report-section-title">&#129504; 사고 습관 패턴</div>
        ${patternCards}
      </div>
    `;
  }

  // 리프레이밍 제안
  if (report.reframing && report.reframing.length > 0) {
    const items = report.reframing.map(r => `
      <div class="quote-card" style="border-left-color: var(--color-success);">
        ${escapeHtml(r)}
      </div>
    `).join('');

    html += `
      <div class="card report-section">
        <div class="report-section-title">&#128161; 다르게 생각해볼까요?</div>
        ${items}
      </div>
    `;
  }

  // 감정 키워드 빈도
  if (report.emotionKeywords && Object.keys(report.emotionKeywords).length > 0) {
    const chips = Object.entries(report.emotionKeywords)
      .sort((a, b) => b[1] - a[1])
      .map(([kw, count]) => `<span class="chip chip-emotion">${escapeHtml(kw)} ${count}회</span>`)
      .join('');
    html += `
      <div class="card report-section">
        <div class="report-section-title">&#128200; 감정 키워드</div>
        <div>${chips}</div>
      </div>
    `;
  }

  // 상담 모드: 과제 인사이트
  if (settings.mode === 'counseling' && report.taskInsight) {
    html += `
      <div class="card report-section">
        <div class="report-section-title">&#9989; 과제 이행 분석</div>
        <div style="line-height: 1.7; font-size: 15px;">${escapeHtml(report.taskInsight)}</div>
      </div>
    `;
  }

  // 상담 모드: 정량 이행률
  if (settings.mode === 'counseling') {
    const quant = calculateQuantitativeData();
    if (Object.keys(quant.taskAdherence).length > 0) {
      const bars = Object.entries(quant.taskAdherence).map(([name, data]) => {
        const pct = data.recorded > 0 ? Math.round((data.done / data.recorded) * 100) : 0;
        return `
          <div class="adherence-bar">
            <span class="adherence-label">${escapeHtml(name)}</span>
            <div class="adherence-track"><div class="adherence-fill" style="width: ${pct}%"></div></div>
            <span class="adherence-value">${data.label}</span>
          </div>
        `;
      }).join('');

      html += `
        <div class="card report-section">
          <div class="report-section-title">&#128203; 과제 이행률 (전체 ${quant.overallAdherence})</div>
          ${bars}
        </div>
      `;
    }
  }

  html += `
    <button class="btn btn-secondary btn-full" data-action="generate-report" style="margin-top: 8px;">
      다시 생성하기
    </button>
  `;

  return html;
}

async function handleGenerateReport() {
  const app = document.getElementById('app');
  const settings = getSettings();

  if (!settings.apiKey) {
    showToast('설정에서 API 키를 입력해주세요');
    return;
  }

  // 기존 헤더 유지하고 콘텐츠만 로딩으로 교체
  const header = app.querySelector('.page-header');
  const headerHtml = header ? header.outerHTML : '';
  app.innerHTML = `
    ${headerHtml}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">AI가 이번 주를 돌아보고 있어요...</div>
    </div>
  `;

  try {
    const report = await generateWeeklyReport();
    const weekKey = getWeekKey();
    const reports = getWeeklyReports();
    reports[weekKey] = { ...report, generatedAt: new Date().toISOString() };
    saveWeeklyReports(reports);
    renderReportPage();
  } catch (err) {
    if (err.message === 'NO_DATA') {
      app.innerHTML = `
        ${headerHtml}
        <div class="empty-state">
          <div class="empty-state-icon">&#128221;</div>
          <div class="empty-state-text">이번 주 기록이 아직 없어요.<br>먼저 기록을 남겨보세요!</div>
        </div>
      `;
    } else if (err.message === 'API_KEY_MISSING') {
      showToast('설정에서 API 키를 입력해주세요');
      renderReportPage();
    } else if (err.message === 'API_KEY_INVALID') {
      showToast('API 키가 올바르지 않아요');
      renderReportPage();
    } else {
      showToast('오류가 발생했어요. 다시 시도해주세요.');
      console.error('리포트 생성 오류:', err);
      renderReportPage();
    }
  }
}

// --- 세션 준비 (상담 모드) ---
let currentBriefingView = 'client'; // 'client' 또는 'counselor'

function renderSessionPage() {
  const app = document.getElementById('app');
  const briefings = getSessionBriefings();

  // 가장 최근 브리핑 찾기
  const keys = Object.keys(briefings).sort().reverse();
  const latestKey = keys[0];
  const existing = latestKey ? briefings[latestKey] : null;

  let contentHtml;
  if (existing) {
    contentHtml = renderBriefingContent(existing);
  } else {
    contentHtml = `
      <div class="empty-state">
        <div class="empty-state-icon">&#128203;</div>
        <div class="empty-state-text">다음 세션 전에<br>이번 주를 정리해드릴게요</div>
      </div>
    `;
  }

  app.innerHTML = `
    <div class="page-header">
      <div class="page-title">세션 준비</div>
      <button class="settings-btn" data-action="open-settings">&#9881;</button>
    </div>
    <div class="toggle-container">
      <button class="toggle-btn ${currentBriefingView === 'client' ? 'active' : ''}" data-action="toggle-client">
        &#127793; 내담자 뷰
      </button>
      <button class="toggle-btn ${currentBriefingView === 'counselor' ? 'active' : ''}" data-action="toggle-counselor">
        &#129658; 상담사 뷰
      </button>
    </div>
    <div id="briefing-area">
      ${contentHtml}
    </div>
    <button class="btn btn-primary btn-full btn-lg" data-action="generate-briefing" style="margin-top: 12px;">
      ${existing ? '다시 생성하기' : '브리핑 생성하기'}
    </button>
  `;
}

function renderBriefingContent(briefing) {
  if (currentBriefingView === 'client') {
    return `
      <div class="briefing-content card">
        <div style="white-space: pre-wrap; line-height: 1.7; font-size: 15px;">${renderMarkdown(briefing.clientView)}</div>
      </div>
    `;
  } else {
    // 상담사 뷰: 정량 + AI 해석 분리
    let quantHtml = '';
    const qd = briefing.quantitativeData;

    if (qd) {
      // 이행률 바
      let adherenceHtml = '';
      if (qd.taskAdherence && Object.keys(qd.taskAdherence).length > 0) {
        const bars = Object.entries(qd.taskAdherence).map(([name, data]) => {
          const pct = data.recorded > 0 ? Math.round((data.done / data.recorded) * 100) : 0;
          return `
            <div class="adherence-bar">
              <span class="adherence-label">${escapeHtml(name)}</span>
              <div class="adherence-track"><div class="adherence-fill" style="width: ${pct}%"></div></div>
              <span class="adherence-value">${data.label}</span>
            </div>
          `;
        }).join('');
        adherenceHtml = `
          <div style="margin-bottom: 12px;">
            <strong>과제 이행률 (전체 ${qd.overallAdherence})</strong>
            <div style="margin-top: 8px;">${bars}</div>
          </div>
        `;
      }

      // 표현 빈도
      let freqHtml = '';
      if (qd.expressionFrequency && qd.expressionFrequency.keywordFreq) {
        const badges = Object.entries(qd.expressionFrequency.keywordFreq)
          .sort((a, b) => b[1] - a[1])
          .map(([kw, count]) => `<span class="freq-badge">${escapeHtml(kw)} <span class="count">${count}회</span></span>`)
          .join('');
        if (badges) {
          freqHtml = `
            <div>
              <strong>추적 키워드 빈도</strong>
              <div style="margin-top: 8px;">${badges}</div>
            </div>
          `;
        }
      }

      if (adherenceHtml || freqHtml) {
        quantHtml = `
          <div class="quant-section">
            <div class="section-label">&#128202; 정량 데이터 (코드 계산)</div>
            ${adherenceHtml}
            ${freqHtml}
          </div>
        `;
      }
    }

    return `
      <div class="briefing-content">
        ${quantHtml}
        <div class="ai-section">
          <div class="section-label">&#129504; AI 해석</div>
          <div style="white-space: pre-wrap; line-height: 1.7; font-size: 14px;">${renderMarkdown(briefing.counselorView)}</div>
        </div>
        <div class="disclaimer">
          &#9888;&#65039; 본 브리핑은 AI가 생성한 참고자료이며, 임상적 판단을 대체하지 않습니다. 최종 판단은 상담사에게 있습니다.
        </div>
      </div>
    `;
  }
}

async function handleGenerateBriefing() {
  const settings = getSettings();

  if (!settings.apiKey) {
    showToast('설정에서 API 키를 입력해주세요');
    return;
  }

  const briefingArea = document.getElementById('briefing-area');
  if (!briefingArea) return;

  briefingArea.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">브리핑을 준비하고 있어요...</div>
    </div>
  `;

  // 생성 버튼 비활성화
  const genBtn = document.querySelector('[data-action="generate-briefing"]');
  if (genBtn) { genBtn.disabled = true; genBtn.textContent = '생성 중...'; }

  try {
    const result = await generateSessionBriefing();
    const today = getTodayKey();
    const briefings = getSessionBriefings();
    briefings[today] = { ...result, generatedAt: new Date().toISOString() };
    saveSessionBriefings(briefings);
    renderSessionPage();
  } catch (err) {
    if (err.message === 'NO_DATA') {
      briefingArea.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">&#128221;</div>
          <div class="empty-state-text">이번 주 기록이 없어요.<br>먼저 기록을 남겨보세요!</div>
        </div>
      `;
    } else if (err.message === 'API_KEY_MISSING') {
      showToast('설정에서 API 키를 입력해주세요');
    } else if (err.message === 'API_KEY_INVALID') {
      showToast('API 키가 올바르지 않아요');
    } else {
      showToast('오류가 발생했어요. 다시 시도해주세요.');
      console.error('브리핑 생성 오류:', err);
    }
    if (genBtn) { genBtn.disabled = false; genBtn.textContent = '브리핑 생성하기'; }
  }
}

function switchBriefingView(view) {
  currentBriefingView = view;
  renderSessionPage();
}

// --- 타임라인 (P2 - 플레이스홀더) ---
function renderTimelinePage() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="page-header">
      <div class="page-title">타임라인</div>
      <button class="settings-btn" data-action="open-settings">&#9881;</button>
    </div>
    <div class="empty-state">
      <div class="empty-state-icon">&#128197;</div>
      <div class="empty-state-text">타임라인 기능은 곧 추가될 예정이에요</div>
    </div>
  `;
}

// ============================================
// 섹션 7: 설정 모달
// ============================================
function openSettings() {
  const settings = getSettings();
  const tasks = getTasks();

  const tasksListHtml = tasks.map(t => `
    <div class="task-manage-item">
      <span class="task-manage-text">${escapeHtml(t.text)}</span>
      <button class="task-delete-btn" data-action="delete-task" data-task-id="${t.id}">&times;</button>
    </div>
  `).join('');

  document.getElementById('settings-body').innerHTML = `
    <div class="settings-section">
      <div class="settings-section-title">모드</div>
      <div class="mode-select">
        <button class="mode-option ${settings.mode === 'general' ? 'active' : ''}" data-action="set-mode" data-mode="general">
          &#127793; 일반
        </button>
        <button class="mode-option ${settings.mode === 'counseling' ? 'active' : ''}" data-action="set-mode" data-mode="counseling">
          &#128154; 상담
        </button>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">API 키</div>
      <input class="form-input" id="api-key-input" type="password"
        placeholder="Claude API 키를 입력하세요"
        value="${escapeHtml(settings.apiKey || '')}">
      <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 6px;">
        Anthropic Console에서 발급받은 API 키를 입력하세요
      </div>
    </div>

    <div class="settings-section ${settings.mode !== 'counseling' ? 'hidden' : ''}" id="task-settings">
      <div class="settings-section-title">과제 관리</div>
      <div id="task-manage-list">${tasksListHtml || '<div style="color: var(--color-text-secondary); font-size: 14px;">등록된 과제가 없어요</div>'}</div>
      <div class="task-add-row">
        <input class="form-input" id="new-task-input" placeholder="새 과제 입력">
        <button class="btn btn-secondary" data-action="add-task">추가</button>
      </div>
    </div>

    <div class="settings-section" style="margin-top: 32px;">
      <button class="btn btn-danger btn-full" data-action="reset-data">
        데이터 초기화
      </button>
      <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 6px; text-align: center;">
        모든 기록이 삭제됩니다
      </div>
    </div>
  `;

  document.getElementById('settings-modal').classList.remove('hidden');
  document.getElementById('settings-overlay').classList.remove('hidden');
  document.getElementById('settings-modal').setAttribute('aria-hidden', 'false');
  document.getElementById('settings-overlay').setAttribute('aria-hidden', 'false');
}

function closeSettings() {
  // API 키 저장
  const apiKeyInput = document.getElementById('api-key-input');
  if (apiKeyInput) {
    const settings = getSettings();
    settings.apiKey = apiKeyInput.value.trim();
    saveSettings(settings);
  }

  document.getElementById('settings-modal').classList.add('hidden');
  document.getElementById('settings-overlay').classList.add('hidden');
  document.getElementById('settings-modal').setAttribute('aria-hidden', 'true');
  document.getElementById('settings-overlay').setAttribute('aria-hidden', 'true');

  // 현재 페이지 다시 렌더
  router();
}

function setMode(mode) {
  const settings = getSettings();
  settings.mode = mode;
  saveSettings(settings);

  // 모달 내 UI 업데이트
  document.querySelectorAll('.mode-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  const taskSettings = document.getElementById('task-settings');
  if (taskSettings) {
    taskSettings.classList.toggle('hidden', mode !== 'counseling');
  }
}

function addTask() {
  const input = document.getElementById('new-task-input');
  if (!input || !input.value.trim()) return;

  const tasks = getTasks();
  tasks.push({
    id: 't' + Date.now(),
    text: input.value.trim(),
    createdAt: new Date().toISOString()
  });
  saveTasks(tasks);
  input.value = '';

  // 설정 모달 새로고침
  openSettings();
}

function deleteTask(taskId) {
  const tasks = getTasks().filter(t => t.id !== taskId);
  saveTasks(tasks);
  openSettings();
}

function resetData() {
  if (confirm('모든 기록이 삭제됩니다. 정말 초기화할까요?')) {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('mindcoach_'));
    keys.forEach(k => localStorage.removeItem(k));
    closeSettings();
    location.hash = '';
    router();
  }
}

// ============================================
// 섹션 8: 유틸리티
// ============================================
function getTodayKey() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function formatDateKorean(dateStr) {
  const d = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}

function getWeekKey() {
  const d = new Date();
  const year = d.getFullYear();
  // ISO 주차 계산
  const jan4 = new Date(year, 0, 4);
  const start = new Date(year, 0, 1 + ((1 - jan4.getDay() + 7) % 7));
  const weekNum = Math.ceil(((d - start) / 86400000 + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

function getWeekDates() {
  // 최근 7일 날짜 배열
  const dates = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0'));
  }
  return dates;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderMarkdown(text) {
  if (!text) return '';
  // 간단한 마크다운 렌더링
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gm, '<h4 style="margin: 12px 0 6px;">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 style="margin: 14px 0 8px;">$1</h3>')
    .replace(/^# (.*$)/gm, '<h2 style="margin: 16px 0 10px;">$1</h2>')
    .replace(/^- (.*$)/gm, '<div style="padding-left: 16px; margin: 2px 0;">&#8226; $1</div>')
    .replace(/^(\d+)\. (.*$)/gm, '<div style="padding-left: 16px; margin: 2px 0;">$1. $2</div>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.add('hidden'), 2000);
}

// ============================================
// 섹션 9: 이벤트 위임 & 앱 초기화
// ============================================

// 이벤트 위임: 모든 클릭을 #app, 탭바, 모달에서 한 번에 처리
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;

  switch (action) {
    // 온보딩
    case 'onboard-yes':  handleOnboarding('counseling'); break;
    case 'onboard-no':   handleOnboarding('general'); break;

    // 기록
    case 'save-record':  saveRecord(); break;

    // 과제 체크
    case 'toggle-task':  break; // task-checkbox는 별도 처리

    // 리포트
    case 'generate-report': handleGenerateReport(); break;

    // 세션 브리핑
    case 'generate-briefing': handleGenerateBriefing(); break;
    case 'toggle-client':    switchBriefingView('client'); break;
    case 'toggle-counselor': switchBriefingView('counselor'); break;

    // 설정
    case 'open-settings':  openSettings(); break;
    case 'close-settings': closeSettings(); break;
    case 'set-mode':       setMode(target.dataset.mode); break;
    case 'add-task':       addTask(); break;
    case 'delete-task':    deleteTask(target.dataset.taskId); break;
    case 'reset-data':     resetData(); break;
  }
});

// 과제 체크박스 클릭 (이벤트 위임)
document.addEventListener('click', (e) => {
  const checkbox = e.target.closest('.task-checkbox');
  if (checkbox) {
    toggleTask(checkbox.dataset.taskId);
  }
});

// 탭바 클릭
document.getElementById('tab-bar').addEventListener('click', (e) => {
  const tabBtn = e.target.closest('.tab-btn');
  if (tabBtn && !tabBtn.classList.contains('hidden')) {
    location.hash = '#' + tabBtn.dataset.tab;
  }
});

// 설정 닫기
document.getElementById('settings-close').addEventListener('click', closeSettings);
document.getElementById('settings-overlay').addEventListener('click', closeSettings);

// 라우터
window.addEventListener('hashchange', router);

// 앱 시작
router();
console.log('마음 코치 앱 시작!');
