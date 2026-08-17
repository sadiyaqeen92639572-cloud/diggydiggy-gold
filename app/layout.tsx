import type { Metadata } from 'next';
import './globals.css'; // Global styles

const SITE_URL = 'https://goldmininggame.com';
const TITLE = 'Gold Mining Game — Free Idle Mining Clicker | DiggyDiggy Gold';
const DESCRIPTION =
  'Play DiggyDiggy Gold, a free online gold mining game — tap to mine, upgrade your pickaxe, hire a mining buddy for passive gold, and collect gold even while you\'re away. No download, play instantly in your browser.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: 'DiggyDiggy Gold',
    type: 'website',
    locale: 'en_US',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'DiggyDiggy Gold',
  url: SITE_URL,
  legalName: 'Gesmine-Invest Limited',
  identifier: { '@type': 'PropertyValue', propertyID: 'UK Company Number', value: '14120136' },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Hardy House, 269 Poynders Gardens',
    addressLocality: 'London',
    postalCode: 'SW4 8PQ',
    addressCountry: 'GB',
  },
};

const gameJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Game',
  name: 'DiggyDiggy Gold',
  url: SITE_URL,
  description: DESCRIPTION,
  image: `${SITE_URL}/og-image.png`,
  genre: 'Idle mining clicker game',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Any (Web Browser)',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  publisher: { '@id': `${SITE_URL}/#organization` },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(gameJsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
