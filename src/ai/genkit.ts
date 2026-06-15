import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// Genkit 플러그인은 내부적으로 GEMINI_API_KEY / GOOGLE_API_KEY 를 fallback 으로 보지만,
// apiKey: undefined 가 명시적으로 전달되면 fallback 이 동작하지 않으므로 직접 우선순위를 처리합니다.
const apiKey =
  process.env.GOOGLE_GENAI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY;

if (!apiKey) {
  throw new Error(
    [
      'Gemini API 키가 설정되지 않았습니다.',
      '프로젝트 루트의 .env.local 파일에 다음 줄을 추가하세요:',
      '  GOOGLE_GENAI_API_KEY=YOUR_KEY',
      '키 발급: https://aistudio.google.com/apikey',
      '',
      '주의: .env.local 변경 후에는 dev 서버를 재시작해야 적용됩니다.',
    ].join('\n')
  );
}

export const ai = genkit({
  plugins: [googleAI({ apiKey })],
  // gemini-2.5-pro: 추론·정확도가 높아 도구(법령 검증) 결과를 더 충실히 따름 → 환각 감소.
  // 트레이드오프: Flash보다 느리고 비쌈 (유료 티어/크레딧 기준 데모엔 충분).
  model: 'googleai/gemini-2.5-pro',
});
