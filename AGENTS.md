# Avance — Instruções de Agentes

## Contexto do Projeto

- **Projeto**: Avance (`85e90bdd-3d30-4d93-8026-1243a441afd8`)
- **Company ID**: `672fabb1-8461-437d-ad7b-6a7bd33df05c`
- **Workspace**: `fadc6cfd-9bc7-4e47-a401-c0cb5abceb38` (`/home/hermes/apps/avance`)
- **Repositório Git**: `https://github.com/alfredo-maia/avance.git` (branch de teste: `test/agent-workflow`)
- **Stack do produto**: Indefinida (será definida pelos requisitos reais do produto; não instalar dependências de produto por presunção).
- **Testes de integração das skills**: Isolados em `tests/skills-smoke/` usando apenas ferramentas já disponíveis no ambiente.

## Regras Operacionais

1. **Rastreador único**: Todas as tarefas (issues), especificações, documentos (`plan`, `spec`), dependências (`blockedByIssueIds`) e revisões residem no **Paperclip**. O GitHub hospeda apenas o código e PRs quando aplicável.
2. **Proporcionalidade (`av-fluxo-enxuto`)**: Selecione a menor rota suficiente para o risco da demanda. Nem toda tarefa exige PM, arquitetura ou DevOps.
3. **Alçadas e Governança**: Respeite `GOVERNANCE.md` e `ORGANIZATION.md`. Aprovação de código/QA independente por Ms. Sakura não substitui autorização humana (Alfredo/Vítor) para merge, produção ou compromissos externos.
4. **Execução limpa**: Faça checkout com `X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID` quando necessário; em caso de `409 Conflict`, encerre a tentativa imediatamente sem retry. Registre evidências reais e SHA na própria tarefa.

## Rota por Agente e Comandos Canônicos (`.agents/skills/`)

Os comandos locais em `.agents/skills/<comando>/SKILL.md` mapeiam cada etapa para a skill gerenciada correspondente (conforme `/home/hermes/apps/paperclip-test/data/skill-research-20261102/avance-commands.json`):

| Agente | Papel | Comandos / Skills atribuídos |
|---|---|---|
| **Mr. Kakashi** | Head de Engenharia / Tech Lead | `/setup-matt-pocock-skills` (`matt-setup-project`), `/ask-matt` (`matt-ask-matt`), `/domain-modeling` (`matt-domain-modeling`), `/codebase-design` (`matt-codebase-design`), `/to-spec` (`matt-to-spec`), `/to-tickets` (`matt-to-tickets`), `/implement-spec` (`matt-implement-spec`), `/code-review` (`matt-code-review`), `/pr` (`matt-pr`), `/diagnosing-bugs` (`matt-diagnosing-bugs`), `/improve-codebase-architecture` (`matt-improve-codebase-architecture`), `/handoff` (`matt-handoff`) |
| **Mr. Shikamaru** | Gerente de Projeto / Entrega | `/triage` (`matt-triage`), `/to-tickets` (`matt-to-tickets`), `/handoff` (`matt-handoff`) |
| **Ms. Hinata** | Head de Negócios e Requisitos | `/grill-with-docs` (`matt-grill-with-docs`), `/grill-me` (`matt-grill-me`), `/grilling` (`matt-grilling`), `/domain-modeling` (`matt-domain-modeling`), `/to-spec` (`matt-to-spec`), `/ui-ux-pro-max` (`ui-ux-pro-max`), `/handoff` (`matt-handoff`) |
| **Mr. Neji** | Analista de Negócios e Requisitos | `/grill-with-docs` (`matt-grill-with-docs`), `/grill-me` (`matt-grill-me`), `/grilling` (`matt-grilling`), `/domain-modeling` (`matt-domain-modeling`), `/to-spec` (`matt-to-spec`), `/handoff` (`matt-handoff`) |
| **Mr. Vegeta** | Desenvolvedor Backend | `/codebase-design` (`matt-codebase-design`), `/implement` (`matt-implement`), `/tdd` (`matt-tdd`), `/pr` (`matt-pr`), `/diagnosing-bugs` (`matt-diagnosing-bugs`), `/handoff` (`matt-handoff`) |
| **Mr. Sasuke** | Desenvolvedor Frontend | `/codebase-design` (`matt-codebase-design`), `/implement` (`matt-implement`), `/tdd` (`matt-tdd`), `/pr` (`matt-pr`), `/diagnosing-bugs` (`matt-diagnosing-bugs`), `/ui-ux-pro-max` (`ui-ux-pro-max`), `/frontend-design` (`frontend-design`), `/impeccable` (`impeccable`), `/web-design-guidelines` (`web-design-guidelines`), `/handoff` (`matt-handoff`) |
| **Ms. Sakura** | QA Independente | `/code-review` (`matt-code-review`), `/diagnosing-bugs` (`matt-diagnosing-bugs`), `/impeccable` (`impeccable`), `/web-design-guidelines` (`web-design-guidelines`), `/handoff` (`matt-handoff`) |
| **Mr. Piccolo** | Head de Infraestrutura / DevOps | `/diagnosing-bugs` (`matt-diagnosing-bugs`), `/handoff` (`matt-handoff`) |
| **Mr. Krillin** | Diagnóstico Operacional Automatizado | `/diagnosing-bugs` (`matt-diagnosing-bugs`), `/handoff` (`matt-handoff`) |

## Agent skills

### Issue tracker

Issues, especificações, documentos e dependências deste projeto são rastreados no Paperclip (`projectId`: `85e90bdd-3d30-4d93-8026-1243a441afd8`, `workspaceId`: `fadc6cfd-9bc7-4e47-a401-c0cb5abceb38`). See `docs/agents/issue-tracker.md`.

### Triage labels

Cinco etiquetas canônicas de triagem (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) e duas categorias (`bug`, `enhancement`) cadastradas no Paperclip. See `docs/agents/triage-labels.md`.

### Domain docs

Layout `single-context` com `GLOSSARY.md` na raiz do repositório e ADRs em `docs/adr/`. See `docs/agents/domain.md`.

## Preflight de execução

Antes de implementar, execute `python3 scripts/check_agent_setup.py --command implement` (ou `implement-spec`/`tdd`). O validador usa PAPERCLIP_AGENT_ID quando presente para conferir a atribuição declarada. Se o setup estiver ausente ou incoerente, pare e informe `/setup-matt-pocock-skills`; esse setup exige acionamento explícito. O preflight verifica configuração, não substitui as permissões do runtime.
