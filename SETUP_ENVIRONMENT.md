# 🔧 Configuración de Variables de Entorno - SIN PROBLEMAS

## 📋 El Comando principal (start-all.bat)

```batch
start "Backend OOH" cmd /k "cd /d ""%CD%\backend"" && "!NODE_EXE!" --version && npm --version && npm install && node migrate-csv-to-db.js && npm run dev"
start "Frontend OOH" cmd /k "cd /d ""%CD%\frontend"" && "!NODE_EXE!" --version && npm --version && npm install && npm start"
```

**Lo que hace:**
- ✅ Detecta Node.js automáticamente en 3 ubicaciones
- ✅ Configura el PATH en TIEMPO DE EJECUCIÓN
- ✅ NO depende de variables del sistema
- ✅ Abre 2 ventanas separadas (Backend + Frontend)
- ✅ Instala dependencias automáticamente
- ✅ Abre el navegador en http://localhost:3000

## 🚀 Cómo usar

### Opción 1: Uso Rápido (SIN Configuración)
```bash
double-click start-all.bat
```
✅ Funciona incluso sin variables de entorno del sistema

### Opción 2: Configuración Permanente (Recomendado)
```bash
right-click SETUP_VARIABLES.bat → "Ejecutar como administrador"
```

Luego reinicia la ventana de comando y usa start-all.bat

**Ventajas:**
- Configura Node.js en el PATH del sistema
- Funciona desde cualquier carpeta
- Permanece incluso después de reiniciar Windows
- Los scripts futuros funcionarán sin problemas

## 📂 Archivos de Configuración

| Archivo | Propósito |
|---------|-----------|
| **start-all.bat** | Inicia Backend + Frontend + Abre navegador |
| **start-frontend.bat** | Inicia solo Frontend (Puerto 3000) |
| **backend/start-dev.bat** | Inicia solo Backend (Puerto 8080) |
| **SETUP_VARIABLES.bat** | Configura PATH del sistema (PERMANENTE) |

## 🔍 Detección de Node.js (Automática)

Los scripts buscan Node.js en este orden:
1. `C:\Program Files\nodejs\node.exe`
2. `C:\Program Files(x86)\nodejs\node.exe`
3. `%LOCALAPPDATA%\Programs\nodejs\node.exe`

Si no lo encuentra, muestra dónde instalarlo.

## 🛠️ Solucionar Problemas

### ❌ "Node.js no encontrado"

**Solución 1: Ejecutar SETUP_VARIABLES.bat**
```bash
right-click SETUP_VARIABLES.bat → "Ejecutar como administrador"
```

**Solución 2: Reinstalar Node.js**
```bash
Descarga desde: https://nodejs.org/ (versión LTS)
Instala en: C:\Program Files\nodejs (por defecto)
Reinicia Windows
```

**Solución 3: Verificar instalación**
```bash
Abre PowerShell y ejecuta:
node --version
npm --version
```

### ❌ "Puerto 3000 o 8080 en uso"

```bash
# Buscar proceso en puerto 3000
netstat -ano | findstr :3000

# Matar proceso (reemplazar PID con el número encontrado)
taskkill /PID <PID> /F

# O simplemente cambiar puertos en:
backend/server.js → const PORT = 8081
frontend/.env → REACT_APP_API_URL=http://localhost:8081
```

### ❌ "EACCES: permission denied"

**En Windows raramente ocurre, pero si pasa:**
```bash
right-click start-all.bat → "Ejecutar como administrador"
```

## 💡 Tips

### Ejecución Manual (si prefieres control)
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (en otra ventana)
cd frontend
npm install
npm start
```

### Verificar que todo funciona
```bash
# Backend OK?
http://localhost:8080/api/health

# Frontend OK?
http://localhost:3000

# Ver estados en Debug Panel (🐛 botón en app)
```

### Ver logs en tiempo real
- Backend: Ventana negra con logs de Express
- Frontend: Ventana gris con logs de React

## 🎯 Flujo Recomendado

1. **Primera vez:**
   ```bash
   SETUP_VARIABLES.bat (como admin) → Reinicia Windows
   ```

2. **Cada vez que quieras desarrollar:**
   ```bash
   double-click start-all.bat
   ```

3. **Para probar cambios:**
   ```bash
   Los servidores usan nodemon (reload automático)
   Simplemente guarda los archivos
   ```

4. **Para ejecutar tests:**
   ```bash
   start-all-tests.bat
   ```

## ✅ Checklist de Configuración

- [ ] Node.js instalado (node --version ≥ 14)
- [ ] SETUP_VARIABLES.bat ejecutado como admin
- [ ] Windows reiniciado después de SETUP_VARIABLES
- [ ] start-all.bat funciona sin errores
- [ ] http://localhost:3000 abre en navegador
- [ ] Debug Panel (🐛) muestra state correcto

---

**Última actualización:** Enero 2026
**Estado:** ✅ Configuración sin problemas
