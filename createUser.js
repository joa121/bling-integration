// createUser.js
const mongoose = require('mongoose');
const Usuario = require('./models/Usuario'); // Certifique-se de que o caminho está correto
require('dotenv').config();

// Conectar ao MongoDB usando a variável de ambiente
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Conectado ao MongoDB para criar usuários');
  criarUsuarios();
})
.catch(err => {
  console.error('Erro ao conectar ao MongoDB:', err);
});

async function criarUsuarios() {
  try {
    // Criação do usuário Admin
    const adminEmail = 'admin@portal.com';
    const adminExistente = await Usuario.findOne({ email: adminEmail });
    if (adminExistente) {
      console.log('Usuário Admin já existe.');
    } else {
      const novoAdmin = new Usuario({
        nome: 'Admin',
        email: adminEmail,
        senha: 'admin123', // Essa senha será criptografada automaticamente pelo pre-save
        tipo: 'admin'
      });
      await novoAdmin.save();
      console.log('Usuário Admin criado com sucesso.');
    }

    // Criação do usuário Cliente
    const clientEmail = 'cliente@portal.com';
    const clientExistente = await Usuario.findOne({ email: clientEmail });
    if (clientExistente) {
      console.log('Usuário Cliente já existe.');
    } else {
      const novoCliente = new Usuario({
        nome: 'Cliente',
        email: clientEmail,
        senha: 'cliente123', // Essa senha também será criptografada automaticamente
        tipo: 'cliente'
      });
      await novoCliente.save();
      console.log('Usuário Cliente criado com sucesso.');
    }
  } catch (err) {
    console.error('Erro ao criar usuários:', err);
  } finally {
    mongoose.connection.close();
  }
}
