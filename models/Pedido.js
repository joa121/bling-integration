// models/Pedido.js
const mongoose = require('mongoose');

const pedidoSchema = new mongoose.Schema({
  numero_pedido: { type: String, required: true },
  cliente: { type: String, required: true },  // Cliente selecionado (ex.: "SANHIDREL")
  responsavel: { type: String },              // Quem pegou o pedido (usado pela administração)
  faturado: { type: String },                 // Nome para faturamento (exibido na área do cliente)
  status: { 
    type: String, 
    enum: ['Solicitado', 'Aprovado', 'Em Produção', 'Saiu para entrega', 'Entregue'], 
    default: 'Solicitado' 
  },
  data_criacao: { type: Date, default: Date.now },
  data_prevista: { type: Date },
  nota_fiscal: { type: String },
  conhecimento_transporte: { type: String },
  comentarios: { type: String }
});

module.exports = mongoose.model('Pedido', pedidoSchema);
