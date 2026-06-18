# proyint-frontend

Frontend web del proyecto **THAQHIRI** — interfaz para administradores y líderes de equipo de la ONP. Desarrollado en Angular con integración de mapas Mapbox.

## Tecnologías

- **Angular 20**
- **Mapbox GL JS** — mapas y georreferenciación
- **Node.js 22 LTS**
- **GitHub Actions** — CI/CD con despliegue en S3

## Ambientes

| Ambiente | URL | Backend |
|---|---|---|
| dev | thaqhiri-dev-frontend-023894313590.s3-website-us-west-2.amazonaws.com | 44.237.58.16:5511 |
| qa | thaqhiri-qa-frontend-023894313590.s3-website-us-west-2.amazonaws.com | 44.245.108.123:5511 |
| prod | thaqhiri-prod-frontend-023894313590.s3-website-us-west-2.amazonaws.com | 44.238.218.85:5511 |

## Ejecución local

```bash
npm ci
npm start
# http://localhost:4200
```

## Build por ambiente

```bash
npm run build                          # dev (production)
npm run build -- --configuration qa    # qa
npm run build -- --configuration prod  # prod
```

Los archivos de configuración por ambiente están en `src/environments/`:

- `environment.ts` — dev
- `environment.qa.ts` — qa
- `environment.prod.ts` — prod

## CI/CD

El pipeline `.github/workflows/deploy.yml` ejecuta builds **en paralelo** para los 3 ambientes:

1. **Build dev + qa + prod** (paralelo)
2. **Deploy Dev** → S3 dev (automático tras merge a main)
3. **Deploy QA** → S3 qa (requiere aprobación manual)
4. **Deploy Prod** → S3 prod (requiere aprobación manual)

El token de Mapbox se inyecta en tiempo de CI con `sed` sobre el archivo de environment correspondiente, evitando almacenarlo en el repositorio.
