import { NextResponse } from "next/server";
import { draftAmendment } from "@/lib/genkit/flows/draft-amendment";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ ruleId: string }> },
) {
  const { ruleId } = await params;
  try {
    const pkg = await draftAmendment({ ruleId });
    return NextResponse.json({ ok: true, package: pkg });
  } catch (err) {
    console.error("[amendments]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
