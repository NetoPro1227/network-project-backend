const request = require('supertest');
const app = require('../app');

describe('Pruebas de Inventario y Solicitudes', () => {
  let adminToken;
  let donanteToken;

  beforeAll(async () => {
    // 1. Registrar e iniciar sesión como ADMIN
    await request(app).post('/api/auth/register').send({
      username: 'admin_test_inv',
      password: 'password123',
      role: 'ADMIN'
    });
    const resAdmin = await request(app).post('/api/auth/login').send({
      username: 'admin_test_inv',
      password: 'password123'
    });
    adminToken = resAdmin.body.token;

    // 2. Registrar e iniciar sesión como DONANTE
    await request(app).post('/api/auth/register').send({
      username: 'donante_test_inv',
      password: 'password123',
      role: 'DONANTE'
    });
    const resDonante = await request(app).post('/api/auth/login').send({
      username: 'donante_test_inv',
      password: 'password123'
    });
    donanteToken = resDonante.body.token;
  });

  beforeEach(async () => {
    // Registrar una donación inicial previa a cada prueba
    await request(app)
      .post('/api/donaciones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ concepto: 'Cuadernos', cantidad: 20, categoria: 'Escolar' });
  });

  // --- PRUEBAS DE SOLICITUDES ---

  test('DONANTE puede solicitar un producto del inventario exitosamente', async () => {
    const res = await request(app)
      .post('/api/solicitudes')
      .set('Authorization', `Bearer ${donanteToken}`)
      .send({ inventarioId: 1, cantidadSolicitada: 5 });

    expect(res.statusCode).toBe(200);
    expect(res.body.stockRestante).toBe(15);
  });

  test('Debe retornar 400 si la cantidad solicitada supera el stock disponible', async () => {
    const res = await request(app)
      .post('/api/solicitudes')
      .set('Authorization', `Bearer ${donanteToken}`)
      .send({ inventarioId: 1, cantidadSolicitada: 1000 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Stock insuficiente/i);
  });

  test('Debe retornar 400 si faltan datos en la solicitud', async () => {
    const res = await request(app)
      .post('/api/solicitudes')
      .set('Authorization', `Bearer ${donanteToken}`)
      .send({ inventarioId: 1 });

    expect(res.statusCode).toBe(400);
  });

  test('Debe retornar 404 si el ítem solicitado no existe', async () => {
    const res = await request(app)
      .post('/api/solicitudes')
      .set('Authorization', `Bearer ${donanteToken}`)
      .send({ inventarioId: 999, cantidadSolicitada: 1 });

    expect(res.statusCode).toBe(404);
  });

  // --- PRUEBAS DE ELIMINACIÓN ---

  test('DONANTE no tiene permiso para eliminar productos (403 Forbidden)', async () => {
    const res = await request(app)
      .delete('/api/inventario/1')
      .set('Authorization', `Bearer ${donanteToken}`);

    expect(res.statusCode).toBe(403);
  });

  test('ADMIN puede eliminar un producto del inventario', async () => {
    const res = await request(app)
      .delete('/api/inventario/1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/eliminado correctamente/i);
  });

  test('Debe retornar 404 si el ADMIN intenta eliminar un producto inexistente', async () => {
    const res = await request(app)
      .delete('/api/inventario/999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
  });

  // --- PRUEBAS DE SEGURIDAD Y TOKEN ---

  test('Debe denegar acceso si no se proporciona Token de autorización (401)', async () => {
    const res = await request(app).get('/api/inventario');
    expect(res.statusCode).toBe(401);
  });

  test('Debe denegar acceso si el Token proporcionado es inválido (403)', async () => {
    const res = await request(app)
      .get('/api/inventario')
      .set('Authorization', 'Bearer token_invalido_123');

    expect(res.statusCode).toBe(403);
  });
});