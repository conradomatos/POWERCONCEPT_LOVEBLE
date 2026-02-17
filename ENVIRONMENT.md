# 🔐 Configuração de Ambiente - POWERCONCEPT_LOVEBLE

## Variáveis de Ambiente Necessárias

O projeto usa as seguintes variáveis de ambiente para conectar ao Supabase:

```bash
VITE_SUPABASE_PROJECT_ID="seu_project_id_aqui"
VITE_SUPABASE_PUBLISHABLE_KEY="seu_publishable_key_aqui"
VITE_SUPABASE_URL="https://seu_project_id.supabase.co"
```

## Setup Local

### 1. Copiar Template
```bash
cp .env.example .env
```

### 2. Preencher Credenciais
Editar `.env` com suas credenciais Supabase:
```bash
# .env
VITE_SUPABASE_PROJECT_ID="seu_project_id"
VITE_SUPABASE_PUBLISHABLE_KEY="seu_token"
VITE_SUPABASE_URL="https://seu_project_id.supabase.co"
```

### 3. Verificar Arquivo
```bash
npm run build  # Compila se variáveis estão OK
```

## ⚠️ IMPORTANTE: Segurança

- ✅ `.env` está **ignorado** pelo git (adicionado ao `.gitignore`)
- ✅ `.env.example` serve como **template**
- ❌ **NUNCA** commite credenciais reais no git
- ✅ A plataforma Lovable gerencia `.env` automaticamente

## Estrutura de Arquivos

```
POWERCONCEPT_LOVEBLE/
├── .env                ← Local (ignorado pelo git) ⛔
├── .env.example        ← Template (commitado) ✅
├── .gitignore          ← Contém .env ✅
└── ...
```

## Troubleshooting

### Erro: "VITE_SUPABASE_URL is not set"
**Solução:** Criar `.env` com valores válidos
```bash
cp .env.example .env
# Editar com credenciais reais
```

### Build falha após merge
**Solução:** Plataforma recriará `.env` automaticamente

## CI/CD Environments

Para CI/CD (GitHub Actions, etc), configure as variáveis como **secrets**:
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`

Exemplo de workflow:
```yaml
- name: Create .env
  run: |
    echo "VITE_SUPABASE_PROJECT_ID=${{ secrets.VITE_SUPABASE_PROJECT_ID }}" > .env
    echo "VITE_SUPABASE_PUBLISHABLE_KEY=${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}" >> .env
    echo "VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL }}" >> .env
```

---

**Última atualização:** 2026-02-17
**Versão:** 1.0
