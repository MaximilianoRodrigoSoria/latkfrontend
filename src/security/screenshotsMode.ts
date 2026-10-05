/**
 * Modo capturas (`npm run local`): desactiva la proteccion de pantalla para sacar capturas de la
 * app (documentacion, presentaciones). Solo existe en desarrollo: en un build de produccion
 * `import.meta.env.DEV` es false y la proteccion queda siempre activa, aunque se use el mismo modo.
 */
export const SCREENSHOTS_ALLOWED =
  import.meta.env.DEV && import.meta.env.VITE_ALLOW_SCREENSHOTS === 'true';

if (SCREENSHOTS_ALLOWED) {
  console.info('[L.A TK] Modo capturas: protección de pantalla desactivada (solo desarrollo).');
}
