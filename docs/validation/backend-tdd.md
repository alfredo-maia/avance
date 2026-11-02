# Evidências do Ciclo TDD Backend (Mr. Vegeta) — AV-73

Entrega Vertical 1 da SPEC `docs/validation/skills-smoke-spec.md` (CLI -> `evaluateReadiness` -> JSON / Erro stderr).
Critérios cobertos: AC-1 a AC-5 e AC-9.
Ambiente de testes: Node.js com `node:test` e `node:assert/strict` nativos, sem dependências externas.

---

## Ciclo 1: Sucesso all-true e extras ignorados (AC-1)

- **Fronteira**: API pública de domínio (`evaluateReadiness`).
- **Comando RED**: `node --test tests/skills-smoke/readiness.test.mjs`
- **Motivo esperado do RED**: Stub inicial retornando `null` falha na asserção `deepStrictEqual` contra o objeto esperado `{ ready: true, missing: [] }`.
- **Saída real do RED**:
```text
✖ AC-1: evaluateReadiness com todas as etapas prontas e campos extras ignorados (2.453633ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
  + null
  - {
  -   missing: [],
  -   ready: true
  - }
```
- **Mudança implementada**: Implementada verificação básica retornando `{ ready: true, missing: [] }`.
- **Comando GREEN**: `node --test tests/skills-smoke/readiness.test.mjs`
- **Saída real do GREEN**:
```text
✔ AC-1: evaluateReadiness com todas as etapas prontas e campos extras ignorados (1.619849ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
```

---

## Ciclo 2: Detecção ordenada de faltantes (AC-2)

- **Fronteira**: API pública de domínio (`evaluateReadiness`).
- **Comando RED**: `node --test tests/skills-smoke/readiness.test.mjs`
- **Motivo esperado do RED**: A implementação atual retorna estaticamente `{ ready: true, missing: [] }`, falhando ao encontrar `{ ready: false, missing: ['setup', 'qa'] }`.
- **Saída real do RED**:
```text
✖ AC-2: Detecção ordenada de faltantes para diferentes combinações de false (1.438545ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
    {
  +   missing: [],
  +   ready: true
  -   missing: [
  -     'setup',
  -     'qa'
  -   ],
  -   ready: false
    }
```
- **Mudança implementada**: Avaliação das chaves `setup`, `spec`, `qa` na ordem canônica acumulando em `missing` quando `false`.
- **Comando GREEN**: `node --test tests/skills-smoke/readiness.test.mjs`
- **Saída real do GREEN**:
```text
✔ AC-1: evaluateReadiness com todas as etapas prontas e campos extras ignorados (1.624336ms)
✔ AC-2: Detecção ordenada de faltantes para diferentes combinações de false (0.585141ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
```

---

## Ciclo 3: Tipagem estrita e validação de contrato com TypeError (AC-3)

- **Fronteira**: API pública de domínio (`evaluateReadiness`).
- **Comando RED**: `node --test tests/skills-smoke/readiness.test.mjs`
- **Motivo esperado do RED**: Entradas não-objeto, incompletas ou com tipos não-booleanos não lançavam `TypeError`.
- **Saída real do RED**:
```text
✖ AC-3: Tipagem estrita e validação de contrato com TypeError (1.040467ms)
  AssertionError [ERR_ASSERTION]: Missing expected exception (TypeError): Deveria lançar TypeError para entrada: "not an object"
      at TestContext.<anonymous> (file:///home/hermes/apps/avance/tests/skills-smoke/readiness.test.mjs:58:12)
```
- **Mudança implementada**: Validação estrita de `typeof checks === 'object'`, `checks !== null`, `!Array.isArray(checks)`, presença obrigatória das chaves (`key in checks`) e tipagem estrita booleana (`typeof checks[key] === 'boolean'`).
- **Comando GREEN**: `node --test tests/skills-smoke/readiness.test.mjs`
- **Saída real do GREEN**:
```text
✔ AC-1: evaluateReadiness com todas as etapas prontas e campos extras ignorados (1.571026ms)
✔ AC-2: Detecção ordenada de faltantes para diferentes combinações de false (0.331959ms)
✔ AC-3: Tipagem estrita e validação de contrato com TypeError (0.775196ms)
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
```

---

## Ciclo 4: Execução da CLI em Sucesso (AC-4)

