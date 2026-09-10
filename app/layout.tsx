import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'nutrIAhorro | Your everyday food intelligence agent',
  description:
    'Organize your pantry, eat better, and find the shopping option that truly costs less.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'nutrIAhorro',
    description: 'Eat better, waste less, and shop using the true cost of travel.',
    images: [{ url: '/og-nutriahorro.png', width: 1536, height: 1024, alt: 'Fresh food, grocery receipt, and the nutrIAhorro app' }],
    locale: 'en_US',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
