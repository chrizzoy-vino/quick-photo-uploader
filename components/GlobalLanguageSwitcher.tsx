'use client';

import { usePathname } from 'next/navigation';
import { LanguageSwitcher } from './LanguageSwitcher';

const FIXED_ROUTES = new Set(['/', '/impressum', '/datenschutz']);

/** Renders the language switcher fixed to the top-right corner, but only on the small, fixed
 *  set of routes listed in FIXED_ROUTES. Hidden everywhere else: on the album view, which places
 *  its own instance inline next to the display-name badge instead (showing the same toggle
 *  twice on one page would be confusing); and on `/admin`, which is fixed to English and has no
 *  toggle at all (see ADR-0011) - showing a switcher there would imply admin is translatable. */
export function GlobalLanguageSwitcher() {
  const pathname = usePathname();

  if (!FIXED_ROUTES.has(pathname)) return null;

  return (
    <LanguageSwitcher
      style={{
        position: 'fixed',
        top: 'calc(12px + env(safe-area-inset-top, 0px))',
        right: '12px',
        zIndex: 20,
        background: 'var(--color-bg)',
      }}
    />
  );
}
