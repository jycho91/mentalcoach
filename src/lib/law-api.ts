/**
 * 한국 법령정보센터 Open API 클라이언트
 * https://www.law.go.kr/DRF/lawSearch.do, lawService.do
 *
 * 환경변수 LAW_OC 가 필요하다 (오픈API 신청자 ID).
 * 호출자의 IP/도메인이 law.go.kr 에 사전 등록되어 있어야 한다.
 */

const LAW_API_BASE = 'https://www.law.go.kr/DRF';

function getOC(): string {
  const oc = process.env.LAW_OC;
  if (!oc) {
    throw new Error(
      'LAW_OC 환경변수가 설정되지 않았습니다. .env 또는 배포 환경에 등록하세요.'
    );
  }
  return oc;
}

/**
 * law.go.kr 은 종종 일시적으로 연결을 끊는다(ECONNRESET 등).
 * 실패 시 짧게 기다렸다가 재시도해 일시적 네트워크 오류를 흡수한다.
 *
 * @param url 호출할 URL
 * @param retries 추가 재시도 횟수 (기본 2회 → 최대 3번 시도)
 */
async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      // 5xx(서버 오류)면 재시도할 가치가 있음. 4xx는 그대로 반환(키/요청 문제).
      if (res.ok || res.status < 500) {
        return res;
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastError = e;
    }
    // 마지막 시도가 아니면 잠깐 대기 후 재시도 (0.5s, 1s ...)
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

// ============================================================================
// 타입
// ============================================================================

export interface LawSearchResult {
  /** 법령ID (법령마다 고정) */
  lawId: string;
  /** 법령일련번호 / MST (특정 시점 버전 식별자, 본문 조회에 사용) */
  mst: string;
  /** 법령명 (한글) */
  name: string;
  /** 소관 부처 */
  ministry: string;
  /** 시행일자 (YYYYMMDD) */
  effectiveDate: string;
  /** 현행/연혁 여부 */
  status: string;
  /** 법령 본문 상세 링크 (참고용) */
  detailLink: string;
}

export interface LawTextResult {
  /** 법령명 */
  name: string;
  /** 조문 본문 (전체 텍스트, 필요한 만큼 잘라서 사용) */
  fullText: string;
}

// ============================================================================
// 검색
// ============================================================================

/**
 * 법령을 이름/키워드로 검색한다.
 * 환각 방지의 기본 단계: AI 가 인용하려는 법령이 실제 존재하는지 확인.
 *
 * @param query 검색어 (예: "근로기준법")
 * @param maxResults 최대 결과 수 (기본 5)
 */
export async function searchLaw(
  query: string,
  maxResults = 5
): Promise<LawSearchResult[]> {
  const oc = getOC();
  const params = new URLSearchParams({
    OC: oc,
    target: 'law',
    type: 'JSON',
    query,
    display: String(maxResults),
  });

  const url = `${LAW_API_BASE}/lawSearch.do?${params.toString()}`;
  const res = await fetchWithRetry(url);

  if (!res.ok) {
    throw new Error(`법령 검색 실패 (HTTP ${res.status}): ${url}`);
  }

  const data = (await res.json()) as unknown;
  return parseSearchResponse(data);
}

interface RawLawItem {
  법령ID?: string;
  법령일련번호?: string;
  법령명한글?: string;
  소관부처명?: string;
  시행일자?: string | number;
  현행연혁코드?: string;
  법령상세링크?: string;
}

function parseSearchResponse(data: unknown): LawSearchResult[] {
  // 응답 구조 예: { LawSearch: { law: [...] | {...} } }
  const root = (data as { LawSearch?: { law?: RawLawItem | RawLawItem[] } })?.LawSearch;
  if (!root?.law) return [];
  const items = Array.isArray(root.law) ? root.law : [root.law];
  return items.map((item) => ({
    lawId: item.법령ID ?? '',
    mst: item.법령일련번호 ?? '',
    name: (item.법령명한글 ?? '').trim(),
    ministry: item.소관부처명 ?? '',
    effectiveDate: String(item.시행일자 ?? ''),
    status: item.현행연혁코드 ?? '',
    detailLink: item.법령상세링크 ?? '',
  }));
}

