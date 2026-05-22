'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';

/**
 * Subscribes to 'auth-error' events and shows them as toasts.
 * Mount once at the layout level.
 */
export function AuthErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handler = (payload: { message: string; code?: string }) => {
      toast({
        variant: 'destructive',
        title: '인증 오류',
        description: payload.message,
      });
    };
    errorEmitter.on('auth-error', handler);
    return () => errorEmitter.off('auth-error', handler);
  }, [toast]);

  return null;
}
