// routes/client.js
const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const Pedido = require('../models/Pedido');
const bcrypt = require('bcrypt');

// Middleware para autenticação do cliente
function checkClientAuth(req, res, next) {
  if (req.session && req.session.usuario && req.session.usuario.tipo === 'cliente') {
    next();
  } else {
    res.redirect('/client/login');
  }
}

// Rota de login do cliente
router.get('/login', (req, res) => {
  res.render('client/login', { erro: null });
});

router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const user = await Usuario.findOne({ email, tipo: 'cliente' });
    if (user && await bcrypt.compare(senha, user.senha)) {
      req.session.usuario = user;
      return res.redirect('/client/dashboard');
    }
    res.render('client/login', { erro: 'Email ou senha incorretos.' });
  } catch (err) {
    console.error(err);
    res.render('client/login', { erro: 'Erro no servidor.' });
  }
});

// Dashboard do cliente
router.get('/dashboard', checkClientAuth, async (req, res) => {
  try {
    const pedidos = await Pedido.find({ cliente: req.session.usuario.nome }).sort({ data_criacao: -1 });
    res.render('client/dashboard', { usuario: req.session.usuario, pedidos });
  } catch (err) {
    res.send('Erro ao carregar pedidos.');
  }
});

// Rota para solicitar um pedido novo (GET)
router.get('/request_order', checkClientAuth, (req, res) => {
  res.render('client/request_order', { erro: null });
});

// Rota para solicitar um pedido novo (POST)
router.post('/request_order', checkClientAuth, async (req, res) => {
  const { numero_pedido, faturado, comentarios } = req.body;
  try {
    const pedido = new Pedido({
      numero_pedido,
      cliente: req.session.usuario.nome,
      faturado,
      comentarios,
      status: 'Solicitado'
    });
    await pedido.save();
    res.redirect('/client/dashboard');
  } catch (err) {
    console.error(err);
    res.render('client/request_order', { erro: 'Erro ao solicitar pedido.' });
  }
});

// Rota de logout do cliente
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/client/login');
});

module.exports = router;
