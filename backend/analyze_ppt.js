// Script para analizar un PPT existente y obtener dimensiones
const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

async function analyzePPT() {
  try {
    console.log('📊 Analizando REPORTE FACTURACIÓN BASE.pptx...\n');
    
    // Leer el archivo
    const filePath = path.join(__dirname, 'REPORTE FACTURACIÓN BASE.pptx');
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ Archivo no encontrado:', filePath);
      return;
    }
    
    console.log('✅ Archivo encontrado');
    console.log('📏 Tamaño:', fs.statSync(filePath).size, 'bytes\n');
    
    // Crear un PPT de prueba con las dimensiones estándar
    const pptx = new PptxGenJS();
    
    // Mostrar dimensiones por defecto
    console.log('📐 DIMENSIONES ESTÁNDAR DE PPTXGENJS:');
    console.log('   Ancho: 10 pulgadas (25.4 cm)');
    console.log('   Alto: 7.5 pulgadas (19.05 cm)');
    console.log('   Proporción: 4:3\n');
    
    // Dimensiones recomendadas para elementos
    console.log('📏 DIMENSIONES RECOMENDADAS PARA ELEMENTOS:');
    console.log('\n🖼️ IMÁGENES (para slide 10"x7.5"):');
    console.log('   Imagen grande (izquierda):');
    console.log('     - Ancho: 4.5" (11.43 cm)');
    console.log('     - Alto: 4.5" (11.43 cm)');
    console.log('     - X: 0.5" (desde borde izquierdo)');
    console.log('     - Y: 1.5" (desde arriba)');
    console.log('\n   Imágenes pequeñas (derecha, stack):');
    console.log('     - Ancho: 4" (10.16 cm)');
    console.log('     - Alto: 2" (5.08 cm)');
    console.log('     - X: 5.5" (desde borde izquierdo)');
    console.log('     - Y1: 1.5" (imagen superior)');
    console.log('     - Y2: 3.75" (imagen inferior)');
    console.log('\n📝 TEXTO:');
    console.log('   Título (Dirección):');
    console.log('     - X: 0.5", Y: 0.5"');
    console.log('     - Tamaño: 24pt, Bold');
    console.log('     - Color: #CC0000 (Rojo ABI)');
    console.log('\n   Subtítulo (Ciudad):');
    console.log('     - X: 0.5", Y: 1"');
    console.log('     - Tamaño: 14pt');
    console.log('     - Color: #003366 (Azul)');
    console.log('\n   Vigencia:');
    console.log('     - X: 5.5", Y: 6"');
    console.log('     - Tamaño: 12pt');
    console.log('\n   REF (Proveedor):');
    console.log('     - X: 0.5", Y: 6.5"');
    console.log('     - Tamaño: 12pt');
    
    console.log('\n🎨 COLORES ABI:');
    console.log('   Rojo: #CC0000');
    console.log('   Oro: #D4A574');
    console.log('   Azul: #003366');
    
    console.log('\n💡 NOTAS IMPORTANTES:');
    console.log('   - PptxGenJS usa pulgadas (inches) como unidad');
    console.log('   - 1 pulgada = 2.54 cm');
    console.log('   - Coordenadas (X,Y) empiezan en esquina superior izquierda (0,0)');
    console.log('   - Ancho del slide: 10"');
    console.log('   - Alto del slide: 7.5"');
    console.log('   - Margen recomendado: 0.5" en todos los lados\n');
    
    // Información sobre cómo copiar el diseño del archivo base
    console.log('🔧 PARA USAR DISEÑO DEL ARCHIVO BASE:');
    console.log('   PptxGenJS no puede copiar diseños de archivos existentes.');
    console.log('   Opciones:');
    console.log('   1. Recrear el diseño manualmente con las dimensiones correctas');
    console.log('   2. Usar una plantilla .potx como base (si está disponible)');
    console.log('   3. Definir un master slide personalizado en PptxGenJS\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

analyzePPT();
