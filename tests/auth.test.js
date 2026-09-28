const request = require('supertest');
const app = require('../app');

describe('Pruebas del Módulo de Autenticación y Seguridad JWT', () => {

  it('Debe registrar un nuevo donante correctamente', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'donante@empresa.com',
        password: 'Password123!',
        role: 'DONANTE',
        nombreEmpresa: 'Supermercado Central'
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('userId');
  });

  it('No debe permitir registrar usuarios duplicados', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'donante@empresa.com',
        password: 'Password123!'
      });
    expect(res.statusCode).toEqual(400);
  });

  it('Debe autenticar un usuario registrado y retornar un token JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'donante@empresa.com',
        password: 'Password123!'
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });

  it('Rechazar el acceso a rutas protegidas sin Token JWT', async () => {
    const res = await request(app).get('/api/donaciones');
    expect(res.statusCode).toEqual(401);
  });

  it('Permitir acceso a donaciones con token de DONANTE válido', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'donante@empresa.com',
        password: 'Password123!'
      });

    const token = loginRes.body.token;

    const res = await request(app)
      .get('/api/donaciones')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
  });

  it('Denegar acceso a dashboard de ADMIN a un rol DONANTE', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'donante@empresa.com',
        password: 'Password123!'
      });

    const token = loginRes.body.token;

    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(403);
  });
});