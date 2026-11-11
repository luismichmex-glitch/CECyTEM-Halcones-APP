# ⚽ Club Halcones CECYTEM 33 Capula — Plataforma Deportiva Integral (`CECyTEM-Halcones-APP`)

Aplicación móvil e híbrida de alto rendimiento desarrollada para la gestión táctica, financiera y deportiva del **Club Deportivo Halcones del CECYTEM 33 Capula** (Michoacán, México), bajo la dirección técnica del D.T. Luis Manuel Martínez.

Construida con **React + Vite + Tailwind CSS** y empaquetada como aplicación nativa Android mediante **Capacitor 6**.

---

## 🏛️ Arquitectura Modular del Proyecto

La estructura de código en `src/` está diseñada bajo un patrón modular escalable para soportar la expansión de la plataforma del club:

```text
Halcones_app/
├── android/                   # Proyecto nativo Android (Capacitor + Gradle)
├── dist/                      # Salida compilada para producción web
├── public/                    # Assets estáticos (logos, iconos)
└── src/
    ├── components/            # Componentes reutilizables de UI (TopAppBar, BottomNavBar)
    ├── modules/               # Módulos del Club Deportivo Halcones
    │   ├── finanzas/          # 💰 Módulo Finanzas (Cédulas, arbitrajes, multas, gastos)
    │   ├── plantilla/         # 👥 Módulo Plantilla (Roster Femenil/Varonil, dorsales, posiciones)
    │   ├── estadisticas/      # 📊 Módulo Estadísticas (Goleo, asistencias, tarjetas, minutos)
    │   └── torneos/           # 🏆 Módulo Torneos (Calendario UNLA, Liga Municipal, tabla general)
    ├── screens/               # Vistas principales de pantalla (Dashboard, Arbitrajes, Multas, Gastos)
    ├── services/              # Conectores externos y sincronización (Google Apps Script API)
    ├── App.jsx                # Componente raíz y orquestador de estado global
    ├── main.jsx               # Punto de entrada de la aplicación
    └── index.css              # Estilos tácticos, diseño glassmorphism y variables de tema
```

### Módulos Principales

1. **`src/modules/finanzas/` (Activo y Sincronizado en Producción)**
   - **Dashboard**: Saldo neto disponible en tiempo real, KPIs de recaudación, historial de movimientos con filtros.
   - **Arbitrajes en Cancha**: Registro de cédula oficial por jornada, cálculo de puntualidad (\$10) y retardos (\$30), pago de árbitro automatizado según liga (UNLA \$175, Liga Municipal \$125) y vinculación con multas.
   - **Sanciones y Multas**: Registro disciplinario de multas cobradas (\$100 base) por jugador y rama con fecha ISO para vinculación automática mediante `SUMIFS`.
   - **Gastos Operativos**: Control de compras y egresos (material deportivo, hidratación, botiquín, uniformes, transporte).
   - **CRUD Completo**: Creación, edición en modo guiado y eliminación con confirmación y sincronización inmediata con Google Sheets.

2. **`src/modules/plantilla/` (Base preparada)**
   - Roster oficial de 42 jugadoras y jugadores (Ramas Femenil y Varonil).
   - Control de dorsales, posiciones tácticas y categorías.

3. **`src/modules/estadisticas/` (Base preparada)**
   - Registro de rendimiento individual: goleo, asistencias, minutos jugados y tarjetas preventivas/expulsiones.

4. **`src/modules/torneos/` (Base preparada)**
   - Gestión de ligas activas (Liga Universitaria UNLA, Liga Municipal) y calendario de jornadas.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend Core**: React 18, Vite 5.
- **Estilos & UI**: Tailwind CSS, Paleta Oficial Tactical Cyan & Coral Glassmorphism, Material Symbols Outlined.
- **Runtime Móvil**: Capacitor 6 (`@capacitor/core`, `@capacitor/android`).
- **Backend Serverless**: Google Apps Script (REST API JSON con autenticación vía clave de acceso).
- **Herramientas de Compilación**: Node.js, JDK 17, Android SDK Build Tools, Gradle Wrapper 8.2.

---

## 🚀 Comandos de Desarrollo y Compilación

### 1. Instalación de dependencias
```powershell
npm install
```

### 2. Entorno de desarrollo local
```powershell
npm run dev
```

### 3. Compilación web para producción
```powershell
npm run build
```

### 4. Sincronización con el contenedor nativo Android
```powershell
npx cap sync android
```

### 5. Compilación del APK Debug Android
```powershell
.\android\gradlew.bat -p android assembleDebug
```
El archivo APK generado se localiza en:
`android/app/build/outputs/apk/debug/app-debug.apk` y se copia a la raíz como `Halcones-Finanzas-debug.apk`.

---

## 🔗 Integración con Google Sheets

- **Endpoint**: Google Apps Script Web App desplegada con permisos de ejecución.
- **Autenticación**: `key=HALCONES_33_KEY_2026`.
- **Acciones soportadas en payload POST**:
  - `tipo: "PARTIDO"`: Envía `{ accion: "CREAR"|"EDITAR", rowIndex, fecha, liga, rama, puntuales, retardos }`. La hoja aplica fórmulas SUMIFS para calcular multas y saldo neto.
  - `tipo: "MULTA"`: Envía `{ accion: "CREAR"|"EDITAR", rowIndex, fecha, rama, dorsal, jugador, motivo, monto, estado: "Cobrada" }`.
  - `tipo: "GASTO"`: Envía `{ accion: "CREAR"|"EDITAR", rowIndex, fecha, concepto, categoria, monto, observaciones }`.
  - `accion: "BORRAR"`: Envía `{ tipo, accion: "BORRAR", rowIndex }` para eliminar la fila seleccionada.

---

## 📄 Licencia y Créditos

Desarrollado para el **Club Deportivo Halcones del CECYTEM 33 Capula**  
Temporada Oficial 2026-2027  
D.T. Luis Manuel Martínez
