"""
Script para inicializar MongoDB Atlas con propiedades de ejemplo
Ejecutar una sola vez después del deployment
"""

import os
from datetime import datetime
from pymongo import MongoClient

# Variables de entorno
MONGO_URI = os.getenv("MONGO_URI", "tu-mongo-uri-aqui")

def inicializar_db():
    """Inicializa la base de datos con propiedades de ejemplo"""
    
    client = MongoClient(MONGO_URI)
    db = client["inmobiliaria"]
    
    # Limpiar propiedades existentes (opcional)
    db.propiedades.delete_many({})
    
    # Propiedades de ejemplo
    propiedades = [
        {
            "titulo": "Departamento moderno en el centro",
            "tipo": "departamento",
            "operacion": "alquiler",
            "precio": 750,
            "moneda": "USD",
            "ubicacion": "Centro, Rosario",
            "direccion": "San Martín 1234",
            "habitaciones": 2,
            "banos": 1,
            "superficie_total": 65,
            "superficie_cubierta": 65,
            "descripcion": "Excelente departamento de 2 dormitorios en pleno centro. Totalmente amoblado, con cocina equipada y seguridad 24hs.",
            "caracteristicas": ["amoblado", "seguridad", "cocina equipada", "luminoso"],
            "estado": "disponible",
            "fecha_publicacion": datetime.now()
        },
        {
            "titulo": "Casa familiar con jardín",
            "tipo": "casa",
            "operacion": "venta",
            "precio": 180000,
            "moneda": "USD",
            "ubicacion": "Fisherton, Rosario",
            "direccion": "Mendoza 5678",
            "habitaciones": 3,
            "banos": 2,
            "superficie_total": 280,
            "superficie_cubierta": 180,
            "descripcion": "Hermosa casa familiar con amplio jardín. 3 dormitorios, 2 baños, living-comedor, cocina integrada, quincho y pileta.",
            "caracteristicas": ["jardín", "pileta", "quincho", "cochera", "parrilla"],
            "estado": "disponible",
            "fecha_publicacion": datetime.now()
        },
        {
            "titulo": "Monoambiente para estudiantes",
            "tipo": "departamento",
            "operacion": "alquiler",
            "precio": 450,
            "moneda": "USD",
            "ubicacion": "Pichincha, Rosario",
            "direccion": "Riobamba 890",
            "habitaciones": 1,
            "banos": 1,
            "superficie_total": 35,
            "superficie_cubierta": 35,
            "descripcion": "Monoambiente ideal para estudiantes o jóvenes profesionales. Zona segura con todos los servicios.",
            "caracteristicas": ["luminoso", "balcón", "calefacción"],
            "estado": "disponible",
            "fecha_publicacion": datetime.now()
        },
        {
            "titulo": "Departamento con vista al río",
            "tipo": "departamento",
            "operacion": "venta",
            "precio": 120000,
            "moneda": "USD",
            "ubicacion": "Parque España, Rosario",
            "direccion": "Av. Belgrano 3456",
            "habitaciones": 2,
            "banos": 2,
            "superficie_total": 85,
            "superficie_cubierta": 85,
            "descripcion": "Espectacular departamento con vista panorámica al río Paraná. 2 dormitorios con placard, 2 baños completos, balcón corrido.",
            "caracteristicas": ["vista al río", "balcón", "cochera", "baulera", "sum"],
            "estado": "disponible",
            "fecha_publicacion": datetime.now()
        },
        {
            "titulo": "Local comercial céntrico",
            "tipo": "local",
            "operacion": "alquiler",
            "precio": 1200,
            "moneda": "USD",
            "ubicacion": "Córdoba y Santa Fe, Rosario",
            "direccion": "Córdoba 2345",
            "habitaciones": 0,
            "banos": 1,
            "superficie_total": 90,
            "superficie_cubierta": 90,
            "descripcion": "Excelente local comercial en esquina de alta circulación peatonal. Ideal para cualquier rubro.",
            "caracteristicas": ["esquina", "vidriera", "baño", "depósito"],
            "estado": "disponible",
            "fecha_publicacion": datetime.now()
        },
        {
            "titulo": "Casa quinta con parque",
            "tipo": "casa",
            "operacion": "venta",
            "precio": 250000,
            "moneda": "USD",
            "ubicacion": "Funes, Santa Fe",
            "direccion": "Los Alamos 123",
            "habitaciones": 4,
            "banos": 3,
            "superficie_total": 1200,
            "superficie_cubierta": 300,
            "descripcion": "Hermosa quinta con amplio parque arbolado. Casa de 4 dormitorios, quincho, pileta y cancha de paddle.",
            "caracteristicas": ["parque", "pileta", "quincho", "paddle", "seguridad"],
            "estado": "disponible",
            "fecha_publicacion": datetime.now()
        },
        {
            "titulo": "Oficina en edificio corporativo",
            "tipo": "oficina",
            "operacion": "alquiler",
            "precio": 900,
            "moneda": "USD",
            "ubicacion": "Microcentro, Rosario",
            "direccion": "Corrientes 1567 - Piso 8",
            "habitaciones": 0,
            "banos": 1,
            "superficie_total": 70,
            "superficie_cubierta": 70,
            "descripcion": "Oficina en edificio de primer nivel con recepción y seguridad. Planta libre, baño privado, vista panorámica.",
            "caracteristicas": ["recepción", "seguridad", "aire acondicionado", "internet"],
            "estado": "disponible",
            "fecha_publicacion": datetime.now()
        },
        {
            "titulo": "Terreno para desarrollo",
            "tipo": "terreno",
            "operacion": "venta",
            "precio": 95000,
            "moneda": "USD",
            "ubicacion": "Zona Oeste, Rosario",
            "direccion": "Av. Circunvalación km 8",
            "habitaciones": 0,
            "banos": 0,
            "superficie_total": 800,
            "superficie_cubierta": 0,
            "descripcion": "Terreno de 800m² en zona de desarrollo. Todos los servicios. Ideal para proyecto inmobiliario o comercial.",
            "caracteristicas": ["esquina", "servicios", "zonificación comercial"],
            "estado": "disponible",
            "fecha_publicacion": datetime.now()
        }
    ]
    
    # Insertar propiedades
    resultado = db.propiedades.insert_many(propiedades)
    print(f"✅ {len(resultado.inserted_ids)} propiedades insertadas")
    
    # Crear índices
    db.propiedades.create_index([("tipo", 1)])
    db.propiedades.create_index([("operacion", 1)])
    db.propiedades.create_index([("precio", 1)])
    db.propiedades.create_index([("ubicacion", 1)])
    print("✅ Índices creados")
    
    # Estadísticas
    total = db.propiedades.count_documents({})
    ventas = db.propiedades.count_documents({"operacion": "venta"})
    alquileres = db.propiedades.count_documents({"operacion": "alquiler"})
    
    print(f"\n📊 Base de datos lista:")
    print(f"   Total: {total}")
    print(f"   Ventas: {ventas}")
    print(f"   Alquileres: {alquileres}")
    
    client.close()


if __name__ == "__main__":
    inicializar_db()
