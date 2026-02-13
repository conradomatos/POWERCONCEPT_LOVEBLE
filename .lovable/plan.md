
# Adicionar Botão "Sincronizar Omie" ao Header da Página FinanceiroDRE

## Entendimento Atual
- A página `FinanceiroDRE.tsx` já utiliza `useDREData()` para buscar dados reais do Omie
- O `SyncButton.tsx` existente em `src/components/rentabilidade/` já implementa a sincronização com:
  - Invocação da Edge Function `omie-financeiro` com `{ tipo: 'TODOS' }`
  - Spinner/loading durante sincronização
  - Toast de sucesso/erro
  - Callback `onSyncComplete` para ações pós-sincronização
- A tabela `omie_sync_log` armazena registros com `status` e `finalizado_em` para rastreamento

## Plano de Implementação

### 1. **Importações Necessárias**
   - Adicionar `SyncButton` (já existe em `rentabilidade/`)
   - Importar `useQueryClient` de `@tanstack/react-query`

### 2. **Obter Última Sincronização**
   - Adicionar hook `useQuery` similar ao de Rentabilidade que:
     - Consulta `omie_sync_log` com `status = 'SUCESSO'`
     - Ordena por `finalizado_em DESC` e pega o primeiro registro
     - Retorna a data em `finalizado_em`

### 3. **Callback de Sincronização Completa**
   - Criar função `handleSyncComplete` que:
     - Invalida a query `'dre-data'` do hook `useDREData` (força refetch)
     - Invalida a query `'last-sync'` para atualizar o timestamp

### 4. **Posicionar SyncButton no Toolbar**
   - Adicionar `SyncButton` no toolbar (linha ~634), após o botão "Exportar PDF"
   - Passar `lastSyncAt={lastSync}` e `onSyncComplete={handleSyncComplete}`
   - Adicionar `Separator` antes para separar visualmente

### 5. **Texto Discreto com Última Sincronização**
   - Adicionar parágrafo abaixo do título (após o badge "Dados Omie")
   - Mostrar "Última sincronização: há X minutos" usando `formatDistanceToNow` da library `date-fns` (já usada em SyncButton)
   - Condicionar a exibição para quando houver `lastSync`

## Detalhes Técnicos
- **Linha do hook lastSync**: Inserir após o hook `useDREData` (linhas ~491-492)
- **Linha do handleSyncComplete**: Inserir após o memoizado `categoriasOrfas` (linhas ~510-511)
- **Posicionamento SyncButton**: No toolbar, após "Exportar PDF" (após linha 639)
- **Texto de última sincronização**: No header, abaixo de `<p className="text-sm text-muted-foreground mt-1">...` (linha 542)

## Benefícios
- Usuário pode sincronizar dados diretamente da DRE sem navegar
- Feedback visual imediato da sincronização (spinner, toast, badge)
- DRE atualiza automaticamente após sucesso da sincronização
- Timestamp visível para rastrear atualização dos dados

## Compatibilidade
- Reutiliza componente `SyncButton` já testado e usado em Rentabilidade
- Segue mesmo padrão de invalidação de queries da aplicação
- Sem alterações em outros arquivos (apenas FinanceiroDRE.tsx)
