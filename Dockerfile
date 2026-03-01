FROM node:22-alpine AS build
WORKDIR /app

ENV VITE_SUPABASE_URL=https://shgnpbrfkqkcuyjddojp.supabase.co
ENV VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoZ25wYnJma3FrY3V5amRkb2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMjgwODksImV4cCI6MjA4NzkwNDA4OX0.XEbZWm7wMhff9zHKLCx9DgyXE_3C5RpkiphcAW1GoZU

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
RUN printf 'server {\n  listen 80;\n  location / {\n    root /usr/share/nginx/html;\n    index index.html;\n    try_files $uri $uri/ /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
