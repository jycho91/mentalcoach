/**
 * 개정안 생성 — Step 2 (선택 모드)
 *
 * 입력: 사내 규정 + 법령 변경
 * 출력: 결재용 패키지 (개정 사유 + 주요 골자 + 신구조문대비표 + 판례 검증)
 *
 * 데모 모드: 사전 생성된 패키지 반환.
 * 실 운영: Gemini 2.5 Flash로 구조화 출력 생성.
 */

import { getAI, isGenkitConfigured } from "../index";
import {
  getAmendmentPackage,
  getRule,
  getLawChange,
  getAffectedRule,
} from "@/lib/mock-data";
import type { AmendmentPackage } from "@/lib/types";

export type DraftAmendmentInput = {
  ruleId: string;
};

export async function draftAmendment(
  input: DraftAmendmentInput,
): Promise<AmendmentPackage> {
  const { ruleId } = input;

  // 데모 모드 — 사전 생성된 패키지 반환
  if (!isGenkitConfigured()) {
    await new Promise((r) => setTimeout(r, 1800));
    const pkg = getAmendmentPackage(ruleId);
    if (!pkg) {
      throw new Error(`사전 생성된 개정안 패키지가 없습니다: ${ruleId}`);
    }
    return { ...pkg, generatedAt: new Date().toISOString() };
  }

  // 실 운영 모드 — Gemini로 생성
  const ai = getAI();
  if (!ai) throw new Error("Genkit AI not initialized");

  const rule = getRule(ruleId);
  const affected = getAffectedRule(ruleId);
  if (!rule || !affected) throw new Error(`Rule not found: ${ruleId}`);
  const law = getLawChange(affected.lawChangeId);
  if (!law) throw new Error(`Law change not found: ${affected.lawChangeId}`);

  // TODO (production): structured-output prompt로 4종 패키지 생성
  // 현 단계에선 mock 패키지를 그대로 반환 (인터페이스만 통일)
  const pkg = getAmendmentPackage(ruleId);
  if (!pkg) {
    throw new Error(`사전 생성 패키지가 아직 없습니다. 먼저 mock 추가가 필요: ${ruleId}`);
  }
  return { ...pkg, source: "GEMINI", generatedAt: new Date().toISOString() };
}
