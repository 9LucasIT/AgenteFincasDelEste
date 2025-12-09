require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();
app.use(express.json());

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

// === ENDPOINT TEMPORAL DE ONBOARDING ===
app.post('/admin/onboard', async (req, res) => {
  try {
    console.log('🚀 Iniciando onboarding de Fincas del Este...');

    const fincasClient = await Client.findOneAndUpdate(
      { whatsappNumber: '+59898254663' },
      {
        name: 'Fincas del Este',
        whatsappNumber: '+59898254663',
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
      },
      {
        clientId: fincasClient._id,
        reference: '7890',
        tipo: 'Apartamento',
        ubicacion: 'Punta del Este Centro',
        precio: 1200,
        operacion: 'Alquiler Anual',
        dormitorios: 2,
        banos: 1,
        superficie: 65,
        descripcion: 'Céntrico, cerca de todos los servicios',
        isActive: true,
        alquilerInfo: {
          periodo: 'Anual',
          expensas: 150,
          aceptaMascotas: true
        }
      },
      {
        clientId: fincasClient._id,
        reference: '4521',
        tipo: 'Casa',
        ubicacion: 'Manantiales',
        precio: 580000,
        operacion: 'Venta',
        dormitorios: 5,
        banos: 4,
        superficie: 280,
        descripcion: 'Casa de lujo con quincho y piscina climatizada',
        isActive: true
      },
      {
        clientId: fincasClient._id,
        reference: '6789',
        tipo: 'Apartamento',
        ubicacion: 'Punta del Este Playa Brava',
        precio: 22000,
        operacion: 'Alquiler Temporario',
        dormitorios: 3,
        banos: 2,
        superficie: 95,
        descripcion: 'Frente al mar, vista panorámica',
        isActive: true,
        alquilerInfo: {
          periodo: 'Enero',
          serviciosIncluidos: ['WiFi', 'Cochera']
        }
      },
      {
        clientId: fincasClient._id,
        reference: '9012',
        tipo: 'Casa',
        ubicacion: 'La Barra',
        precio: 1800,
        operacion: 'Alquiler Anual',
        dormitorios: 3,
        banos: 2,
        superficie: 150,
        descripcion: 'Con jardín y parrillero',
        isActive: true,
        alquilerInfo: {
          periodo: 'Anual',
          expensas: 200,
          garaje: true
        }
      },
      {
        clientId: fincasClient._id,
        reference: '3344',
        tipo: 'Terreno',
        ubicacion: 'José Ignacio',
        precio: 180000,
        operacion: 'Venta',
        superficie: 1000,
        descripcion: 'Terreno esquina, zona premium',
        isActive: true
      },
      {
        clientId: fincasClient._id,
        reference: '5566',
        tipo: 'Apartamento',
        ubicacion: 'Punta del Este Puerto',
        precio: 14000,
        operacion: 'Alquiler Temporario',
        dormitorios: 2,
        banos: 2,
        superficie: 75,
        descripcion: 'A pasos del puerto y restaurantes',
        isActive: true,
        alquilerInfo: {
          periodo: 'Febrero',
          serviciosIncluidos: ['WiFi', 'Cochera', 'Amenities']
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
// === FIN ENDPOINT TEMPORAL ===

// Webhook de Green API
app.post('/webhook/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const notification = req.body;

    console.log('📨 Webhook recibido:', JSON.stringify(notification, null, 2));

    // Responder rápido a Green API
    res.status(200).json({ received: true });

    // Procesar solo mensajes entrantes
    if (notification.typeWebhook === 'incomingMessageReceived') {
      const messageData = notification.messageData;
      const senderNumber = messageData.chatId.replace('@c.us', '');
      const messageText = messageData.textMessageData?.textMessage || '';

      console.log(`💬 Mensaje de ${senderNumber}: ${messageText}`);

      // Buscar cliente por instanceId
      const client = await Client.findOne({ 
        greenApiInstanceId: instanceId,
        isActive: true 
      });

      if (!client) {
        console.log('⚠️ Cliente no encontrado para instance:', instanceId);
        return;
      }

      console.log('✅ Cliente encontrado:', client.name);

      // Buscar o crear conversación
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

      // Agregar mensaje del usuario
      conversation.messages.push({
        role: 'user',
        content: messageText,
        timestamp: new Date()
      });

      // Obtener propiedades del cliente
      const properties = await Property.find({ 
        clientId: client._id,
        isActive: true 
      });

      // Preparar contexto para Claude
      const systemPrompt = generateSystemPrompt(client, properties);
      const conversationHistory = conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Llamar a Claude API
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
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

      // Guardar respuesta del asistente
      conversation.messages.push({
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date()
      });

      conversation.updatedAt = new Date();
      await conversation.save();

      // Enviar mensaje por WhatsApp
      await sendWhatsAppMessage(
        client.greenApiInstanceId,
        client.greenApiToken,
        senderNumber,
        assistantMessage
      );

      console.log('✅ Mensaje enviado exitosamente');
    }

  } catch (error) {
    console.error('❌ Error en webhook:', error);
  }
});

// Función para generar prompt del sistema
function generateSystemPrompt(client, properties) {
  return `Eres un agente inmobiliario profesional de ${client.name} en ${client.country}.

PROPIEDADES DISPONIBLES:
${JSON.stringify(properties, null, 2)}

TU TRABAJO:
1. Saluda cordialmente y preséntate como asistente de ${client.name}
2. Primera pregunta: "¿Estás buscando COMPRAR o ALQUILAR?"
   - Si alquilar: "¿Para TEMPORADA (enero/febrero) o ANUAL (contrato 2 años)?"
3. Pregunta: "¿Ya tenés alguna propiedad vista (link o dirección)?"
4. Si tiene propiedad vista: Identificar y ofrecer coordinar visita
5. Si busca asesoramiento: Calificar según operación

PREGUNTAS DE CALIFICACIÓN:
- VENTAS: zona, presupuesto USD, tipo, dormitorios, para vivir/inversión
- ALQUILERES TEMPORARIOS: período, personas, zona, presupuesto, servicios
- ALQUILERES ANUALES: presupuesto mensual USD, zona, dormitorios, garaje, mascotas

CUANDO CALIFICADO: "Perfecto, te voy a conectar con uno de nuestros asesores"

IMPORTANTE:
- Respuestas BREVES (2-3 líneas)
- Lenguaje ${client.country === 'Uruguay' ? 'uruguayo' : 'argentino'} natural
- Precios formato: "U$S 350.000" (venta), "U$S 18.000 por Enero" (temporario), "U$S 1.200 por mes" (anual)
- NO inventar propiedades que no están en la base de datos
- Si preguntan por propiedad que no existe, ofrecer alternativas similares`;
}

// Función para enviar mensaje por WhatsApp
async function sendWhatsAppMessage(instanceId, token, phoneNumber, message) {
  try {
    const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`;
    
    await axios.post(url, {
      chatId: `${phoneNumber}@c.us`,
      message: message
    });

    console.log(`✅ Mensaje enviado a ${phoneNumber}`);
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error.response?.data || error.message);
    throw error;
  }
}

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ PulseTrack Server corriendo en puerto ${PORT}`);
  console.log(`📞 Sistema listo para Fincas del Este`);
  console.log(`\n🔗 Webhook URL:`);
  console.log(`https://tu-servidor.com/webhook/{instanceId}`);
});
