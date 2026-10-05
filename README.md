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

## App Android

```bash
cp .env.example .env            # VITE_API_URL=https://<dominio-del-backend>
npm run cap:sync                # build web + copia a android/
npm run cap:open                # abre Android Studio para compilar/firmar el APK
```

Requiere Android Studio (JDK 21 y Android SDK). `android:allowBackup` está en `false` para que el
token de sesión no viaje en los backups de Android.
