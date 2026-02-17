# 🎯 Configuração do Projeto no Lovable

## ⚠️ Problema: Variáveis de Ambiente não são Carregadas

Se você receber o erro:
```
Error: supabaseUrl is required.
```

Significa que as variáveis de ambiente não estão sendo injetadas no build.

## ✅ Solução

### Passo 1: Verificar `.env`
O arquivo `.env` DEVE estar presente na raiz do projeto com:

```bash
VITE_SUPABASE_PROJECT_ID="anjfgswaktmemysfmyff"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://anjfgswaktmemysfmyff.supabase.co"
```

### Passo 2: Forçar Reconstrução

Se o erro persiste após verificar o `.env`:

1. **No Lovable Editor:**
   - Clique em **Menu** → **Settings**
   - Procure por "Clear Cache" ou "Rebuild"
   - Selecione **Limpar Cache do Projeto**

2. **Via Terminal (se acesso disponível):**
   ```bash
   rm -rf node_modules/.vite
   rm -rf dist
   npm run build
   ```

### Passo 3: Verificar se `.env` está no `.gitignore`

O `.env` DEVE estar ignorado (conforme nossa configuração de segurança):

```bash
# .gitignore
.env                    # ← Deve estar aqui
.env.local
.env.*.local

!.env.example           # ← Mas .env.example pode ser commitado
```

## 🔧 Configuração Automática do Lovable

A plataforma Lovable **DEVE AUTOMATICAMENTE**:

1. ✅ Ler o arquivo `.env` na raiz
2. ✅ Substituir as variáveis durante a build
3. ✅ Injetar no `import.meta.env`

Se isso não estiver acontecendo:

### Opção A: Usar Variáveis de Projeto (Recomendado para Produção)

1. Em **Lovable Dashboard** → **Project Settings**
2. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_URL`

### Opção B: Usar Arquivo `.env.production`

Crie um arquivo `.env.production` que o Lovable pode usar em builds de produção:

```bash
VITE_SUPABASE_PROJECT_ID="seu_project_id"
VITE_SUPABASE_PUBLISHABLE_KEY="seu_key"
VITE_SUPABASE_URL="https://seu_project_id.supabase.co"
```

## 🐛 Debugging

### Verificar se variáveis estão sendo injetadas:

Abra o **DevTools Console** (F12) e execute:

```javascript
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('All env vars:', import.meta.env)
```

Se retornar `undefined`, as variáveis não estão sendo injetadas.

### Solução rápida no Console:

```javascript
// Forçar reload com cache limpo
window.location.reload(true)
// Ou
localStorage.clear()
window.location.reload()
```

## 📋 Checklist de Resolução

- [ ] Arquivo `.env` existe na raiz do projeto
- [ ] `.env` contém todas as 3 variáveis Supabase
- [ ] `.env` está em `.gitignore`
- [ ] Build local (`npm run build`) funciona
- [ ] Lovable cache foi limpo
- [ ] Console do navegador não mostra erros de env var
- [ ] App carrega sem erro "supabaseUrl is required"

## 🚀 Próximas Etapas

Após resolver o problema:

1. Verify que a aplicação carrega corretamente
2. Test login com credenciais Supabase
3. Verifique console para erros
4. Se tudo funciona, fazer commit das mudanças

---

**Atualizado:** 2026-02-17
**Status:** ✅ Validação de variáveis adicionada
