import { describe, expect, it } from 'vitest';
import { toCustomerRequest, type CustomerFormValues } from './CustomerForm';

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
