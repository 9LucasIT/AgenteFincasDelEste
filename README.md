# 🏠 Agente Inmobiliario IA - WhatsApp Bot

Agente inmobiliario inteligente con Claude AI, MongoDB Atlas y Green API (WhatsApp).

## 🚀 Deploy en Railway (1 clic)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

## 📋 Requisitos previos

1. **Cuenta en Railway** - https://railway.app
2. **MongoDB Atlas** - https://www.mongodb.com/cloud/atlas (plan gratuito)
3. **Green API** - https://green-api.com (para WhatsApp)
4. **Anthropic API Key** - https://console.anthropic.com

## ⚙️ Configuración

### 1. MongoDB Atlas

1. Crear cuenta en MongoDB Atlas
2. Crear un cluster (M0 gratis)
3. Crear base de datos llamada `inmobiliaria`
4. Obtener connection string:
   - Format: `mongodb+srv://usuario:password@cluster.mongodb.net/inmobiliaria`
   - Whitelist todas las IPs: `0.0.0.0/0`

### 2. Green API (WhatsApp)

1. Registrarse en https://green-api.com
2. Crear instancia
3. Vincular número de WhatsApp:
   - Escanear QR code con WhatsApp
4. Obtener credenciales:
   - `idInstance` (ej: 1234567890)
   - `apiTokenInstance` (ej: abc123xyz)

### 3. Anthropic API

1. Ir a https://console.anthropic.com
2. Generar API Key
3. Guardar la key (empieza con `sk-ant-`)

### 4. Deployment en Railway

#### Opción A: Desde GitHub (Recomendado)

1. Subir este código a GitHub
2. En Railway: `New Project` → `Deploy from GitHub repo`
3. Seleccionar tu repositorio
4. Railway detectará automáticamente Python y usará `Procfile`

#### Opción B: Desde Railway CLI

```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Inicializar proyecto
railway init

# Deploy
railway up
```

### 5. Variables de Entorno en Railway

En Railway, ir a `Variables` y agregar:

```env
ANTHROPIC_API_KEY=sk-ant-api03-tu-key-aqui
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/inmobiliaria
GREEN_API_INSTANCE=1234567890
GREEN_API_TOKEN=abc123xyz
PORT=5000
```

### 6. Inicializar Base de Datos

Una vez desplegado, ejecutar SOLO UNA VEZ:

```bash
# Desde Railway CLI
railway run python init_db.py

# O desde el dashboard de Railway
# Variables → Add Variable → RUN_INIT_DB=true
# Luego remove la variable
```

### 7. Configurar Webhook en Green API

1. Ir al panel de Green API
2. En `Settings` → `Webhooks`
3. Configurar:
   - **Webhook URL**: `https://tu-app.railway.app/webhook`
   - **Webhook Type**: `incomingMessageReceived`
4. Guardar y activar

## 🧪 Probar el Bot

1. Envía un mensaje de WhatsApp al número vinculado:
   ```
   Hola, estoy buscando un departamento
   ```

2. El bot debería responder automáticamente

## 📱 Ejemplos de uso

```
👤 Usuario: Hola
🤖 Bot: ¡Hola! Soy tu agente inmobiliario virtual...

👤 Usuario: Busco departamento de 2 habitaciones en alquiler
🤖 Bot: Encontré 3 departamentos de 2 habitaciones...

👤 Usuario: Quiero agendar una visita
🤖 Bot: Por supuesto, ¿cuál es tu nombre y teléfono?
```

## 🛠️ Estructura del Proyecto

```
.
├── main.py              # Aplicación principal (Flask + Agente IA)
├── init_db.py           # Script de inicialización de BD
├── requirements.txt     # Dependencias Python
├── Procfile            # Configuración Railway
├── runtime.txt         # Versión de Python
└── README.md           # Este archivo
```

## 🔧 Endpoints de la API

### GET /
Health check del servicio

### POST /webhook
Recibe mensajes de Green API (WhatsApp)

### POST /send
Enviar mensajes manualmente (testing)

```bash
curl -X POST https://tu-app.railway.app/send \
  -H "Content-Type: application/json" \
  -d '{
    "telefono": "5493411234567",
    "mensaje": "Hola, esto es una prueba"
  }'
```

## 📊 Base de Datos

### Colecciones

- **propiedades** - Catálogo de propiedades
- **conversaciones** - Historial de chats
- **clientes** - Leads capturados
- **visitas** - Visitas agendadas

### Esquema de Propiedad

```javascript
{
  titulo: String,
  tipo: "casa" | "departamento" | "terreno" | "oficina" | "local",
  operacion: "venta" | "alquiler",
  precio: Number,
  moneda: "USD" | "ARS",
  ubicacion: String,
  habitaciones: Number,
  banos: Number,
  superficie_total: Number,
  descripcion: String,
  caracteristicas: Array,
  estado: "disponible" | "reservado" | "vendido"
}
```

## 🔍 Monitoreo

### Logs en Railway

```bash
railway logs
```

### Verificar estado

```bash
curl https://tu-app.railway.app/
```

Respuesta esperada:
```json
{
  "status": "online",
  "service": "Agente Inmobiliario IA",
  "version": "1.0.0"
}
```

## 🐛 Troubleshooting

### Bot no responde

1. Verificar que el webhook esté configurado correctamente en Green API
2. Ver logs: `railway logs`
3. Verificar variables de entorno

### Error de MongoDB

1. Verificar connection string
2. Whitelist IP `0.0.0.0/0` en MongoDB Atlas
3. Verificar que la BD se llame `inmobiliaria`

### Error de Anthropic API

1. Verificar que la API key sea válida
2. Verificar que tengas créditos en tu cuenta
3. Revisar límites de rate

## 💰 Costos

- **Railway**: Plan gratuito incluye $5 de crédito/mes
- **MongoDB Atlas**: Cluster M0 es GRATIS para siempre
- **Green API**: Plan gratuito disponible (limitado)
- **Anthropic API**: Pay-as-you-go (~ $0.003 por mensaje)

## 🔐 Seguridad

- Nunca expongas tus API keys
- Usa variables de entorno siempre
- Activa autenticación en producción
- Monitorea el uso de APIs

## 📈 Escalabilidad

Para alto volumen:
- Upgrade Railway plan
- Escalar MongoDB cluster
- Implementar caché con Redis
- Rate limiting por usuario

## 🤝 Soporte

Para issues o preguntas, crear un issue en GitHub.

---

**Desarrollado con ❤️ usando Claude API de Anthropic**
