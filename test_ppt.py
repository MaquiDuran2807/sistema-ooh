#!/usr/bin/env python3
import requests
import sys

try:
    print("🔄 Descargando reporte PPT...")
    response = requests.get('http://localhost:8080/api/ooh/report/ppt?month=2026-01', timeout=10)
    
    if response.status_code == 200:
        with open('reporte_test.pptx', 'wb') as f:
            f.write(response.content)
        print(f"✅ Archivo descargado exitosamente: {len(response.content)} bytes")
        print(f"✅ Archivo guardado como: reporte_test.pptx")
        sys.exit(0)
    else:
        print(f"❌ Error: {response.status_code}")
        print(f"Respuesta: {response.text}")
        sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
