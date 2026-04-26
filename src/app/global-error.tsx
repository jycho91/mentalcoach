'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  const isPermissionError = error.message?.includes('permissions') || error.name === 'FirestorePermissionError';

  return (
    <html lang="ko">
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F8FAFC',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '1rem',
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '2.5rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
            border: '1px solid #E2E8F0',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              backgroundColor: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
            }}>
              <AlertTriangle style={{ width: '28px', height: '28px', color: '#DC2626' }} />
            </div>

            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#0F172A',
              marginBottom: '0.5rem',
            }}>
              {isPermissionError ? '접근 권한 오류' : '일시적인 오류가 발생했습니다'}
            </h2>

            <p style={{
              color: '#64748B',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
            }}>
              {isPermissionError
                ? '해당 데이터에 접근할 권한이 없습니다. 로그인 상태를 확인하거나 페이지를 새로고침해 주세요.'
                : '작업을 처리하는 중 예상치 못한 문제가 발생했습니다. 아래 버튼을 눌러 다시 시도해 주세요.'}
            </p>

            {error.digest && (
              <div style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1.5rem',
                fontSize: '0.75rem',
                color: '#64748B',
                fontFamily: 'Source Code Pro, monospace',
              }}>
                오류 ID: {error.digest}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => reset()}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  backgroundColor: '#0F172A',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <RefreshCw style={{ width: '16px', height: '16px' }} />
                다시 시도
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  backgroundColor: 'white',
                  color: '#0F172A',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                }}
              >
                페이지 새로고침
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
