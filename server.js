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

// === ENDPOINT PARA CARGAR PROPIEDADES DESDE CSV ===
app.post('/admin/upload-properties', async (req, res) => {
  try {
    console.log('📊 Iniciando carga masiva de propiedades...');

    const client = await Client.findOne({ name: 'Fincas del Este' });
    
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Cliente Fincas del Este no encontrado. Ejecutá /admin/onboard primero.'
      });
    }

    console.log('✅ Cliente encontrado:', client._id);

    const csvProperties = req.body.properties;

    if (!csvProperties || !Array.isArray(csvProperties)) {
      return res.status(400).json({
        success: false,
        error: 'Falta el array de propiedades en el body'
      });
    }

    await Property.deleteMany({ clientId: client._id });
    console.log('🗑️ Propiedades anteriores eliminadas');

    const properties = csvProperties
      .filter(p => p.activo === '1')
      .map(p => {
        let operacion = '';
        if (p.negocio && p.negocio.toLowerCase().includes('vent')) {
          operacion = 'Venta';
        } else if (p.negocio && p.negocio.toLowerCase().includes('alquil')) {
          if (p.tiempo === 'anual') {
            operacion = 'Alquiler Anual';
          } else {
            operacion = 'Alquiler Temporario';
          }
        }

        let precio = 0;
        if (operacion === 'Venta' && p.precioventa) {
          precio = parseInt(p.precioventa) || 0;
        } else if (operacion.includes('Alquiler') && p.precioalquiler) {
          precio = parseInt(p.precioalquiler) || 0;
        }

        return {
          clientId: client._id,
          reference: p.id || '',
          tipo: p.tipo || 'Apartamento',
          ubicacion: `${p.barrio || p.localidad || p.ciudad || ''}`.trim(),
          precio: precio,
          operacion: operacion,
          dormitorios: parseInt(p.dormitorio) || 0,
          banos: parseInt(p.banio) || 0,
          superficie: parseInt(p.supConstruida || p.supPropia) || 0,
          descripcion: (p.Descripción || p.nombre || '').substring(0, 500),
          isActive: true,
          alquilerInfo: operacion.includes('Alquiler') ? {
            periodo: p.tiempo || '',
            serviciosIncluidos: []
          } : undefined
        };
      })
      .filter(p => p.precio > 0 && p.operacion);

    const insertedProps = await Property.insertMany(properties);
    console.log(`✅ ${insertedProps.length} propiedades cargadas`);

    res.json({
      success: true,
      message: `✅ ${insertedProps.length} propiedades cargadas correctamente`,
      data: {
        clientId: client._id,
        properties: insertedProps.length
      }
    });

  } catch (error) {
    console.error('❌ Error cargando propiedades:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Webhook de Green API
// Webhook de Green API
app.post('/webhook/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const notification = req.body;

    console.log('📨 Webhook recibido - instanceId:', instanceId);
    console.log('📨 Notification type:', notification.typeWebhook);

    res.status(200).json({ received: true });

    if (notification.typeWebhook === 'incomingMessageReceived') {
      console.log('✅ Es un mensaje entrante, procesando...');
      
      const messageData = notification.messageData;
      const senderData = notification.senderData;
      
      const senderNumber = senderData.chatId.replace('@c.us', '');
      
      let messageText = '';
      if (messageData.textMessageData?.textMessage) {
        messageText = messageData.textMessageData.textMessage;
      } else if (messageData.extendedTextMessageData?.text) {
        messageText = messageData.extendedTextMessageData.text;
      }

      console.log(`💬 Mensaje de ${senderNumber}: ${messageText}`);

      console.log('🔍 Buscando cliente con instanceId:', instanceId);
      
      const client = await Client.findOne({ 
        greenApiInstanceId: instanceId.toString(),
        isActive: true 
      });

      if (!client) {
        console.log('⚠️ Cliente no encontrado para instance:', instanceId);
        return;
      }

      console.log('✅ Cliente encontrado:', client.name);

      let conversation = await Conversation.findOne({
        clientId: client._id,
        phoneNumber: senderNumber
      });

      if (!conversation) {
        console.log('📝 Creando nueva conversación...');
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
      }).limit(10); // Solo primeras 10 para no sobrecargar

      console.log(`📦 Propiedades encontradas: ${properties.length}`);

      // Crear un resumen simple de propiedades para el prompt
      const propSummary = properties.map(p => 
        `${p.tipo} en ${p.ubicacion}, ${p.operacion}, ${p.dormitorios} dorm, U$S ${p.precio.toLocaleString()}`
      ).join('\n');

      const systemPrompt = `Eres un agente inmobiliario profesional de ${client.name} en ${client.country}.

Propiedades disponibles (${properties.length} en total):
${propSummary}

INSTRUCCIONES:
1. Saluda y pregunta: "¿Estás buscando COMPRAR o ALQUILAR?"
2. Si alquilar: "¿Para TEMPORADA o ANUAL?"
3. Califica al cliente preguntando zona, presupuesto, dormitorios
4. Cuando esté calificado di: "Te conecto con un asesor"

IMPORTANTE:
- Respuestas MUY BREVES (máximo 2 líneas)
- Lenguaje uruguayo natural
- Precios: "U$S 350.000"`;

      const conversationHistory = conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      console.log('🤖 Llamando a Claude API...');

      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 500,
          system: systemPrompt,
          messages: conversationHistory
        },
        {
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          }
        }
      );

      const assistantMessage = response.data.content[0].text;
      console.log('🤖 Respuesta de Claude:', assistantMessage);

      conversation.messages.push({
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date()
      });

      conversation.updatedAt = new Date();
      await conversation.save();

      console.log('💾 Conversación guardada');

      console.log('📤 Enviando mensaje por WhatsApp...');
      
      await sendWhatsAppMessage(
        client.greenApiInstanceId,
        client.greenApiToken,
        senderNumber,
        assistantMessage
      );

      console.log('✅ Proceso completado exitosamente');
    }

  } catch (error) {
    console.error('❌ Error en webhook:', error.message);
    if (error.response) {
      console.error('❌ API Response:', error.response.data);
    }
  }
});
