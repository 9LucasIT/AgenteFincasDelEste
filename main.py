"""
Agente Inmobiliario IA - WhatsApp Bot
Integración: Claude API + MongoDB Atlas + Green API
"""

import os
import json
import logging
from datetime import datetime
from typing import List, Dict, Optional

import requests
from anthropic import Anthropic
from pymongo import MongoClient
from flask import Flask, request, jsonify

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Inicialización
app = Flask(__name__)

# Variables de entorno
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MONGO_URI = os.getenv("MONGO_URI")
GREEN_API_INSTANCE = os.getenv("GREEN_API_INSTANCE")
GREEN_API_TOKEN = os.getenv("GREEN_API_TOKEN")

# Cliente Anthropic
anthropic_client = Anthropic(api_key=ANTHROPIC_API_KEY)

# MongoDB
mongo_client = MongoClient(MONGO_URI)
db = mongo_client["inmobiliaria"]
propiedades_col = db["propiedades"]
conversaciones_col = db["conversaciones"]
clientes_col = db["clientes"]
visitas_col = db["visitas"]

# Green API URL base
GREEN_API_URL = f"https://api.green-api.com/waInstance{GREEN_API_INSTANCE}"


class AgenteInmobiliario:
    """Agente inmobiliario con IA"""
    
    def __init__(self):
        self.model = "claude-sonnet-4-20250514"
        self.max_tokens = 4000
        
    def obtener_propiedades(self, filtros: Dict = None) -> List[Dict]:
        """Busca propiedades en MongoDB"""
        if filtros is None:
            filtros = {}
        
        propiedades = list(propiedades_col.find(filtros).limit(10))
        for prop in propiedades:
            prop['_id'] = str(prop['_id'])
        
        return propiedades
    
    def crear_herramientas(self) -> List[Dict]:
        """Define herramientas disponibles para Claude"""
        return [
            {
                "name": "buscar_propiedades",
                "description": "Busca propiedades según criterios. Filtra por tipo, precio, ubicación, habitaciones, etc.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "tipo": {
                            "type": "string",
                            "enum": ["casa", "departamento", "terreno", "oficina", "local"],
                            "description": "Tipo de propiedad"
                        },
                        "operacion": {
                            "type": "string",
                            "enum": ["venta", "alquiler"],
                            "description": "Venta o alquiler"
                        },
                        "precio_min": {"type": "number", "description": "Precio mínimo"},
                        "precio_max": {"type": "number", "description": "Precio máximo"},
                        "ubicacion": {"type": "string", "description": "Ciudad o zona"},
                        "habitaciones": {"type": "integer", "description": "Número de habitaciones"},
                        "banos": {"type": "integer", "description": "Número de baños"}
                    },
                    "required": []
                }
            },
            {
                "name": "obtener_detalle_propiedad",
                "description": "Obtiene detalles completos de una propiedad por ID",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "propiedad_id": {
                            "type": "string",
                            "description": "ID de la propiedad"
                        }
                    },
                    "required": ["propiedad_id"]
                }
            },
            {
                "name": "agendar_visita",
                "description": "Agenda una visita a una propiedad",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "propiedad_id": {"type": "string", "description": "ID de la propiedad"},
                        "nombre_cliente": {"type": "string", "description": "Nombre del cliente"},
                        "telefono": {"type": "string", "description": "Teléfono del cliente"},
                        "email": {"type": "string", "description": "Email del cliente"},
                        "fecha_preferida": {"type": "string", "description": "Fecha preferida (YYYY-MM-DD)"},
                        "horario_preferido": {"type": "string", "description": "Horario preferido"}
                    },
                    "required": ["propiedad_id", "nombre_cliente", "telefono"]
                }
            },
            {
                "name": "guardar_lead",
                "description": "Guarda información de un cliente potencial",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "nombre": {"type": "string", "description": "Nombre del cliente"},
                        "telefono": {"type": "string", "description": "Teléfono del cliente"},
                        "email": {"type": "string", "description": "Email del cliente"},
                        "preferencias": {"type": "object", "description": "Preferencias del cliente"}
                    },
                    "required": ["nombre"]
                }
            }
        ]
    
    def ejecutar_herramienta(self, nombre: str, parametros: Dict) -> Dict:
        """Ejecuta una herramienta específica"""
        try:
            if nombre == "buscar_propiedades":
                filtros = {}
                
                if "tipo" in parametros:
                    filtros["tipo"] = parametros["tipo"]
                
                if "operacion" in parametros:
                    filtros["operacion"] = parametros["operacion"]
                
                if "ubicacion" in parametros:
                    filtros["ubicacion"] = {"$regex": parametros["ubicacion"], "$options": "i"}
                
                if "habitaciones" in parametros:
                    filtros["habitaciones"] = parametros["habitaciones"]
                
                if "banos" in parametros:
                    filtros["banos"] = parametros["banos"]
                
                if "precio_min" in parametros or "precio_max" in parametros:
                    filtros["precio"] = {}
                    if "precio_min" in parametros:
                        filtros["precio"]["$gte"] = parametros["precio_min"]
                    if "precio_max" in parametros:
                        filtros["precio"]["$lte"] = parametros["precio_max"]
                
                propiedades = self.obtener_propiedades(filtros)
                return {"success": True, "cantidad": len(propiedades), "propiedades": propiedades}
            
            elif nombre == "obtener_detalle_propiedad":
                from bson.objectid import ObjectId
                propiedad = propiedades_col.find_one({"_id": ObjectId(parametros["propiedad_id"])})
                if propiedad:
                    propiedad['_id'] = str(propiedad['_id'])
                    return {"success": True, "propiedad": propiedad}
                return {"success": False, "error": "Propiedad no encontrada"}
            
            elif nombre == "agendar_visita":
                visita = {
                    "propiedad_id": parametros["propiedad_id"],
                    "nombre_cliente": parametros["nombre_cliente"],
                    "telefono": parametros["telefono"],
                    "email": parametros.get("email"),
                    "fecha_preferida": parametros.get("fecha_preferida"),
                    "horario_preferido": parametros.get("horario_preferido"),
                    "estado": "pendiente",
                    "fecha_creacion": datetime.now()
                }
                resultado = visitas_col.insert_one(visita)
                return {
                    "success": True,
                    "mensaje": "Visita agendada correctamente",
                    "visita_id": str(resultado.inserted_id)
                }
            
            elif nombre == "guardar_lead":
                lead = {
                    "nombre": parametros["nombre"],
                    "telefono": parametros.get("telefono"),
                    "email": parametros.get("email"),
                    "preferencias": parametros.get("preferencias", {}),
                    "fecha_registro": datetime.now(),
                    "estado": "nuevo"
                }
                resultado = clientes_col.insert_one(lead)
                return {
                    "success": True,
                    "mensaje": "Lead guardado correctamente",
                    "cliente_id": str(resultado.inserted_id)
                }
            
            return {"success": False, "error": "Herramienta no reconocida"}
        
        except Exception as e:
            logger.error(f"Error ejecutando herramienta {nombre}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def procesar_mensaje(self, mensaje: str, telefono: str) -> str:
        """Procesa un mensaje y genera respuesta"""
        
        # Obtener o crear historial
        conversacion = conversaciones_col.find_one({"telefono": telefono})
        
        if not conversacion:
            conversacion = {
                "telefono": telefono,
                "historial": [],
                "fecha_inicio": datetime.now(),
                "estado": "activa"
            }
            conversaciones_col.insert_one(conversacion)
        
        historial = conversacion.get("historial", [])
        
        # Agregar mensaje del usuario
        historial.append({
            "role": "user",
            "content": mensaje
        })
        
        # System prompt
        system_prompt = """Eres un agente inmobiliario virtual profesional y amable en WhatsApp.

Tu objetivo es ayudar a los clientes a encontrar propiedades según sus necesidades.

Responsabilidades:
- Entender necesidades del cliente
- Buscar propiedades con filtros adecuados
- Proporcionar información detallada
- Agendar visitas
- Capturar información de contacto

Comportamiento:
- Sé profesional pero cercano
- Sé específico con detalles
- Confirma información importante
- Mantén respuestas concisas para WhatsApp (máximo 3-4 párrafos)
- Usa emojis moderadamente para hacer el mensaje más amigable

Cuando muestres propiedades, incluye: precio, ubicación, características principales."""

        # Llamada a Claude
        response = anthropic_client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            system=system_prompt,
            tools=self.crear_herramientas(),
            messages=historial
        )
        
        # Procesar tool calls
        while response.stop_reason == "tool_use":
            historial.append({
                "role": "assistant",
                "content": response.content
            })
            
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    resultado = self.ejecutar_herramienta(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(resultado, ensure_ascii=False)
                    })
            
            historial.append({
                "role": "user",
                "content": tool_results
            })
            
            response = anthropic_client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                system=system_prompt,
                tools=self.crear_herramientas(),
                messages=historial
            )
        
        # Extraer respuesta
        respuesta_texto = ""
        for block in response.content:
            if hasattr(block, "text"):
                respuesta_texto += block.text
        
        # Guardar historial actualizado
        historial.append({
            "role": "assistant",
            "content": respuesta_texto
        })
        
        conversaciones_col.update_one(
            {"telefono": telefono},
            {
                "$set": {
                    "historial": historial,
                    "ultima_actualizacion": datetime.now()
                }
            }
        )
        
        return respuesta_texto


