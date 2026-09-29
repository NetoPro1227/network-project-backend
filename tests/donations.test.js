const request = require('supertest');
const app = require('../app');

describe('Pruebas del Módulo de Donaciones e Inventario', () => {
  let token;

  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        username: 'donante_test@empresa.com',
        password: 'password123',
        role: 'DONANTE'
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'donante_test@empresa.com',
        password: 'password123'
      });

    token = res.body.token;
  });

  test('Debe registrar una donación y actualizar inventario', async () => {
    const res = await request(app)
      .post('/api/donaciones')
      .set('Authorization', `Bearer ${token}`)
      .send({
        concepto: 'Cobijas Térmicas',
        cantidad: 50,
        categoria: 'Ropa'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('donacion');
    expect(res.body.donacion.concepto).toBe('Cobijas Térmicas');
  });

  test('Debe consultar el inventario actualizado', async () => {
    const res = await request(app)
      .get('/api/inventario')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body.inventario)).toBe(true);
    expect(res.body.inventario.length).toBeGreaterThan(0);
  });
}); 