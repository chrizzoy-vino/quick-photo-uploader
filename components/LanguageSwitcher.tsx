'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition, type CSSProperties } from 'react';
import { setLocaleAction } from '@/lib/setLocaleAction';
import type { Locale } from '@/lib/locale';

const OTHER_LOCALE: Record<Locale, Locale> = { en: 'de', de: 'en' };

export function LanguageSwitcher({ style }: { style?: CSSProperties }) {
  const locale = useLocale() as Locale;
  const t = useTranslations('LanguageSwitcher');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const target = OTHER_LOCALE[locale];
  const label = target === 'de' ? t('switchToGerman') : t('switchToEnglish');

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await setLocaleAction(target);
          router.refresh();
        });
      }}
      style={{
        fontSize: '0.8rem',
        color: 'var(--color-text-muted)',
        background: 'transparent',
        border: '1px solid var(--color-border)',
        borderRadius: '999px',
        padding: '4px 10px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        opacity: isPending ? 0.6 : 1,
        ...style,
      }}
    >
      🌐 {locale.toUpperCase()}
    </button>
  );
}
