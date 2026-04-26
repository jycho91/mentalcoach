'use client';
import {
  Auth,
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { errorEmitter } from '@/firebase/error-emitter';

function emitAuthError(e: unknown, fallback: string) {
  const message = e instanceof Error ? e.message : fallback;
  const code = (e as { code?: string })?.code;
  console.error('[AuthError]', e);
  errorEmitter.emit('auth-error', { message, code });
}

/** Initiate anonymous sign-in (non-blocking, with error emission). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance).catch((e) => {
    emitAuthError(e, '익명 로그인에 실패했습니다. 네트워크 연결을 확인해 주세요.');
  });
}

/** Initiate email/password sign-up (non-blocking, with error emission). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  createUserWithEmailAndPassword(authInstance, email, password).catch((e) => {
    emitAuthError(e, '회원가입에 실패했습니다.');
  });
}

/** Initiate email/password sign-in (non-blocking, with error emission). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password).catch((e) => {
    emitAuthError(e, '로그인에 실패했습니다.');
  });
}

/** Sign out (non-blocking, with error emission). */
export function initiateSignOut(authInstance: Auth): void {
  signOut(authInstance).catch((e) => {
    emitAuthError(e, '로그아웃 처리에 실패했습니다.');
  });
}
