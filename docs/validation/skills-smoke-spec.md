# Especificação: Cenário de Validação de Skills Smoke (AV-71)

## 1. Problema (Problem Statement)
Para validar o fluxo operacional ponta a ponta de agentes de engenharia no projeto Avance sem presunção de stack de produto nem dependências externas prematuras, é necessário um cenário isolado de validação técnica. A equipe precisa de um mecanismo confiável para avaliar o estado de prontidão de três etapas essenciais (`setup`, `spec`, `qa`), exercitável tanto via automação de linha de comando quanto via interface de usuário mínima acessível.

## 2. Solução (Solution)
Implementação de um módulo isolado em `tests/skills-smoke/` contendo:
1. Uma função pura de domínio (`evaluateReadiness`) que consolida as três verificações obrigatórias com validação estrita de tipos e contratos;
2. Uma interface CLI determinística que consome JSON de entrada, executa o domínio e retorna códigos de saída padronizados (0 para sucesso, 2 para erro);
3. Uma interface web estática mínima (HTML/CSS/JS sem frameworks), acessível por teclado e responsiva (mínimo 360px), que consome a mesma função de domínio para refletir o status visual e anunciável de prontidão.

---

## 3. Alinhamento e Decisões de Domínio (/grill-with-docs)
- **Status do Alinhamento**: As decisões do cenário foram pré-delimitadas como parâmetros de teste do coordenador. Não foram identificadas ambiguidades nem lacunas impeditivas; portanto, **nenhuma entrevista adicional foi necessária**.
- **Vocabulário de Domínio**: Registrado e preservado em `GLOSSARY.md` (`Readiness Check`, `evaluateReadiness`, `Smoke CLI`, `Smoke UI`, `Skill Smoke Test`).
- **Arquitetura em Fatias Verticais**:
  - **Entrega Vertical 1**: Entrada CLI -> Domínio (`evaluateReadiness`) -> Saída JSON / Erro stderr.
  - **Entrega Vertical 2 (bloqueada na Entrega 1)**: Interface web HTML/CSS/JS local em `tests/skills-smoke/` consumindo a mesma função pública.

---

## 4. Contratos e Interfaces

### 4.1. Função Pública de Domínio: `evaluateReadiness(checks)`
- **Assinatura**:
  ```ts
  type ReadinessInput = {
    setup: boolean;
    spec: boolean;
    qa: boolean;
    [key: string]: unknown; // campos adicionais são ignorados
  };

  type ReadinessResult = {
    ready: boolean;
    missing: string[]; // subconjunto de ['setup', 'spec', 'qa'] na ordem estrita
  };

  function evaluateReadiness(checks: ReadinessInput): ReadinessResult;
  ```
- **Regras de Validação de Entrada**:
  - Se `checks` for `null`, `undefined`, um array ou qualquer tipo que não seja objeto comum, lança `TypeError`.
  - Se qualquer uma das três chaves obrigatórias (`setup`, `spec`, `qa`) estiver ausente (`!(key in checks)`), lança `TypeError`.
  - Se o valor de qualquer uma das três chaves não for estritamente booleano (`typeof checks[key] !== 'boolean'`), lança `TypeError`.
  - Chaves adicionais presentes no objeto são ignoradas.
- **Regras de Resultado**:
  - `ready` é `true` se e somente se `setup === true && spec === true && qa === true`.
  - Se `ready` for `true`, `missing` é array vazio `[]`.
  - Se qualquer campo for `false`, `ready` é `false` e `missing` lista as chaves com valor `false` respeitando estritamente a ordem canônica: `["setup", "spec", "qa"]`.

### 4.2. Interface de Linha de Comando (Smoke CLI)
- **Comando**: executável via runtime disponível (ex.: `node tests/skills-smoke/cli.js '<json>'`).
- **Entrada**: um argumento string contendo JSON a ser parseado como o objeto `checks`.
- **Comportamento em Sucesso**:
  - JSON válido e conforme ao contrato de `evaluateReadiness`.
  - Escreve o resultado `{ ready: boolean, missing: string[] }` formatado em JSON na `stdout`.
  - Código de saída do processo: `0`.
- **Comportamento em Erro**:
  - Argumento omitido, JSON sintaticamente inválido ou falha contratual que lance `TypeError`.
  - Escreve mensagem descritiva do erro na `stderr`.
  - Código de saída do processo: `2`.

---

## 5. Critérios de Aceitação Observáveis (AC-N)

- **AC-1 (Contrato de Sucesso evaluateReadiness)**: Ao fornecer `{ setup: true, spec: true, qa: true }` (mesmo com campos extras), a função retorna `{ ready: true, missing: [] }`.
- **AC-2 (Detecção de Pendências Ordenada)**: Ao fornecer objeto com campos falsos (ex.: `{ setup: false, spec: true, qa: false }`), retorna `ready: false` e `missing: ["setup", "qa"]` mantendo a ordem `setup`, `spec`, `qa`.
- **AC-3 (Tipagem Estrita e Erros de Contrato)**: Entradas inválidas (`null`, arrays, objetos sem uma das chaves ou com valores não booleanos como `"true"` ou `1`) lançam imediatamente `TypeError`.
- **AC-4 (Execução da CLI em Sucesso)**: A CLI chamada com argumento `'{"setup":true,"spec":true,"qa":true}'` encerra com código `0` e imprime JSON equivalente em `stdout`.
- **AC-5 (Execução da CLI em Falha)**: A CLI chamada sem argumentos, com JSON malformado ou violando o contrato de tipos encerra com código `2` e escreve o motivo em `stderr`.
- **AC-6 (Interface HTML - Estado Inicial e Reatividade)**: A página em `tests/skills-smoke/` carrega com três checkboxes ("Setup", "SPEC", "QA") desmarcados, exibindo status "Pendente" e listando as faltantes (`setup`, `spec`, `qa`). Ao marcar as três, o status atualiza para "Pronto".
- **AC-7 (Acessibilidade da UI)**: Todos os checkboxes possuem labels associados, são navegáveis e alternáveis via teclado (Tab e Espaço), e a região de status possui atributo de acessibilidade (`aria-live="polite"` ou `role="status"`).
- **AC-8 (Responsividade da UI)**: O layout visual é fluido e não apresenta estouro horizontal nem barra de rolagem horizontal em viewport de 360px de largura.
- **AC-9 (Isolamento e Sem Rede)**: A UI e a CLI não realizam chamadas de rede externas e não introduzem dependências externas ou frameworks na raiz do produto Avance.

---

## 6. Fronteiras de Teste (Test Seams)
1. **Fronteira 1 — API Pública de Domínio (`evaluateReadiness`)**:
   - Teste unitário direto sobre a função exportada cobrindo matriz de combinações booleanas e casos de exceção com `TypeError`.
2. **Fronteira 2 — CLI de Processo**:
   - Teste de integração de processo executando o script CLI via subprocesso e validando `stdout`, `stderr` e código de saída (`0` vs `2`).
3. **Fronteira 3 — Interface de Navegador (UI)**:
   - Teste de interface verificando manipulação do DOM, sincronia de estado com a função de domínio, suporte a teclado e viewport de 360px.

---

## 7. Exclusões de Escopo (Out of Scope)
- Nenhuma dependência de framework web (React, Vue, etc.) ou bundler para o produto principal Avance.
- Nenhum backend HTTP, servidor Express/Fastify de produto ou persistência em banco de dados.
- Nenhuma comunicação externa de rede ou integração com serviços de terceiros.
- Não representa a stack final nem a arquitetura do produto de negócio Avance.
