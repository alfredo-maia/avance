# 0003. Pipeline de CI/CD Automatizado no GitHub Actions com Gates Obrigatórios e Deploy Direto em Produção

Status: accepted

Estruturamos o pipeline de integração contínua (CI) e entrega contínua (CD) do **Avance SaaS Multi-Tenant** no GitHub Actions (`.github/workflows/ci.yml`), conforme os requisitos de engenharia, direcionamento executivo e a governança multiagente (`AV-99` e `GOVERNANCE.md`).

## 1. Disparadores e Concorrência

- **Triggers**: Executado automaticamente em `push` e `pull_request` contra a branch `main`, além de acionamento manual controlado via `workflow_dispatch` direcionado para `producao`.
- **Concorrência**: Grupo de concorrência com cancelamento automático de execuções redundantes para pull requests (`cancel-in-progress: true`), otimizando capacidade e evitando corridas de estado.

## 2. Etapas e Checagens Obrigatórias (Quality Gate)

O job inicial `quality-gate` atua como barreira inegociável de qualidade antes de qualquer empacotamento ou publicação:
1. **Preflight de Governança de Agentes**: Execução de `python3 scripts/check_agent_setup.py` para validar conformidade do repositório, rastreador e mapeamento canônico de skills.
2. **Geração de Contratos de Dados**: `npx prisma generate` gerando os tipos estritos do Prisma Client alinhados ao schema multi-tenant.
3. **Typecheck Estrito**: `npm run typecheck` (`tsc --noEmit`), garantindo ausência de erros de tipos TypeScript em todo o código e testes.
4. **Linting**: `npm run lint` validando diretrizes e regras estáticas de código.
5. **Suíte Completa de Testes**: Instalação headless de dependências do Playwright (`npx playwright install --with-deps chromium`) e execução de `npm test`, abrangendo testes de fumaça de skills (`tests/skills-smoke/`), testes unitários de domínio puro dos 4 módulos (`tests/unit/`) e testes de integração com Playwright/browser (`tests/integration/`).
6. **Compilação de Produção**: `npm run build` (`next build`), validando integridade de empacotamento da aplicação Next.js App Router e arquivando rastros essenciais como artefato (`actions/upload-artifact@v4`).

## 3. Empacotamento em Container Docker (`docker-build`)

- **Dependência Estrita**: Depende explicitamente do `quality-gate` (`needs: [quality-gate]`). Se qualquer checagem falhar, o build de container é sumariamente abortado.
- **Isolamento e Segurança**: Constrói a imagem Docker baseada no `Dockerfile` oficial (`node:22-alpine` com usuário não-privilegiado `avance` e healthcheck HTTP em `/api/v1/tenants`).
- **Validação de Inicialização**: Sobe temporariamente o container recém-construído e aguarda o status `healthy` antes de validar o artefato.

## 4. Portão de Entrega Direta em Produção (`deploy-production`)

- **Garantia de CI Verde**: Nenhum código transita para produção sem a aprovação estrita dos jobs anteriores (`needs: [quality-gate, docker-build]`).
- **Deploy em Produção**: Conforme autorização e diretriz executiva de Alfredo ("O deploy pode ser em produção não em staging"), o deploy é realizado diretamente no ambiente `producao` após CI verde em push na branch `main` ou via `workflow_dispatch`.
- **Governança**: O job é protegido pelo ambiente `producao` com conformidade às alçadas de `GOVERNANCE.md` (autorização da Direção com checks obrigatórios no SHA final e plano de reversão ativo). Pull requests executam apenas o `quality-gate` e nunca disparam entregas produtivas.
