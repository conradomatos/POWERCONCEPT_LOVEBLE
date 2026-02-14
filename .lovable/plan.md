

# Corrigir DRE com valores incorretos + Impostos calculados por alíquota

## Problemas Identificados

1. **Impostos retidos no Omie distorcem a DRE gerencial**: O código atual soma INSS+IR+ISS+PIS+COFINS+CSLL de AMBOS AR e AP, jogando tudo em "Deduções de Receita". Isso causa valores inflados (ex: R$ 147.733,71) e está conceitualmente errado.

2. **Categorias não mapeadas = valores zerados**: A Edge Function grava `categoria` (código Omie) mas faz upsert na tabela `omie_categoria_mapeamento` sem `conta_dre` vinculado. O hook busca mapeamentos e vê que nenhum tem `conta_dre`, resultando em nenhum valor sendo acumulado.

3. **AR e AP tratados sem distinção**: Atualmente ambos usam a mesma lógica de processamento, mas na DRE são conceitos diferentes (receita vs. despesa).

## Solução

### Decisão de Negócio sobre Impostos

A **DRE gerencial** calcula impostos por alíquotas sobre receita bruta (lucro presumido), não usa retenções de campo. Os campos `valor_inss`, `valor_ir`, etc. são **ignorados na DRE** — servem apenas para conciliação bancária futura.

Alíquotas padrão para Lucro Presumido (Prestação de Serviços):
- **ISS**: 3% (dedutor de receita)
- **PIS**: 0.65% (dedutor de receita)
- **COFINS**: 3% (dedutor de receita)
- **IRPJ**: 4.80% (32% presunção × 15% alíquota)
- **CSLL**: 2.88% (32% presunção × 9% alíquota)

### Mudanças de Implementação

#### 1. Criar `src/lib/financeiro/aliquotas.ts`

Interface e helper para configuração de alíquotas:
- `AliquotasTributarias`: `{ iss, pis, cofins, irpj, csll }`
- `ALIQUOTAS_PADRAO`: valores padrão
- `getAliquotas()`: lê do localStorage (fallback para padrão)
- `saveAliquotas()`: persiste em localStorage (futuro: Supabase)
- `calcularImpostosDRE()`: calcula impostos baseado em receita bruta
  - Retorna: `{ iss, pis, cofins, deducoes, irpj, csll, impostosLucro }`
  - `deducoes = ISS + PIS + COFINS` (saem da receita bruta)
  - `impostosLucro = IRPJ + CSLL` (seção final da DRE)

#### 2. Reescrever `src/hooks/useDREData.ts`

**Mudanças principais:**

- **Separar AR vs AP**:
  - AR sem mapeamento → fallback `(+) - Receita Bruta de Vendas`
  - AP sem mapeamento → fallback inteligente por prefixo (mesma lógica atual: `2.01/2.02` → Pessoal, `2.05` → Vendas, etc.)

- **Ignorar campos de retenção** (`valor_inss`, `valor_ir`, `valor_iss`, `valor_pis`, `valor_cofins`, `valor_csll`):
  - NÃO incluir na query do Supabase
  - NÃO processar na agregação

- **Calcular impostos por alíquota**:
  - Após processar AR, acumular receita bruta por mês
  - Para cada mês com receita, chamar `calcularImpostosDRE(receita, aliquotas)`
  - Adicionar `deducoes` em `(-) - Deduções de Receita`
  - Adicionar `impostosLucro` em `(-) - Impostos`

- **Retornar**:
  - Interface `DREDataResult` com `{ dados: DREDadosMes[], unmapped: DREUnmappedInfo[], totalAR: number, totalAP: number }`
  - Permite UI mostrar resumo dos totais sem refetch

- **Tratar `categorias_rateio` como JSON**:
  - Pode vir como string do Supabase, verificar tipo e fazer parse

#### 3. Atualizar `src/pages/FinanceiroDRE.tsx`

**Mudanças:**

- `dreResult` continua tendo `dados` e `unmapped` (já existe)
- Adicionar `totalAR` e `totalAP` para exibição opcional (futura)
- Alerta de "categorias não mapeadas" já está correto (linhas 680-696)
- Adicionar no header (após badge "Dados Omie"):
  - Texto discreto: "Impostos calculados por alíquota" com tooltip explicando as alíquotas
  - Exemplo: "Impostos calculados por alíquota (ISS 3%, PIS 0.65%, COFINS 3%, IRPJ 4.80%, CSLL 2.88%)"

