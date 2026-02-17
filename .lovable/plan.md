

# FIX 6b -- Diagnostico FOPAG + Fallback por valor

## Resumo

Adicionar logging de diagnostico no parser e engine para identificar por que o match FOPAG nao esta funcionando, e implementar fallback que faz match por valor exato + data sem depender do campo observacoes.

---

## Alteracoes

### 1. Logging de observacoes no parser (`parsers.ts`)

**Arquivo:** `src/lib/conciliacao/parsers.ts`, apos linha 98 (antes do `break;` na linha 99)

Adicionar validacao e log da coluna `observacoes`, com fallback que lista todas as colunas do header caso nao encontrada.

### 2. Diagnostico FOPAG no engine (`engine.ts`)

**Arquivo:** `src/lib/conciliacao/engine.ts`, antes da linha 147 (`matchCamadaA(...)`)

Inserir bloco de diagnostico que:
- Conta entradas PIX_ENVIADO/FOLHA no banco
- Conta entradas FOPAG no Omie filtrado
- Mostra amostra dos 5 primeiros FOPAG do Omie (incluindo campo observacoes)
- Busca especificamente LUIZ ALBERTO no banco e no Omie (por observacoes e por valor)

### 3. Fallback FOPAG no matcher (`matcher.ts`)

**Arquivo:** `src/lib/conciliacao/matcher.ts`, linhas 153-169

Substituir o bloco FOPAG atual por dois loops sequenciais:

**Tentativa 1** (existente, com log adicionado): Match via observacoes usando `nomeCompativel`. Adicionar `console.log` quando match ocorre.

**Tentativa 2** (NOVO fallback): Para entradas `PIX_ENVIADO` com valor negativo que nao fizeram match na tentativa 1, tentar match contra lancamentos FOPAG genericos (clienteFornecedor contem "FOLHA"/"PAGAMENTO"/"FOPAG") usando apenas:
- Valor exato (diferenca < 0.01)
- Data dentro de 2 dias
- Sem exigir nome

Logica: valores de salario individual sao tipicamente unicos por colaborador, tornando o match por valor confiavel.

---

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/conciliacao/parsers.ts` | Log de validacao da coluna observacoes com fallback de listagem de headers |
| `src/lib/conciliacao/engine.ts` | Bloco de diagnostico FOPAG antes do matching |
| `src/lib/conciliacao/matcher.ts` | Adicionar log ao match existente + novo fallback FOPAG por valor+data |

## Arquivos NAO alterados

- `utils.ts`, `classifier.ts`, `types.ts`, `outputs.ts`, `Conciliacao.tsx`

