# Validação do Setup Inicial (`/setup-matt-pocock-skills`)

- **Data da execução**: 2026-11-02
- **Responsável pela execução**: Mr. Kakashi (`6ee7b192-bdd3-473b-b1e6-cf80fbd5ab9a`) — Head de Engenharia / Tech Lead
- **Tarefa Paperclip**: `AV-70` (`a412de41-b7ea-436c-adbf-f773953e6219`), filha de `AV-69`
- **Company ID**: `672fabb1-8461-437d-ad7b-6a7bd33df05c`
- **Project ID (`projectId`)**: `85e90bdd-3d30-4d93-8026-1243a441afd8` (Avance)
- **Workspace ID (`workspaceId`)**: `fadc6cfd-9bc7-4e47-a401-c0cb5abceb38` (`/home/hermes/apps/avance`)
- **Repositório / Branch / Base SHA**: `https://github.com/alfredo-maia/avance.git` | branch `test/agent-workflow` | SHA base `6426ebf9a1ffa196bf42c084b96e15ffd884035e`
- **Skill acionada**: `/setup-matt-pocock-skills` (`.agents/skills/setup-matt-pocock-skills/SKILL.md` → `matt-setup-project`)

## Artefatos Criados e Validados

| Caminho | Tamanho | Conteúdo / Finalidade |
|---|---|---|
| `AGENTS.md` | 4895 B | Instruções operacionais concisas, matriz de roteamento por agente (22 comandos em `.agents/skills/`) e bloco `## Agent skills` referenciando `docs/agents/` |
| `docs/agents/issue-tracker.md` | 3401 B | Configuração do Paperclip como único rastreador (`projectId`, `workspaceId`, endpoints de leitura/checkout/criação/documentos/bloqueios e `PRs as a request surface: no`) |
| `docs/agents/triage-labels.md` | 1815 B | Mapeamento das 5 etiquetas canônicas (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) e 2 categorias (`bug`, `enhancement`) com seus UUIDs reais no Paperclip |
| `docs/agents/domain.md` | 1828 B | Regras de consumo e atualização da documentação de domínio no layout `single-context` (`GLOSSARY.md` e `docs/adr/`) |
| `GLOSSARY.md` | 1785 B | Linguagem ubíqua real do fluxo de engenharia no projeto Avance (`Task (Issue)`, `Spec`, `Vertical Slice (Ticket)`, `Triage Role`, `Independent QA`, `Skill Smoke Test`) sem inventar requisitos de produto |
| `docs/adr/0001-paperclip-issue-tracker-and-isolated-skill-smoke-tests.md` | 1167 B | ADR-0001 registrando a decisão do Paperclip como issue tracker único e o isolamento dos testes de skills em `tests/skills-smoke/` |
| `docs/agents/setup-validation.md` | Este arquivo | Registro de auditoria das verificações reais e limitações desta etapa |

## Verificações Reais Executadas

1. **Estado do repositório Git**: confirmado `origin` apontando para `https://github.com/alfredo-maia/avance.git`, branch ativa `test/agent-workflow` e HEAD em `6426ebf9a1ffa196bf42c084b96e15ffd884035e`.
2. **Descoberta de comandos e fontes**: conferidos os 22 diretórios em `.agents/skills/<comando>/SKILL.md` contra `/home/hermes/apps/paperclip-test/data/skill-research-20261102/avance-commands.json` e o catálogo de etiquetas em `avance-labels.json`.
3. **Integridade de referências e IDs**: script determinístico em Python validou a existência física, tamanho não vazio, presença exata do `projectId` (`85e90bdd-3d30-4d93-8026-1243a441afd8`) e `workspaceId` (`fadc6cfd-9bc7-4e47-a401-c0cb5abceb38`), além da correspondência de todos os 22 comandos e 7 etiquetas do Paperclip.
4. **Ausência de efeitos colaterais proibidos**: nenhuma dependência de produto foi instalada, nenhum commit/push foi realizado e nenhuma outra tarefa ou agente foi acionado.

## Limitações e Escopo Respeitado

- **Stack do produto indefinida**: conforme o briefing, o produto Avance ainda não possui stack nem requisitos de negócio definidos; portanto, `GLOSSARY.md` e `ADR-0001` limitam-se estritamente aos conceitos e decisões reais deste fluxo e do rastreador.
- **Sem commits nem implementação nesta etapa**: por instrução explícita da tarefa `AV-70`, os arquivos permanecem na working tree do workspace `/home/hermes/apps/avance` (branch `test/agent-workflow`) sem `git commit` e sem implementação de código em `tests/skills-smoke/`.
