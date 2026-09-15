import { readLegalPageHtml } from '@/lib/legalContent';

export const dynamic = 'force-dynamic';

export default async function ImpressumPage() {
  const html = await readLegalPageHtml('impressum.md');

  return (
    <main style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 16px', lineHeight: 1.6 }}>
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <>
          <h1 style={{ fontSize: '1.3rem' }}>Impressum</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Platzhalter — hier fehlen noch die gesetzlich vorgeschriebenen Angaben (u.&nbsp;a.
            Name, Anschrift und Kontaktmöglichkeit des Betreibers gemäß §&nbsp;5 DDG). Bitte vor
            produktivem, über den privaten Kreis hinausgehendem Betrieb ausfüllen.
          </p>
        </>
      )}
    </main>
  );
}
