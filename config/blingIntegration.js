const axios = require('axios');
const Pedido = require('../models/Pedido');
const moment = require('moment');
require('dotenv').config();

// Sua chave API
const API_KEY = "642490a35e7301d50bbaa473cd329a9d0f560627506d7a2ccc9d161ffd715a81d9387fb4";

// URL da API do Bling (v2)
const API_URL = 'https://bling.com.br/Api/v2/pedidos/json/';

// Configurações:
const LIMITE_PEDIDOS = 20; // Apenas os últimos 10 pedidos
const dataHoje = moment().format("DD/MM/YYYY"); // Data de hoje

// Mapeamento de status
const statusMap = {
    "Em aberto": "Aprovado",  // Convertendo "Em aberto" para "Aprovado"
    "Cancelado": "Cancelado",
    "Faturado": "Faturado",
    "Finalizado": "Finalizado",
    "Aprovado": "Aprovado"
};

/**
 * Função para sincronizar os 10 pedidos mais recentes do Bling
 * - Apenas os pedidos emitidos hoje
 * - Apenas pedidos do vendedor "sanhidrel"
 */
async function sincronizarPedidos() {
    console.log("🔄 Iniciando sincronização de pedidos do Bling...");

    try {
        console.log(`📥 Buscando os últimos ${LIMITE_PEDIDOS} pedidos da data ${dataHoje}...`);

        // Faz a requisição para obter pedidos, ordenados em ordem decrescente (mais novos primeiro)
        const response = await axios.get(API_URL, {
            params: {
                apikey: API_KEY,
                pagina: 1,
                limite: LIMITE_PEDIDOS,
                ordenar: 'desc',
                filters: `dataEmissao[${dataHoje} TO ${dataHoje}]`
            }
        });

        if (!response.data || !response.data.retorno || !response.data.retorno.pedidos) {
            console.log("🚫 Nenhum pedido encontrado para hoje.");
            return;
        }

        const pedidos = response.data.retorno.pedidos;
        let pedidosImportados = 0;

        for (const pedidoObj of pedidos) {
            const pedido = pedidoObj.pedido;

            // Tenta extrair o número do pedido da sanhidrel a partir das informações adicionais
            let numeroPedidoSistema;
            const regex = /(\d{5}\/\d{4})/;
            if (pedido.informacoesAdicionais && typeof pedido.informacoesAdicionais === 'string') {
                console.log("Informações adicionais:", pedido.informacoesAdicionais);
                const match = pedido.informacoesAdicionais.match(regex);
                if (match) {
                    numeroPedidoSistema = match[0];
                    console.log(`Número do pedido extraído: ${numeroPedidoSistema}`);
                } else {
                    console.log("Padrão não encontrado nas informações adicionais.");
                }
            } else {
                console.log("Campo 'informacoesAdicionais' não encontrado ou não é string:", pedido.informacoesAdicionais);
            }

            // Se não encontrou, usa o número padrão retornado pela API
            if (!numeroPedidoSistema) {
                numeroPedidoSistema = pedido.numero;
                console.log(`Usando número padrão do pedido: ${numeroPedidoSistema}`);
            }

            // Verifica se o campo vendedor contém "sanhidrel" (case-insensitive)
            const vendedor = (pedido.vendedor || "").toLowerCase();
            if (!vendedor.includes("sanhidrel")) {
                console.log(`🔸 Pedido ${numeroPedidoSistema} ignorado (vendedor diferente: ${pedido.vendedor || "Não informado"}).`);
                continue;
            }

            // Verifica se o pedido já existe no banco de dados
            const pedidoExiste = await Pedido.findOne({ numero_pedido: numeroPedidoSistema });
            if (pedidoExiste) {
                console.log(`⚠️ Pedido ${numeroPedidoSistema} já existe no banco.`);
                continue;
            }

            // Mapeia o status do pedido
            const statusPedido = statusMap[pedido.situacao] || "Aprovado";

            // Garante que o nome do cliente será usado no campo 'faturado'
            const nomeCliente = pedido.cliente ? pedido.cliente.nome : "Cliente Desconhecido";

            // Cria o novo pedido; ajuste os campos conforme o seu modelo
            const novoPedido = new Pedido({
                numero_pedido: numeroPedidoSistema,
                cliente: "SANHIDREL",
                faturado: nomeCliente,
                status: statusPedido,
                data_prevista: pedido.dataSaida ? new Date(pedido.dataSaida) : null
            });

            await novoPedido.save();
            console.log(`✅ Pedido ${numeroPedidoSistema} importado com sucesso.`);
            pedidosImportados++;
        }

        console.log(`✅ Sincronização concluída. ${pedidosImportados} novos pedidos importados.`);

    } catch (error) {
        console.error("❌ Erro ao buscar pedidos:", error.message);
    }
}

module.exports = { sincronizarPedidos };
