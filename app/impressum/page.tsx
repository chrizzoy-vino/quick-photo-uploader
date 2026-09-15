import { getTranslations } from 'next-intl/server';
import { readLegalPageHtml } from '@/lib/legalContent';

export const dynamic = 'force-dynamic';

export default async function ImpressumPage() {
  const [html, t] = await Promise.all([readLegalPageHtml('impressum.md'), getTranslations('LegalPlaceholder')]);

  return (
    <main style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 16px', lineHeight: 1.6 }}>
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <>
          <h1 style={{ fontSize: '1.3rem' }}>{t('impressumTitle')}</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>{t('impressumBody')}</p>
        </>
      )}
    </main>
  );
}
