/**
 * Validaciones argentinas, espejo de las del backend (Cuil.java y Cbu.java). Se validan en el
 * celular para avisar antes de enviar; el backend vuelve a validar siempre.
 */

const CUIL_PREFIXES = new Set(['20', '23', '24', '27', '30', '33', '34']);
const CUIL_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
const CBU_FIRST = [7, 1, 3, 9, 7, 1, 3];
const CBU_SECOND = [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3];

export const onlyDigits = (value: string) => value.replace(/\D/g, '');

function weightedSum(digits: string, weights: number[]): number {
  return weights.reduce((sum, w, i) => sum + Number(digits[i]) * w, 0);
}

export function cuilCheckDigit(first10: string): number | null {
  const result = 11 - (weightedSum(first10, CUIL_WEIGHTS) % 11);
  if (result === 11) return 0;
  return result === 10 ? null : result;
}

/** null si es valido; si no, el motivo. */
export function validateCuil(value: string, dni?: string): string | null {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return 'El CUIL debe tener 11 digitos';
  if (!CUIL_PREFIXES.has(digits.slice(0, 2))) return 'Prefijo de CUIL invalido';
  if (cuilCheckDigit(digits.slice(0, 10)) !== Number(digits[10])) {
    return 'CUIL invalido (revisa el ultimo digito)';
  }
  const dniDigits = onlyDigits(dni ?? '');
  if (dniDigits && digits.slice(2, 10) !== dniDigits.padStart(8, '0')) {
    return 'El CUIL no corresponde al DNI';
  }
  return null;
}

/** CUIL sugeridos para un DNI (masculino 20 / femenino 27 / 23 cuando corresponde). */
export function suggestCuils(dni: string): string[] {
  const digits = onlyDigits(dni);
  if (digits.length < 7 || digits.length > 8) return [];
  const padded = digits.padStart(8, '0');
  return ['20', '27', '23']
    .map((prefix) => {
      const dv = cuilCheckDigit(prefix + padded);
      return dv === null ? null : `${prefix}-${padded}-${dv}`;
    })
    .filter((c): c is string => c !== null);
}

export function formatCuil(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 10) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

export function isCvu(cbu: string): boolean {
  return onlyDigits(cbu).startsWith('000');
}

export function validateCbu(value: string): string | null {
  const digits = onlyDigits(value);
  if (digits.length !== 22) return 'El CBU/CVU debe tener 22 digitos';
  if (isCvu(digits)) return null;
  const first = (10 - (weightedSum(digits.slice(0, 7), CBU_FIRST) % 10)) % 10;
  const second = (10 - (weightedSum(digits.slice(8, 21), CBU_SECOND) % 10)) % 10;
  return first === Number(digits[7]) && second === Number(digits[21])
    ? null
    : 'CBU invalido (revisa los numeros)';
}

/** Principales entidades por codigo (3 primeros digitos del CBU). */
const BANKS: Record<string, string> = {
  '007': 'Banco Galicia',
  '011': 'Banco Nacion',
  '014': 'Banco Provincia',
  '015': 'ICBC',
  '017': 'BBVA',
  '027': 'Banco Supervielle',
  '029': 'Banco Ciudad',
  '034': 'Banco Patagonia',
  '044': 'Banco Hipotecario',
  '072': 'Banco Santander',
  '150': 'HSBC',
  '191': 'Banco Credicoop',
  '285': 'Banco Macro',
  '299': 'Banco Comafi',
};

export function bankFromCbu(cbu: string): string | null {
  const digits = onlyDigits(cbu);
  if (digits.length < 3) return null;
  if (digits.startsWith('000')) return 'Billetera virtual (CVU)';
  return BANKS[digits.slice(0, 3)] ?? null;
}

export function ageAt(birthDate: Date, today = new Date()): number {
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age;
}

export const PROVINCES = [
  'Buenos Aires',
  'CABA',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Cordoba',
  'Corrientes',
  'Entre Rios',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquen',
  'Rio Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucuman',
];
