#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test script para verificar conversión de rutas de imagen"""

import os
import sys
import json

# Simular la función de conversión
def convert_api_to_local_path(api_path):
    """Convierte /api/images/... a ruta local del filesystem"""
    if not api_path:
        return None
    
    # Script está en backend/, imágenes están en backend/local-images/
    script_dir = os.path.dirname(os.path.abspath(__file__))  # backend/
    
    # Remover /api/ del inicio
    clean_path = api_path.replace('/api/', '', 1)
    
    # Construir ruta absoluta
    full_path = os.path.join(script_dir, clean_path)
    normalized = os.path.normpath(full_path)
    
    return normalized

# Pruebas
test_paths = [
    "/api/images/BBC/JUAN_A/2025-12/323a2f38-3f22-4e6d-89d0-f40aa178be7a_BBC_JUAN_A_PLAZA_DE_BOLIVAR_45_1.jpg",
    "/api/images/CLUB_COLOMBIA/TRIGO/2026-01/900ba645-2440-4010-b793-63e1c4439167_CLUB_COLOMBIA_TRIGO_PLLAZA_DE_BOLIVAR_1.jpg",
]

print("[TEST] Conversión de rutas de imagen\n")

for api_path in test_paths:
    full_path = convert_api_to_local_path(api_path)
    exists = os.path.exists(full_path) if full_path else False
    
    print(f"API:      {api_path}")
    print(f"Convertida: {full_path}")
    print(f"Existe:    {'SÍ' if exists else 'NO'}")
    
    if not exists and full_path:
        # Ver si está en local-images en lugar de images
        alt_path = full_path.replace('images\\', 'local-images\\')
        alt_exists = os.path.exists(alt_path)
        print(f"Alt path:  {alt_path}")
        print(f"Existe alt: {'SÍ' if alt_exists else 'NO'}")
    print()