#### 4. Melhorar `src/pages/MapeamentoCategorias.tsx`

**O arquivo já está correto**, mas validar:
- Coluna "Tipo" mostra badges AR/AP (já implementado)
- Botão "Sugerir Todos" aplica fallback por prefixo (já implementado no `handleAutoSuggest`)
- Tabela exibe código, descrição, tipo, títulos, conta DRE, status (já implementado)

---

## Fluxo de Dados Corrigido

```text
AR (Contas a Receber):
  1. Com mapeamento → vai para conta DRE mapeada
  2. Sem mapeamento → vai para "(+) - Receita Bruta de Vendas"
  3. Acumular receita por mês
  4. Calcular impostos sobre receita bruta
  5. ISS + PIS + COFINS → "(-) - Deduções de Receita" (reduz receita bruta)
  6. IRPJ + CSLL → "(-) - Impostos" (seção final)

AP (Contas a Pagar):
  1. Com mapeamento → vai para conta DRE mapeada
  2. Sem mapeamento → fallback inteligente por prefixo
  3. Valor integral incluso (sem retenções separadas)

Resultado:
  - Receita Bruta mostra AR total (ex: os R$ 147.733,71 antes em Deduções)
  - Deduções mostra ISS+PIS+COFINS calculados (~6.65% da receita)
  - Custos e Despesas mostram AP classificados
  - Impostos mostra IRPJ+CSLL (~7.68% da receita)
  - Categorias não mapeadas usam fallback inteligente
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/lib/financeiro/aliquotas.ts` | **CRIAR** | Configuração e cálculo de impostos |
| `src/hooks/useDREData.ts` | **REESCREVER** | Novo pipeline: separar AR/AP, ignorar retenções, calcular impostos |
| `src/pages/FinanceiroDRE.tsx` | **ATUALIZAR** | Adicionar tooltip de alíquotas no header (pequena mudança) |
| `src/pages/MapeamentoCategorias.tsx` | **VALIDAR** | Já está correto, sem mudanças necessárias |
| `src/lib/conciliacao/dre.ts` | **NÃO ALTERAR** | Motor correto, recebe dados e calcula cascata de subtotais |
| `supabase/functions/omie-financeiro/index.ts` | **NÃO ALTERAR** | Edge Function está correta, grava os dados |

---

## Benefícios

- ✅ **DRE gerencial realista**: impostos calculados por alíquota de lucro presumido, não por retenções
- ✅ **Valores não zerados**: categorias não mapeadas usam fallback inteligente (AR → Receita, AP → por prefixo)
- ✅ **Separação AR/AP clara**: receitas e despesas processadas distinta e corretamente
- ✅ **Conformidade contábil**: estrutura segue padrão DRE profissional
- ✅ **Configurável**: alíquotas podem ser ajustadas via localStorage (preparado para Supabase futuro)

---

## Detalhes Técnicos

### Parse de categorias_rateio

```typescript
const rateio = typeof titulo.categorias_rateio === 'string' 
  ? JSON.parse(titulo.categorias_rateio) 
  : (Array.isArray(titulo.categorias_rateio) ? titulo.categorias_rateio : null);
```

### Seleção Supabase (otimizada)

Remover campos de impostos retidos:
```typescript
// Antes:
.select('data_emissao, valor, categoria, categorias_rateio, valor_inss, valor_ir, ...')

// Depois:
.select('data_emissao, valor, categoria, categorias_rateio, status')
```

### Estrutura de Return do Hook

```typescript
interface DREDataResult {
  dados: DREDadosMes[];              // Array de valores por conta/mês
  unmapped: DREUnmappedInfo[];       // Categorias não mapeadas com totais
  totalAR: number;                  // Soma de todas receitas (para validação)
  totalAP: number;                  // Soma de todas despesas (para validação)
}
```

---

## Compatibilidade

- Se Supabase vazio: DRE funciona como antes (estrutura com zeros)
- Se localStorage vazio: fallback para ALIQUOTAS_PADRAO
- Funções existentes mantidas como fallback
- Nenhuma coluna existente removida, apenas ignoradas (backwards compatible)

