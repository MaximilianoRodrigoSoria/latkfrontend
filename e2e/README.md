# Pruebas E2E y capturas (Playwright)

Recorren la app real como lo haría una persona (login, Inicio, clientes, préstamos, simulador,
ganancias, vendedores, configuración), verifican reglas de negocio visibles y sacan una captura
de cada pantalla, en **celular** (Pixel 7) y **escritorio** (1366 px).

## Qué se verifica

| Área              | Comprobación                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| Ingreso           | Sin sesión redirige al login; con una contraseña incorrecta muestra un error y no entra.                       |
| Vendedor · Inicio | "Este mes podés ganar" oculto hasta confirmar la contraseña; "Te pagaron" y "A rendir"; objetivo del mes.      |
| Vendedor · reglas | El simulador y los productos no muestran la tasa ni el interés; no entra a Vendedores.                         |
| Vendedor · cuenta | Menú con "Cambiar contraseña"; el formulario valida que la confirmación coincida.                              |
| Admin             | Cobranza del mes sin ganancia de vendedor, cartera completa, cupo mensual, productos con tasa y configuración. |

## Requisitos

1. El backend corriendo en `http://localhost:8080` con los datos de prueba
   (`app.demo-data.enabled=true`, el perfil `local` ya lo activa).
2. Chromium para Playwright, una sola vez: `npx playwright install chromium`.
3. Las contraseñas de los usuarios de prueba en variables de entorno. **No se escriben en el
   repo**; sin ellas, las pruebas de ese rol se saltean con un aviso.

| Variable                    | Usuario por defecto                                                      |
| --------------------------- | ------------------------------------------------------------------------ |
| `E2E_SELLER_PASSWORD`       | `vendedor` (`E2E_SELLER_USER`)                                           |
| `E2E_ADMIN_PASSWORD`        | `admin` (`E2E_ADMIN_USER`)                                               |
| `E2E_EMPTY_SELLER_PASSWORD` | `vendedorTest` (`E2E_EMPTY_SELLER_USER`); reservada para pruebas futuras |

En PowerShell (solo para esa terminal):

```powershell
$env:E2E_SELLER_PASSWORD = Read-Host "Contraseña de vendedor"
$env:E2E_ADMIN_PASSWORD  = Read-Host "Contraseña de admin"
```

## Uso

```bash
npm run e2e            # todo: celular + escritorio
npm run e2e:capturas   # solo celular (más rápido)
npm run e2e:report     # reporte HTML con las capturas adjuntas
npm run typecheck:e2e  # chequeo de tipos de la suite
```

Playwright levanta Vite en **modo capturas** (`npm run local`), sin marca de agua ni bloqueo de
capturas; solo funciona en desarrollo. Si ya hay un Vite en el puerto 5173 lo reutiliza, así que
conviene que sea el de `npm run local`.

## Salida

- `e2e/screenshots/celular/*.png` y `e2e/screenshots/escritorio/*.png`: las capturas, numeradas
  en el orden del recorrido. Se pueden versionar para documentación.
- `e2e/.report/` y `e2e/.results/`: reporte, trazas y capturas de fallos (ignorados por git).

Las capturas son de página completa: la ventana se agranda al alto del contenido para que el
encabezado y la barra inferior queden en su lugar.

## Estructura

```
playwright.config.ts      proyectos celular/escritorio, servidor web y reporte
e2e/support/session.ts    usuarios desde variables de entorno y login por la pantalla real
e2e/support/capture.ts    espera a que la pantalla esté quieta, cierra avisos y saca la captura
e2e/tests/*.spec.ts       un archivo por recorrido (ingreso, vendedor, administrador)
```

Las pruebas corren en serie (`workers: 1`) porque comparten el mismo backend y los mismos datos.
