const RETRYABLE_CODES = ['503', 'UNAVAILABLE', '429', 'QUOTA', 'RESOURCE_EXHAUSTED'];
const RETRY_DELAYS_MS = [2000, 5000, 10000];

function isRetryable(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return RETRYABLE_CODES.some((code) => msg.includes(code));
}

/** 503/429 등 일시적 AI API 오류 시 최대 3회 재시도 */
export async function withAiRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (!isRetryable(e) || attempt === RETRY_DELAYS_MS.length) break;
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }
  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  if (isRetryable(lastError)) {
    throw new Error('AI 서비스가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해 주세요.');
  }
  throw lastError instanceof Error ? lastError : new Error(msg);
}
