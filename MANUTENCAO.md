# Guia de Manutencao

Este projeto foi documentado em duas camadas:

1. comentarios inline nos arquivos principais;
2. este guia, que funciona como mapa rapido de navegacao.

## Estrutura do projeto

- `C:\Users\USER\Desktop\projeto-estoque\index.html`
  Pagina publica de estoque. Mostra a tabela detalhada e a tabela-resumo.

- `C:\Users\USER\Desktop\projeto-estoque\editar.html`
  Pagina de operacao. Concentra login, voz, formulario manual, nova contagem e sincronizacao.

- `C:\Users\USER\Desktop\projeto-estoque\visao-geral.html`
  Dashboard com total de caixas, saida de caixas e comparacao da ultima contagem.

- `C:\Users\USER\Desktop\projeto-estoque\assets\app.js`
  Arquivo central do sistema. Quase toda a regra de negocio esta aqui.

- `C:\Users\USER\Desktop\projeto-estoque\styles.css`
  Estilos compartilhados entre as tres paginas.

- `C:\Users\USER\Desktop\projeto-estoque\manifest.webmanifest`
  Configuracao do PWA instalado no celular.

- `C:\Users\USER\Desktop\projeto-estoque\service-worker.js`
  Cache offline do shell do app.

- `C:\Users\USER\Desktop\projeto-estoque\supabase-completo.sql`
  Script principal de estrutura do banco.

- `C:\Users\USER\Desktop\projeto-estoque\supabase-caixas-avulsas.sql`
  Migracao da funcionalidade de caixas avulsas.

- `C:\Users\USER\Desktop\projeto-estoque\supabase-dashboard-migracao.sql`
  Migracao do campo `outflow_caixas` usado no dashboard.

## Mapa de blocos do `app.js`

### 1. Configuracao e regras de negocio

- `CONFIG_GERAL`
  Define setores, produtos, marcas e a funcao que calcula `caixas_pallet`.

- `SPECIAL_TIPO_VARIANTS`
  Guarda tipos especiais que nao aparecem como numero puro.
  Hoje o caso especial e `ORANGE`, com:
  - `6A` salvo internamente como `14`
  - `6B` salvo internamente como `15`

- `NO_TIPO_PRODUCTS`
  Lista produtos que nao usam tipo.
  Hoje o principal caso e `PIMENTAO`.

### 2. Utilitarios de inventario

- `normalizeInventoryMetrics`
  Funcao mais importante das metricas. Mantem pallets, caixas avulsas e total coerentes.

- `hydrateInventoryRow`
  Garante que qualquer linha lida do banco ou do rascunho fique normalizada.

- `applyInventoryDeltas`
  Soma pallets/caixas em um item ja existente.

### 3. Desfazer e corrigir ultimo lancamento

- `buildLaunchItem`
- `buildLaunchRecord`
- `revertLaunchRecord`
- `removeLastLaunchCommand`
- `beginVoiceCorrection`
- `handlePendingCorrection`

Essas funcoes sustentam os comandos de voz:
- `REMOVER`
- `CORRIGIR`

### 4. Linguagem e parser da voz

- `normalizeText`
  Normaliza a transcricao da fala.
  Exemplos:
  - `CEP` -> `CEPI`
  - `BRASIL` -> `BRAZIL`
  - `ORANAGE` -> `ORANGE`

- `extractCommandNumbers`
  Extrai numeros do comando ignorando setor/produto/marca ja reconhecidos.

- `extractSpecialTipoSequence`
  Detecta tipos especiais como `SEIS A` e `SEIS B`.

- `processCommand`
  Coracao da automacao por voz. Decide:
  - travas de contexto;
  - tipo;
  - quantidade;
  - remocao/correcao;
  - gravacao final.

### 5. Rascunho offline

- `saveCountDraftLocally`
- `restoreCountDraftForCurrentUser`
- `clearCountDraft`
- `renderCountSyncStatus`

Essas funcoes permitem continuar a nova contagem sem internet.

### 6. Agregacao, comparacao e saida

- `aggregateRows`
  Agrupa itens iguais.

- `calculateOutflowCaixas`
  Soma quantas caixas sairam no total.

- `buildComparisonReport`
  Gera a lista detalhada do que saiu por item.

- `saveComparisonReport`
- `loadComparisonReport`
- `renderComparisonReport`

Essas funcoes alimentam o card de comparacao da pagina `Visao geral`.

### 7. Dashboard

- `buildSnapshotSeries`
- `buildSnapshotEventSeries`
- `buildDashboardSeries`
- `renderDashboard`

Controlam os graficos de total do CD e saida de caixas.

### 8. Supabase

- `loadPublicRecords`
- `loadUserRecords`
- `upsertRecord`
- `saveSnapshotRecord`
- `saveNewCount`

Essas funcoes fazem leitura e escrita no banco.

### 9. Formulario manual e edicao

- `updateManualTipoOptions`
  Monta os tipos disponiveis conforme setor/produto/marca.
  Exemplo:
  - `ORANGE` mostra `6A` e `6B`
  - `PIMENTAO` mostra `S/T`

- `getManualCaixasPallet`
- `addManualItem`
- `openEditModal`
- `saveEditItem`
- `removeRow`

### 10. Bootstrap

- `setupEvents`
- `handleAuthState`
- `setupAuth`
- `initSetorSelects`

Sao as funcoes que conectam o DOM com a regra de negocio.

## Fluxos principais

### Fluxo 1: estoque atual

1. `loadPublicRecords` carrega a tabela publica.
2. `loadUserRecords` carrega a contagem do usuario logado.
3. `renderPublicTable` e `renderCountTable` atualizam a tela.

### Fluxo 2: nova contagem offline

1. `setCountMode("new")` inicia a nova contagem.
2. os lancamentos entram em `state.sessionRows`.
3. `saveCountDraftLocally` protege o rascunho no aparelho.
4. `saveNewCount` sincroniza tudo de uma vez com o Supabase.

### Fluxo 3: voz

1. `setupVoice` liga a Web Speech API.
2. `processCommand` interpreta o texto final.
3. `registerInventoryChange` aplica o lancamento.
4. `upsertRecord` salva no banco quando necessario.

### Fluxo 4: comparacao de saida

1. ao salvar nova contagem, o sistema separa:
   - contagem anterior
   - contagem atual
2. `buildComparisonReport` calcula item a item o que saiu.
3. `renderComparisonReport` mostra isso na `Visao geral`.

## Regras especiais atuais

- `PIMENTAO` usa `S/T`
- marcas com `14Kg` continuam sendo marcas normais, nao tipo
- `ORANGE` usa tipos especiais:
  - `6A`
  - `6B`

## Dica de manutencao

Quando precisar alterar alguma regra de negocio, siga esta ordem:

1. ajuste `CONFIG_GERAL` se a mudanca for de produto/marca/caixas por pallet;
2. ajuste parser de voz em `normalizeText`, `extractCommandNumbers` ou `processCommand`;
3. ajuste formulario manual em `updateManualTipoOptions` e `addManualItem`;
4. ajuste exibicao em `formatTipoLabelValue`, tabelas e resumo;
5. se houver persistencia nova, revise as funcoes do Supabase.
