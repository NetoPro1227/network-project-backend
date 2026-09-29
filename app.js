const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Bases de datos en memoria
const usersDB = [];
const donationsDB = [];
const inventoryDB = [];

const JWT_SECRET = process.env.JWT_SECRET || 'secreto_network_project_2026';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado, token no proporcionado' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    req.user = user;
    next();
  });
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para acceder a esta ruta' });
    }
    next();
  };
};

// ==========================================
// 1. AUTENTICACIÓN Y REGISTRO
// ==========================================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const userIdentifier = username || email;

    if (!userIdentifier || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const existingUser = usersDB.find(u => u.username === userIdentifier || u.email === userIdentifier);
    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserId = usersDB.length + 1;
    const newUser = {
      userId: newUserId,
      id: newUserId,
      username: userIdentifier,
      password: hashedPassword,
      role: role || 'DONANTE'
    };

    usersDB.push(newUser);
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      userId: newUserId,
      user: newUser
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const userIdentifier = username || email;

    const user = usersDB.find(u => u.username === userIdentifier || u.email === userIdentifier);
    if (!user) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.userId || user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================
// 2. MÓDULO DE DONACIONES E INVENTARIO
// ==========================================

// Registrar una nueva donación y actualizar inventario
app.post('/api/donaciones', authenticateToken, authorizeRoles('DONANTE', 'ADMIN'), (req, res) => {
  try {
    const { concepto, cantidad, categoria } = req.body;

    if (!concepto || !cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'El concepto y una cantidad válida mayor a 0 son obligatorios' });
    }

    const newDonation = {
      id: donationsDB.length + 1,
      userId: req.user.id,
      donante: req.user.username,
      concepto,
      cantidad: Number(cantidad),
      categoria: categoria || 'General',
      fecha: new Date().toISOString(),
      estatus: 'Recibido'
    };

    donationsDB.push(newDonation);

    // Actualizar o agregar al inventario
    const itemInsumo = inventoryDB.find(i => i.concepto.toLowerCase() === concepto.toLowerCase());
    if (itemInsumo) {
      itemInsumo.stock += Number(cantidad);
      itemInsumo.ultimaActualizacion = new Date().toISOString();
    } else {
      inventoryDB.push({
        id: inventoryDB.length + 1,
        concepto,
        stock: Number(cantidad),
        categoria: categoria || 'General',
        ultimaActualizacion: new Date().toISOString()
      });
    }

    res.status(201).json({
      message: 'Donación registrada e inventario actualizado con éxito',
      donacion: newDonation
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar la donación' });
  }
});

// Obtener listado de donaciones
app.get('/api/donaciones', authenticateToken, authorizeRoles('ADMIN', 'DONANTE'), (req, res) => {
  // Si es DONANTE, ve sus donaciones; si es ADMIN, ve todas
  if (req.user.role === 'ADMIN') {
    return res.json({ message: 'Listado completo de donaciones', donaciones: donationsDB });
  }
  const userDonations = donationsDB.filter(d => d.userId === req.user.id);
  res.json({ message: 'Listado de donaciones activo', donaciones: userDonations });
});

app.get('/api/inventario', authenticateToken, authorizeRoles('ADMIN', 'DONANTE'), (req, res) => {
  res.json({ inventario: inventoryDB });
});

app.get('/api/admin/dashboard', authenticateToken, authorizeRoles('ADMIN'), (req, res) => {
  res.json({ message: 'Bienvenido al panel de administración' });
});

app.get('/', (req, res) => {
  res.status(200).send('Servidor ejecutándose correctamente');
});

module.exports = app;