# Instancia del agente
agente = AgenteInmobiliario()


def enviar_whatsapp(telefono: str, mensaje: str):
    """Envía mensaje por WhatsApp usando Green API"""
    url = f"{GREEN_API_URL}/sendMessage/{GREEN_API_TOKEN}"
    
    payload = {
        "chatId": f"{telefono}@c.us",
        "message": mensaje
    }
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        logger.info(f"Mensaje enviado a {telefono}")
        return True
    except Exception as e:
        logger.error(f"Error enviando mensaje: {str(e)}")
        return False


@app.route("/", methods=["GET"])
def home():
    """Health check"""
    return jsonify({
        "status": "online",
        "service": "Agente Inmobiliario IA",
        "version": "1.0.0"
    })


@app.route("/webhook", methods=["POST"])
def webhook():
    """Webhook para recibir mensajes de Green API"""
    try:
        data = request.json
        logger.info(f"Webhook recibido: {data}")
        
        # Validar estructura del webhook
        if not data or "typeWebhook" not in data:
            return jsonify({"status": "ignored"}), 200
        
        # Solo procesar mensajes entrantes
        if data["typeWebhook"] != "incomingMessageReceived":
            return jsonify({"status": "ignored"}), 200
        
        # Extraer información del mensaje
        message_data = data.get("messageData", {})
        sender_data = data.get("senderData", {})
        
        # Obtener texto del mensaje
        texto_mensaje = message_data.get("textMessageData", {}).get("textMessage", "")
        
        if not texto_mensaje:
            return jsonify({"status": "no_text"}), 200
        
        # Obtener número de teléfono del remitente
        telefono = sender_data.get("chatId", "").replace("@c.us", "")
        
        if not telefono:
            return jsonify({"status": "no_sender"}), 200
        
        # Ignorar mensajes de grupos
        if "@g.us" in sender_data.get("chatId", ""):
            return jsonify({"status": "group_ignored"}), 200
        
        logger.info(f"Mensaje de {telefono}: {texto_mensaje}")
        
        # Procesar con el agente
        respuesta = agente.procesar_mensaje(texto_mensaje, telefono)
        
        # Enviar respuesta
        enviar_whatsapp(telefono, respuesta)
        
        return jsonify({"status": "success"}), 200
    
    except Exception as e:
        logger.error(f"Error en webhook: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/send", methods=["POST"])
def send_message():
    """Endpoint para enviar mensajes manualmente (testing)"""
    try:
        data = request.json
        telefono = data.get("telefono")
        mensaje = data.get("mensaje")
        
        if not telefono or not mensaje:
            return jsonify({"error": "telefono y mensaje son requeridos"}), 400
        
        success = enviar_whatsapp(telefono, mensaje)
        
        if success:
            return jsonify({"status": "sent"}), 200
        else:
            return jsonify({"status": "failed"}), 500
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