// ============================================================================
// 본문 조회
// ============================================================================

/**
 * 특정 법령의 본문(조문 텍스트)을 가져온다.
 * 환각 방지: AI 가 인용한 조문이 실제 본문에 있는지 대조하는 데 사용.
 *
 * @param mst searchLaw 결과의 mst (법령일련번호)
 * @param maxChars 본문 최대 길이. 너무 크면 컨텍스트 폭발로 모델이 빈 응답을 내므로 균형값 사용. 기본 30000자.
 */
export async function getLawText(mst: string, maxChars = 30000): Promise<LawTextResult> {
  const oc = getOC();
  const params = new URLSearchParams({
    OC: oc,
    target: 'law',
    type: 'JSON',
    MST: mst,
  });

  const url = `${LAW_API_BASE}/lawService.do?${params.toString()}`;
  const res = await fetchWithRetry(url);

  if (!res.ok) {
    throw new Error(`법령 본문 조회 실패 (HTTP ${res.status}): mst=${mst}`);
  }

  const data = (await res.json()) as unknown;
  return parseLawTextResponse(data, maxChars);
}

function parseLawTextResponse(data: unknown, maxChars: number): LawTextResult {
  // 응답 구조 예: { 법령: { 기본정보: { 법령명_한글: ... }, 조문: { 조문단위: [...] } } }
  const root = (data as { 법령?: Record<string, unknown> })?.법령;
  if (!root) {
    return { name: '', fullText: '' };
  }

  const basicInfo = (root.기본정보 as Record<string, unknown> | undefined) ?? {};
  const name = String(basicInfo.법령명_한글 ?? basicInfo.법령명 ?? '');

  // 조문 텍스트 모으기
  const articlesContainer = (root.조문 as Record<string, unknown> | undefined) ?? {};
  const articleUnits = articlesContainer.조문단위;
  const articles: Array<Record<string, unknown>> = Array.isArray(articleUnits)
    ? (articleUnits as Array<Record<string, unknown>>)
    : articleUnits
      ? [articleUnits as Record<string, unknown>]
      : [];

  const parts: string[] = [];
  for (const art of articles) {
    const num = String(art.조문번호 ?? '');
    const title = String(art.조문제목 ?? '');
    // 조문내용은 보통 제목만 들어있고, 실제 본문은 '항' 배열의 '항내용'에 있다.
    const head = title ? `제${num}조(${title})` : `제${num}조`;
    const lines: string[] = [head];

    // 항(項) 펼치기
    const hangRaw = (art as Record<string, unknown>).항;
    const hangs: Array<Record<string, unknown>> = Array.isArray(hangRaw)
      ? (hangRaw as Array<Record<string, unknown>>)
      : hangRaw
        ? [hangRaw as Record<string, unknown>]
        : [];

    if (hangs.length > 0) {
      for (const hang of hangs) {
        const hangText = String(hang.항내용 ?? '').trim();
        if (hangText) lines.push(hangText);

        // 호(號) 펼치기
        const hoRaw = hang.호;
        const hos: Array<Record<string, unknown>> = Array.isArray(hoRaw)
          ? (hoRaw as Array<Record<string, unknown>>)
          : hoRaw
            ? [hoRaw as Record<string, unknown>]
            : [];
        for (const ho of hos) {
          const hoText = String(ho.호내용 ?? '').trim();
          if (hoText) lines.push('  ' + hoText);
        }
      }
    } else {
      // 항이 없으면 조문내용을 그대로 사용 (제목+본문이 한 덩어리인 경우)
      const content = String(art.조문내용 ?? '').trim();
      if (content && content !== head) lines.push(content);
    }

    parts.push(lines.join('\n').trim());
  }

  let fullText = parts.join('\n\n').trim();
  if (fullText.length > maxChars) {
    fullText =
      fullText.slice(0, maxChars) +
      '\n\n⚠️ [경고: 법령 본문이 너무 길어 이 지점 이후가 생략되었습니다. ' +
      '생략된 뒷부분 조항은 이 응답으로 확인할 수 없으므로, 해당 조항을 인용해야 한다면 검증되지 않은 것으로 취급하십시오.]';
  }

  return { name, fullText };
}
