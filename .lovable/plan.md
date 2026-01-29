

# Redesign: Apontamento com Dropdown de Selecao

## Problema Atual
A interface atual exibe TODOS os projetos ativos em uma lista/tabela longa. Isso polui a tela e dificulta encontrar projetos especificos.

## Solucao Proposta
Mudar para um formato com dropdown de selecao onde:
- Usuario seleciona projeto em dropdown com busca
- Digita horas e clica "Adicionar"
- Apenas os lancamentos do dia aparecem na lista
- Lista e curta e editavel

---

## Arquitetura das Mudancas

### Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/apontamento/ApontamentoDesktop.tsx` | Redesign completo para formato dropdown |
| `src/components/apontamento/ApontamentoMobile.tsx` | Redesign para formato dropdown mobile-friendly |
| `src/hooks/useApontamentoSimplificado.ts` | Adicionar funcoes para add/remove items localmente |

---

## 1. Novo Layout Desktop

```text
+------------------------------------------------------------------+
| Apontamento de Horas                                             |
| Lance horas rapidamente para colaboradores                       |
+------------------------------------------------------------------+
| Colaborador: [Dropdown]     Data: < quinta, 29/01 > [Hoje]       |
+------------------------------------------------------------------+
| Adicionar Lancamento:                                            |
| [Selecione projeto v]  [Horas]  [Nota icone]  [+ Adicionar]      |
+------------------------------------------------------------------+
| Lancamentos do Dia:                                              |
| +------------------------------------------------------------+   |
| | PROJETO                      | HORAS | NOTA |              |   |
| |------------------------------------------------------------|   |
| | 0002 ADMINISTRATIVO          |  4    | icone | lixeira    |   |
| | 26004 GEXPO - CALDEIREIRO    |  4    | icone | lixeira    |   |
| +------------------------------------------------------------+   |
|                                                                  |
| Total: 8h                                    [Salvar]            |
+------------------------------------------------------------------+
| Resumo do Dia (Rateio)                                           |
| [Card 0002: 50% 4h R$109]  [Card 26004: 50% 4h R$109]            |
+------------------------------------------------------------------+
```

---

## 2. Componentes do Formulario de Adicao

### Dropdown de Projeto
- Usar componente Popover + Command (cmdk) para busca
- Mostrar projetos no formato "OS - NOME"
- Filtrar projetos ja adicionados para evitar duplicatas
- Ordenar por OS

### Campo de Horas
- Input numerico com placeholder "0"
- Aceita decimais (0.5, 1.5)
- Largura fixa ~80px

### Icone de Nota
- Botao com icone FileText
- Ao clicar, expande campo de descricao abaixo do formulario

### Botao Adicionar
- Desabilitado se projeto ou horas nao preenchidos
- Ao clicar: adiciona item a lista local
- Limpa campos apos adicionar

---

## 3. Lista de Lancamentos

### Exibicao
- Mostra apenas itens COM horas para o dia (existentes + novos)
- Cada linha: Projeto | Horas (editavel) | Nota | Remover

### Comportamento
- Horas editavel inline (mesmo comportamento atual)
- Botao remover (lixeira) - remove da lista local
- Se item existia no banco, marca para delete no save

---

## 4. Mudancas no Hook

```typescript
// Adicionar ao useApontamentoSimplificado:

// Estado local para itens adicionados
const [localItems, setLocalItems] = useState<LocalItem[]>([]);

// Funcao para adicionar item
const addItem = (projetoId: string, horas: number, descricao?: string) => {
  // Adiciona ao estado local
  // Marca como 'changed'
};

// Funcao para remover item
const removeItem = (projetoId: string) => {
  // Se existia no banco: marca para delete
  // Se era local: remove do estado
};

// Lista filtrada: apenas items com horas > 0
const lancamentosDoDia = projetosComHoras.filter(p => p.horas && p.horas > 0);

// Projetos disponiveis para dropdown (exclui ja adicionados)
const projetosDisponiveis = projetos.filter(
  p => !lancamentosDoDia.find(l => l.projeto_id === p.id)
);
```

---

## 5. Fluxo de Usuario

```text
1. Usuario abre pagina
2. Seleciona colaborador (se gestor)
3. Ve lista vazia ou com lancamentos existentes do dia
4. Clica no dropdown de projeto
5. Busca/seleciona projeto desejado
6. Digita horas (ex: 4)
7. [Opcional] Clica icone nota, digita descricao
8. Clica "Adicionar"
9. Projeto aparece na lista abaixo
10. Repete passos 4-9 para outros projetos
11. Pode editar horas inline na lista
12. Pode remover item clicando na lixeira
13. Clica "Salvar" para persistir
14. Toast "Horas salvas!"
```

---

## 6. Detalhes de Implementacao

### Dropdown com Busca (Combobox Pattern)

Usar Popover + Command para criar dropdown searchable:

```tsx
<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" className="w-[280px] justify-between">
      {selectedProjeto 
        ? `${selectedProjeto.os} - ${selectedProjeto.nome}`
        : "Selecione o projeto"
      }
      <ChevronsUpDown className="opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[280px] p-0">
    <Command>
      <CommandInput placeholder="Buscar projeto..." />
      <CommandList>
        <CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>
        <CommandGroup>
          {projetosDisponiveis.map((projeto) => (
            <CommandItem
              key={projeto.id}
              onSelect={() => {
                setSelectedProjeto(projeto);
                setOpen(false);
              }}
            >
              <span className="text-muted-foreground mr-2">
                {projeto.os}
              </span>
              {projeto.nome}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

### Tabela de Lancamentos

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Projeto</TableHead>
      <TableHead className="w-24">Horas</TableHead>
      <TableHead className="w-16">Nota</TableHead>
      <TableHead className="w-12"></TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {lancamentosDoDia.map((item) => (
      <TableRow key={item.projeto_id}>
        <TableCell>{item.projeto_os} {item.projeto_nome}</TableCell>
        <TableCell>
          <Input 
            value={item.horas} 
            onChange={(e) => setHoras(item.projeto_id, parseFloat(e.target.value))}
          />
        </TableCell>
        <TableCell>
          <Button variant="ghost" size="icon">
            <FileText />
          </Button>
        </TableCell>
        <TableCell>
          <Button variant="ghost" size="icon" onClick={() => removeItem(item.projeto_id)}>
            <Trash2 className="text-destructive" />
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## 7. Versao Mobile

Layout similar mas otimizado para toque:

```text
+----------------------------------+
| <- Apontamento   29/01/2026      |
|      < quinta-feira >            |
+----------------------------------+
| Adicionar:                       |
| [Selecione projeto        v]     |
| [Horas]  [Nota]  [+ Adicionar]   |
+----------------------------------+
| Lancamentos:                     |
| +------------------------------+ |
| | 0002 ADMIN         4h  x    | |
| | 26004 GEXPO        4h  x    | |
| +------------------------------+ |
+----------------------------------+
| Total: 8h     [Salvar]           |
+----------------------------------+
```

---

## 8. Cards de Resumo (Rateio)

Manter implementacao existente do rateio:
- Buscar da view `vw_rateio_dia_projeto`
- Mostrar cards com percentual e valor

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Lista com 20+ projetos | Dropdown com busca |
| Precisa rolar para encontrar | Busca instantanea |
| Interface poluida | Interface limpa |
| Todos projetos visiveis | Apenas lancamentos do dia |
| Dificil saber o que foi preenchido | Obvio - so aparece o que foi adicionado |

**Tempo de lancamento:** De ~30 segundos para ~10 segundos por projeto.

