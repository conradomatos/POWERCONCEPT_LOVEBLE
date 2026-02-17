
# FIX 6 -- Match FOLHA DE PAGAMENTO individual via campo Observacoes

## Resumo

Expandir o matching para identificar pagamentos individuais de folha (PIX para colaboradores) cruzando o nome do colaborador no extrato bancario com o campo `observacoes` do lancamento FOPAG no Omie.

---

## Alteracoes

### 1. Expandir `nomeCompativel` com parametro `observacoesOmie` (`utils.ts`)

**Arquivo:** `src/lib/conciliacao/utils.ts`, linhas 77-101

Adicionar parametro opcional `observacoesOmie?: string` a funcao. Limpar prefixos PIX e numeros de CPF/CNPJ das observacoes antes de comparar. Incluir o texto limpo das observacoes no loop de comparacao junto com `nomeOmie` e `razaoOmie`.

- Adicionar stop words especificas de PIX: `PAGAMENTO`, `PIXDEB`, `PIXPIXDEB`, `PIXCRED`
- Remover sequencias de 11-14 digitos (CPF/CNPJ) das observacoes antes do split em palavras
- Remover condicao `if (!nomeO && !razaoO) return false` para permitir match quando so observacoes tem o nome

### 2. Passar `o.observacoes` nas chamadas existentes (`matcher.ts`)

**Arquivo:** `src/lib/conciliacao/matcher.ts`

Adicionar 5o argumento `o.observacoes` em tres locais:
- Linha 76 (Camada B): `nomeCompativel(b.nome, b.descricao, o.clienteFornecedor, o.razaoSocial, o.observacoes)`
- Linha 116 (Camada B2): idem
- Linha 237 (Camada D scoring): idem

### 3. Adicionar matching dedicado FOPAG individual (`matcher.ts`)

**Arquivo:** `src/lib/conciliacao/matcher.ts`, antes da linha 153

Inserir um novo bloco na funcao `matchCamadaC`, ANTES do agrupamento FOLHA existente. Este bloco:
- Itera sobre lancamentos bancarios nao matched do tipo `PIX_ENVIADO` ou `FOLHA`
- Para cada um, busca lancamentos Omie nao matched com categoria FOPAG/FOLHA
- Exige valor exato (diferenca < 0.01) e data proxima (ate 3 dias)
- Usa `nomeCompativel` com observacoes para verificar nome do colaborador
- Se match: marca como Camada B, tipo `FOPAG_Obs+Valor`

Isso garante que PIX individuais de folha sejam conciliados ANTES do agrupamento consolidado.

---

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/conciliacao/utils.ts` | Adicionar parametro `observacoesOmie` a `nomeCompativel`, incluir no loop de comparacao |
| `src/lib/conciliacao/matcher.ts` | Passar `o.observacoes` em 3 chamadas existentes + novo bloco FOPAG individual na Camada C |

## Arquivos NAO alterados

- `parsers.ts`, `classifier.ts`, `engine.ts`, `types.ts`, `outputs.ts`, `Conciliacao.tsx`
