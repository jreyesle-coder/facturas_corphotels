import './globals.css';

export const metadata = {
  title: 'Comparador de Facturas · Claro / Altice',
  description: 'Comparación mes a mes de facturas Claro y Altice',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
