const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const Pedido = require('../models/Pedido');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

// Configuração do Multer para uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    if (file.fieldname === 'nota_fiscal') {
      cb(null, path.join(__dirname, '..', 'uploads', 'nota_fiscal'));
    } else if (file.fieldname === 'conhecimento_transporte') {
      cb(null, path.join(__dirname, '..', 'uploads', 'conhecimento'));
    } else {
      cb(null, path.join(__dirname, '..', 'uploads'));
    }
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '_' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Middleware para autenticação do admin
function checkAdminAuth(req, res, next) {
  if (req.session && req.session.usuario && req.session.usuario.tipo === 'admin') {
    next();
  } else {
    // Se a requisição espera PDF, envia status 401
    if (req.headers.accept && req.headers.accept.indexOf('application/pdf') !== -1) {
      return res.status(401).send("Não autorizado");
    }
    res.redirect('/admin/login');
  }
}

// Rota de login do admin
router.get('/login', (req, res) => {
  res.render('admin/login', { erro: null });
});

router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const user = await Usuario.findOne({ email, tipo: 'admin' });
    if (user && await bcrypt.compare(senha, user.senha)) {
      req.session.usuario = user;
      return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', { erro: 'Email ou senha incorretos.' });
  } catch (err) {
    console.error(err);
    res.render('admin/login', { erro: 'Erro no servidor.' });
  }
});

// Dashboard do admin
router.get('/dashboard', checkAdminAuth, async (req, res) => {
  try {
    const pedidos = await Pedido.find().sort({ data_criacao: -1 });
    res.render('admin/dashboard', { usuario: req.session.usuario, pedidos });
  } catch (err) {
    res.send('Erro ao carregar pedidos.');
  }
});

// Rota para adicionar novo pedido - GET
router.get('/add_order', checkAdminAuth, async (req, res) => {
  try {
    const clients = await Usuario.find({ tipo: 'cliente' });
    res.render('admin/add_order', { erro: null, clients });
  } catch (err) {
    console.error(err);
    res.render('admin/add_order', { erro: 'Erro ao carregar clientes', clients: [] });
  }
});

// Rota para adicionar novo pedido - POST
router.post('/add_order', checkAdminAuth, upload.fields([
  { name: 'nota_fiscal', maxCount: 1 },
  { name: 'conhecimento_transporte', maxCount: 1 }
]), async (req, res) => {
  const { numero_pedido, cliente, data_prevista, comentarios, responsavel, faturado } = req.body;
  let nota_fiscal = req.files['nota_fiscal'] ? req.files['nota_fiscal'][0].filename : null;
  let conhecimento_transporte = req.files['conhecimento_transporte'] ? req.files['conhecimento_transporte'][0].filename : null;
  
  try {
    // Ao cadastrar, armazena tanto o número exibido quanto o número original importado
    const pedido = new Pedido({
      numero_pedido,                              // Número exibido (pode ser alterado posteriormente)
      numero_pedido_original: numero_pedido,       // Número importado (usado para verificação de duplicidade)
      cliente,
      responsavel,
      faturado,
      data_prevista: data_prevista || null,
      comentarios,
      nota_fiscal,
      conhecimento_transporte
    });
    await pedido.save();
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    const clients = await Usuario.find({ tipo: 'cliente' });
    res.render('admin/add_order', { erro: 'Erro ao adicionar pedido.', clients });
  }
});

// Rota para atualizar pedido - GET
router.get('/update_order/:id', checkAdminAuth, async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) return res.send('Pedido não encontrado.');
    res.render('admin/update_order', { pedido, erro: null });
  } catch (err) {
    res.send('Erro ao carregar pedido.');
  }
});

// Rota para atualizar pedido - POST
router.post('/update_order/:id', checkAdminAuth, upload.fields([
  { name: 'nota_fiscal', maxCount: 1 },
  { name: 'conhecimento_transporte', maxCount: 1 }
]), async (req, res) => {
  const { status, data_prevista, comentarios, numero_pedido_sanhidrel } = req.body;
  try {
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) return res.send('Pedido não encontrado.');
    
    pedido.status = status;
    pedido.data_prevista = data_prevista || null;
    pedido.comentarios = comentarios;
    
    // Atualiza apenas o número exibido para a Sanhidrel,
    // mantendo inalterado o número importado (numero_pedido_original)
    if (numero_pedido_sanhidrel && numero_pedido_sanhidrel.trim() !== '') {
      pedido.numero_pedido = numero_pedido_sanhidrel;
    }
    
    if (req.files['nota_fiscal']) {
      pedido.nota_fiscal = req.files['nota_fiscal'][0].filename;
    }
    if (req.files['conhecimento_transporte']) {
      pedido.conhecimento_transporte = req.files['conhecimento_transporte'][0].filename;
    }
    
    await pedido.save();
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.render('admin/update_order', { pedido: req.body, erro: 'Erro ao atualizar pedido.' });
  }
});

