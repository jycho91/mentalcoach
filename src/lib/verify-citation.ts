/**
 * 인용 검증 레이어
 *
 * AI가 스캔/개정안에서 인용한 조문(sourceArticle)을 실제 법령정보센터 본문과
 * 대조해, 본문에 없는 숫자(일수·횟수·기간 등)를 인용했는지 검출한다.
 *
 * 목적: AI가 "본문 봤다"고 착각하며 틀린 숫자를 자신있게 답할 때(미검증 표시도 없이)
 * 코드가 기계적으로 잡아낸다.
 *
 * 한계: "조문 번호/숫자가 본문에 존재하는가"만 본다. (해석의 정합성까지는 못 봄)
 */

import { searchLaw, getLawText } from '@/lib/law-api';

export interface CitationVerifyResult {
  /**
   * 검증 상태
   * - 'ok': 검증 완료, 본문과 일치
   * - 'mismatch': 검증 완료, 본문과 불일치(환각·단서누락 등)
   * - 'unverifiable': 검증 시도했으나 법령 조회 실패 등으로 확인 불가
   * - 'skip': 검증 대상 아님(이미 [미검증] 표시, 법령명 추출 불가 등) → 표시 안 함
   */
  status: 'ok' | 'mismatch' | 'unverifiable' | 'skip';
  /** 사람이 읽을 경고 메시지 (문제 있을 때만 채워짐) */
  note: string;
  // ↓ 하위호환용 (기존 호출부가 쓰던 필드)
  /** @deprecated status 사용 권장 */
  checked: boolean;
  /** @deprecated status 사용 권장 */
  consistent: boolean;
}

