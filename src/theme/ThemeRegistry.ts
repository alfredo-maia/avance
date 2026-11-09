'use client';

import React, { type ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme.ts';

/**
 * Provedor de Tema Client-Side do Material UI (ADR-0004 / AV-111)
 * Envelopa ThemeProvider e CssBaseline evitando serialização de funções do tema no RSC boundary.
 */
export default function ThemeRegistry({ children }: { children: ReactNode }) {
  return React.createElement(
    ThemeProvider,
    { theme },
    React.createElement(CssBaseline, null),
    children
  );
}
