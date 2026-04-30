/**
 * 국가법령정보센터 Open API 클라이언트
 *
 * 문서: https://open.law.go.kr/LSO/openApi/guideList.do
 * 인증: OC 파라미터 (KOREA_LAW_API_KEY 환경변수)
 *
 * 사용 엔드포인트:
 *   - 현행법령 목록 (lawSearch) : 최근 개정 법령 스캔
 *   - 현행법령 본문 (lawService) : 특정 조문 전문 조회
 *   - 판례 목록/본문 (lawSearch/lawService) : 판례 검증
 */

const BASE = "https://www.law.go.kr/DRF";

function getKey(): string {
  const key = process.env.KOREA_LAW_API_KEY;
  if (!key) throw new Error("KOREA_LAW_API_KEY 환경변수가 설정되지 않았습니다.");
  return key;
}

// ──────────────────────────────────────────────
// 응답 타입 (법제처 JSON 스키마 기반)
// ──────────────────────────────────────────────

export interface KoreaLawListItem {
  법령ID: string;        // MST 식별자 (본문 조회에 사용)
  법령명_한글: string;
  현행연혁코드: string;
  공포일자: string;      // YYYYMMDD
  공포번호: string;
  시행일자: string;      // YYYYMMDD
  소관부처명: string;
  법령구분명: string;    // "법률" | "대통령령" | "부령" 등
}

export interface KoreaLawListResponse {
  LawSearch: {
    totalCnt: string;
    page: string;
    numOfRows: string;
    law: KoreaLawListItem[] | KoreaLawListItem; // 1건이면 배열이 아닐 수 있음
  };
}

export interface KoreaLawArticle {
  조문번호: string;
  조문제목?: string;
  조문내용: string;
}

export interface KoreaLawServiceResponse {
  법령: {
    기본정보: {
      법령ID: string;
      법령명_한글: string;
      시행일자: string;
      소관부처명: string;
    };
    조문: {
      조문단위: KoreaLawArticle[] | KoreaLawArticle;
    };
  };
}

export interface KoreaPrecListItem {
  판례정보일련번호: string;
  사건명: string;
  사건번호: string;
  선고일자: string;
  법원명: string;
  판결유형: string;
  판시사항: string;
}

export interface KoreaPrecListResponse {
  PrecSearch: {
    totalCnt: string;
    prec: KoreaPrecListItem[] | KoreaPrecListItem;
  };
}

// ──────────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────────

/** 법제처 API는 1건일 때 배열 대신 객체를 반환하는 경우가 있음 */
function toArray<T>(val: T[] | T | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

/** YYYYMMDD → "YYYY-MM-DD" */
export function formatKoreaDate(d: string): string {
  if (!d || d.length !== 8) return d;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

// ──────────────────────────────────────────────
// API 호출 함수
// ──────────────────────────────────────────────

/**
 * 최근 개정 현행법령 목록 조회
 *
 * @param days   최근 N일 이내 시행된 법령 필터 (기본 90일)
 * @param display 최대 결과 수 (기본 20)
 */
export async function fetchRecentLaws(
  days = 90,
  display = 20,
): Promise<KoreaLawListItem[]> {
  const key = getKey();

  // 기준일 계산 (YYYYMMDD)
  const from = new Date();
  from.setDate(from.getDate() - days);
  const fromStr = from.toISOString().slice(0, 10).replace(/-/g, "");

  const url = new URL(`${BASE}/lawSearch.do`);
  url.searchParams.set("OC", key);
  url.searchParams.set("target", "law");
  url.searchParams.set("type", "JSON");
  url.searchParams.set("display", String(display));
  url.searchParams.set("sort", "efdate");      // 시행일 기준 정렬
  url.searchParams.set("efFrom", fromStr);     // 시행일 시작
  url.searchParams.set("efTo", new Date().toISOString().slice(0, 10).replace(/-/g, ""));

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`법령 목록 조회 실패: ${res.status}`);

  const json: KoreaLawListResponse = await res.json();
  return toArray(json.LawSearch?.law);
}

/**
 * 특정 법령 본문 조회 (조문 리스트 반환)
 *
 * @param mst  법령ID (법령 목록 조회 결과의 법령ID 필드)
 */
export async function fetchLawText(mst: string): Promise<KoreaLawArticle[]> {
  const key = getKey();

  const url = new URL(`${BASE}/lawService.do`);
  url.searchParams.set("OC", key);
  url.searchParams.set("target", "law");
  url.searchParams.set("MST", mst);
  url.searchParams.set("type", "JSON");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`법령 본문 조회 실패 (MST=${mst}): ${res.status}`);

  const json: KoreaLawServiceResponse = await res.json();
  return toArray(json.법령?.조문?.조문단위);
}

/**
 * 판례 목록 검색
 *
 * @param query  검색어 (예: "근로기준법 제50조")
 * @param display  최대 결과 수 (기본 5)
 */
export async function fetchPrecedents(
  query: string,
  display = 5,
): Promise<KoreaPrecListItem[]> {
  const key = getKey();

  const url = new URL(`${BASE}/lawSearch.do`);
  url.searchParams.set("OC", key);
  url.searchParams.set("target", "prec");
  url.searchParams.set("type", "JSON");
  url.searchParams.set("display", String(display));
  url.searchParams.set("query", query);
  url.searchParams.set("sort", "ddes");  // 최신순

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`판례 검색 실패: ${res.status}`);

  const json: KoreaPrecListResponse = await res.json();
  return toArray(json.PrecSearch?.prec);
}

/**
 * API 키 유효성 빠른 검증 (목록 1건만 조회)
 * 서버 사이드에서만 사용 가능
 */
export async function pingKoreaLawApi(): Promise<{ ok: boolean; message: string }> {
  try {
    const laws = await fetchRecentLaws(30, 1);
    return { ok: true, message: `연결 성공 — 최근 30일 개정 법령 확인 완료 (${laws.length}건 샘플)` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "알 수 없는 오류" };
  }
}
