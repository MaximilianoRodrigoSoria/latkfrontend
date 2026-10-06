# L.A TK — Latin America Transaction Kernel · Frontend

PWA **mobile-first** en React para vendedores (celular) y administración (celular o escritorio).
Se instala como app desde el navegador y además se empaqueta como **app Android** (Capacitor).

## Stack

| Necesidad | Librería | Versión |
|---|---|---|
| UI + design system | Mantine (core, dates, form, notifications, charts, modals) | 9.7 |
| Íconos | Tabler Icons | 3.48 |
| Base | React + TypeScript + Vite | 19.3 / 6.0 / 8.3 |
| Navegación | React Router | 8.4 |
| Datos del servidor | TanStack Query | 5.104 |
| Estado local | Zustand | 5.0 |
| Gráficos | Recharts (vía `@mantine/charts`) | 3.10 |
| PWA | vite-plugin-pwa (Workbox) | 2.0 |
| App Android | Capacitor + privacy-screen | 8.5 / 8.0 |
| Tests | Vitest + Testing Library + jsdom | 5.0 |

## Ejecutar

```bash
npm install
npm run dev          # http://localhost:5173 (proxy de /latk-api a localhost:8080)
npm run local        # igual que dev pero SIN protección de pantalla, para sacar capturas
npm test             # tests unitarios
npm run build        # typecheck + build de producción (PWA)
```

Requiere el backend (`latk-backend`) corriendo en `localhost:8080`. Usuario local: `admin` / `admin1234`.

Para probar en el celular dentro de la misma red: `npm run dev -- --host` y abrir
`http://<ip-de-tu-pc>:5173`. La instalación como PWA y el service worker requieren HTTPS fuera de
`localhost`.

## Estructura

```
src/
├── api/        cliente HTTP (ProblemDetail -> ApiError), contratos y endpoints
├── auth/       sesión JWT (Zustand), permisos, login, guards de ruta
├── theme/      design system dinámico: tokens -> tema Mantine, contraste WCAG, preview
├── security/   protección de capturas (ScreenGuard + FLAG_SECURE nativo)
├── layout/     AppShell: barra inferior en celular, menú lateral desde 48em
├── features/   dashboard, products, simulator, settings
└── shared/     formato es-AR, notificaciones, componentes comunes
```

## Interacciones móviles

- Motion anima la entrada de pantallas y el indicador de la barra inferior. Cambiar parámetros de
  la URL no reinicia la animación ni remonta el formulario.
- Los botones y las tarjetas navegables responden al toque con una escala sutil.
- Clientes, préstamos y vendedores ofrecen **Actualizar**. En celulares también se puede
  arrastrar la zona indicada y soltar después de 64 px; el gesto no intercepta el scroll del listado.
- Los filtros de clientes y préstamos, las vistas de productos y el resultado del simulador tienen
  transiciones cortas. Los paneles inferiores y las secciones plegables usan Mantine.
- Se respeta la preferencia del dispositivo de reducir movimiento. Las actualizaciones reutilizan
  las consultas existentes de TanStack Query.

## Guías de uso

El menú de la cuenta incluye **Guía de esta pantalla**. Driver.js muestra un recorrido en español
para la pantalla actual, adaptado a los permisos y a los controles visibles en celular o escritorio.
Se puede cerrar y repetir en cualquier momento; no aparece automáticamente ni registra operaciones.

Los textos y la selección de pasos viven en `src/shared/help/useGuidedTour.ts`. Los controles se
identifican con atributos `data-tour`; los estilos usan las variables del tema Mantine en
`src/shared/help/tour.css`. El recorrido se cierra al cambiar de pantalla o cuenta y respeta la
preferencia de reducir movimiento.

## Documentación de flujos

El menú de la cuenta permite consultar una guía básica por rol. Los contenidos se entregan desde
un Worker de Cloudflare que verifica la sesión; no quedan incluidos en los archivos públicos de
la app. El mismo Markdown genera sitios Docusaurus separados. Ver [configuración y comandos](documentation/README.md).

## Design system editable

- El tema vive en el backend (`GET/PUT /api/v1/settings/theme`). El GET es público, así el login
  ya se pinta con los colores configurados.
- El admin (permiso `parameter.manage`) lo edita en **Tema**. Los cambios se ven en vivo, solo para
  él, hasta que toca **Guardar para todos**.
- Cada color base se expande a 10 tonalidades con `@mantine/colors-generator`.
- La pantalla avisa si el contraste del color primario no cumple WCAG AA.
- El último tema se guarda en el dispositivo: sin red, la app arranca con los colores correctos.

## Protección de capturas (todo rol distinto de ADMIN)

| Plataforma | Qué se logra |
|---|---|
| **App Android** (Capacitor) | **Bloqueo real** con `FLAG_SECURE`: capturas y grabaciones salen en negro, y la app se ve en negro en "recientes". La app arranca protegida y la protección se apaga solo si inicia sesión un ADMIN. |
| **Navegador / PWA** | **Disuasión**: marca de agua con usuario y hora, contenido oculto al perder el foco, sin copiar, imprimir ni menú contextual, y portapapeles limpio tras PrintScreen. Ningún navegador permite bloquear la captura del sistema operativo. |

Recomendación operativa: que los vendedores usen la app Android y el administrador, la web.

**Modo capturas** (`npm run local`): levanta el servidor de desarrollo con `.env.capturas`
(`VITE_ALLOW_SCREENSHOTS=true`) y desactiva la protección para cualquier rol, para sacar capturas
de documentación o presentaciones. Solo funciona en desarrollo: en un build de producción la
protección queda siempre activa (el código del modo ni siquiera llega al build).

## App Android

```bash
cp .env.example .env            # VITE_API_URL=https://<dominio-del-backend>
npm run cap:sync                # build web + copia a android/
npm run cap:open                # abre Android Studio para compilar/firmar el APK
```

Requiere Android Studio (JDK 21 y Android SDK). `android:allowBackup` está en `false` para que el
token de sesión no viaje en los backups de Android.

## Probar desde el celular con Cloudflare Tunnel

```bash
npm run dev                                         # o npm run local
cloudflared tunnel --url http://localhost:5173      # da una URL https://<algo>.trycloudflare.com
```

`vite.config.ts` acepta cualquier subdominio de `trycloudflare.com` (`server.allowedHosts`). La API
viaja por el mismo túnel gracias al proxy `/latk-api`, así que el backend sigue en `localhost:8080`.
La URL es pública mientras el túnel esté abierto: cerrarlo al terminar.
