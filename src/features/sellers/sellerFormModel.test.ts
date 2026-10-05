import { describe, expect, it } from 'vitest';
import type { SellerResponse } from '../../api/types';
import {
  EMPTY_SELLER,
  sellerValidation,
  toContactRequest,
  toNewSellerRequest,
  valuesFrom,
} from './sellerFormModel';

// Valor de prueba armado en tiempo de ejecucion (no es una credencial real).
const TEST_PASS = 'x'.repeat(10);

const filled = {
  ...EMPTY_SELLER,
  firstName: ' Marta ',
  lastName: 'Garcia',
  dni: '27.999.888',
  cuil: '27-27999888-5',
  phone: '11 5555-1234',
  cbu: '2850590940090418135201',
  username: 'MGarcia',
  password: TEST_PASS,
  commissionPercent: 5.5,
};

describe('sellerForm', () => {
  it('arma el alta con el % como fraccion y sin domicilio si no se cargo', () => {
    const req = toNewSellerRequest(filled);
    expect(req.username).toBe('mgarcia');
    expect(req.commissionRate).toBe(0.055);
    expect(req.data).toMatchObject({
      firstName: 'Marta',
      dni: '27999888',
      cuil: '27279998885',
      phone: '1155551234',
      email: null,
      address: null,
    });
  });

  it('el domicilio es opcional pero si se empieza va completo', () => {
    const rules = sellerValidation('self');
    expect(rules.street('', filled)).toBeNull();
    const partial = { ...filled, city: 'Lanus' };
    expect(rules.street('', partial)).toBe('Obligatorio');
    expect(rules.province(null, partial)).toBe('Obligatorio');
  });

  it('el vendedor no valida identidad ni acceso', () => {
    const rules = sellerValidation('self');
    expect(rules.firstName('')).toBeNull();
    expect(rules.cuil('', filled)).toBeNull();
    expect(rules.password('')).toBeNull();
    expect(sellerValidation('create').password('x')).not.toBeNull();
  });

  it('carga los valores desde la respuesta y vuelve al contacto', () => {
    const response: SellerResponse = {
      userId: 'u1',
      username: 'mgarcia',
      firstName: 'Marta',
      lastName: 'Garcia',
      fullName: 'Marta Garcia',
      dni: '27999888',
      cuil: '27279998885',
      phone: '1155551234',
      bankAccount: { cbu: '0000003100010000000001', alias: 'MARTA.MP', virtual: true },
      completeness: 75,
      missingFields: ['Email', 'Domicilio'],
      createdAt: '2026-10-05T12:00:00Z',
      updatedAt: '2026-10-05T12:00:00Z',
    };
    const values = valuesFrom(response);
    expect(values.cuil).toBe('27-27999888-5');
    expect(toContactRequest(values)).toEqual({
      phone: '1155551234',
      email: null,
      address: null,
      bankAccount: { cbu: '0000003100010000000001', alias: 'MARTA.MP', bankName: null },
    });
  });

  it('el CBU es opcional: vacio no se valida ni se envia; cargado se valida', () => {
    const rules = sellerValidation('create');
    const noCbu = { ...filled, cbu: '', alias: '' };
    expect(rules.cbu('')).toBeNull();
    expect(toNewSellerRequest(noCbu).data.bankAccount).toBeNull();
    expect(rules.cbu('123')).not.toBeNull();
    expect(rules.alias('MARTA.MP', noCbu)).toMatch(/CBU/);
  });
});