/** 인용 문자열에서 법령명을 추출 (예: "남녀고용평등...법률 제18조..." → 법령명) */
function extractLawName(citation: string): string | null {
  // "○○법" 또는 "○○에 관한 법률" 패턴을 넓게 잡는다.
  const m =
    citation.match(/[가-힣ㆍ·\s]+?에 관한 법률/) ||
    citation.match(/[가-힣]+법(?:\s|제|\(|$)/);
  if (!m) return null;
  return m[0].replace(/\s*(제|\().*$/, '').trim();
}

/** 인용 문자열에서 핵심 숫자 토큰 추출 (예: "6일", "20일", "3회", "1년", "6개월") */
function extractNumberTokens(citation: string): string[] {
  const tokens = citation.match(/\d+\s*(일|회|개월|년|시간|세|퍼센트|%|명|원)/g) || [];
  // 공백 제거 후 중복 제거
  return Array.from(new Set(tokens.map((t) => t.replace(/\s+/g, ''))));
}

/** 본문 텍스트를 비교용으로 정규화 (공백 제거) */
function normalize(text: string): string {
  return text.replace(/\s+/g, '');
}

/** 인용에서 항 번호(①②③④ 또는 "제2항")를 추출 */
function extractClauseNumbers(citation: string): number[] {
  const nums = new Set<number>();
  // 원문자 ①~⑮
  const circled = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮';
  for (const ch of citation) {
    const idx = circled.indexOf(ch);
    if (idx >= 0) nums.add(idx + 1);
  }
  // "제N항" 형태
  const m = citation.matchAll(/제\s*(\d+)\s*항/g);
  for (const x of m) nums.add(Number(x[1]));
  return Array.from(nums);
}

/**
 * 본문에서 특정 항(項)의 텍스트 한 덩어리를 잘라낸다.
 * (해당 항 원문자부터 다음 항 원문자 전까지)
 */
function extractClauseBody(fullText: string, clauseNum: number): string | null {
  const circled = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮';
  const mark = circled[clauseNum - 1];
  if (!mark) return null;
  const start = fullText.indexOf(mark);
  if (start < 0) return null;
  // 다음 항 마커 위치 찾기
  const nextMark = circled[clauseNum];
  let end = nextMark ? fullText.indexOf(nextMark, start + 1) : -1;
  if (end < 0) end = Math.min(fullText.length, start + 500); // 못 찾으면 적당히 자름
  return fullText.slice(start, end);
}

/**
 * 본문에서 특정 조(條) 영역만 잘라낸다. (예: 제19조 ~ 제19조의2 직전)
 * 같은 ②가 법 전체에 여러 개 있으므로, 항을 찾기 전 조 영역으로 먼저 좁힌다.
 */
function extractArticleRegion(fullText: string, articleNum: number): string | null {
  // "제19조(" 또는 "제19조\n" 형태로 시작 지점 찾기
  const startRe = new RegExp(`제${articleNum}조(?![0-9의])`);
  const startM = fullText.match(startRe);
  if (!startM || startM.index === undefined) return null;
  const start = startM.index;
  // 다음 조(제20조 등) 또는 제19조의2 시작 전까지
  const after = fullText.slice(start + 1);
  const nextRe = new RegExp(`제${articleNum}조의|제${articleNum + 1}조`);
  const nextM = after.match(nextRe);
  const end = nextM && nextM.index !== undefined ? start + 1 + nextM.index : fullText.length;
  return fullText.slice(start, end);
}

/**
 * 단서 누락 검출: 인용이 참조한 항(예: 제2항)의 실제 본문에
 * "다만" 단서나 추가 수치가 있는데 인용에서 빠졌으면 경고.
 * (육아휴직 제2항 "1년 이내" 만 적고 "다만 6개월 추가" 누락하는 패턴 대응)
 */
function detectMissingProviso(
  citation: string,
  fullText: string
): string | null {
  const clauseNums = extractClauseNumbers(citation);
  if (clauseNums.length === 0) return null;

  // 인용에서 조(條) 번호 추출 → 본문을 해당 조 영역으로 좁힘 (오탐 방지 핵심)
  const artM = citation.match(/제\s*(\d+)\s*조/);
  const searchBody = artM
    ? extractArticleRegion(fullText, Number(artM[1])) ?? fullText
    : fullText;

  const normCitation = normalize(citation);
  for (const num of clauseNums) {
    const clauseBody = extractClauseBody(searchBody, num);
    if (!clauseBody) continue;
    // 본문 해당 항에 "다만" 단서가 있는가?
    if (clauseBody.includes('다만')) {
      // 인용에 "다만"이 없으면 누락 의심
      if (!normCitation.includes('다만')) {
        // 단서에 들어있는 수치 중 인용에 빠진 것 찾기
        const provisoNums =
          (clauseBody.split('다만')[1] || '').match(
            /\d+\s*(일|회|개월|년|시간|세|명|원|%)/g
          ) || [];
        const missingProviso = provisoNums
          .map((t) => t.replace(/\s+/g, ''))
          .filter((t) => !normCitation.includes(t));
        const detail =
          missingProviso.length > 0 ? ` (예: ${missingProviso.join(', ')})` : '';
        return `제${num}항에 '다만' 단서(예외 조항)가 있으나 인용에서 누락된 것으로 보입니다${detail}. 원문 재확인이 필요합니다.`;
      }
    }
  }
  return null;
}

/**
 * 하나의 인용(sourceArticle)을 실제 법령 본문과 대조한다.
 *
 * @param citation AI가 인용한 조문 텍스트 (sourceArticle)
 */
// 결과 생성 헬퍼 (status → checked/consistent 하위호환 자동 채움)
function mk(status: CitationVerifyResult['status'], note = ''): CitationVerifyResult {
  return {
    status,
    note,
    checked: status === 'ok' || status === 'mismatch',
    consistent: status === 'ok',
  };
}

export async function verifyCitation(citation: string): Promise<CitationVerifyResult> {
  // 이미 미검증으로 표시된 건 검사 불필요 → 표시 안 함
  if (!citation || citation.includes('[미검증]')) {
    return mk('skip');
  }

  const lawName = extractLawName(citation);
  if (!lawName) {
    // 법령명을 못 뽑으면 검증 스킵 (오탐 방지) → 표시 안 함
    return mk('skip');
  }

  try {
    const results = await searchLaw(lawName, 1);
    if (results.length === 0) {
      // 법령 검색 실패 → 검증 불가
      return mk(
        'unverifiable',
        `법령 "${lawName}"을(를) 법령DB에서 조회하지 못해 자동 검증을 수행하지 못했습니다. 원문을 직접 확인하세요.`
      );
    }
    const body = await getLawText(results[0].mst);
    if (!body.fullText) {
      // 본문 조회 실패 → 검증 불가
      return mk(
        'unverifiable',
        '법령 본문을 가져오지 못해 자동 검증을 수행하지 못했습니다. 원문을 직접 확인하세요.'
      );
    }

    const normalizedBody = normalize(body.fullText);
    const numbers = extractNumberTokens(citation);
    // 인용에 숫자가 없으면 (조문 존재만으로) 일치로 본다
    if (numbers.length === 0) {
      return mk('ok');
    }

    // 인용된 숫자 중 본문에 없는 게 있으면 불일치 (환각 검출)
    const missing = numbers.filter((n) => !normalizedBody.includes(normalize(n)));
    if (missing.length > 0) {
      return mk(
        'mismatch',
        `인용에 사용된 수치(${missing.join(', ')})가 실제 법령 본문에서 확인되지 않습니다. 원문 재확인이 필요합니다.`
      );
    }

    // 단서(다만) 누락 검출 — "1년 이내"만 적고 "다만 6개월 추가"를 빠뜨린 경우
    const provisoNote = detectMissingProviso(citation, body.fullText);
    if (provisoNote) {
      return mk('mismatch', provisoNote);
    }

    return mk('ok');
  } catch (e) {
    // law.go.kr 연결 끊김(ECONNRESET) 등 → 검증 불가
    console.error('[verifyCitation] 검증 중 오류:', e);
    return mk(
      'unverifiable',
      '법령 서버 연결 오류로 자동 검증을 수행하지 못했습니다. 원문을 직접 확인하세요.'
    );
  }
}
