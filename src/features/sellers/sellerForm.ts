import type {
  NewSellerRequest,
  SellerAddress,
  SellerContactRequest,
  SellerDataRequest,
  SellerResponse,
} from '../../api/types';
import { formatCuil, onlyDigits, validateCbu, validateCuil } from '../customers/validators';

/** create: alta completa (admin). admin: el admin corrige todo. self: el vendedor edita lo suyo. */
export type SellerFormMode = 'create' | 'admin' | 'self';

export interface SellerFormValues {
  firstName: string;
  lastName: string;
  dni: string;
  cuil: string;
  phone: string;
  email: string;
  street: string;
  number: string;
  apartment: string;
  city: string;
  province: string | null;
  postalCode: string;
  cbu: string;
  alias: string;
  bankName: string;
  username: string;
  password: string;
  /** En porcentaje (5 = 5 %). */
  commissionPercent: number | string;
}

export const EMPTY_SELLER: SellerFormValues = {
  firstName: '',
  lastName: '',
  dni: '',
  cuil: '',
  phone: '',
  email: '',
  street: '',
  number: '',
  apartment: '',
  city: '',
  province: null,
  postalCode: '',
  cbu: '',
  alias: '',
  bankName: '',
  username: '',
  password: '',
  commissionPercent: 5,
};

const orNull = (v: string) => (v.trim() ? v.trim() : null);
const hasAddress = (v: SellerFormValues) =>
  [v.street, v.number, v.city, v.apartment, v.postalCode].some((x) => x.trim()) || !!v.province;

export function valuesFrom(s: SellerResponse): SellerFormValues {
  return {
    ...EMPTY_SELLER,
    firstName: s.firstName ?? '',
    lastName: s.lastName ?? '',
    dni: s.dni ?? '',
    cuil: s.cuil ? formatCuil(s.cuil) : '',
    phone: s.phone ?? '',
    email: s.email ?? '',
    street: s.address?.street ?? '',
    number: s.address?.number ?? '',
    apartment: s.address?.apartment ?? '',
    city: s.address?.city ?? '',
    province: s.address?.province ?? null,
    postalCode: s.address?.postalCode ?? '',
    cbu: s.bankAccount?.cbu ?? '',
    alias: s.bankAccount?.alias ?? '',
    bankName: s.bankAccount?.bankName ?? '',
    username: s.username,
    password: '',
    commissionPercent: s.commissionRate != null ? Math.round(s.commissionRate * 10000) / 100 : 5,
  };
}

function address(v: SellerFormValues): SellerAddress | null {
  if (!hasAddress(v)) return null;
  return {
    street: v.street.trim(),
    number: v.number.trim(),
    apartment: orNull(v.apartment),
    city: v.city.trim(),
    province: v.province ?? '',
    postalCode: orNull(v.postalCode),
  };
}

export function toContactRequest(v: SellerFormValues): SellerContactRequest {
  return {
    phone: onlyDigits(v.phone),
    email: orNull(v.email),
    address: address(v),
    bankAccount: { cbu: onlyDigits(v.cbu), alias: orNull(v.alias), bankName: orNull(v.bankName) },
  };
}

export function toDataRequest(v: SellerFormValues): SellerDataRequest {
  return {
    ...toContactRequest(v),
    firstName: v.firstName.trim(),
    lastName: v.lastName.trim(),
    dni: onlyDigits(v.dni),
    cuil: onlyDigits(v.cuil),
  };
}

export function toNewSellerRequest(v: SellerFormValues): NewSellerRequest {
  return {
    username: v.username.trim().toLowerCase(),
    password: v.password,
    commissionRate: Math.round(Number(v.commissionPercent) * 100) / 10000,
    data: toDataRequest(v),
  };
}

const blank = (v: string) => (v.trim() ? null : 'Obligatorio');

/** Reglas por modo: el vendedor no valida (ni ve) nombre, DNI, CUIL ni acceso. */
export function sellerValidation(mode: SellerFormMode) {
  const identity = mode !== 'self';
  return {
    firstName: (v: string) => (identity ? blank(v) : null),
    lastName: (v: string) => (identity ? blank(v) : null),
    dni: (v: string) =>
      !identity || /^\d{7,8}$/.test(onlyDigits(v)) ? null : 'DNI de 7 u 8 dígitos',
    cuil: (v: string, values: SellerFormValues) => (identity ? validateCuil(v, values.dni) : null),
    phone: (v: string) => (/^\d{8,15}$/.test(onlyDigits(v)) ? null : 'Entre 8 y 15 dígitos'),
    email: (v: string) =>
      !v.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim()) ? null : 'Email inválido',
    // El domicilio es opcional, pero si se empieza a cargar va completo.
    street: (v: string, values: SellerFormValues) => (hasAddress(values) ? blank(v) : null),
    number: (v: string, values: SellerFormValues) => (hasAddress(values) ? blank(v) : null),
    city: (v: string, values: SellerFormValues) => (hasAddress(values) ? blank(v) : null),
    province: (v: string | null, values: SellerFormValues) =>
      hasAddress(values) && !v ? 'Obligatorio' : null,
    cbu: validateCbu,
    alias: (v: string) =>
      !v.trim() || /^[A-Za-z0-9.-]{6,20}$/.test(v.trim())
        ? null
        : '6 a 20 caracteres: letras, números, punto o guion',
    username: (v: string) =>
      mode !== 'create' || /^[A-Za-z0-9._-]{3,64}$/.test(v.trim())
        ? null
        : 'Al menos 3 caracteres: letras, números, punto o guion',
    password: (v: string) => (mode !== 'create' || v.length >= 8 ? null : 'Al menos 8 caracteres'),
    commissionPercent: (v: number | string) => {
      if (mode !== 'create') return null;
      const n = Number(v);
      return v !== '' && n >= 0 && n < 100 ? null : 'Entre 0 y 99,99 %';
    },
  };
}
