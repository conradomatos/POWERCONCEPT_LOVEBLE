
## Plano: Correção de Rotas/Menus + UX Apontamento Diário

### TAREFA 1: Correção de Rotas e Menus

#### Problema Identificado
O arquivo `src/components/Layout.tsx` possui um mapeamento `routeToArea` que determina qual sidebar lateral mostrar. A rota `/apontamento-diario` **não está neste mapeamento**, então cai no default (`relatorios`), exibindo a sidebar errada.

#### Rotas Faltantes no `routeToArea`
| Rota | Área Correta | Status |
|------|--------------|--------|
| `/apontamento-diario` | `projetos` | FALTANDO |
| `/aprovacoes-projetos` | `projetos` | FALTANDO |
| `/rentabilidade` | `relatorios` | OK (startsWith funciona) |
| `/pendencias` | N/A | Página não existe! |

#### Solução 1.1: Atualizar `Layout.tsx`
Adicionar as rotas faltantes no objeto `routeToArea`:

```typescript
const routeToArea: Record<string, NavigationArea> = {
  // Home
  '/': 'home',
  // Recursos
  '/collaborators': 'recursos',
  '/recursos/custos': 'recursos',
  '/import': 'recursos',
  // Projetos
  '/empresas': 'projetos',
  '/projetos': 'projetos',
  '/planejamento': 'projetos',
  '/apontamentos': 'projetos',
  '/apontamento-diario': 'projetos',       // ADICIONAR
  '/aprovacoes-projetos': 'projetos',      // ADICIONAR
  '/import-apontamentos': 'projetos',
  // Relatórios
  '/dashboard': 'relatorios',
  '/custos-projeto': 'relatorios',
  '/rentabilidade': 'relatorios',          // ADICIONAR (explícito)
  // Orçamentos
  '/orcamentos': 'orcamentos',
  '/orcamentos/bases': 'orcamentos',
};
```

#### Solução 1.2: Remover ou Criar `/pendencias`
A rota `/pendencias` está listada no menu de Relatórios mas a página não existe (erro 404 no console). 

**Opção A (recomendada)**: Remover do menu até a funcionalidade ser implementada.
**Opção B**: Criar página placeholder.

Arquivo: `src/components/AppSidebar.tsx` - Remover linha:
```typescript
{ title: 'Pendências', url: '/pendencias', icon: AlertTriangle },
```

---

### TAREFA 2: Melhorias de UX no Apontamento Diário

A tela atual já possui boa estrutura. Melhorias propostas para velocidade:

#### 2.1: Atalhos de Teclado para Lançamento Rápido
- **Enter** no campo de horas → adiciona lançamento
- **Foco automático** no próximo campo após adicionar
- Adicionar `autoFocus` no primeiro campo após limpeza

#### 2.2: Melhoria no Formulário de Lançamento
- Usar `Command` (cmdk) para autocomplete de projetos mais rápido
- Simplificar: apenas Projeto + Horas como campos obrigatórios
- Mover Tipo Hora e Descrição para expansão opcional (accordion)

#### 2.3: Indicadores no Topo (Já existem, apenas ajustes)
Os 4 cards (Base, Apontadas, Saldo, Custo) já estão implementados. Ajustes:
- Tornar mais compactos em mobile
- Adicionar badge de fonte quando Secullum estiver ativo (futuro)

#### 2.4: Validação de Saldo (Já implementada)
- Tolerância de ±0.25h já está no código (`tolerancia = 0.25`)
- Botão "Enviar para Aprovação" já desabilita quando saldo ≠ 0
- Warning visual já existe quando há divergência

#### Arquivos a Modificar
| Arquivo | Alteração |
|---------|-----------|
| `src/components/Layout.tsx` | Adicionar rotas faltantes em `routeToArea` |
| `src/components/AppSidebar.tsx` | Remover link "Pendências" que não existe |
| `src/pages/ApontamentoDiario.tsx` | Adicionar atalho Enter + autoFocus para velocidade |

---

### TAREFA 3: Preparação para Secullum (Estrutura Pronta)

A estrutura atual já está preparada:

| Campo/Recurso | Status |
|---------------|--------|
| `horas_base_dia` | ✅ Existe, editável manualmente |
| `fonte_base` | ✅ Campo existe (PONTO, JORNADA, MANUAL) |
| `saldoHoras` | ✅ Calculado automaticamente |
| Tolerância ±0.25h | ✅ Implementada |
| Badge de fonte | ⏳ Adicionar visualização futura |

Quando Secullum for integrado:
1. O trigger `sync_apontamento_dia_from_secullum` já existe no banco
2. O campo `fonte_base` será preenchido como `'SECULLUM'`
3. A lógica de conciliação ativará automaticamente

---

### Detalhes Técnicos das Alterações

#### Layout.tsx (linhas 29-49)
Adicionar 3 rotas faltantes no mapeamento:

```typescript
'/apontamento-diario': 'projetos',
'/aprovacoes-projetos': 'projetos',
'/rentabilidade': 'relatorios',
```

#### AppSidebar.tsx (linha 92)
Remover item de menu que causa 404:

```typescript
// REMOVER esta linha:
{ title: 'Pendências', url: '/pendencias', icon: AlertTriangle },
```

#### ApontamentoDiario.tsx (linhas 436-454)
Adicionar handler de teclado para Enter e autoFocus:

```typescript
// No Input de horas:
onKeyDown={(e) => {
  if (e.key === 'Enter' && newProjetoId && newHoras) {
    e.preventDefault();
    handleAddItem();
  }
}}

// No Select de projeto, adicionar ref para foco:
const projetoInputRef = useRef<HTMLButtonElement>(null);

// Após adicionar, focar novamente:
setTimeout(() => projetoInputRef.current?.focus(), 100);
```

---

### Resumo das Entregas

1. **Correção de Rotas**: Menu "Apontamento Diário" abrirá com sidebar correta de Projetos
2. **Remoção de Pendências**: Link removido até funcionalidade existir
3. **UX Velocidade**: Enter para adicionar + foco automático
4. **Secullum Ready**: Estrutura já preparada para conciliação futura
