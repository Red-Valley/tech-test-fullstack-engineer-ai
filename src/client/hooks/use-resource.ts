'use client';

import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { ApiError } from '@/client/api/http-client';

export type Resource<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

const messageOf = (error: unknown) =>
  error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';

/**
 * Loads data whenever `key` changes (the key encodes everything the loader depends on).
 * Loading is derived (the stored result belongs to an older key) rather than set from the
 * effect, and responses for an outdated key are dropped so a slow request can't overwrite
 * a newer one.
 */
export function useResource<T>(load: () => Promise<T>, key: string): Resource<T> {
  const [nonce, setNonce] = useState(0);
  const requestKey = `${key}#${nonce}`;
  const [result, setResult] = useState<{ key: string; data?: T; error?: string } | null>(null);
  const runLoad = useEffectEvent(load);

  useEffect(() => {
    let current = true;
    // Promise.resolve().then(...) turns a synchronous throw in the loader into a rejection,
    // so it can't escape the effect and leave isLoading stuck at true.
    Promise.resolve()
      .then(runLoad)
      .then(
        (data) => current && setResult({ key: requestKey, data }),
        // Keep the last good data on failure so a failed refetch doesn't blank the view.
        (error: unknown) =>
          current &&
          setResult((previous) => ({
            key: requestKey,
            data: previous?.data,
            error: messageOf(error),
          })),
      );
    return () => {
      current = false;
    };
  }, [requestKey]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  const isFresh = result?.key === requestKey;

  return {
    // Keep showing the previous data while a refetch runs, instead of flashing empty.
    data: result?.data,
    isLoading: !isFresh,
    error: isFresh ? (result.error ?? null) : null,
    refetch,
  };
}
