// app.js
const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Conectado ao MongoDB'))
.catch(err => console.error('Erro ao conectar ao MongoDB:', err));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'seuchavesecreta',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 dia
}));

const adminRoutes = require('./routes/admin');
const clientRoutes = require('./routes/client');

app.use('/admin', adminRoutes);
app.use('/client', clientRoutes);

app.get('/', (req, res) => {
  res.render('index');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
require('./scheduler'); // Inicia o agendador de pedidos Bling
const cron = require('node-cron');
const { sincronizarPedidos } = require('./config/blingIntegration');

// Executa a sincronização a cada 30 minutos
cron.schedule('*/30 * * * *', async () => {
    console.log("🔄 Sincronizando pedidos do Bling...");
    await sincronizarPedidos();
});
