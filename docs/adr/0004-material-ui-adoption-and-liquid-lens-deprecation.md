# ADR-0004: Adoção do Material UI (MUI) e Descontinuação do Liquid Lens

## Status
Aceito (Direção AV / Usuário via interação AV-110 `aaab9721-1ccb-4f37-9ed6-cb2717117ee1`)

## Contexto
O Avance adotava uma biblioteca proprietária de componentes visuais baseada em CSS/Glassmorphism (`Liquid Lens`, localizada em `src/components/liquid-lens/`). Para acelerar a produtividade, robustez, conformidade com padrões de acessibilidade (WCAG 2.1 AA) e riqueza de componentes de UI (DataGrid, Modals, Autocomplete, Tabs, Theming), foi demandada a implementação do Material UI ([https://mui.com/material-ui/](https://mui.com/material-ui/)) em todo o sistema.

Na consulta de alinhamento técnico (AV-110), a direção determinou:
1. **Estratégia de Escopo**: Refatoração completa imediata de todo o frontend existente (`full_refactor`).
2. **Tratamento do Design System Existente**: Descontinuação e substituição integral do `Liquid Lens` por componentes e temas do MUI (`deprecate_replace`).

## Decisões de Arquitetura

1. **Stack de Dependências MUI**:
   - `@mui/material`: Componentes centrais do Material UI.
   - `@mui/icons-material`: Ícones vetoriais padronizados.
   - `@emotion/react` & `@emotion/styled`: Engine padrão de estilização do MUI v5.
   - `@mui/material-nextjs`: Integração oficial para Next.js 15 App Router com SSR e Emotion cache (`AppRouterCacheProvider`).

2. **Server Components vs Client Components**:
   - O `AppRouterCacheProvider` será envelopado no `RootLayout` (`src/app/layout.tsx`).
   - Componentes interativos de dashboard, grids de finanças, abas e diálogos permanecem com a diretiva `'use client'` conforme o padrão do App Router.
   - Criação de um módulo central de tema (`src/theme/theme.ts`) com `ThemeProvider` e `CssBaseline`.

3. **Substituição dos Componentes Liquid Lens**:
   - `LiquidLensCard` → `MuiCard`, `CardContent`, `CardHeader`, `Typography` (ou wrapper `MuiFinanceCard`).
   - `LiquidLensDock` → `Tabs`, `Tab`, `Box` (Navigation Dock).
   - `LiquidLensModal` → `Dialog`, `DialogTitle`, `DialogContent`, `DialogActions`.
   - `LiquidLensBadge` → `Chip` / `Badge`.
   - Remoção dos arquivos legados em `src/components/liquid-lens/` após a migração.

4. **Entregas Verticais e Pipeline de Execução**:
   - **Fase 1 (Fundação)**: Instalação das dependências, configuração do AppRouterCacheProvider, tema central MUI e smoke tests.
   - **Fase 2 (Frontend)**: Substituição dos componentes em `src/app/page.tsx` e `src/app/layout.tsx` por componentes MUI, migração da Grade Inline de 12 meses e dos 4 módulos.
   - **Fase 3 (QA Independente)**: Homologação por Ms. Sakura de acessibilidade, responsividade e equivalência funcional dos 120 testes.
