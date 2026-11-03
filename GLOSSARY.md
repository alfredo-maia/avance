# Avance

Contexto do repositório **Avance** (`85e90bdd-3d30-4d93-8026-1243a441afd8`). Este glossário registra os termos canônicos do fluxo de engenharia com agentes no Paperclip e a linguagem ubíqua do produto **Avance SaaS Multi-Tenant Financeiro e de Metas** (`AV-87` / `AV-88` / `AV-89`).

## Engenharia e Fluxo de Trabalho (Paperclip)

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

## Domínio do Produto — SaaS Multi-Tenant Financeiro e de Metas

**Tenant**:
Organização ou conta de cliente assinante do SaaS com isolamento lógico absoluto (`tenantId`) sobre todos os dados financeiros, cartões, metas, indicadores e usuários.
_Avoid_: Cliente solto, workspace compartilhado sem filtro, conta global

**Profile Type (`PF` / `PJ`)**:
Classificação de titularidade patrimonial ou operacional (`PF` para Pessoa Física, `PJ` para Pessoa Jurídica) aplicada a contas de recursos financeiros, faturas de cartão e linhas de lançamento dentro de um mesmo `Tenant`.
_Avoid_: Conta mista não classificada, tenant duplicado para PF e PJ

**Tenant Template Seed**:
Estrutura inicial padronizada de categorias e grupos (5 grupos financeiros, 14 categorias de cartão e 4 categorias de metas) provisionada com valores zerados para cada novo `Tenant`, sem qualquer dado pessoal da planilha de origem.
_Avoid_: Carga de dados pessoais, banco vazio sem estrutura

**Financial Group**:
Um dos cinco agrupamentos estruturais do Módulo 1 (`Controle Finanças`): `RECURSOS_FINANCEIROS`, `RECEITAS`, `INVESTIMENTOS`, `DESPESAS_FIXAS` e `DESPESAS_VARIAVEIS`.
_Avoid_: Tipo genérico de transação, centro de custo avulso

**Monthly Entry Triad**:
Conjunto de três valores mensais (`realized`, `settledAt`, `target`) registrados para cada linha orçamentária ou patrimonial em cada mês (`Jan` a `Dez`) de um exercício anual.
_Avoid_: Lançamento avulso sem meta, saldo sem controle de efetivação

**Last Informed Balance Rule**:
Regra de consolidação anual exclusiva do grupo `RECURSOS_FINANCEIROS` pela qual o saldo anual consolidado corresponde ao último mês do ano que possui valor realizado informado (e nunca à soma dos doze meses).
_Avoid_: Soma anual de saldos bancários, média de saldos

**Settlement Status (`✔`, `⏳`, `⚠`, `—`)**:
Estado determinístico de efetivação mensal de uma linha financeira: `—` quando o valor do mês é zero; `✔ Recebido` / `✔ Pago` quando `settledAt` está preenchido; `⚠ Atrasado` quando não efetivado e a data de vencimento no mês é anterior à data de referência (`referenceDate`); `⏳ A receber` / `⏳ A pagar` quando não efetivado e ainda dentro do prazo.
_Avoid_: Status manual arbitrário, flag booleana simples sem atraso

**Considered Invoice Amount (`Valor Considerado`)**:
Valor definitivo da fatura mensal de um cartão de crédito integrado automaticamente às `DESPESAS_VARIAVEIS` do Módulo 1: equivale à `Fatura Informada (banco)` quando preenchida (não nula) ou, na sua ausência, à soma `Detalhado (lançamentos)` das parcelas daquele cartão no mês.
_Avoid_: Dupla contagem de fatura e compras, média entre fatura e detalhado

**Installment Purchase Engine**:
Motor determinístico que divide o `Valor Total` de uma compra pelo `Nº de Parcelas`, projeta o `Valor da Parcela` linearmente desde a `1ª Fatura (mês/ano)` até a `Última Fatura`, e calcula o `Saldo a Pagar Após Dezembro` para parcelas que avançam para exercícios seguintes.
_Avoid_: Lançamento manual mês a mês, parcelamento sem saldo remanescente

**Multi-Year Goal (`Propósito / Meta`)**:
Objetivo plurianual categorizado em uma das 4 dimensões canônicas (`1. Financeira`, `2. Desenvolvimento Pessoal`, `3. Física/Saúde`, `4. Diversão`), com cálculo automático de `Situação` (`Atingida`, `Sem prazo`, `Não atingida`, `Em andamento`) e `Dias Restantes`.
_Avoid_: Tarefa diária, lembrete não categorizado

**Extra Achievement (`Conquista de Compensação`)**:
Resultado relevante alcançado no exercício anual que não possuía meta previamente estabelecida, registrado para compensação qualitativa e financeira no painel plurianual de metas.
_Avoid_: Meta retroativa disfarçada, lançamento orçamentário comum

**Action Plan Indicator (`Indicador do Plano de Ação`)**:
Desdobramento mensal (`Plano` × `Realizado`, `Jan..Dez`) vinculado a uma `Multi-Year Goal`, avaliado por uma das 4 regras determinísticas de acompanhamento: `SOMA` (quanto maior melhor), `LIMITE_MAXIMO` (menor melhor), `ULTIMO_VALOR_REDUZIR` (convergência de valor inicial até a meta) ou `MARCO_TEXTO` (qualitativo), com suporte a vínculo automático com linhas ou grupos do Módulo 1 (`Controle Finanças`).
_Avoid_: Subtarefa sem métrica mensal, referência quebrada (`#REF!`)
