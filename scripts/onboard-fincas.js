require('dotenv').config();
const mongoose = require('mongoose');

// Modelos
const clientSchema = new mongoose.Schema({
  name: String,
  whatsappNumber: String,
  country: String,
  isActive: Boolean,
  config: Object
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
  alquilerInfo: Object
});

const Client = mongoose.model('Client', clientSchema);
const Property = mongoose.model('Property', propertySchema);

async function onboardFincas() {
  try {
    console.log('🚀 Iniciando onboarding de Fincas del Este...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Crear cliente
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

    // Propiedades
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

    console.log('\n📊 Resumen:');
    console.log('- Cliente ID:', fincasClient._id);
    console.log('- WhatsApp:', fincasClient.whatsappNumber);
    console.log('- Propiedades:', insertedProps.length);
    
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

onboardFincas();