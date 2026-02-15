/**
 * @module FaceMeshDetector
 * @description Módulo de Detección Facial con MediaPipe Face Mesh.
 * Gestiona la webcam y el tracking de landmarks faciales en tiempo real,
 * dibuja el mesh facial sobre un canvas y calcula métricas de movimiento facial.
 */

/**
 * @typedef {Object} RGBColor
 * @property {number} r - Componente rojo (0-255)
 * @property {number} g - Componente verde (0-255)
 * @property {number} b - Componente azul (0-255)
 */

/**
 * @typedef {Object} MeshConfig
 * @property {RGBColor} tesselationColor - Color de la malla completa del rostro
 * @property {RGBColor} eyeColor - Color del contorno de los ojos
 * @property {RGBColor} lipsColor - Color del contorno de los labios
 * @property {RGBColor} pointsColor - Color de los puntos clave
 * @property {number} tesselationOpacity - Opacidad de la malla (0-1)
 * @property {number} eyeOpacity - Opacidad del contorno de ojos (0-1)
 * @property {number} lipsOpacity - Opacidad del contorno de labios (0-1)
 * @property {number} pointsOpacity - Opacidad de los puntos clave (0-1)
 * @property {number} tesselationWidth - Grosor de línea de la malla
 * @property {number} eyeWidth - Grosor de línea del contorno de ojos
 * @property {number} lipsWidth - Grosor de línea del contorno de labios
 * @property {number} pointSize - Tamaño de los puntos clave en píxeles
 */

/**
 * @typedef {Object} Position2D
 * @property {number} x - Coordenada X normalizada (0-1)
 * @property {number} y - Coordenada Y normalizada (0-1)
 */

/**
 * @typedef {Object} FacialMetrics
 * @property {number} mouthOpening - Apertura bucal (0-100%)
 * @property {number} lateralMovement - Movimiento lateral de mandíbula (0-100%)
 * @property {Position2D} jawPosition - Posición de la mandíbula normalizada
 * @property {number} smile - Intensidad de sonrisa (0-100%)
 * @property {number} leftEyeOpen - Apertura del ojo izquierdo (0-100%)
 * @property {number} rightEyeOpen - Apertura del ojo derecho (0-100%)
 * @property {number} eyebrowsRaised - Elevación de cejas (0-100%)
 * @property {number} tongueVisible - Estimación de visibilidad de lengua (0-100%)
 * @property {Position2D} tonguePosition - Posición estimada de la lengua
 */

/**
 * @typedef {Object} FaceLandmark
 * @property {number} x - Coordenada X normalizada (0-1)
 * @property {number} y - Coordenada Y normalizada (0-1)
 * @property {number} z - Coordenada Z (profundidad relativa)
 */

/**
 * @callback OnResultsCallback
 * @param {FaceLandmark[]} landmarks - Array de 478 landmarks faciales
 * @param {FacialMetrics} metrics - Métricas calculadas del frame actual
 */

/**
 * Detector de malla facial en tiempo real usando MediaPipe Face Mesh.
 * Captura video de la webcam, detecta landmarks faciales y calcula
 * métricas de movimiento orofacial.
 *
 * @class FaceMeshDetector
 * @example
 * const detector = new FaceMeshDetector();
 * await detector.initialize();
 * detector.setOnResultsCallback((landmarks, metrics) => {
 *   console.log('Apertura bucal:', metrics.mouthOpening);
 * });
 * await detector.start();
 */
