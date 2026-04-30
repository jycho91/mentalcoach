/**
 * Genkit 초기화
 *
 * GOOGLE_GENAI_API_KEY가 없거나 NEXT_PUBLIC_DEMO_MODE=1이면
 * Genkit 인스턴스를 만들지 않고 mock 모드로 동작합니다.
 *
 * 키가 들어오면 같은 인터페이스로 자동 전환되도록 설계.
 */

import { genkit, type Genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";

let _ai: Genkit | null = null;

export function isGenkitConfigured(): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "1") return false;
  return Boolean(process.env.GOOGLE_GENAI_API_KEY);
}

export function getAI(): Genkit | null {
  if (!isGenkitConfigured()) return null;
  if (_ai) return _ai;
  _ai = genkit({
    plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })],
    model: "googleai/gemini-2.5-flash",
  });
  return _ai;
}
