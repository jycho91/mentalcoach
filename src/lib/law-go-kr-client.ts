/**
 * @fileOverview law.go.kr 판례 검색 REST API 클라이언트
 *
 * API 문서: https://www.law.go.kr/DRF/lawSearch.do?OC={key}&target=prec&type=JSON&query={keyword}&display=5
 * API key 미설정 시 mock 데이터를 반환합니다.
 */

/** 판례 정보 */
export interface Precedent {
  /** 판례일련번호 또는 사건번호 */
  caseNumber: string;
  /** 사건명 */
  caseName: string;
  /** 법원명 */
  court: string;
  /** 선고일자 */
  date: string;
  /** 판시사항 또는 판결요지 (요약) */
  summary: string;
  /** 관련 법령 */
  relatedLaws: string[];
  /** 판결내용 (간략) */
  verdict: string;
}

/** 판례 검색 결과 */
export interface PrecedentSearchResult {
  precedents: Precedent[];
  totalCount: number;
  /** API key 미설정 시 true */
  isMock: boolean;
}

/** law.go.kr API 응답 내 개별 판례 항목 형태 */
interface LawPrecItem {
  판례일련번호?: string;
  사건명?: string;
  법원명?: string;
  선고일자?: string;
  판시사항?: string;
  판결요지?: string;
  관련법령?: string;
  판례내용?: string;
}

/** law.go.kr API 응답 최상위 구조 */
interface LawApiResponse {
  PrecSearch?: {
    prec?: LawPrecItem | LawPrecItem[];
    totalCnt?: string | number;
  };
}

/**
 * 노동법 관련 mock 판례 데이터 (API key 미설정 시 사용)
 */
const MOCK_PRECEDENTS: Precedent[] = [
  {
    caseNumber: '2019다200111',
    caseName: '부당해고구제재심판정취소',
    court: '대법원',
    date: '2020-03-12',
    summary:
      '사용자가 근로자를 해고할 때에는 근로기준법 제27조에 따라 해고 사유와 해고 시기를 서면으로 통지하여야 하며, 이를 위반한 해고는 효력이 없다.',
    relatedLaws: ['근로기준법 제27조', '근로기준법 제28조'],
    verdict:
      '원심판결 파기환송. 서면 통지 요건을 갖추지 못한 해고는 절차적 하자로 무효.',
  },
  {
    caseNumber: '2021두48521',
    caseName: '최저임금위반과태료부과처분취소',
    court: '서울고등법원',
    date: '2022-05-20',
    summary:
      '사용자는 최저임금법 제6조에 따라 최저임금액 이상의 임금을 지급하여야 하고, 수습기간 중 최저임금 감액 적용은 1년 이상 계약직에 한하며 수습 시작일로부터 3개월 이내로 제한된다.',
    relatedLaws: ['최저임금법 제6조', '최저임금법 제28조'],
    verdict:
      '원고 청구 기각. 수습 감액 요건을 충족하지 못한 사업주에 대한 과태료 부과 처분은 적법.',
  },
];

/**
 * law.go.kr에서 판례를 검색합니다.
 *
 * @param keyword - 검색 키워드
 * @param lawName - 관련 법령명
 * @returns 판례 검색 결과. API key 미설정 시 mock 데이터 반환.
 */
export async function searchPrecedents(
  keyword: string,
  lawName: string
): Promise<PrecedentSearchResult> {
  const apiKey = process.env.LAW_GO_KR_API_KEY;
  const baseUrl = process.env.LAW_GO_KR_API_URL;

  if (!apiKey || !baseUrl) {
    console.warn('law.go.kr API key 미설정. Mock 데이터를 반환합니다.');
    return {
      precedents: MOCK_PRECEDENTS,
      totalCount: MOCK_PRECEDENTS.length,
      isMock: true,
    };
  }

  const query = encodeURIComponent(`${keyword} ${lawName}`);
  const url = `${baseUrl}?OC=${encodeURIComponent(apiKey)}&target=prec&type=JSON&query=${query}&display=5`;

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      // Next.js App Router 서버 컴포넌트에서 캐싱 방지
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(
        `law.go.kr API 오류: HTTP ${response.status} ${response.statusText}`
      );
    }

    const data: LawApiResponse = await response.json();
    const search = data?.PrecSearch;

    if (!search) {
      console.warn('law.go.kr API 응답 구조가 예상과 다릅니다. Mock 데이터를 반환합니다.');
      return {
        precedents: MOCK_PRECEDENTS,
        totalCount: MOCK_PRECEDENTS.length,
        isMock: true,
      };
    }

    const rawItems: LawPrecItem[] = search.prec
      ? Array.isArray(search.prec)
        ? search.prec
        : [search.prec]
      : [];

    const precedents: Precedent[] = rawItems.map((item) => ({
      caseNumber: item.판례일련번호 ?? '',
      caseName: item.사건명 ?? '',
      court: item.법원명 ?? '',
      date: item.선고일자 ?? '',
      summary: item.판시사항 ?? item.판결요지 ?? '',
      relatedLaws: item.관련법령
        ? item.관련법령.split(',').map((s) => s.trim())
        : [],
      verdict: item.판례내용 ?? '',
    }));

    const totalCount =
      typeof search.totalCnt === 'string'
        ? parseInt(search.totalCnt, 10)
        : (search.totalCnt ?? 0);

    return { precedents, totalCount, isMock: false };
  } catch (error) {
    console.warn(
      'law.go.kr API 호출 실패. Mock 데이터를 반환합니다.',
      error instanceof Error ? error.message : error
    );
    return {
      precedents: MOCK_PRECEDENTS,
      totalCount: MOCK_PRECEDENTS.length,
      isMock: true,
    };
  }
}
