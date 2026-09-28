const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(express.json());

const usersDB = [];
const JWT_SECRET = process.env.JWT_SECRET || 'secreto_network_project_2026';

// 1. Registro de Donantes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role, nombreEmpresa } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const existingUser = usersDB.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: usersDB.length + 1,
      email,
      password: hashedPassword,
      role: role || 'DONANTE',
      nombreEmpresa: nombreEmpresa || 'Sin Especificar'
    };

    usersDB.push(newUser);
    return res.status(201).json({ message: 'Usuario registrado exitosamente', userId: newUser.id });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 2. Login y JWT
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = usersDB.find(u => u.email === email);

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({ token, message: 'Autenticación exitosa' });
  } catch (err) {
    return res.status(500).json({ error: 'Error en servidor' });
  }
});

// 3. Middlewares de Seguridad (JWT + RBAC)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Acceso denegado, token requerido' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos para acceder a esta ruta' });
    }
    next();
  };
};

// 4. Rutas protegidas
app.get('/api/admin/dashboard', authenticateToken, authorizeRoles('ADMIN'), (req, res) => {
  res.json({ message: 'Bienvenido al panel de administración' });
});

app.get('/api/donaciones', authenticateToken, authorizeRoles('ADMIN', 'DONANTE'), (req, res) => {
  res.json({ message: 'Listado de donaciones activo' });
});

module.exports = app;