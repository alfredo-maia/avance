# Avance

Contexto inicial do repositório **Avance** (`85e90bdd-3d30-4d93-8026-1243a441afd8`). Enquanto a stack e os requisitos de negócio do produto permanecem em definição, este glossário registra os termos canônicos do fluxo de engenharia com agentes no Paperclip.

## Language

**Task (Issue)**:
Unidade rastreável de trabalho, triagem, especificação ou revisão registrada no Paperclip sob o projeto Avance (`85e90bdd-3d30-4d93-8026-1243a441afd8`).
_Avoid_: GitHub Issue, local scratch ticket, card avulso

**Spec**:
Documento verificável que sintetiza o problema, os critérios observáveis de aceitação, os contratos de fronteira e as exclusões de escopo antes da divisão ou implementação.
_Avoid_: Briefing solto, rascunho informal, lista de desejos

**Vertical Slice (Ticket)**:
Entrega incremental demonstrável ponta a ponta que corta as camadas necessárias e pode ser verificada isoladamente, vinculada à tarefa mãe no Paperclip.
_Avoid_: Tarefa por camada isolada, subtarefa de mero repasse

**Triage Role**:
Estado de prontidão e encaminhamento de uma demanda representado pelas cinco etiquetas canônicas (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`).
_Avoid_: Status implícito em comentário, fila paralela

**Independent QA**:
Verificação independente executada por `Ms. Sakura` sobre o pedido original, a `Spec` e o código no SHA final, distinta da autorrevisão do desenvolvedor.
_Avoid_: Self-review como aceite final, aprovação automática

**Skill Smoke Test**:
Exercício isolado em `tests/skills-smoke/` destinado exclusivamente a validar o funcionamento integrado das skills de engenharia, sem definir a arquitetura ou a stack do produto Avance.
_Avoid_: Protótipo de produto, código de produção

**Readiness Check**:
Verificação booleana obrigatória (`setup`, `spec`, `qa`) que reflete a conclusão de uma etapa fundamental do fluxo de validação de skills.
_Avoid_: Flag genérica, checagem parcial não mapeada

**evaluateReadiness**:
Função pura de domínio que avalia o objeto de verificações, exigindo os três campos booleanos obrigatórios, retornando status de prontidão (`ready`) e a lista ordenada de faltantes (`missing`).
_Avoid_: Validação distribuída na interface, regra de negócio na CLI

**Smoke CLI**:
Fronteira em linha de comando para exercício direto do domínio `evaluateReadiness` via argumento JSON, com código de saída determinístico (0 para sucesso, 2 para erro de contrato ou parsing).
_Avoid_: Script interativo, CLI com dependências externas de produto

**Smoke UI**:
Página HTML/CSS/JS estática em `tests/skills-smoke/` que consome `evaluateReadiness`, acessível por teclado, compatível com viewport de 360px e com região de status anunciável.
_Avoid_: Aplicação SPA com framework, interface conectada a API remota
