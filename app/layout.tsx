import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'nutrIAhorro | Tu agente de alimentacion inteligente',
  description:
    'Organiza tu despensa, come mejor y encuentra la compra que realmente te conviene.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'nutrIAhorro',
    description: 'Come mejor, desperdicia menos y compra con el costo real del traslado.',
    images: [{ url: '/og-nutriahorro.png', width: 1536, height: 1024, alt: 'Alimentos frescos, ticket y aplicacion nutrIAhorro' }],
    locale: 'es_UY',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
