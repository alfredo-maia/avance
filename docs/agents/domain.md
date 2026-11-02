# Domain Docs

Como as skills de engenharia devem consumir e atualizar a documentação de domínio do projeto **Avance** (`85e90bdd-3d30-4d93-8026-1243a441afd8`).

## Antes de explorar, leia estes arquivos

- **`GLOSSARY.md`** na raiz do repositório (`/home/hermes/apps/avance/GLOSSARY.md`): define a linguagem ubíqua atual do projeto e do fluxo de trabalho.
- **`docs/adr/`** (`/home/hermes/apps/avance/docs/adr/`): registra as decisões arquiteturais (ADRs) tomadas até o momento.

Se algum termo ou decisão de produto ainda não constar desses arquivos, **não invente requisitos de produto**. A stack do produto Avance permanece indefinida até que os requisitos reais sejam especificados; novos termos e decisões devem ser adicionados por `/domain-modeling` apenas quando forem efetivamente resolvidos.

## Estrutura de arquivos (`single-context`)

O repositório adota o layout de contexto único (`single-context`):

```text
/
├── AGENTS.md
├── GLOSSARY.md
├── docs/
│   ├── adr/
│   │   └── 0001-paperclip-issue-tracker-and-isolated-skill-smoke-tests.md
│   └── agents/
│       ├── domain.md
│       ├── issue-tracker.md
│       ├── setup-validation.md
│       └── triage-labels.md
└── tests/
    └── skills-smoke/
```

## Use o vocabulário do glossário

Quando sua saída nomear um conceito definido em `GLOSSARY.md` (em título de tarefa, especificação, hipótese de diagnóstico ou revisão), use o termo canônico e evite os sinônimos listados em `_Avoid_`.

## Sinalize conflitos com ADRs

Se uma proposta ou mudança contradisser um ADR existente em `docs/adr/`, sinalize explicitamente o conflito antes de alterar o comportamento ou a estrutura:

> _Contradicts ADR-0001 (...), mas merece reavaliação porque…_
