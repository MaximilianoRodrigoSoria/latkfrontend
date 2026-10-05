import { describe, expect, it } from 'vitest';
import { isWhatsAppUrl } from './WhatsAppButton';

describe('isWhatsAppUrl', () => {
  it('solo acepta links de wa.me', () => {
    expect(isWhatsAppUrl('https://wa.me/5491155551234?text=Hola')).toBe(true);
    expect(isWhatsAppUrl('https://evil.example/wa.me/')).toBe(false);
    expect(isWhatsAppUrl('javascript:alert(1)')).toBe(false);
    expect(isWhatsAppUrl(null)).toBe(false);
  });
});
