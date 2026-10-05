import { describe, expect, it } from 'vitest';
import type { CustomerResponse } from '../../api/types';
import { fromCustomer, toCustomerRequest, type CustomerFormValues } from './CustomerForm';

describe('toCustomerRequest', () => {
  it('limpia formatos y convierte vacios en null', () => {
    const values: CustomerFormValues = {
      firstName: ' Juan ',
      lastName: 'Perez',
      dni: '12.345.678',
      cuil: '20-12345678-6',
      birthDate: '1990-05-20',
      phone: '11 5555-1234',
      email: '',
      street: 'Rivadavia',
      number: '1234',
      apartment: '',
      city: 'CABA',
      province: 'Buenos Aires',
      postalCode: '',
      cbu: '2850590940090418135201',
      alias: 'juan.perez',
      bankName: 'Banco Macro',
      occupation: '',
      monthlyIncome: '',
      notes: '',
    };

    const request = toCustomerRequest(values);

    expect(request.firstName).toBe('Juan');
    expect(request.dni).toBe('12345678');
    expect(request.cuil).toBe('20123456786');
    expect(request.phone).toBe('1155551234');
    expect(request.email).toBeNull();
    expect(request.address.apartment).toBeNull();
    expect(request.bankAccount).toEqual({
      cbu: '2850590940090418135201',
      alias: 'juan.perez',
      bankName: 'Banco Macro',
    });
    expect(request.monthlyIncome).toBeNull();
  });
});

describe('edicion de cliente', () => {
  it('los datos actuales vuelven igual al backend si no se toca nada', () => {
    const current: CustomerResponse = {
      id: 'c1',
      sellerId: 's1',
      firstName: 'Sergio',
      lastName: 'Ledesma',
      dni: '36433709',
      cuil: '20-36433709-5',
      birthDate: '1988-06-15',
      phone: '1150001004',
      email: null,
      address: {
        street: 'Sarmiento',
        number: '77',
        apartment: null,
        city: 'Remedios de Escalada',
        province: 'Buenos Aires',
        postalCode: null,
      },
      bankAccount: {
        cbu: '2850590900044000237576',
        alias: null,
        bankName: 'Banco Macro',
        virtual: false,
      },
      occupation: 'Electricista',
      monthlyIncome: 1400000,
      notes: null,
      createdAt: '2026-10-05T12:00:00Z',
      version: 3,
    };

    expect(toCustomerRequest(fromCustomer(current))).toEqual({
      firstName: 'Sergio',
      lastName: 'Ledesma',
      dni: '36433709',
      cuil: '20364337095',
      birthDate: '1988-06-15',
      phone: '1150001004',
      email: null,
      address: current.address,
      bankAccount: { cbu: '2850590900044000237576', alias: null, bankName: 'Banco Macro' },
      occupation: 'Electricista',
      monthlyIncome: 1400000,
      notes: null,
    });
  });
});
