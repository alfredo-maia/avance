import type { ReactNode } from 'react';

export const metadata = {
  title: 'Avance SaaS Multi-Tenant — Dashboard Financeiro e de Metas',
  description: 'Sistema SaaS Multi-Tenant para Controle Financeiro, Cartões de Crédito, Propósitos e Plano de Ação',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>{children}</body>
    </html>
  );
}