class FaceMeshDetector {
    /**
     * Crea una nueva instancia del detector de malla facial.
     * Inicializa la configuración visual del mesh con valores por defecto.
     */
    constructor() {
        /** @type {?Object} Instancia de MediaPipe FaceMesh */
        this.faceMesh = null;
        /** @type {?Object} Instancia de la cámara MediaPipe */
        this.camera = null;
        /** @type {?HTMLVideoElement} Elemento de video para la webcam */
        this.videoElement = null;
        /** @type {?HTMLCanvasElement} Canvas para dibujar el mesh */
        this.canvasElement = null;
        /** @type {?CanvasRenderingContext2D} Contexto 2D del canvas */
        this.canvasCtx = null;
        /** @type {boolean} Indica si la detección está activa */
        this.isRunning = false;
        /** @type {?OnResultsCallback} Callback para procesar resultados */
        this.onResultsCallback = null;
        /** @type {?FaceLandmark[]} Landmarks del último frame procesado */
        this.currentLandmarks = null;
        /** @type {number} Nivel de zoom actual (1.0 = sin zoom) */
        this.zoom = 1.0;

        /**
         * Configuración de visualización del mesh facial.
         * Controla colores, opacidades y grosores de los diferentes
         * elementos visuales de la malla.
         * @type {MeshConfig}
         */
        this.meshConfig = {
            // Color del mesh (formato RGB)
            tesselationColor: { r: 0, g: 255, b: 100 },
            eyeColor: { r: 0, g: 255, b: 100 },
            lipsColor: { r: 0, g: 255, b: 255 },
            pointsColor: { r: 0, g: 255, b: 100 },

            // Opacidad (0-1)
            tesselationOpacity: 0.15,
            eyeOpacity: 0.7,
            lipsOpacity: 0.9,
            pointsOpacity: 0.9,

            // Grosor de líneas
            tesselationWidth: 0.5,
            eyeWidth: 1.5,
            lipsWidth: 2.5,

            // Tamaño de puntos
            pointSize: 2
        };
    }

