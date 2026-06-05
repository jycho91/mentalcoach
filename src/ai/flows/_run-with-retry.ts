/**
 * AI 흐름 공통 헬퍼: 빈 응답(null) 자동 재시도.
 *
 * Gemini가 도구 호출 + 구조화 출력 + 큰 컨텍스트를 동시에 다룰 때
 * 가끔 최종 응답을 비워서(null) 스키마 검증 실패가 난다.
 * 일시적인 경우가 많으므로 짧게 기다렸다 재시도한다.
 */

type PromptResult<T> = { output: T | null | undefined };
type PromptFn<I, T> = (
  input: I,
  opts?: { maxTurns?: number }
) => Promise<PromptResult<T>>;

/**
 * prompt 를 실행하고, output 이 비어 있으면 재시도한다.
 *
 * @param promptFn 실행할 프롬프트 함수
 * @param input 프롬프트 입력
 * @param opts.maxTurns 도구 호출 최대 횟수
 * @param opts.retries 추가 재시도 횟수 (기본 1 → 최대 2번 시도)
 * @returns 검증된 output (비어 있지 않음)
 */
export async function runPromptWithRetry<I, T>(
  promptFn: PromptFn<I, T>,
  input: I,
  opts: { maxTurns?: number; retries?: number } = {}
): Promise<T> {
  const { maxTurns = 20, retries = 1 } = opts;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { output } = await promptFn(input, { maxTurns });
      if (output) {
        return output;
      }
      lastErr = new Error('AI가 빈 응답을 반환했습니다 (output null).');
    } catch (e) {
      // 429/할당량 오류는 재시도해도 의미 없으므로 즉시 전파
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('429') || msg.includes('QUOTA') || msg.includes('RESOURCE_EXHAUSTED')) {
        throw e;
      }
      lastErr = e;
    }
    // 마지막 시도가 아니면 잠깐 대기 후 재시도
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error('AI 응답 생성에 실패했습니다.');
}
