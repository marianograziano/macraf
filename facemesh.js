/**
 * Módulo de Detección Facial con MediaPipe Face Mesh
 * Gestiona la webcam y el tracking de landmarks faciales en tiempo real
 */

class FaceMeshDetector {
    constructor() {
        this.faceMesh = null;
        this.camera = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;
        this.isRunning = false;
        this.onResultsCallback = null;
        this.currentLandmarks = null;
        this.zoom = 1.0;

        // Configuración de visualización del mesh
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
     * Inicializa MediaPipe Face Mesh
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
     * Inicia la cámara y la detección
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
     * Detiene la cámara y la detección
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
     * Ajusta el nivel de zoom
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
     * Procesa los resultados de Face Mesh
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
     * Dibuja el mesh facial en el canvas
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
     * Calcula métricas de movimiento facial y expresiones
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
     * Registrar callback para recibir resultados
     */
    setOnResultsCallback(callback) {
        this.onResultsCallback = callback;
    }

    /**
     * Obtener landmarks actuales
     */
    getCurrentLandmarks() {
        return this.currentLandmarks;
    }

    /**
     * Verificar si está en ejecución
     */
    getIsRunning() {
        return this.isRunning;
    }

    /**
     * Actualizar configuración del mesh
     */
    updateMeshConfig(config) {
        this.meshConfig = { ...this.meshConfig, ...config };
    }

    /**
     * Obtener configuración actual del mesh
     */
    getMeshConfig() {
        return { ...this.meshConfig };
    }

    /**
     * Establecer color de un elemento del mesh
     * @param {string} element - 'tesselation', 'eye', 'lips', 'points'
     * @param {Object} color - {r, g, b}
     */
    setMeshColor(element, color) {
        const colorKey = `${element}Color`;
        if (this.meshConfig[colorKey]) {
            this.meshConfig[colorKey] = { ...color };
        }
    }

    /**
     * Establecer grosor de línea de un elemento
     * @param {string} element - 'tesselation', 'eye', 'lips'
     * @param {number} width - grosor de línea
     */
    setMeshWidth(element, width) {
        const widthKey = `${element}Width`;
        if (this.meshConfig.hasOwnProperty(widthKey)) {
            this.meshConfig[widthKey] = width;
        }
    }

    /**
     * Establecer opacidad de un elemento
     * @param {string} element - 'tesselation', 'eye', 'lips', 'points'
     * @param {number} opacity - opacidad (0-1)
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