- **Fronteira**: CLI de Processo real (`cli.mjs`).
- **Comando RED**: `node --test tests/skills-smoke/cli.test.mjs`
- **Motivo esperado do RED**: Stub da CLI imprimia apenas `"stub"`, falhando ao tentar fazer parse do JSON e comparar com `{ ready: true, missing: [] }`.
- **Saída real do RED**:
```text
✖ AC-4: Execução da CLI em sucesso retorna código 0 e JSON na stdout (45.498257ms)
  SyntaxError: Unexpected token 's', "stub
  " is not valid JSON
      at JSON.parse (<anonymous>)
      at TestContext.<anonymous> (file:///home/hermes/apps/avance/tests/skills-smoke/cli.test.mjs:14:23)
```
- **Mudança implementada**: Implementada leitura de `process.argv[2]`, parse do JSON, chamada a `evaluateReadiness(checks)` e impressão em `stdout` com `process.exit(0)`.
- **Comando GREEN**: `node --test tests/skills-smoke/cli.test.mjs`
- **Saída real do GREEN**:
```text
✔ AC-4: Execução da CLI em sucesso retorna código 0 e JSON na stdout (58.160458ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
```

---

## Ciclo 5: Execução da CLI em Falha (AC-5)

- **Fronteira**: CLI de Processo real (`cli.mjs`).
- **Cenários testados**:
  1. Argumento ausente (`[]`).
  2. JSON sintaticamente inválido (`'{ malformed json'`).
  3. Contrato incompleto (`'{"setup": true}'`).
  4. Entrada nula (`'null'`).
  5. Tipo não booleano (`'{"setup":"true","spec":true,"qa":true}'`).
- **Comando**: `node --test tests/skills-smoke/cli.test.mjs`
- **Comportamento verificado**: Código de saída `2`, `stdout` vazio, mensagem correspondente descritiva em `stderr`.
- **Saída real**:
```text
✔ AC-4: Execução da CLI em sucesso retorna código 0 e JSON na stdout (52.387758ms)
✔ AC-5: Execução da CLI em falha encerra com código 2 e escreve motivo na stderr (236.359111ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
```

---

## Suíte Completa e Casos Reais de CLI

- **Comando**: `node --test tests/skills-smoke/*.test.mjs`
- **Resultado**:
```text
✔ AC-4: Execução da CLI em sucesso retorna código 0 e JSON na stdout (64.047951ms)
✔ AC-5: Execução da CLI em falha encerra com código 2 e escreve motivo na stderr (237.005247ms)
✔ AC-1: evaluateReadiness com todas as etapas prontas e campos extras ignorados (2.461535ms)
✔ AC-2: Detecção ordenada de faltantes para diferentes combinações de false (0.408174ms)
✔ AC-3: Tipagem estrita e validação de contrato com TypeError (1.418025ms)
ℹ tests 5
ℹ suites 0
ℹ pass 5
ℹ fail 0
```

- **Execuções manuais de validação direta**:
  - `node tests/skills-smoke/cli.mjs '{"setup":true,"spec":true,"qa":true}'` -> code 0, stdout `{"ready":true,"missing":[]}`
  - `node tests/skills-smoke/cli.mjs '{"setup":false,"spec":true,"qa":false}'` -> code 0, stdout `{"ready":false,"missing":["setup","qa"]}`
  - `node tests/skills-smoke/cli.mjs` -> code 2, stderr `Erro: Argumento JSON ausente.`
  - `node tests/skills-smoke/cli.mjs '{"setup":"invalid","spec":true,"qa":true}'` -> code 2, stderr `Erro de validação: O valor da chave "setup" deve ser estritamente booleano.`

## Verificação de Isolamento (AC-9)

- Nenhum `package.json` foi criado na raiz do repositório.
- Nenhuma dependência externa via `npm` instalada.
- Código 100% puro usando `node:test`, `node:assert/strict`, `node:child_process` e JavaScript ESM padrão.
- Escopo rigorosamente restrito a `tests/skills-smoke/` e `docs/validation/backend-tdd.md`.

## Autorrevisão (/implement)

1. **Standards**: Código modular ESM (`readiness.mjs`, `cli.mjs`), tratamento explícito de exceções, ausência de efeitos colaterais e logs desnecessários, convenções canônicas de retorno.
2. **Spec**: Todos os AC da fatia (AC-1, AC-2, AC-3, AC-4, AC-5 e AC-9) rigorosamente atendidos e verificados por testes de domínio e processo de ponta a ponta.
