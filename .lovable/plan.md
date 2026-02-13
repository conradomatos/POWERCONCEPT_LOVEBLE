
# PLANO: FIX — PDF: Tabela estourando + Checklist formatação

## PROBLEMA 1: Coluna "Ação" estourando a tabela

**Causa**: 
- Nem todas as `autoTable` calls têm `overflow: 'linebreak'` em styles
- A coluna "Ação" (coluna 5) tem largura de 38mm, mas texto como "Lançar transferência Sicredi → Cartão de Crédito no Omie" é muito longo e ultrapassa
- Outras tabelas (Fontes, Matching, Titular) não têm este setting, causando potenciais estouros também

**Solução**:
1. Adicionar `overflow: 'linebreak'` em TODAS as chamadas de `autoTable` dentro de `gerarRelatorioPDF` (4 chamadas: linhas 573, 591, 657, 709)
2. Revisar columnStyles da tabela de divergências para garantir que coluna "Ação" (index 5) tem espaço suficiente com wrap forçado
3. Aplicar padrão consistente: `fontSize: 8` (já tem), `cellPadding: 3` para respiração, `overflow: 'linebreak'` global

**Mudanças específicas em `outputs.ts`**:
- Linha 585: Adicionar `overflow: 'linebreak'` ao styles da tabela Fontes
- Linha 605: Adicionar `overflow: 'linebreak'` ao styles da tabela Matching
- Linha 666: Já tem, mas garantir que está ativo
- Linha 720: Adicionar `overflow: 'linebreak'` ao styles da tabela Titular
- Linhas 667-674: Verificar se columnStyles está adequado (possivelmente aumentar coluna 5 para 50-55)

---

## PROBLEMA 2: Checklist com "&" e formatação monospace

**Causa**:
- Linhas 748-783: Usando `doc.text(item, ...)` com checkbox Unicode (☐) que aparenta renderizar como "&"
- Possível encoding issue ou fonte incorreta afetando Unicode
- Cada item é rendido como texto simples, sem styling colorido por importância

**Solução**:
Substituir a seção de checklist (linhas 734-783) por uma tabela estruturada usando `autoTable` com styling colorido por tipo de item:

1. Criar array `checkItems` com estrutura: `{ icon: string, texto: string, cor: [r,g,b] }`
2. Separar por tipo:
   - Vermelho (200, 50, 50): FALTANDO, ATRASO, DUPLICIDADES
   - Laranja (200, 120, 0): TRANSFERÊNCIAS, A MAIS, VALORES
   - Azul (47, 84, 150): CARTÃO
   - Cinza (100, 100, 100): REVISAR
3. Usar `autoTable` com theme `plain`, `didParseCell` para colorir cada linha conforme o tipo
4. Forçar font `helvetica`, remover bordas (theme `plain`), usar bullets (●) em vez de checkboxes

**Mudanças específicas em `outputs.ts`**:
- Linhas 734-741: Manter header e estrutura
- Linhas 743-776: Manter lógica de contagem de itens
- Linhas 748-775: Refatorar para criar array estruturado com `{ icon, texto, cor }`
- Linhas 777-783: Substituir loop de `doc.text()` por single `autoTable` call com `didParseCell` para styling

---

## ORDEM DE IMPLEMENTAÇÃO

1. **Adicionar `overflow: 'linebreak'` em TODAS as autoTable** (4 pontos: linhas 585, 605, 666, 720)
2. **Aumentar coluna "Ação" em columnStyles** (linha 673, de 38 para 50)
3. **Refatorar checklist** (substituir linhas 748-783 por nova lógica com array estruturado + autoTable)

---

## IMPACTO

- **Tabelas**: Sem mais overflow, texto quebra dentro das células
- **Checklist**: Aparência profissional com cores por tipo, sem encoding issues
- **Qualidade PDF**: Melhor leitura, menos erros de rendering
