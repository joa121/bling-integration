const cron = require('node-cron');
const { buscarPedidosBling } = require('./config/blingIntegration');

// Agendar a execução da busca a cada 5 minutos
cron.schedule('*/5 * * * *', async () => {
  console.log("🔄 Buscando pedidos no Bling...");
  await buscarPedidosBling();
});
