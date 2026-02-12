
# Plano: Modulo Conciliacao Financeira (Fase 1)

## Resumo

Criar a estrutura do modulo de Conciliacao Financeira: rota, menu, tipos TypeScript e pagina com UI de upload de 3 arquivos Excel/CSV. O parsing real dos arquivos funcionara via `xlsx` (ja instalado). A logica de conciliacao sera placeholder (toast informando Fase 2).

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/lib/conciliacao/types.ts` | Tipos TypeScript (interfaces para lancamentos, matches, divergencias, resultado) |
| `src/pages/Conciliacao.tsx` | Pagina completa com header, 3 cards de upload, botao de acao e area de resultados |

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/App.tsx` | Adicionar rota `/conciliacao` |
| `src/components/AppSidebar.tsx` | Adicionar item "Conciliacao" na area `relatorios` com icone `ArrowLeftRight` |
| `src/components/Layout.tsx` | Adicionar mapeamento `'/conciliacao': 'relatorios'` no `routeToArea` |

---

## Detalhes de Implementacao

### 1. Tipos (`src/lib/conciliacao/types.ts`)

Criar todas as interfaces conforme especificado:
- `LancamentoBanco`, `LancamentoOmie`, `TransacaoCartao`, `CartaoInfo`
- `Divergencia` com `TipoDivergencia`
- `Match` com `TipoMatch`
- `ResultadoConciliacao` com resumo
- `CategoriaMap`

### 2. Pagina (`src/pages/Conciliacao.tsx`)

**Estrutura:**
- Wrapper `<Layout>` com autenticacao (mesmo padrao de Dashboard/Home)
- Estado local para os 3 arquivos e dados parseados

**Zona 1 - Header:**
- Titulo "Conciliacao Financeira"
- Subtitulo explicativo
- Badge com mes/ano de referencia (detectado do primeiro arquivo carregado, ou "--")

**Zona 2 - Upload (3 Cards em grid):**

Cada card tera:
- Header colorido (azul/verde/roxo) com icone
- Area de drag & drop usando `onDragOver`/`onDrop` nativos + `<input type="file">`
- Estado vazio: texto "Arraste ou clique para carregar"
- Estado carregado: nome do arquivo, contagens parseadas, botao X para remover
- Parsing real com `xlsx` (read workbook, extrair linhas, detectar periodo)

Detalhes por card:
- **Extrato Bancario**: icone `Building2`, cor azul, aceita xlsx/xls/csv, mostra quantidade de lancamentos e periodo
- **Extrato Omie**: icone `FileSpreadsheet`, cor verde, aceita xlsx/xls, mostra lancamentos e contas correntes encontradas
- **Fatura Cartao**: icone `CreditCard`, cor roxa, aceita xlsx/xls/csv, mostra transacoes e valor total

**Zona 3 - Acao + Resultados:**
- Botao "Executar Conciliacao" desabilitado ate Banco + Omie carregados (Cartao opcional)
- Ao clicar: toast "Processamento sera implementado na Fase 2"
- Area de resultados com placeholder (4 KPI cards zerados + 3 botoes de download desabilitados)

### 3. Rota (`src/App.tsx`)

```typescript
import Conciliacao from "./pages/Conciliacao";
// Adicionar junto com rotas de relatorios:
<Route path="/conciliacao" element={<Conciliacao />} />
```

### 4. Sidebar (`src/components/AppSidebar.tsx`)

No `areaNavItems.relatorios.items`, apos "Custos & Margem":
```typescript
{ title: 'Conciliacao', url: '/conciliacao', icon: ArrowLeftRight }
```
Importar `ArrowLeftRight` do lucide-react.

### 5. Layout (`src/components/Layout.tsx`)

No `routeToArea`:
```typescript
'/conciliacao': 'relatorios',
```

---

## Logica de Parsing dos Arquivos

O parsing usara a lib `xlsx` ja instalada:

```typescript
import * as XLSX from 'xlsx';

// Ao receber arquivo via drop/input:
const reader = new FileReader();
reader.onload = (e) => {
  const data = new Uint8Array(e.target.result);
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  // Extrair contagens e periodo
};
```

Para cada tipo de arquivo:
- **Banco**: contar linhas, detectar mes/ano da coluna de data
- **Omie**: contar linhas, extrair valores unicos da coluna "conta_corrente"
- **Cartao**: contar linhas, somar coluna de valor

---

## Responsividade

- Cards de upload: `grid-cols-1 md:grid-cols-3`
- KPI cards: `grid-cols-2 md:grid-cols-4`
- Conteudo centralizado com `max-w-6xl mx-auto`

---

## Ordem de Implementacao

1. Criar `src/lib/conciliacao/types.ts`
2. Criar `src/pages/Conciliacao.tsx`
3. Modificar `src/App.tsx` (rota)
4. Modificar `src/components/Layout.tsx` (routeToArea)
5. Modificar `src/components/AppSidebar.tsx` (menu item)
