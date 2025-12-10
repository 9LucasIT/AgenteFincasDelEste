require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();
app.use(express.json({ limit: '50mb' }));

// ============================================
// MODELOS DE MONGODB (Solo propiedades y conversaciones)
// ============================================

const propertySchema = new mongoose.Schema({
  reference: String,
  tipo: String,
  ubicacion: String,
  precio: Number,
  operacion: String,
  dormitorios: Number,
  banos: Number,
  superficie: Number,
  descripcion: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema({
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

const Property = mongoose.model('Property', propertySchema);
const Conversation = mongoose.model('Conversation', conversationSchema);

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB conectado'))
  .catch(err => console.error('❌ Error MongoDB:', err));

// ============================================
// ENDPOINTS
// ============================================

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// Cargar propiedades masivamente
app.post('/admin/upload-properties', async (req, res) => {
  try {
    console.log('📊 Iniciando carga masiva de propiedades...');

    const csvProperties = req.body.properties;

    if (!csvProperties || !Array.isArray(csvProperties)) {
      return res.status(400).json({
        success: false,
        error: 'Falta el array de propiedades en el body'
      });
    }

    // IMPORTANTE: NO borrar propiedades existentes, solo agregar nuevas
    console.log('📦 Procesando propiedades...');

    const properties = csvProperties.map(p => {
      const dormitorios = parseInt(p.dormitorio) || 0;
      const banos = parseInt(p.banio) || 0;
      const superficie = parseInt(p.supConstruida) || 0;

      return {
        reference: p.id || '',
        tipo: p.tipo || 'Apartamento',
        ubicacion: p.ubicacion || '',
        precio: p.precio || 0,
        operacion: p.negocio || '',
        dormitorios: dormitorios,
        banos: banos,
        superficie: superficie,
        descripcion: (p.Descripción || '').substring(0, 500),
        isActive: true
      };
    }).filter(p => p.precio > 0 && p.operacion);

    // Borrar propiedades existentes y cargar las nuevas
    await Property.deleteMany({});
    const insertedProps = await Property.insertMany(properties);
    console.log(`✅ ${insertedProps.length} propiedades cargadas`);

    res.json({
      success: true,
      message: `✅ ${insertedProps.length} propiedades cargadas correctamente`,
      data: {
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

// Ver estadísticas de propiedades
app.get('/admin/stats', async (req, res) => {
  try {
    const total = await Property.countDocuments();
    const ventas = await Property.countDocuments({ operacion: 'Venta' });
    const alquileres = await Property.countDocuments({ 
      operacion: { $regex: 'Alquiler', $options: 'i' } 
    });

    res.json({
      success: true,
      data: {
        total,
        ventas,
        alquileres,
        conversaciones: await Conversation.countDocuments()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener todas las propiedades
app.get('/admin/properties', async (req, res) => {
  try {
    const properties = await Property.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: properties
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Agregar una propiedad individual
app.post('/admin/properties', async (req, res) => {
  try {
    const property = new Property(req.body);
    await property.save();
    
    res.json({
      success: true,
      message: 'Propiedad agregada correctamente',
      data: property
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Eliminar una propiedad
app.delete('/admin/properties/:id', async (req, res) => {
  try {
    await Property.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: 'Propiedad eliminada'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Borrar todas las propiedades
app.delete('/admin/properties/clear', async (req, res) => {
  try {
    await Property.deleteMany({});
    res.json({
      success: true,
      message: 'Todas las propiedades eliminadas'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// WEBHOOK DE GREEN API
// ============================================

app.post('/webhook/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const notification = req.body;

    console.log('📨 Webhook recibido');

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

      // Verificar que el instanceId coincide con el configurado
      if (instanceId !== process.env.GREEN_API_INSTANCE_ID) {
        console.log('⚠️ Instance ID no coincide');
        return;
      }

      console.log('✅ Instance ID verificado');

      // Buscar o crear conversación
      let conversation = await Conversation.findOne({
        phoneNumber: senderNumber
      });

      if (!conversation) {
        conversation = new Conversation({
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

      // Obtener propiedades (máximo 10 para el contexto)
      const properties = await Property.find({ 
        isActive: true 
      }).limit(10);

      console.log(`📦 Propiedades: ${properties.length}`);

      const propList = properties.map(p => 
        `${p.tipo} ${p.ubicacion} ${p.dormitorios}d U$S${p.precio.toLocaleString()}`
      ).join(', ');

      const systemPrompt = `Sos un agente de Fincas del Este (Uruguay).

Propiedades disponibles: ${propList}

Total en base de datos: ${await Property.countDocuments()} propiedades

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
        process.env.GREEN_API_INSTANCE_ID,
        process.env.GREEN_API_TOKEN,
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

// ============================================
// FUNCIÓN AUXILIAR
// ============================================

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

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server en puerto ${PORT}`);
  console.log(`🔗 Webhook: https://agentefincasdeleste-production.up.railway.app/webhook/${process.env.GREEN_API_INSTANCE_ID}`);
});
