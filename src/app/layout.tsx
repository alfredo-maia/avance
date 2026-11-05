import type { ReactNode } from 'react';
import '../components/liquid-lens/liquid-lens.css';

export const metadata = {
  title: 'Avance SaaS Multi-Tenant — Dashboard Financeiro e de Metas',
  description: 'Sistema SaaS Multi-Tenant com Design System Liquid Lens / Liquid Glass UI (ADR-0002 / AV-98)',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="liquid-lens-theme">{children}</body>
    </html>
  );
}
