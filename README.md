# Asistente de Ejercicios Orofaciales

Aplicación web interactiva para asistir en ejercicios orofaciales utilizando detección facial en tiempo real con MediaPipe Face Mesh de Google.

## 🎯 Características

- **Detección Facial en Tiempo Real**: Utiliza Google MediaPipe Face Mesh para tracking preciso de movimientos faciales
- **Ejercicios Personalizados**: Define y gestiona ejercicios con parámetros personalizados (duración, tipo, descripción)
- **Grabación de Sesiones**: Captura y almacena datos de rendimiento durante cada sesión de ejercicio
- **Análisis de Progreso**: Visualiza métricas históricas con gráficas y estadísticas detalladas
- **Diseño Moderno**: Interfaz limpia y profesional con esquema de colores azul y blanco calmados
- **Almacenamiento Local**: Todos los datos se guardan localmente en el navegador (localStorage)

## 🚀 Tecnologías Utilizadas

- **HTML5**: Estructura semántica
- **CSS3**: Diseño moderno con variables CSS, glassmorphism y animaciones
- **JavaScript (Vanilla)**: Lógica de aplicación modular
- **MediaPipe Face Mesh**: Detección facial en tiempo real
- **Canvas API**: Visualización de mesh facial y gráficas
- **LocalStorage**: Persistencia de datos

## 📋 Requisitos

- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Cámara web funcional
- Permisos de cámara habilitados

## 🎮 Uso

1. **Abrir la Aplicación**
   - Abre `index.html` en tu navegador
   - Otorga permisos de acceso a la cámara cuando se solicite

2. **Crear Ejercicios** (opcional)
   - Ve a la sección "Ejercicios"
   - Haz clic en "Nuevo Ejercicio"
   - Define nombre, duración, tipo y descripción
   - La aplicación incluye 3 ejercicios por defecto

3. **Practicar**
   - Ve a la sección "Practicar"
   - Haz clic en "Iniciar Cámara"
   - Selecciona un ejercicio del menú desplegable
   - Haz clic en "Iniciar Sesión"
   - Realiza el ejercicio mientras ves las métricas en tiempo real
   - Puedes pausar o detener la sesión en cualquier momento

4. **Revisar Progreso**
   - Ve a la sección "Revisar"
   - Explora el historial de sesiones
   - Haz clic en una sesión para ver detalles y gráficas
   - Filtra por ejercicio específico si lo deseas

## 📊 Métricas Capturadas

- **Apertura Bucal**: Distancia vertical entre labios superior e inferior (0-100%)
- **Movimiento Lateral**: Desplazamiento horizontal de la mandíbula (0-100%)
- **Progreso de Sesión**: Porcentaje de tiempo completado
- **Duración Real**: Tiempo total de la sesión
- **Estadísticas Agregadas**: Promedios y máximos de cada sesión

## 🏗️ Estructura del Proyecto

```
macraf/
├── index.html          # Estructura HTML principal
├── styles.css          # Sistema de diseño y estilos
├── app.js             # Módulo principal de la aplicación
├── facemesh.js        # Módulo de detección facial
├── exercises.js       # Gestión de ejercicios
├── recorder.js        # Sistema de grabación de sesiones
├── review.js          # Visualización y análisis de sesiones
└── README.md          # Documentación
```

## 🎨 Diseño

La aplicación utiliza un esquema de colores azul y blanco calmado, diseñado para proporcionar un ambiente tranquilo y profesional:

- **Color Principal**: Azul HSL(210, 75%, 55%)
- **Fondo**: Blanco con gradientes suaves
- **Tipografía**: Inter (Google Fonts)
- **Efectos**: Glassmorphism, sombras suaves, animaciones fluidas

## 🔒 Privacidad

- Todos los datos se almacenan localmente en tu navegador
- No se envía información a servidores externos
- El acceso a la cámara solo se usa para detección facial en tiempo real
- Puedes eliminar todos los datos limpiando el localStorage del navegador

## 📝 Tipos de Ejercicios

1. **Apertura Bucal**: Monitorea principalmente la apertura de la boca
2. **Movimiento Lateral**: Rastrea movimientos horizontales de la mandíbula
3. **Combinado**: Registra ambas métricas simultáneamente

## 🛠️ Personalización

Puedes personalizar fácilmente la aplicación modificando:

- **Variables CSS** en `styles.css` para cambiar colores y estilos
- **Ejercicios por defecto** en `exercises.js`
- **Cálculo de métricas** en `facemesh.js`
- **Visualización de gráficas** en `review.js`

## ⚠️ Solución de Problemas

**La cámara no se inicia:**
- Verifica que hayas otorgado permisos de cámara
- Asegúrate de que ninguna otra aplicación esté usando la cámara
- Intenta en otro navegador

**No se detecta el rostro:**
- Asegúrate de tener buena iluminación
- Posiciónate frente a la cámara
- Verifica que tu rostro esté completamente visible

**Los datos no se guardan:**
- Verifica que el localStorage no esté deshabilitado
- Comprueba que no estés en modo incógnito
- Revisa la consola del navegador para errores

## 🌐 Compatibilidad

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 📄 Licencia

Este proyecto es de código abierto y está disponible para uso personal y educativo.

## 🤝 Contribuciones

Las sugerencias y mejoras son bienvenidas. Siéntete libre de explorar y adaptar el código a tus necesidades.

---

**Desarrollado con ❤️ para profesionales de la salud orofacial y sus pacientes**
