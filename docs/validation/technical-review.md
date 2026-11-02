# Revisão Técnica de Contrato e Fronteiras — Cenário Skills Smoke (AV-75)

**Status da Revisão**: **APROVADO PARA IMPLEMENTAÇÃO**  
**Responsável Técnico**: Mr. Kakashi (Head de Engenharia / Tech Lead)  
**Referências Avaliadas**:
- Tarefa de origem / parâmetros do cenário: `AV-71` (`62ff16b1-9004-42e4-befd-66c344db2a8b`)
- Especificação técnica: [`docs/validation/skills-smoke-spec.md`](./skills-smoke-spec.md)
- Mapa de entregas verticais: [`docs/validation/skills-smoke-tickets.json`](./skills-smoke-tickets.json)
- Entrega Vertical 1 (Backend/CLI): `AV-73` (`81c05467-598c-48d3-9a38-d5b6d740cfce`)
- Entrega Vertical 2 (Frontend/UI): `AV-74` (`e134ca1f-656f-4a9f-8559-081b72c371f2`)

---

## 1. Avaliação Proporcional de Design e Contrato (`/codebase-design`)

A especificação define um módulo profundo e coeso com superfície mínima (`evaluateReadiness(checks)`), sem necessidade de decisões adicionais de interface além do já fixado em `AV-71` e `docs/validation/skills-smoke-spec.md`.

### 1.1. Verificabilidade do Contrato `evaluateReadiness` e da `Smoke CLI`
- **Contrato de Domínio (`evaluateReadiness`)**: Assinatura determinística e pura. Recebe objeto com chaves obrigatórias `setup`, `spec` e `qa` estritamente booleanas (`typeof checks[key] === 'boolean'`), ignorando chaves extras. Retorna `{ ready: boolean, missing: string[] }`, onde `ready` é `true` somente quando os três campos são `true`, e `missing` preserva a ordem estrita `["setup", "spec", "qa"]`. Qualquer entrada `null`, `undefined`, array, primitivo, objeto sem chave obrigatória ou com valor não booleano lança `TypeError`. Coberto por **AC-1, AC-2 e AC-3**.
- **Contrato da CLI (`Smoke CLI`)**: Recebe um argumento JSON posicional, invoca `evaluateReadiness`, imprime JSON válido em `stdout` com código de saída `0` no sucesso (**AC-4**), e captura ausência de argumento, erro de parsing JSON ou `TypeError` de contrato escrevendo mensagem descritiva em `stderr` com código de saída `2` (**AC-5**). Totalmente verificável via execução de subprocesso.

### 1.2. Reutilização da Função Pública pela UI (`Smoke UI`)
- A Entrega Vertical 2 (`AV-74`) e os critérios **AC-6, AC-7, AC-8 e AC-9** determinam que a página HTML/CSS/JS estática em `tests/skills-smoke/` consuma diretamente a mesma função pública `evaluateReadiness` (sem duplicar lógica de negócio na camada visual).
- **Diretriz técnica para implementação entre Node CLI e Browser UI**: Para que o mesmo módulo em `tests/skills-smoke/` seja importado tanto pelo Node.js (`cli.js` e testes unitários) quanto pelo navegador (HTML estático sem bundler), o módulo de domínio deve ser exposto em formato compatível com ambos os ambientes (ex.: ESM nativo com `<script type="module">` quando servido localmente ou padrão UMD/global compatível com CJS/Browser), preservando uma única fonte de verdade para `evaluateReadiness`.

### 1.3. Adequação das Fronteiras de Teste (Test Seams)
As três fronteiras definidas na seção 6 de `docs/validation/skills-smoke-spec.md` são claras, isoladas e suficientes para TDD:
1. **Fronteira 1 — API Pública de Domínio (`evaluateReadiness`)**: Testes unitários diretos sobre entradas válidas, campos extras ignorados, ordenação de `missing` e matriz completa de `TypeError` (**AC-1 a AC-3**).
2. **Fronteira 2 — Processo CLI (`Smoke CLI`)**: Testes de integração invocando o binário/script CLI via subprocesso para validar `stdout`, `stderr` e exit codes `0` e `2` (**AC-4 e AC-5**).
3. **Fronteira 3 — Interface no Navegador (`Smoke UI`)**: Verificação do estado inicial ("Pendente" com `setup`, `spec`, `qa` desmarcados), transição para "Pronto" ao marcar os três checkboxes, associação de `<label>`, navegação/acionamento por teclado (`Tab`/`Space`), região anunciável (`role="status"` ou `aria-live="polite"`) e ausência de overflow horizontal em viewport de `360px` (**AC-6 a AC-9**).

### 1.4. Confirmação de Dependência Nativa (`UI -> CLI`)
Verificado via API do Paperclip (`GET /api/issues/{id}`):
- `AV-73` (`81c05467-598c-48d3-9a38-d5b6d740cfce` — Entrega Vertical 1: Domínio `evaluateReadiness` e Smoke CLI): `status: "backlog"`, `blockedBy: []`, `blocks: ["e134ca1f-656f-4a9f-8559-081b72c371f2"]`.
- `AV-74` (`e134ca1f-656f-4a9f-8559-081b72c371f2` — Entrega Vertical 2: Interface Web de Prontidão): `status: "backlog"`, `blockedBy: [{"id": "81c05467-598c-48d3-9a38-d5b6d740cfce", "identifier": "AV-73"}]`.
- A relação nativa `AV-74 blockedBy AV-73` corresponde exatamente ao registrado em `docs/validation/skills-smoke-tickets.json`.

---

## 2. Critérios e Limites para Implementação (TDD)

1. **Isolamento estrito**: Todo código e teste do exercício deve residir exclusivamente em `tests/skills-smoke/`, na branch `test/agent-workflow`.
2. **Zero dependências de produto**: Proibido instalar pacotes externos, frameworks ou bundlers; utilizar apenas o runtime e ferramentas já disponíveis no ambiente.
3. **Sem rede externa**: Nem a CLI nem a UI podem realizar requisições de rede externas (**AC-9**).
4. **Ordem de execução**: `AV-73` (Domínio + CLI com TDD RED/GREEN) precede `AV-74` (UI com TDD reutilizando a função de domínio).
5. **Limites de governança**: Esta aprovação técnica libera exclusivamente a implementação das tarefas de teste `AV-73` e `AV-74` quando distribuídas pelo coordenador. **Não autoriza** push, merge em `main`, deploy em produção, criação de novos agentes/tarefas, nem representa definição de stack ou aprovação comercial do produto Avance.