    /**
     * Inicializa MediaPipe Face Mesh y configura el canvas y video.
     * Debe llamarse antes de {@link FaceMeshDetector#start}.
     *
     * @async
     * @returns {void}
     * @throws {Error} Si no se encuentran los elementos DOM requeridos
     */
    async initialize() {
        this.videoElement = document.getElementById('webcam');
        this.canvasElement = document.getElementById('output-canvas');
        this.canvasCtx = this.canvasElement.getContext('2d');

        // Configurar Face Mesh
        this.faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`;
            }
        });

        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.faceMesh.onResults((results) => this.onResults(results));

        console.log('Face Mesh inicializado correctamente');
    }

    /**
     * Inicia la webcam y comienza la detección facial en tiempo real.
     * Configura la resolución de captura a 1920x1080 y aplica espejo CSS.
     *
     * @async
     * @returns {boolean} `true` si la cámara se inició correctamente
     * @throws {Error} Si no se puede acceder a la cámara (permisos denegados, etc.)
     */
    async start() {
        if (this.isRunning) {
            console.warn('Face Mesh ya está en ejecución');
            return;
        }

        try {
            // Inicializar cámara con alta resolución para mejor nitidez
            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    if (this.isRunning) {
                        await this.faceMesh.send({ image: this.videoElement });
                    }
                },
                width: 1920,
                height: 1080
            });

            await this.camera.start();
            this.isRunning = true;


            // Ajustar tamaño del canvas al contenedor
            const rect = this.videoElement.getBoundingClientRect();
            this.canvasElement.width = rect.width;
            this.canvasElement.height = rect.height;

            // Aplicar espejo al canvas para que coincida con el video
            this.canvasElement.style.transform = 'scaleX(-1)';
            this.canvasElement.style.transformOrigin = 'center center';


            return true;
        } catch (error) {
            console.error('Error al iniciar la cámara:', error);
            throw new Error('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
        }
    }

    /**
     * Detiene la webcam, la detección facial y limpia el canvas.
     * Libera los recursos de la cámara.
     *
     * @returns {void}
     */
    stop() {
        if (this.camera) {
            this.camera.stop();
            this.camera = null;
        }
        this.isRunning = false;
        this.currentLandmarks = null;

        // Limpiar canvas
        if (this.canvasCtx) {
            this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        }

    }

    /**
     * Ajusta el nivel de zoom de la cámara.
     * Intenta usar zoom nativo del hardware primero, si el navegador/cámara
     * no lo soporta, aplica zoom digital mediante transformaciones CSS.
     *
     * @async
     * @param {number|string} value - Nivel de zoom (1.0 = sin zoom, 3.0 = máximo)
     * @returns {void}
     */
    async setZoom(value) {
        this.zoom = parseFloat(value);

        // Intentar zoom nativo si es soportado por el hardware/navegador
        if (this.videoElement && this.videoElement.srcObject) {
            const stream = this.videoElement.srcObject;
            const tracks = stream.getVideoTracks();

            if (tracks.length > 0) {
                const track = tracks[0];
                const capabilities = track.getCapabilities ? track.getCapabilities() : {};

                if (capabilities.zoom) {
                    try {
                        const min = capabilities.zoom.min || 1;
                        const max = capabilities.zoom.max || 3;
                        // Ajustar valor al rango soportado
                        const nativeZoom = Math.min(Math.max(this.zoom, min), max);

                        await track.applyConstraints({
                            advanced: [{ zoom: nativeZoom }]
                        });

                        // Si el zoom nativo funciona, reseteamos el transform CSS
                        this.videoElement.style.transform = 'scaleX(-1)';
                        this.canvasElement.style.transform = 'none';
                        return;
                    } catch (e) {
                        console.warn('Error aplicando zoom nativo:', e);
                    }
                }
            }
        }

        // Fallback: Zoom digital (CSS)
        if (this.videoElement && this.canvasElement) {
            // Aplicamos zoom manteniendo el espejado en ambos
            // Video: espejado + zoom
            this.videoElement.style.transform = `scaleX(-1) scale(${this.zoom})`;
            // Canvas: espejado + zoom (debe coincidir con el video)
            this.canvasElement.style.transform = `scaleX(-1) scale(${this.zoom})`;

            // Ajustar el transform-origin para que el zoom sea central
            this.videoElement.style.transformOrigin = 'center center';
            this.canvasElement.style.transformOrigin = 'center center';
        }
    }

    /**
     * Callback interno que procesa los resultados de cada frame de Face Mesh.
     * Dibuja el mesh, calcula métricas y notifica al callback externo.
     *
     * @param {Object} results - Resultados de MediaPipe Face Mesh
     * @param {FaceLandmark[][]} results.multiFaceLandmarks - Landmarks detectados por rostro
     * @returns {void}
     * @private
     */
    onResults(results) {
        // Limpiar canvas
        this.canvasCtx.save();
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            this.currentLandmarks = landmarks;

            // Dibujar el mesh facial
            this.drawFaceMesh(landmarks);

            // Calcular métricas
            const metrics = this.calculateMetrics(landmarks);

            // Llamar callback si existe
            if (this.onResultsCallback) {
                this.onResultsCallback(landmarks, metrics);
            }
        } else {
            this.currentLandmarks = null;
        }

        this.canvasCtx.restore();
    }

    /**
     * Dibuja el mesh facial completo en el canvas overlay.
     * Renderiza la malla de teselación, contornos de ojos y labios,
     * puntos clave y puntos de detección de lengua.
     *
     * @param {FaceLandmark[]} landmarks - Array de 478 landmarks faciales
     * @returns {void}
     * @private
     */
    drawFaceMesh(landmarks) {

        // Guardar estado del contexto
        this.canvasCtx.save();

        // NO aplicamos transformación al canvas porque MediaPipe ya da coordenadas correctas
        // El video está espejado solo visualmente con CSS

        const { meshConfig } = this;

        // Dibujar malla completa con color configurable
        drawConnectors(this.canvasCtx, landmarks, FACEMESH_TESSELATION, {
            color: `rgba(${meshConfig.tesselationColor.r}, ${meshConfig.tesselationColor.g}, ${meshConfig.tesselationColor.b}, ${meshConfig.tesselationOpacity})`,
            lineWidth: meshConfig.tesselationWidth
        });

        // Dibujar contornos importantes - ojos
        drawConnectors(this.canvasCtx, landmarks, FACEMESH_RIGHT_EYE, {
            color: `rgba(${meshConfig.eyeColor.r}, ${meshConfig.eyeColor.g}, ${meshConfig.eyeColor.b}, ${meshConfig.eyeOpacity})`,
            lineWidth: meshConfig.eyeWidth
        });
        drawConnectors(this.canvasCtx, landmarks, FACEMESH_LEFT_EYE, {
            color: `rgba(${meshConfig.eyeColor.r}, ${meshConfig.eyeColor.g}, ${meshConfig.eyeColor.b}, ${meshConfig.eyeOpacity})`,
            lineWidth: meshConfig.eyeWidth
        });

        // Dibujar labios
        drawConnectors(this.canvasCtx, landmarks, FACEMESH_LIPS, {
            color: `rgba(${meshConfig.lipsColor.r}, ${meshConfig.lipsColor.g}, ${meshConfig.lipsColor.b}, ${meshConfig.lipsOpacity})`,
            lineWidth: meshConfig.lipsWidth
        });

        // Dibujar puntos clave
        const keyLandmarks = [
            ...FACEMESH_LIPS,
            [33, 133], // Ojos
            [362, 263]
        ].flat();

        const uniqueLandmarks = [...new Set(keyLandmarks)];

        uniqueLandmarks.forEach(index => {
            const landmark = landmarks[index];
            if (landmark) {
                this.canvasCtx.beginPath();
                this.canvasCtx.arc(
                    landmark.x * this.canvasElement.width,
                    landmark.y * this.canvasElement.height,
                    meshConfig.pointSize,
                    0,
                    2 * Math.PI
                );
                this.canvasCtx.fillStyle = `rgba(${meshConfig.pointsColor.r}, ${meshConfig.pointsColor.g}, ${meshConfig.pointsColor.b}, ${meshConfig.pointsOpacity})`;
                this.canvasCtx.fill();
            }
        });

        // Dibujar puntos de detección de lengua (landmarks internos de la boca)
        const tongueLandmarks = [78, 308]; // Puntos internos superior e inferior
        tongueLandmarks.forEach(index => {
            const landmark = landmarks[index];
            if (landmark) {
                this.canvasCtx.beginPath();
                this.canvasCtx.arc(
                    landmark.x * this.canvasElement.width,
                    landmark.y * this.canvasElement.height,
                    meshConfig.pointSize * 1.5, // Ligeramente más grandes
                    0,
                    2 * Math.PI
                );
                // Color distintivo para puntos de lengua (naranja)
                this.canvasCtx.fillStyle = 'rgba(255, 150, 0, 0.8)';
                this.canvasCtx.fill();
                // Borde para mayor visibilidad
                this.canvasCtx.strokeStyle = 'rgba(255, 200, 0, 1)';
                this.canvasCtx.lineWidth = 1;
                this.canvasCtx.stroke();
            }
        });

        // Restaurar estado del contexto
        this.canvasCtx.restore();
    }

    /**
     * Calcula métricas de movimiento facial y expresiones a partir de landmarks.
     * Evalúa apertura bucal, movimiento lateral, sonrisa, apertura de ojos,
     * elevación de cejas y estimación de visibilidad de lengua.
     *
     * @param {FaceLandmark[]} landmarks - Array de 478 landmarks faciales
     * @returns {FacialMetrics} Objeto con todas las métricas calculadas (valores 0-100)
     */
    calculateMetrics(landmarks) {
        const metrics = {
            mouthOpening: 0,
            lateralMovement: 0,
            jawPosition: { x: 0, y: 0 },
            // Nuevas métricas de expresiones
            smile: 0,
            leftEyeOpen: 0,
            rightEyeOpen: 0,
            eyebrowsRaised: 0,
            // Detección de lengua
            tongueVisible: 0,
            tonguePosition: { x: 0, y: 0 }
        };

        if (!landmarks) return metrics;

        // Apertura bucal (distancia vertical entre labios superior e inferior)
        const upperLip = landmarks[13]; // Punto central del labio superior
        const lowerLip = landmarks[14]; // Punto central del labio inferior

        if (upperLip && lowerLip) {
            const verticalDistance = Math.abs(lowerLip.y - upperLip.y);
            // Normalizar a un rango de 0-100
            metrics.mouthOpening = Math.min(100, verticalDistance * 500);
        }

        // Movimiento lateral (posición horizontal de la mandíbula)
        const chin = landmarks[152]; // Punto de la barbilla
        const noseTip = landmarks[1]; // Punta de la nariz (referencia central)

        if (chin && noseTip) {
            const horizontalOffset = chin.x - noseTip.x;
            // Normalizar a un rango de 0-100
            metrics.lateralMovement = Math.min(100, Math.abs(horizontalOffset) * 500);
            metrics.jawPosition.x = chin.x;
            metrics.jawPosition.y = chin.y;
        }

        // SONRISA: Distancia horizontal entre comisuras de los labios
        const leftMouth = landmarks[61];  // Comisura izquierda
        const rightMouth = landmarks[291]; // Comisura derecha
        const mouthCenter = landmarks[13]; // Centro del labio superior

        if (leftMouth && rightMouth && mouthCenter) {
            // Calcular el ancho de la boca
            const mouthWidth = Math.abs(rightMouth.x - leftMouth.x);
            // Calcular cuánto suben las comisuras (sonrisa)
            const leftLift = mouthCenter.y - leftMouth.y;
            const rightLift = mouthCenter.y - rightMouth.y;
            const avgLift = (leftLift + rightLift) / 2;

            // Combinar ancho y elevación para detectar sonrisa
            metrics.smile = Math.min(100, (mouthWidth * 300 + avgLift * 500));
        }

        // OJO IZQUIERDO: Distancia vertical entre párpados
        const leftEyeTop = landmarks[159];    // Párpado superior izquierdo
        const leftEyeBottom = landmarks[145]; // Párpado inferior izquierdo

        if (leftEyeTop && leftEyeBottom) {
            const eyeHeight = Math.abs(leftEyeBottom.y - leftEyeTop.y);
            metrics.leftEyeOpen = Math.min(100, eyeHeight * 1000);
        }

        // OJO DERECHO: Distancia vertical entre párpados
        const rightEyeTop = landmarks[386];    // Párpado superior derecho
        const rightEyeBottom = landmarks[374]; // Párpado inferior derecho

        if (rightEyeTop && rightEyeBottom) {
            const eyeHeight = Math.abs(rightEyeBottom.y - rightEyeTop.y);
            metrics.rightEyeOpen = Math.min(100, eyeHeight * 1000);
        }

        // CEJAS LEVANTADAS: Posición vertical de las cejas
        const leftEyebrow = landmarks[70];  // Ceja izquierda
        const rightEyebrow = landmarks[300]; // Ceja derecha
        const noseBridge = landmarks[6];     // Puente de la nariz (referencia)

        if (leftEyebrow && rightEyebrow && noseBridge) {
            // Calcular distancia vertical entre cejas y puente nasal
            const leftDist = noseBridge.y - leftEyebrow.y;
            const rightDist = noseBridge.y - rightEyebrow.y;
            const avgDist = (leftDist + rightDist) / 2;

            metrics.eyebrowsRaised = Math.min(100, avgDist * 400);
        }

        // DETECCIÓN DE LENGUA (Estimación indirecta)
        // MediaPipe Face Mesh no tiene landmarks específicos para la lengua,
        // pero podemos usar landmarks internos de la boca para estimar su visibilidad

        // Landmarks internos de la boca que pueden indicar presencia de lengua
        const innerMouthTop = landmarks[78];    // Parte superior interna
        const innerMouthBottom = landmarks[308]; // Parte inferior interna
        const upperLipInner = landmarks[13];     // Labio superior interno
        const lowerLipInner = landmarks[14];     // Labio inferior interno

        if (innerMouthTop && innerMouthBottom && upperLipInner && lowerLipInner) {
            // Calcular apertura vertical interna de la boca
            const innerMouthHeight = Math.abs(innerMouthBottom.y - innerMouthTop.y);

            // Calcular profundidad de la boca (distancia entre labios internos)
            const mouthDepth = Math.abs(lowerLipInner.y - upperLipInner.y);

            // La lengua es más visible cuando:
            // 1. La boca está abierta (mouthDepth alto)
            // 2. Hay espacio vertical interno (innerMouthHeight alto)
            // 3. La relación entre profundidad y altura es significativa

            const depthFactor = mouthDepth * 1000;
            const heightFactor = innerMouthHeight * 800;

            // Combinar factores para estimar visibilidad de lengua
            // Valores más altos = mayor probabilidad de lengua visible
            metrics.tongueVisible = Math.min(100, (depthFactor + heightFactor) / 2);

            // Estimar posición aproximada de la lengua (centro de la boca)
            metrics.tonguePosition.x = (innerMouthTop.x + innerMouthBottom.x) / 2;
            metrics.tonguePosition.y = (innerMouthTop.y + innerMouthBottom.y) / 2;
        }

        return metrics;
    }

    /**
     * Registra un callback que será invocado en cada frame con resultados.
     *
     * @param {OnResultsCallback} callback - Función a ejecutar con landmarks y métricas
     * @returns {void}
     */
    setOnResultsCallback(callback) {
        this.onResultsCallback = callback;
    }

    /**
     * Obtiene los landmarks del último frame procesado.
     *
     * @returns {?FaceLandmark[]} Array de landmarks o `null` si no hay detección activa
     */
    getCurrentLandmarks() {
        return this.currentLandmarks;
    }

    /**
     * Verifica si la detección facial está activa.
     *
     * @returns {boolean} `true` si la cámara y detección están corriendo
     */
    getIsRunning() {
        return this.isRunning;
    }

    /**
     * Actualiza la configuración visual del mesh facial (merge parcial).
     *
     * @param {Partial<MeshConfig>} config - Propiedades a actualizar
     * @returns {void}
     */
    updateMeshConfig(config) {
        this.meshConfig = { ...this.meshConfig, ...config };
    }

    /**
     * Obtiene una copia de la configuración actual del mesh.
     *
     * @returns {MeshConfig} Copia del objeto de configuración
     */
    getMeshConfig() {
        return { ...this.meshConfig };
    }

    /**
     * Establece el color de un elemento específico del mesh.
     *
     * @param {('tesselation'|'eye'|'lips'|'points')} element - Elemento del mesh a colorear
     * @param {RGBColor} color - Nuevo color en formato RGB
     * @returns {void}
     */
    setMeshColor(element, color) {
        const colorKey = `${element}Color`;
        if (this.meshConfig[colorKey]) {
            this.meshConfig[colorKey] = { ...color };
        }
    }

    /**
     * Establece el grosor de línea de un elemento del mesh.
     *
     * @param {('tesselation'|'eye'|'lips')} element - Elemento del mesh
     * @param {number} width - Grosor de línea en píxeles
     * @returns {void}
     */
    setMeshWidth(element, width) {
        const widthKey = `${element}Width`;
        if (this.meshConfig.hasOwnProperty(widthKey)) {
            this.meshConfig[widthKey] = width;
        }
    }

    /**
     * Establece la opacidad de un elemento del mesh.
     * El valor se limita al rango [0, 1].
     *
     * @param {('tesselation'|'eye'|'lips'|'points')} element - Elemento del mesh
     * @param {number} opacity - Opacidad (0 = transparente, 1 = opaco)
     * @returns {void}
     */
    setMeshOpacity(element, opacity) {
        const opacityKey = `${element}Opacity`;
        if (this.meshConfig.hasOwnProperty(opacityKey)) {
            this.meshConfig[opacityKey] = Math.max(0, Math.min(1, opacity));
        }
    }
}

// Exportar instancia singleton
const faceMeshDetector = new FaceMeshDetector();
