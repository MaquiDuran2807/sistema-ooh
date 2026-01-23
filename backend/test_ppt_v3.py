#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de prueba para generate_ppt_from_base_v3.py
Genera un PPT con algunos registros para validar la nueva estrategia
"""

import json
import sys
import os
import subprocess
from pathlib import Path

# Ruta del directorio actual
script_dir = Path(__file__).parent

# Datos de prueba con 3 registros
test_data = {
    "base_file": str(script_dir / "REPORTE FACTURACIÓN BASE.pptx"),
    "output_file": str(script_dir / "output_test_v3.pptx"),
    "month": "2026-01",
    "records": [
        {
            "id": "1",
            "marca": "COCA-COLA",
            "categoria": "BEVERAGE",
            "proveedor": "PROVIDER A",
            "campana": "SUMMER",
            "direccion": "Calle 1 #123",
            "ciudad": "BOGOTÁ",
            "region": "CUNDINAMARCA",
            "latitud": "4.7110",
            "longitud": "-74.0721",
            "imagenes": [
                "/api/images/COCA-COLA/SUMMER/2026-01/img1.jpg",
                "/api/images/COCA-COLA/SUMMER/2026-01/img2.jpg",
                "/api/images/COCA-COLA/SUMMER/2026-01/img3.jpg"
            ],
            "fechaInicio": "2026-01-01",
            "fechaFin": "2026-01-31"
        },
        {
            "id": "2",
            "marca": "PEPSI",
            "categoria": "BEVERAGE",
            "proveedor": "PROVIDER B",
            "campana": "FRESH",
            "direccion": "Carrera 5 #456",
            "ciudad": "MEDELLÍN",
            "region": "ANTIOQUIA",
            "latitud": "6.2442",
            "longitud": "-75.5812",
            "imagenes": [
                "/api/images/PEPSI/FRESH/2026-01/img1.jpg",
                "/api/images/PEPSI/FRESH/2026-01/img2.jpg",
                "/api/images/PEPSI/FRESH/2026-01/img3.jpg"
            ],
            "fechaInicio": "2026-01-05",
            "fechaFin": "2026-01-25"
        },
        {
            "id": "3",
            "marca": "SPRITE",
            "categoria": "BEVERAGE",
            "proveedor": "PROVIDER C",
            "campana": "WINTER",
            "direccion": "Avenida 7 #789",
            "ciudad": "CALI",
            "region": "VALLE",
            "latitud": "3.4372",
            "longitud": "-76.5069",
            "imagenes": [
                "/api/images/SPRITE/WINTER/2026-01/img1.jpg",
                "/api/images/SPRITE/WINTER/2026-01/img2.jpg",
                "/api/images/SPRITE/WINTER/2026-01/img3.jpg"
            ],
            "fechaInicio": "2026-01-10",
            "fechaFin": "2026-01-28"
        }
    ]
}

# Guardar datos en archivo temporal
test_data_file = script_dir / "test_data.json"

print("[TEST] Escribiendo datos de prueba...")
with open(test_data_file, 'w', encoding='utf-8') as f:
    json.dump(test_data, f, indent=2, ensure_ascii=False)

print(f"[TEST] Datos guardados en: {test_data_file}")
print(f"[TEST] Base PPT: {test_data['base_file']}")
print(f"[TEST] Output: {test_data['output_file']}")
print(f"[TEST] Registros: {len(test_data['records'])}")

# Ejecutar script v3
print("\n" + "="*60)
print("[TEST] Ejecutando generate_ppt_from_base_v3.py...")
print("="*60 + "\n")

script_path = script_dir / "generate_ppt_from_base_v3.py"
result = subprocess.run([sys.executable, str(script_path), str(test_data_file)], 
                       capture_output=False)

# Limpiar
print(f"\n[TEST] Limpiando archivo temporal...")
try:
    os.remove(test_data_file)
    print("[TEST] Archivo temporal eliminado")
except:
    pass

if result.returncode == 0:
    output_file = Path(test_data['output_file'])
    if output_file.exists():
        size_mb = output_file.stat().st_size / (1024 * 1024)
        print(f"\n✅ [TEST] PPT generado exitosamente!")
        print(f"   Archivo: {output_file}")
        print(f"   Tamaño: {size_mb:.2f} MB")
    else:
        print(f"\n❌ [TEST] Archivo de salida no encontrado: {output_file}")
        sys.exit(1)
else:
    print(f"\n❌ [TEST] Script falló con código: {result.returncode}")
    sys.exit(1)
