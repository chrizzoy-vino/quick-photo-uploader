'use client';

import { useLocale } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { generateRandomDisplayName, sanitizeDisplayName } from '@/lib/displayName';
import type { Locale } from '@/lib/locale';

const STORAGE_KEY = 'quick-photo-uploader:display-name';

export function useDisplayName() {
  const locale = useLocale() as Locale;
  const [displayName, setDisplayNameState] = useState<string>('');

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage not available (e.g. private mode) - name only applies for this session
    }

    if (stored) {
      setDisplayNameState(stored);
      return;
    }

    const generated = generateRandomDisplayName(Math.random, locale);
    setDisplayNameState(generated);
    try {
      window.localStorage.setItem(STORAGE_KEY, generated);
    } catch {
      // ignore
    }
  }, [locale]);

  const setDisplayName = useCallback((input: string) => {
    setDisplayNameState((current) => {
      const sanitized = sanitizeDisplayName(input, current);
      try {
        window.localStorage.setItem(STORAGE_KEY, sanitized);
      } catch {
        // ignore
      }
      return sanitized;
    });
  }, []);

  return { displayName, setDisplayName };
}
