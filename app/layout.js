import './globals.css';
import localFont from 'next/font/local';

const futura = localFont({
  src: [
    { path: './fonts/FuturaPTBook.otf', weight: '400', style: 'normal' },
    { path: './fonts/FuturaPTMedium.otf', weight: '500', style: 'normal' },
    { path: './fonts/FuturaPTDemi.otf', weight: '600', style: 'normal' },
    { path: './fonts/FuturaPTBold.otf', weight: '700', style: 'normal' },
  ],
  variable: '--font-futura',
  display: 'swap',
});

export const metadata = {
  title: 'CORPHOTELS · Gestión de Facturas',
  description: 'Comparación y control de facturas de servicios — CORPHOTELS',
  icons: { icon: '/favicon.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={futura.variable}>
      <body>{children}</body>
    </html>
  );
}
