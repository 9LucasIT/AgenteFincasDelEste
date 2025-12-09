require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();
app.use(express.json({ limit: '50mb' }));

// Modelos
const clientSchema = new mongoose.Schema({
  name: String,
  whatsappNumber: String,
  greenApiInstanceId: String,
  greenApiToken: String,
  country: String,
  isActive: Boolean,
  config: Object,
  createdAt: { type: Date, default: Date.now }
});

const propertySchema = new mongoose.Schema({
  clientId: mongoose.Schema.Types.ObjectId,
  reference: String,
  tipo: String,
  ubicacion: String,
  precio: Number,
  operacion: String,
  dormitorios: Number,
  banos: Number,
  superficie: Number,
  descripcion: String,
  isActive: Boolean,
  alquilerInfo: Object,
  createdAt: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema({
  clientId: mongoose.Schema.Types.ObjectId,
  phoneNumber: String,
  messages: [{
    role: String,
    content: String,
    timestamp: Date
  }],
  leadData: Object,
  status: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Client = mongoose.model('Client', clientSchema);
const Property = mongoose.model('Property', propertySchema);
const Conversation = mongoose.model('Conversation', conversationSchema);

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => console.error('❌ Error MongoDB:', err));

// Endpoint de test
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// === ENDPOINT DE ONBOARDING ===
app.get('/admin/onboard', async (req, res) => {
  try {
    console.log('🚀 Iniciando onboarding de Fincas del Este...');

    const fincasClient = await Client.findOneAndUpdate(
      { whatsappNumber: '+59898254663' },
      {
        name: 'Fincas del Este',
        whatsappNumber: '+59898254663',
        greenApiInstanceId: process.env.GREEN_API_INSTANCE_ID,
        greenApiToken: process.env.GREEN_API_TOKEN,
        country: 'Uruguay',
        isActive: true,
        config: {
          operationType: ['Venta', 'Alquiler Temporario', 'Alquiler Anual'],
          currency: 'USD',
          features: {
            infocasasIntegration: true,
            leadQualification: true,
            autoResponse: true
          }
        }
      },
      { upsert: true, new: true }
    );

    console.log('✅ Cliente creado:', fincasClient._id);

    const properties = [
      {
        clientId: fincasClient._id,
        reference: '2125',
        tipo: 'Apartamento',
        ubicacion: 'La Barra',
        precio: 350000,
        operacion: 'Venta',
        dormitorios: 3,
        banos: 3,
        superficie: 120,
        descripcion: 'Moderno apartamento en La Barra con vista al mar',
        isActive: true
      },
      {
        clientId: fincasClient._id,
        reference: '3456',
        tipo: 'Casa',
        ubicacion: 'José Ignacio',
        precio: 18000,
        operacion: 'Alquiler Temporario',
        dormitorios: 4,
        banos: 3,
        superficie: 200,
        descripcion: 'Casa con piscina, ideal para familias',
        isActive: true,
        alquilerInfo: {
          periodo: 'Enero-Febrero',
          serviciosIncluidos: ['WiFi', 'Piscina', 'Parrillero']
        }
      }
    ];

    await Property.deleteMany({ clientId: fincasClient._id });
    const insertedProps = await Property.insertMany(properties);
    console.log(`✅ ${insertedProps.length} propiedades agregadas`);

    res.json({
      success: true,
      message: '✅ Fincas del Este configurado correctamente',
      data: {
        clientId: fincasClient._id,
        whatsapp: fincasClient.whatsappNumber,
        greenApiInstanceId: fincasClient.greenApiInstanceId,
        properties: insertedProps.length
      }
    });

  } catch (error) {
    console.error('❌ Error en onboarding:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Webhook de Green API
app.post('/webhook/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const notification = req.body;

    console.log('📨 Webhook recibido - instanceId:', instanceId);

    res.status(200).json({ received: true });

    if (notification.typeWebhook === 'incomingMessageReceived') {
      console.log('✅ Procesando mensaje...');
      
      const messageData = notification.messageData;
      const senderData = notification.senderData;
      
      const senderNumber = senderData.chatId.replace('@c.us', '');
      
      let messageText = '';
      if (messageData.textMessageData?.textMessage) {
        messageText = messageData.textMessageData.textMessage;
      } else if (messageData.extendedTextMessageData?.text) {
        messageText = messageData.extendedTextMessageData.text;
      }

      console.log(`💬 De ${senderNumber}: ${messageText}`);

      const client = await Client.findOne({ 
        greenApiInstanceId: instanceId.toString(),
        isActive: true 
      });

      if (!client) {
        console.log('⚠️ Cliente no encontrado');
        return;
      }

      console.log('✅ Cliente:', client.name);

      let conversation = await Conversation.findOne({
        clientId: client._id,
        phoneNumber: senderNumber
      });

      if (!conversation) {
        conversation = new Conversation({
          clientId: client._id,
          phoneNumber: senderNumber,
          messages: [],
          leadData: {},
          status: 'active'
        });
      }

      conversation.messages.push({
        role: 'user',
        content: messageText,
        timestamp: new Date()
      });

      const properties = await Property.find({ 
        clientId: client._id,
        isActive: true 
      }).limit(5);

      console.log(`📦 Propiedades: ${properties.length}`);

      const propList = properties.map(p => 
        `${p.tipo} ${p.ubicacion} ${p.dormitorios}d U$S${p.precio}`
      ).join(', ');

      const systemPrompt = `Sos un agente de Fincas del Este (Uruguay).

Propiedades: ${propList}

Reglas:
- Respuestas MUY cortas (1-2 lineas)
- Pregunta: comprar o alquilar?
- Si alquila: temporario o anual?
- Califica: zona, presupuesto, dormitorios
- Al final: "te conecto con un asesor"`;

      const messages = conversation.messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      console.log('🤖 Llamando Claude...');

      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 300,
          system: systemPrompt,
          messages: messages
        },
        {
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        }
      );

      const reply = response.data.content[0].text;
      console.log('🤖 Respuesta:', reply);

      conversation.messages.push({
        role: 'assistant',
        content: reply,
        timestamp: new Date()
      });

      conversation.updatedAt = new Date();
      await conversation.save();

      await sendWhatsAppMessage(
        client.greenApiInstanceId,
        client.greenApiToken,
        senderNumber,
        reply
      );

      console.log('✅ Enviado');
    }

  } catch (error) {
    console.error('❌ Error webhook:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data));
    }
  }
});

async function sendWhatsAppMessage(instanceId, token, phoneNumber, message) {
  try {
    const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`;
    
    await axios.post(url, {
      chatId: `${phoneNumber}@c.us`,
      message: message
    });

    console.log(`✅ Enviado a ${phoneNumber}`);
  } catch (error) {
    console.error('❌ Error WhatsApp:', error.message);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server en puerto ${PORT}`);
  console.log(`🔗 Webhook: https://agentefincasdeleste-production.up.railway.app/webhook/{instanceId}`);
});
