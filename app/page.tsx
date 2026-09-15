import { getTranslations } from 'next-intl/server';

export default async function HomePage() {
  const t = await getTranslations('Home');

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '24px',
        gap: '12px',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Quick Photo Uploader</h1>
      <p style={{ color: 'var(--color-text-muted)', maxWidth: '32ch', margin: 0 }}>{t('subtitle')}</p>
      <footer style={{ marginTop: '24px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
        <a href="/impressum" style={{ color: 'inherit' }}>
          {t('impressumLink')}
        </a>
        {' · '}
        <a href="/datenschutz" style={{ color: 'inherit' }}>
          {t('datenschutzLink')}
        </a>
      </footer>
    </main>
  );
}
