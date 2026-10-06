# Documentación de flujos por rol

El menú de la cuenta y el lateral de escritorio incluyen **Documentación de flujos**. La app muestra
la guía de su rol principal: vendedor, administrador, operador o auditor. Driver.js sigue disponible
en **Guía de esta pantalla** para explicar controles puntuales.

## Fuentes de contenido

Las guías se editan en `content/<rol>/flows.md`. Estos mismos archivos alimentan el lector de la app
y Docusaurus. La guía del vendedor describe sus tareas y ganancias sin explicar porcentajes internos.

## Activar en Cloudflare

1. Construir con `npm run build` y desplegar con `npx wrangler deploy`.
2. En el Worker **latkfrontend → Settings → Variables and Secrets**, agregar un **Secret** llamado
   `LATK_JWT_SECRET` con exactamente el mismo valor que utiliza el backend en Render.
3. No usar un prefijo `VITE_` para ese secreto ni incluirlo en Git. Guardar/aplicar la configuración
   y volver a abrir la documentación con una sesión vigente.

`wrangler.jsonc` sirve la app desde `dist` y ejecuta el Worker para `/documentation-api/*`.
El Worker verifica la firma HS256, el emisor `latk-backend` y el vencimiento del token; selecciona
el rol firmado, sin aceptar un rol enviado por URL. Devuelve únicamente el Markdown de esa cuenta
con `Cache-Control: private, no-store`. Sin secreto configurado falla con 503; sin sesión válida, con
401. Las guías no se incluyen en los assets públicos ni en el precache de la PWA.

## Probar localmente

1. Copiar `.dev.vars.example` a `.dev.vars` y completar el secreto del backend local.
2. Ejecutar `npm run build` y después `npm run docs:worker` en una terminal (puerto 8787).
3. Ejecutar `npm run local` en otra terminal e iniciar sesión. Vite envía `/documentation-api` al
   Worker local y sigue usando su proxy habitual para el backend.

## Docusaurus

El sitio tiene dependencias y lockfile propios para no mezclar versiones de React con la app:

```bash
npm run docs:install
npm run docs:dev -- seller
npm run docs:build -- seller
npm run docs:build -- admin
npm run docs:build -- operator
npm run docs:build -- auditor
```

Cada build contiene un solo rol y se genera en `site/build/<rol>`. No se copia a `dist` ni se publica
con el Worker de la app. Antes de publicar un sitio Docusaurus, proteger todo su dominio y assets
con autenticación y una política de acceso para ese rol; ocultar el enlace no reemplaza esa protección.

Para publicar, definir `LATK_DOCS_URL=https://<dominio-protegido-del-rol>` en el entorno del build de
Docusaurus. Cuando el sitio esté protegido y publicado, se puede configurar la variable de build
del frontend correspondiente: `VITE_DOCS_SELLER_URL`, `VITE_DOCS_ADMIN_URL`, `VITE_DOCS_OPERATOR_URL`
o `VITE_DOCS_AUDITOR_URL`. La página mostrará **Abrir sitio de documentación** para la cuenta activa.
No se envían tokens de LATK por URL; el sitio externo debe tener su propia protección de acceso.

## Verificación

```bash
npm test
npm run lint
npm run build
npm run typecheck:worker
npx wrangler deploy --dry-run
```
