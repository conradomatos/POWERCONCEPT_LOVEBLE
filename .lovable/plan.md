
# DIAGNÓSTICO E PLANO DE CORREÇÃO: Motor de Conciliação Financeira

## PROBLEMAS IDENTIFICADOS

### 1. **Omie Parser com Índices Fixos (CRÍTICO)**
- Linha 56-91 em `parsers.ts`: O `parseOmie` usa índices hardcoded (coluna 0=situacao, 1=data, 2=cliente, etc.)
- Se o arquivo Omie real tiver colunas em ordem diferente ou colunas adicionais, os dados são lidos nas posições erradas
- Resultado: CNPJ/CPF (coluna 19) e Observações (coluna 20) ficam vazios ou leem dados errados
- Isso faz com que matching A (que depende de CNPJ) não encontre correspondências

### 2. **Filtro de Conta Muito Rígido**
- Linha 39-40 em `engine.ts`: Filtro exato `o.contaCorrente === 'CONCEPT_SICREDI'`
- Se o Omie usar nomes diferentes para a conta (ex: "SICREDI C/C", "SICREDI CONCEPT", etc.), o filtro não funciona
- Resultado: Lançamentos não são separados corretamente entre Sicredi e Cartão
- `omieSicredi` fica vazio ou incompleto, causando 99% das transações caírem em Camada D (fallback)

### 3. **parseDate Não Trata Datas Seriais do Excel**
- Linha 137-145 em `utils.ts`: Quando xlsx lê datas, pode retornar número serial (ex: 45658 = "15/01/2025")
- O parseDate atual não converte números → Datas ficam null
- Resultado: Lançamentos com datas inválidas são descartados durante parsing
- Reduz drasticamente o número de lançamentos processados

### 4. **Falta de Diagnóstico**
- Não há visibility no que está acontecendo durante o parsing e matching
- Impossível saber se:
  - Banco tem CNPJ? Quantos?
  - Omie tem CNPJ? Quantos?
  - Qual é a distribuição de contas Omie?
  - Quantos registros são perdidos em cada etapa?

---

## SOLUÇÃO: 5 MUDANÇAS CRÍTICAS

### **MUDANÇA 1: Adicionar Console.logs Diagnósticos em `engine.ts`**

Inserir logs estratégicos após cada parsing e após cada camada de matching para visibilidade:
- Após parseBanco: Total, com CNPJ, amostra de dados
- Após parseOmie: Total, com CNPJ, separação por conta, amostra de dados
- Após cada camada: Contagem de matches acumulados, banco/omie matched
- Filtro de contas: Listar todas as contas encontradas no Omie

**Benefício**: Identificar exatamente onde os dados estão sendo perdidos

### **MUDANÇA 2: Reescrever `parseOmie` com Detecção Dinâmica de Header**

Implementar um colMap dinâmico que:
- Procura a linha de header (geralmente linha 2-3) detectando colunas por nome
- Monta um dicionário `colMap` mapeando `{ situacao: idx, data: idx, cliente: idx, ... cnpjCpf: idx }`
- Usa helpers `col(key)` e `colNum(key)` para ler dados usando o colMap
- Fallback: Se não encontrar header, usa índices padrão como fallback

**Benefício**: Parser robusto a variações no formato do arquivo Omie

### **MUDANÇA 3: Melhorar `parseDate` para Lidar com Datas Seriais do Excel**

Adicionar lógica:
- Se `val` é number: Converter número serial Excel → Date
  - Excel epoch: 1/1/1900
  - Fórmula: `new Date(1900, 0, 1).getTime() + (serialNumber - 2) * 86400000`
- Se `val` é string: Tentar dd/mm/yyyy, ISO (yyyy-mm-dd), depois parse genérico
- Resultado: Todas as datas (string ou número) são tratadas

**Benefício**: Não perder lançamentos por falha de parsing de data

### **MUDANÇA 4: Tornar Filtro de Conta Mais Flexível em `engine.ts`**

Mudar de:
```typescript
const omieSicredi = omie.filter(o => o.contaCorrente === 'CONCEPT_SICREDI');
```

Para:
```typescript
const contaCartaoKeywords = ['CARTAO', 'CARTÃO', 'CREDIT CARD', 'DÉBITO'];
const omieSicredi = omie.filter(o => 
  !contaCartaoKeywords.some(k => o.contaCorrente.toUpperCase().includes(k))
);
const omieCartao = omie.filter(o => 
  contaCartaoKeywords.some(k => o.contaCorrente.toUpperCase().includes(k))
);
```

**Benefício**: Separação correta independente do exato nome da conta no Omie

### **MUDANÇA 5: Verificar e Melhorar `nomeCompativel` e `extractCnpjCpf` em `utils.ts` (Validação)**

O código atual parece estar OK, mas:
- `nomeCompativel` pode ser verificado para ter threshold correto (>=1 token comum)
- `extractCnpjCpf` já faz o trabalho, mas só funciona se o CNPJ estiver na descrição

---

## PLANO DE IMPLEMENTAÇÃO (ORDEM CRÍTICA)

1. **Adicionar console.logs em `engine.ts`** (10 min)
   - Sem modificar lógica, apenas diagnóstico
   
2. **Reescrever `parseOmie` com colMap dinâmico** (20 min)
   - Maior impacto: vai recuperar dados que estão sendo lidos em índices errados
   
3. **Melhorar `parseDate` para datas seriais** (10 min)
   - Evitar perda de lançamentos
   
4. **Tornar filtro de conta flexível** (5 min)
   - Garantir separação correta Sicredi vs Cartão

5. **Testar e Verificar Distribuição**
   - Executar conciliação e verificar console
   - Esperado: Camada A > B > C >> D

---

## IMPACTO ESPERADO

**Antes (Problema Atual):**
- Camada A: 1 (CNPJ não extraído ou não comparado)
- Camada B: 0 (dados faltando por índices errados)
- Camada D: 160 (fallback de scoring baixo)

**Depois (Objetivo):**
- Camada A: ~30-50 (CNPJ exato encontrado)
- Camada B: ~80-100 (valor + nome + data)
- Camada C: ~5-15 (agrupamentos)
- Camada D: ~20-30 (scoring baixo para casos reais inconciliáveis)
- **Total conciliados: ~130-190 de 160** = Taxa melhorada de 60% → 85%+

---

## ARQUIVOS A MODIFICAR

1. `src/lib/conciliacao/engine.ts` - Adicionar console.logs + filtro flexível
2. `src/lib/conciliacao/parsers.ts` - Reescrever parseOmie
3. `src/lib/conciliacao/utils.ts` - Melhorar parseDate
