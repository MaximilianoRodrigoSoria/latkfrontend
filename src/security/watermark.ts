/** Escapa texto para incrustarlo en un SVG. */
function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * Baldosa SVG con usuario y fecha/hora en diagonal. Si alguien fotografia o captura la pantalla
 * desde el navegador, la imagen queda identificada.
 */
export function watermarkDataUrl(label: string, color: string): string {
  const text = escapeXml(label);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200">
  <text x="160" y="100" fill="${color}" font-family="sans-serif" font-size="14"
    text-anchor="middle" transform="rotate(-28 160 100)">${text}</text></svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}

export function watermarkLabel(username: string, now: Date): string {
  const stamp = now.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${username} · ${stamp}`;
}
