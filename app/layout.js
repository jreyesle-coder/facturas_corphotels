import './globals.css';
import { Poppins } from 'next/font/google';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata = {
  title: 'CORPHOTELS · Comparador de Facturas',
  description: 'Comparación mes a mes de facturas Claro y Altice — CORPHOTELS',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
