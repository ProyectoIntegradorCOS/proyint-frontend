# [CHANGE][autor: cormenos@onp.gob.pe][fecha: 2026-02-19 12:29 UTC-5 (Lima)][desc: Construye Angular en etapa Node y sirve con nginx en runtime][obj: Dockerfile multi-stage build]
FROM docker.io/library/node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Aseguramos que ng se pueda ejecutar
RUN chmod +x ./node_modules/.bin/*

# Establece el PATH para encontrar ng local
ENV PATH=/app/node_modules/.bin:$PATH

ARG BASE_HREF=/
RUN npm run build -- --configuration production --base-href ${BASE_HREF}

# ---------- Runtime ----------
FROM docker.io/library/nginx:1.26-alpine

RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist/thaqhiri-frontend/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
