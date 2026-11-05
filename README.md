# Avance — SaaS Multi-Tenant Financeiro e de Metas

Avance SaaS Multi-Tenant Financeiro e de Metas (ADR-0002) desenvolvido com **Next.js (App Router + TypeScript)**, **Prisma ORM** e **PostgreSQL 16**.

## Comandos do Projeto

```bash
# Instalação de dependências
npm install

# Geração de tipos Prisma
npx prisma generate

# Checagem estrita de tipos TypeScript
npm run typecheck

# Execução do linter
npm run lint

# Execução da suíte completa de testes (smoke, unit, integration)
npm test

# Build da aplicação Next.js
npm run build

# Preflight de configuração dos agentes Paperclip
python3 scripts/check_agent_setup.py

# Build da imagem Docker
docker build -t avance-saas:latest .
```

## Pipeline de CI/CD (GitHub Actions)

O pipeline automatizado reside em `.github/workflows/ci.yml` (ADR-0003) e executa:
1. **Quality Gate Obrigatório**: Preflight de agentes, geração Prisma, `typecheck`, `lint`, suíte completa de testes (Node.js test runner + Playwright) e `build` do Next.js.
2. **Docker Build & Healthcheck**: Construção da imagem Docker (`node:22-alpine`) e validação do healthcheck `/api/v1/tenants`.
3. **Deploy em Homologação (`deploy-staging`)**: Acionado em push na `main` ou via `workflow_dispatch` com CI verde confirmado.
4. **Deploy em Produção (`deploy-production`)**: Depende de CI verde e homologação aprovada, exigindo autorização conforme `GOVERNANCE.md`.

Rastreador oficial de tarefas e governança: **Paperclip** (ADR-0001).

