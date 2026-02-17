

# Fix: Restaurar arquivo `.env` ausente

## Problema

O arquivo `.env` nao existe no projeto. O client Supabase (`client.ts`) tenta ler `import.meta.env.VITE_SUPABASE_URL` que retorna `undefined`, causando o erro `supabaseUrl is required` e tela em branco.

## Solucao

Recriar o arquivo `.env` com as credenciais do projeto:

```
VITE_SUPABASE_PROJECT_ID="anjfgswaktmemysfmyff"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuamZnc3dha3RtZW15c2ZteWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTYxNTEsImV4cCI6MjA4MzM5MjE1MX0.NF_GcAoY_BUnG51ZzjilBBhXJqOHozHmf7ukpw1P1Co"
VITE_SUPABASE_URL="https://anjfgswaktmemysfmyff.supabase.co"
```

## Arquivo alterado

- `.env` (recriar)

## Nota

Nao e necessario rodar `rm -rf node_modules/.vite` manualmente. Basta aprovar este plano para recriar o `.env` e o app voltara a funcionar.

