import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { GlobalLanguageSwitcher } from '@/components/GlobalLanguageSwitcher';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Layout');
  return {
    title: 'Quick Photo Uploader',
    description: t('description'),
    manifest: '/manifest.webmanifest',
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <GlobalLanguageSwitcher />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
