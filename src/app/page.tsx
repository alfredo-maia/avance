'use client';

import React from 'react';

/**
 * Página principal do SaaS Multi-Tenant no Next.js App Router (ADR-0002 / AC-16)
 * Redireciona ou serve a interface unificada dos 4 módulos.
 */
export default function DashboardPage() {
  return (
    <main className="dashboard-container">
      <header className="saas-header">
        <h1>Avance SaaS Multi-Tenant</h1>
        <p>Interface dos 4 módulos integrados: Controle Finanças, Cartões de Crédito, Propósitos e Metas, e Plano de Ação.</p>
      </header>
    </main>
  );
}
