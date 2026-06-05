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
  /** 검증 수행 가능 여부 (법령 본문을 가져왔는지) */
  checked: boolean;
  /** 인용이 본문과 일치하는지 (checked=false면 의미 없음) */
  consistent: boolean;
  /** 사람이 읽을 경고 메시지 (문제 있을 때만 채워짐) */
  note: string;
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

/**
 * 하나의 인용(sourceArticle)을 실제 법령 본문과 대조한다.
 *
 * @param citation AI가 인용한 조문 텍스트 (sourceArticle)
 */
export async function verifyCitation(citation: string): Promise<CitationVerifyResult> {
  // 이미 미검증으로 표시된 건 검사 불필요
  if (!citation || citation.includes('[미검증]')) {
    return { checked: false, consistent: false, note: '' };
  }

  const lawName = extractLawName(citation);
  if (!lawName) {
    // 법령명을 못 뽑으면 검증 스킵 (오탐 방지)
    return { checked: false, consistent: false, note: '' };
  }

  try {
    const results = await searchLaw(lawName, 1);
    if (results.length === 0) {
      return {
        checked: true,
        consistent: false,
        note: `법령 "${lawName}"을(를) 법령DB에서 찾지 못해 인용을 검증하지 못했습니다.`,
      };
    }
    const body = await getLawText(results[0].mst);
    if (!body.fullText) {
      return { checked: false, consistent: false, note: '' };
    }

    const normalizedBody = normalize(body.fullText);
    const numbers = extractNumberTokens(citation);
    // 인용에 숫자가 없으면 (조문 존재만으로) 일치로 본다
    if (numbers.length === 0) {
      return { checked: true, consistent: true, note: '' };
    }

    // 인용된 숫자 중 본문에 없는 게 있으면 불일치
    const missing = numbers.filter((n) => !normalizedBody.includes(normalize(n)));
    if (missing.length > 0) {
      return {
        checked: true,
        consistent: false,
        note: `인용에 사용된 수치(${missing.join(', ')})가 실제 법령 본문에서 확인되지 않습니다. 원문 재확인이 필요합니다.`,
      };
    }

    return { checked: true, consistent: true, note: '' };
  } catch (e) {
    console.error('[verifyCitation] 검증 중 오류:', e);
    return { checked: false, consistent: false, note: '' };
  }
}
