import { NextResponse } from "next/server";
import { runScan } from "@/lib/genkit/flows/match-rules";

export async function POST() {
  try {
    const scan = await runScan();
    return NextResponse.json({ ok: true, scan });
  } catch (err) {
    console.error("[scan]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
