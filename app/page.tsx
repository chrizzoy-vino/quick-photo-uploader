export default function HomePage() {
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
      <p style={{ color: 'var(--color-text-muted)', maxWidth: '32ch', margin: 0 }}>
        Öffne einen Album-Link (z.&nbsp;B. aus WhatsApp), um Fotos und Videos hochzuladen und
        anzusehen.
      </p>
    </main>
  );
}
