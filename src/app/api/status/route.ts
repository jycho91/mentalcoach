/**
 * GET /api/status
 * API 키 연결 상태 확인 엔드포인트
 * 브라우저에서 http://localhost:3000/api/status 로 바로 테스트 가능
 */

import { NextResponse } from "next/server";
import { pingKoreaLawApi } from "@/lib/korea-law-api";

export async function GET() {
  const hasKey = Boolean(process.env.KOREA_LAW_API_KEY);

  if (!hasKey) {
    return NextResponse.json({
      koreaLawApi: { ok: false, message: "KOREA_LAW_API_KEY 환경변수 없음 — .env.local 확인" },
      demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === "1",
    });
  }

  const result = await pingKoreaLawApi();

  return NextResponse.json({
    koreaLawApi: result,
    keyHint: `${process.env.KOREA_LAW_API_KEY?.slice(0, 4)}****`,
    demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === "1",
  });
}