// Rota para deletar pedido
router.get('/delete_order/:id', checkAdminAuth, async (req, res) => {
  try {
    await Pedido.findByIdAndDelete(req.params.id);
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.send('Erro ao deletar pedido.');
  }
});

/* === Gestão de Clientes === */

// Rota para listar todos os clientes
router.get('/clients', checkAdminAuth, async (req, res) => {
  try {
    const clients = await Usuario.find({ tipo: 'cliente' });
    res.render('admin/clients', { clients });
  } catch (err) {
    console.error(err);
    res.send('Erro ao carregar clientes.');
  }
});

// Rota para atualizar um cliente - GET
router.get('/update_client/:id', checkAdminAuth, async (req, res) => {
  try {
    const client = await Usuario.findById(req.params.id);
    if (!client) return res.send('Cliente não encontrado.');
    res.render('admin/update_client', { client, erro: null });
  } catch (err) {
    res.send('Erro ao carregar cliente.');
  }
});

// Rota para atualizar um cliente - POST
router.post('/update_client/:id', checkAdminAuth, async (req, res) => {
  const { nome, email, senha } = req.body;
  try {
    const client = await Usuario.findById(req.params.id);
    if (!client) return res.send('Cliente não encontrado.');
    client.nome = nome;
    client.email = email;
    if (senha && senha.trim() !== '') {
      client.senha = senha; // Será criptografada pelo pre-save
    }
    await client.save();
    res.redirect('/admin/clients');
  } catch (err) {
    console.error(err);
    res.render('admin/update_client', { client: req.body, erro: 'Erro ao atualizar cliente.' });
  }
});

// Rota para cadastrar novo cliente - GET
router.get('/add_client', checkAdminAuth, (req, res) => {
  res.render('admin/add_client', { erro: null });
});

// Rota para cadastrar novo cliente - POST
router.post('/add_client', checkAdminAuth, async (req, res) => {
  const { nome, email, senha } = req.body;
  try {
    const existingUser = await Usuario.findOne({ email });
    if (existingUser) {
      return res.render('admin/add_client', { erro: 'Usuário já existe.' });
    }
    const novoCliente = new Usuario({
      nome,
      email,
      senha, // Será criptografada automaticamente
      tipo: 'cliente'
    });
    await novoCliente.save();
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.render('admin/add_client', { erro: 'Erro ao cadastrar novo cliente.' });
  }
});

const { sincronizarPedidos } = require('../config/blingIntegration'); // Certifique-se que este arquivo existe e está correto

// Rota para importar pedidos do Bling
router.get('/importar_pedidos_bling', checkAdminAuth, async (req, res) => {
    try {
        await sincronizarPedidos();
        res.send("📦 Pedidos do Bling importados com sucesso!");
    } catch (error) {
        console.error("❌ Erro ao importar pedidos do Bling:", error);
        res.status(500).send("Erro ao importar pedidos. Verifique a chave API.");
    }
});

// Rota de logout do admin
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Servir Nota Fiscal (PDF)
router.get('/nota_fiscal/:filename', checkAdminAuth, (req, res) => {
  const fileName = req.params.filename;
  const filePath = path.join(__dirname, '..', 'uploads', 'nota_fiscal', fileName);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=" + fileName);

  res.sendFile(filePath, (err) => {
      if (err) {
          console.error("❌ Erro ao carregar o PDF da nota fiscal:", err);
          res.status(500).send("Erro ao carregar o PDF.");
      }
  });
});

// Servir Conhecimento de Transporte (PDF)
router.get('/conhecimento/:filename', checkAdminAuth, (req, res) => {
  const fileName = req.params.filename;
  const filePath = path.join(__dirname, '..', 'uploads', 'conhecimento', fileName);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=" + fileName);

  res.sendFile(filePath, (err) => {
      if (err) {
          console.error("❌ Erro ao carregar o PDF do conhecimento de transporte:", err);
          res.status(500).send("Erro ao carregar o PDF.");
      }
  });
});

module.exports = router;
