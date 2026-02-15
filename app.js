/**
 * @module OrofacialApp
 * @description Aplicación Principal - Asistente de Ejercicios Orofaciales.
 * Coordina todos los módulos (FaceMeshDetector, ExerciseManager,
 * SessionRecorder, SessionReviewer) y maneja la interacción del usuario.
 */

/**
 * Aplicación principal que orquesta la detección facial, gestión de ejercicios,
 * grabación de sesiones y visualización de resultados.
 *
 * @class OrofacialApp
 * @see FaceMeshDetector
 * @see ExerciseManager
 * @see SessionRecorder
 * @see SessionReviewer
 */
class OrofacialApp {
    /**
     * Crea una nueva instancia de la aplicación.
     */
    constructor() {
        /** @type {string} Vista activa actual ('practice'|'exercises'|'review') */
        this.currentView = 'practice';
        /** @type {?number} ID del intervalo de actualización del timer de sesión */
        this.sessionInterval = null;
        /** @type {?number} ID del intervalo de actualización de métricas */
        this.metricsUpdateInterval = null;
    }

    /**
     * Inicializa todos los módulos y configura la interfaz.
     * Debe llamarse una vez al cargar el DOM.
     *
     * @async
     * @returns {void}
     * @throws {Error} Si falla la inicialización de Face Mesh o ejercicios
     */
    async init() {
        console.log('Inicializando Asistente Orofacial...');

        try {
            // Inicializar Face Mesh
            await faceMeshDetector.initialize();

            // Esperar a que se carguen los ejercicios
            await exerciseManager.initializeExercises();

            // Configurar navegación
            this.setupNavigation();

            // Configurar vista de práctica
            this.setupPracticeView();

            // Configurar vista de ejercicios
            this.setupExercisesView();

            // Configurar vista de revisión
            this.setupReviewView();

            // Configurar modales
            this.setupModals();

            // Cargar vista inicial
            this.showView('practice');

            console.log('Aplicación inicializada correctamente');
        } catch (error) {
            console.error('Error al inicializar la aplicación:', error);
            alert('Error al inicializar la aplicación. Por favor, recarga la página.');
        }
    }

    /**
     * Configura los event listeners de los botones de navegación principal.
     *
     * @returns {void}
     * @private
     */
    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');

        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.showView(view);

                // Actualizar botones activos
                navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    /**
     * Muestra una vista específica y oculta las demás.
     * Ejecuta acciones de carga específicas al cambiar de vista.
     *
     * @param {('practice'|'exercises'|'review')} viewName - Nombre de la vista a mostrar
     * @returns {void}
     */
    showView(viewName) {
        this.currentView = viewName;

        // Ocultar todas las vistas
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Mostrar vista seleccionada
        const view = document.getElementById(`${viewName}-view`);
        if (view) {
            view.classList.add('active');
        }

        // Acciones específicas por vista
        if (viewName === 'exercises') {
            this.loadExercisesList();
        } else if (viewName === 'review') {
            this.loadSessionsList();
        }
    }

    /**
     * Configura la vista de práctica: cámara, zoom, mesh, selector de ejercicios,
     * botones de sesión y callback de resultados de Face Mesh.
     *
     * @returns {void}
     * @private
     */
    setupPracticeView() {
        // Botones de cámara
        const startCameraBtn = document.getElementById('start-camera');
        const stopCameraBtn = document.getElementById('stop-camera');

        startCameraBtn.addEventListener('click', async () => {
            await this.startCamera();
        });

        stopCameraBtn.addEventListener('click', () => {
            this.stopCamera();
        });

        // Control de Zoom
        const zoomRange = document.getElementById('zoom-range');
        const zoomValueDisp = document.getElementById('zoom-value');

        zoomRange.addEventListener('input', (e) => {
            const val = e.target.value;
            zoomValueDisp.textContent = `${parseFloat(val).toFixed(1)}x`;
            faceMeshDetector.setZoom(val);
        });

        // Configuración del Mesh
        this.setupMeshControls();

        // Selector de ejercicio
        const exerciseSelect = document.getElementById('exercise-select');
        exerciseSelect.addEventListener('change', (e) => {
            this.selectExercise(e.target.value);
        });

        // Cargar ejercicios en el selector
        this.loadExercisesIntoSelect();

        // Botones de sesión
        const startSessionBtn = document.getElementById('start-session');
        const pauseSessionBtn = document.getElementById('pause-session');
        const stopSessionBtn = document.getElementById('stop-session');

        startSessionBtn.addEventListener('click', () => this.startSession());
        pauseSessionBtn.addEventListener('click', () => this.togglePause());
        stopSessionBtn.addEventListener('click', () => this.stopSession());

        // Configurar callback de resultados de Face Mesh
        faceMeshDetector.setOnResultsCallback((landmarks, metrics) => {
            this.onFaceMeshResults(landmarks, metrics);
        });
    }

    /**
     * Configura los controles de personalización visual del mesh facial:
     * colores, grosores, opacidades para labios, ojos, teselación y puntos,
     * y botón de reset a valores por defecto.
     *
     * @returns {void}
     * @private
     */
    setupMeshControls() {
        // Helper para convertir hex a RGB
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        };

        // Configuración de Labios
        const lipsColor = document.getElementById('lips-color');
        const lipsWidth = document.getElementById('lips-width');
        const lipsOpacity = document.getElementById('lips-opacity');
        const lipsWidthValue = document.getElementById('lips-width-value');
        const lipsOpacityValue = document.getElementById('lips-opacity-value');

        lipsColor.addEventListener('input', (e) => {
            const rgb = hexToRgb(e.target.value);
            if (rgb) faceMeshDetector.setMeshColor('lips', rgb);
        });

        lipsWidth.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            lipsWidthValue.textContent = val.toFixed(1);
            faceMeshDetector.setMeshWidth('lips', val);
        });

        lipsOpacity.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            lipsOpacityValue.textContent = val.toFixed(1);
            faceMeshDetector.setMeshOpacity('lips', val);
        });

        // Configuración de Ojos
        const eyeColor = document.getElementById('eye-color');
        const eyeWidth = document.getElementById('eye-width');
        const eyeOpacity = document.getElementById('eye-opacity');
        const eyeWidthValue = document.getElementById('eye-width-value');
        const eyeOpacityValue = document.getElementById('eye-opacity-value');

        eyeColor.addEventListener('input', (e) => {
            const rgb = hexToRgb(e.target.value);
            if (rgb) faceMeshDetector.setMeshColor('eye', rgb);
        });

        eyeWidth.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            eyeWidthValue.textContent = val.toFixed(1);
            faceMeshDetector.setMeshWidth('eye', val);
        });

        eyeOpacity.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            eyeOpacityValue.textContent = val.toFixed(1);
            faceMeshDetector.setMeshOpacity('eye', val);
        });

        // Configuración de Malla (Tesselation)
        const tesselationColor = document.getElementById('tesselation-color');
        const tesselationWidth = document.getElementById('tesselation-width');
        const tesselationOpacity = document.getElementById('tesselation-opacity');
        const tesselationWidthValue = document.getElementById('tesselation-width-value');
        const tesselationOpacityValue = document.getElementById('tesselation-opacity-value');

        tesselationColor.addEventListener('input', (e) => {
            const rgb = hexToRgb(e.target.value);
            if (rgb) faceMeshDetector.setMeshColor('tesselation', rgb);
        });

        tesselationWidth.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            tesselationWidthValue.textContent = val.toFixed(1);
            faceMeshDetector.setMeshWidth('tesselation', val);
        });

        tesselationOpacity.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            tesselationOpacityValue.textContent = val.toFixed(2);
            faceMeshDetector.setMeshOpacity('tesselation', val);
        });

        // Configuración de Puntos
        const pointsColor = document.getElementById('points-color');
        const pointSize = document.getElementById('point-size');
        const pointsOpacity = document.getElementById('points-opacity');
        const pointSizeValue = document.getElementById('point-size-value');
        const pointsOpacityValue = document.getElementById('points-opacity-value');

        pointsColor.addEventListener('input', (e) => {
            const rgb = hexToRgb(e.target.value);
            if (rgb) faceMeshDetector.setMeshColor('points', rgb);
        });

        pointSize.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            pointSizeValue.textContent = val.toFixed(1);
            faceMeshDetector.updateMeshConfig({ pointSize: val });
        });

        pointsOpacity.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            pointsOpacityValue.textContent = val.toFixed(1);
            faceMeshDetector.setMeshOpacity('points', val);
        });

        // Botón de reset
        const resetBtn = document.getElementById('reset-mesh-config');
        resetBtn.addEventListener('click', () => {
            // Valores por defecto
            const defaults = {
                lipsColor: '#00ffff',
                lipsWidth: 2.5,
                lipsOpacity: 0.9,
                eyeColor: '#00ff64',
                eyeWidth: 1.5,
                eyeOpacity: 0.7,
                tesselationColor: '#00ff64',
                tesselationWidth: 0.5,
                tesselationOpacity: 0.15,
                pointsColor: '#00ff64',
                pointSize: 2,
                pointsOpacity: 0.9
            };

            // Actualizar controles
            lipsColor.value = defaults.lipsColor;
            lipsWidth.value = defaults.lipsWidth;
            lipsOpacity.value = defaults.lipsOpacity;
            lipsWidthValue.textContent = defaults.lipsWidth.toFixed(1);
            lipsOpacityValue.textContent = defaults.lipsOpacity.toFixed(1);

            eyeColor.value = defaults.eyeColor;
            eyeWidth.value = defaults.eyeWidth;
            eyeOpacity.value = defaults.eyeOpacity;
            eyeWidthValue.textContent = defaults.eyeWidth.toFixed(1);
            eyeOpacityValue.textContent = defaults.eyeOpacity.toFixed(1);

            tesselationColor.value = defaults.tesselationColor;
            tesselationWidth.value = defaults.tesselationWidth;
            tesselationOpacity.value = defaults.tesselationOpacity;
            tesselationWidthValue.textContent = defaults.tesselationWidth.toFixed(1);
            tesselationOpacityValue.textContent = defaults.tesselationOpacity.toFixed(2);

            pointsColor.value = defaults.pointsColor;
            pointSize.value = defaults.pointSize;
            pointsOpacity.value = defaults.pointsOpacity;
            pointSizeValue.textContent = defaults.pointSize.toFixed(1);
            pointsOpacityValue.textContent = defaults.pointsOpacity.toFixed(1);

            // Actualizar mesh detector
            faceMeshDetector.updateMeshConfig({
                tesselationColor: hexToRgb(defaults.tesselationColor),
                eyeColor: hexToRgb(defaults.eyeColor),
                lipsColor: hexToRgb(defaults.lipsColor),
                pointsColor: hexToRgb(defaults.pointsColor),
                tesselationOpacity: defaults.tesselationOpacity,
                eyeOpacity: defaults.eyeOpacity,
                lipsOpacity: defaults.lipsOpacity,
                pointsOpacity: defaults.pointsOpacity,
                tesselationWidth: defaults.tesselationWidth,
                eyeWidth: defaults.eyeWidth,
                lipsWidth: defaults.lipsWidth,
                pointSize: defaults.pointSize
            });
        });
    }

    /**
     * Inicia la webcam y actualiza la UI (botones, indicador de estado).
     *
     * @async
     * @returns {void}
     */
    async startCamera() {
        try {
            await faceMeshDetector.start();

            // Actualizar UI
            document.getElementById('camera-placeholder').classList.add('hidden');
            document.getElementById('start-camera').disabled = true;
            document.getElementById('stop-camera').disabled = false;

            const statusIndicator = document.getElementById('camera-status');
            statusIndicator.classList.add('active');
            statusIndicator.querySelector('.status-text').textContent = 'Conectada';

            // Habilitar inicio de sesión si hay ejercicio seleccionado
            const exerciseSelect = document.getElementById('exercise-select');
            if (exerciseSelect.value) {
                document.getElementById('start-session').disabled = false;
            }

            // Habilitar control de zoom
            document.getElementById('zoom-range').disabled = false;
        } catch (error) {
            alert(error.message);
        }
    }

    /**
     * Detiene la webcam y resetea la UI.
     * Si hay una sesión activa, la detiene primero.
     *
     * @returns {void}
     */
    stopCamera() {
        faceMeshDetector.stop();

        // Si hay sesión activa, detenerla
        if (sessionRecorder.getIsRecording()) {
            this.stopSession();
        }

        // Actualizar UI
        document.getElementById('camera-placeholder').classList.remove('hidden');
        document.getElementById('start-camera').disabled = false;
        document.getElementById('stop-camera').disabled = true;

        const statusIndicator = document.getElementById('camera-status');
        statusIndicator.classList.remove('active');
        statusIndicator.querySelector('.status-text').textContent = 'Desconectada';

        document.getElementById('start-session').disabled = true;

        // Deshabilitar y resetear control de zoom
        const zoomRange = document.getElementById('zoom-range');
        zoomRange.value = 1.0;
        zoomRange.disabled = true;
        document.getElementById('zoom-value').textContent = '1.0x';
        faceMeshDetector.setZoom(1.0);
    }

    /**
     * Carga los ejercicios disponibles en el selector de la vista de práctica
     * y en el filtro de la vista de revisión.
     *
     * @returns {void}
     */
    loadExercisesIntoSelect() {
        const select = document.getElementById('exercise-select');
        const exercises = exerciseManager.getAllExercises();

        // Limpiar opciones existentes (excepto la primera)
        select.innerHTML = '<option value="">-- Selecciona un ejercicio --</option>';

        exercises.forEach(exercise => {
            const option = document.createElement('option');
            option.value = exercise.id;
            option.textContent = exercise.name;
            select.appendChild(option);
        });

        // También actualizar el filtro en la vista de revisión
        const filterSelect = document.getElementById('filter-exercise');
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">Todos los ejercicios</option>';
            exercises.forEach(exercise => {
                const option = document.createElement('option');
                option.value = exercise.id;
                option.textContent = exercise.name;
                filterSelect.appendChild(option);
            });
        }
    }

    /**
     * Selecciona un ejercicio y muestra su información en la vista de práctica.
     * Habilita el botón de inicio de sesión si la cámara está activa.
     *
     * @param {string} exerciseId - ID del ejercicio seleccionado, o cadena vacía para deseleccionar
     * @returns {void}
     */
    selectExercise(exerciseId) {
        if (!exerciseId) {
            document.getElementById('exercise-info').style.display = 'none';
            document.getElementById('start-session').disabled = true;
            return;
        }

        const exercise = exerciseManager.setCurrentExercise(exerciseId);

        if (exercise) {
            // Mostrar información del ejercicio
            document.getElementById('exercise-duration').textContent =
                exerciseManager.formatDuration(exercise.duration);
            document.getElementById('exercise-description').textContent =
                exercise.description || 'Sin descripción';
            document.getElementById('exercise-info').style.display = 'block';

            // Habilitar inicio de sesión si la cámara está activa
            if (faceMeshDetector.getIsRunning()) {
                document.getElementById('start-session').disabled = false;
            }
        }
    }

    /**
     * Inicia una sesión de ejercicio con el ejercicio actualmente seleccionado.
     * Requiere cámara activa y ejercicio seleccionado.
     *
     * @returns {void}
     */
    startSession() {
        const exercise = exerciseManager.getCurrentExercise();
        if (!exercise) {
            alert('Por favor, selecciona un ejercicio');
            return;
        }

        if (!faceMeshDetector.getIsRunning()) {
            alert('Por favor, inicia la cámara primero');
            return;
        }

        // Iniciar sesión
        sessionRecorder.startSession(exercise);

        // Mostrar timer y métricas
        document.getElementById('session-timer').style.display = 'block';
        document.getElementById('metrics-display').style.display = 'block';

        const totalDuration = exerciseManager.formatDuration(exercise.duration);
        document.getElementById('timer-total').textContent = totalDuration;

        // Actualizar UI de controles
        document.getElementById('start-session').disabled = true;
        document.getElementById('pause-session').disabled = false;
        document.getElementById('stop-session').disabled = false;
        document.getElementById('exercise-select').disabled = true;

        // Iniciar actualización de timer
        this.sessionInterval = setInterval(() => {
            this.updateSessionTimer();
        }, 100);

        console.log('Sesión iniciada');
    }

    /**
     * Alterna entre pausa y reanudación de la sesión activa.
     * Actualiza el icono y texto del botón correspondientemente.
     *
     * @returns {void}
     */
    togglePause() {
        const isPaused = sessionRecorder.getIsPaused();

        if (isPaused) {
            sessionRecorder.resumeSession();
            document.getElementById('pause-session').innerHTML = `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
                    <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
                </svg>
                Pausar
            `;
        } else {
            sessionRecorder.pauseSession();
            document.getElementById('pause-session').innerHTML = `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 5v14l11-7z" fill="currentColor"/>
                </svg>
                Reanudar
            `;
        }
    }

    /**
     * Detiene la sesión activa, muestra un resumen de resultados
     * y restaura la UI a su estado previo.
     *
     * @returns {void}
     */
    stopSession() {
        if (!sessionRecorder.getIsRecording()) {
            return;
        }

        // Detener sesión
        const completedSession = sessionRecorder.stopSession();

        // Limpiar interval
        if (this.sessionInterval) {
            clearInterval(this.sessionInterval);
            this.sessionInterval = null;
        }

        // Ocultar timer y métricas
        document.getElementById('session-timer').style.display = 'none';
        document.getElementById('metrics-display').style.display = 'none';

        // Restaurar UI
        document.getElementById('start-session').disabled = false;
        document.getElementById('pause-session').disabled = true;
        document.getElementById('stop-session').disabled = true;
        document.getElementById('exercise-select').disabled = false;

        // Resetear botón de pausa
        document.getElementById('pause-session').innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
                <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
            </svg>
            Pausar
        `;

        // Mostrar resumen
        if (completedSession) {
            alert(`Sesión completada!\n\nCompletado: ${completedSession.metrics.completionPercentage}%\nApertura máxima: ${completedSession.metrics.maxMouthOpening}%`);
        }

        console.log('Sesión detenida');
    }

    /**
     * Actualiza el timer visual y la barra de progreso de la sesión.
     * Auto-detiene la sesión al alcanzar el 100%.
     *
     * @returns {void}
     * @private
     */
    updateSessionTimer() {
        const formattedTime = sessionRecorder.getFormattedElapsedTime();
        const progress = sessionRecorder.getProgress();

        document.getElementById('timer-value').textContent = formattedTime;
        document.getElementById('progress-fill').style.width = `${progress}%`;

        // Auto-detener al completar
        if (progress >= 100) {
            this.stopSession();
        }
    }

    /**
     * Callback que procesa los resultados de Face Mesh en cada frame.
     * Graba datos si hay sesión activa y actualiza las métricas visuales.
     *
     * @param {FaceLandmark[]} landmarks - Landmarks faciales del frame
     * @param {FacialMetrics} metrics - Métricas calculadas del frame
     * @returns {void}
     * @private
     */
    onFaceMeshResults(landmarks, metrics) {
        // Si hay sesión activa y no está pausada, grabar datos
        if (sessionRecorder.getIsRecording() && !sessionRecorder.getIsPaused()) {
            sessionRecorder.recordDataPoint(landmarks, metrics);
        }

        // Actualizar métricas visuales
        this.updateMetricsDisplay(metrics);
    }

    /**
     * Actualiza las barras de progreso y valores numéricos de todas las
     * métricas faciales en la UI (boca, lateral, sonrisa, ojos, cejas, lengua).
     *
     * @param {FacialMetrics} metrics - Métricas a mostrar
     * @returns {void}
     * @private
     */
    updateMetricsDisplay(metrics) {
        const metricsDisplay = document.getElementById('metrics-display');
        if (!metricsDisplay || metricsDisplay.style.display === 'none') {
            return;
        }

        // Apertura bucal
        const mouthFill = document.getElementById('mouth-opening-fill');
        const mouthValue = document.getElementById('mouth-opening-value');
        if (mouthFill && mouthValue) {
            mouthFill.style.width = `${metrics.mouthOpening}%`;
            mouthValue.textContent = `${Math.round(metrics.mouthOpening)}%`;
        }

        // Movimiento lateral
        const lateralFill = document.getElementById('lateral-movement-fill');
        const lateralValue = document.getElementById('lateral-movement-value');
        if (lateralFill && lateralValue) {
            lateralFill.style.width = `${metrics.lateralMovement}%`;
            lateralValue.textContent = `${Math.round(metrics.lateralMovement)}%`;
        }

        // Sonrisa
        const smileFill = document.getElementById('smile-fill');
        const smileValue = document.getElementById('smile-value');
        if (smileFill && smileValue) {
            smileFill.style.width = `${metrics.smile}%`;
            smileValue.textContent = `${Math.round(metrics.smile)}%`;
        }

        // Ojo izquierdo
        const leftEyeFill = document.getElementById('left-eye-fill');
        const leftEyeValue = document.getElementById('left-eye-value');
        if (leftEyeFill && leftEyeValue) {
            leftEyeFill.style.width = `${metrics.leftEyeOpen}%`;
            leftEyeValue.textContent = `${Math.round(metrics.leftEyeOpen)}%`;
        }

        // Ojo derecho
        const rightEyeFill = document.getElementById('right-eye-fill');
        const rightEyeValue = document.getElementById('right-eye-value');
        if (rightEyeFill && rightEyeValue) {
            rightEyeFill.style.width = `${metrics.rightEyeOpen}%`;
            rightEyeValue.textContent = `${Math.round(metrics.rightEyeOpen)}%`;
        }

        // Cejas levantadas
        const eyebrowsFill = document.getElementById('eyebrows-fill');
        const eyebrowsValue = document.getElementById('eyebrows-value');
        if (eyebrowsFill && eyebrowsValue) {
            eyebrowsFill.style.width = `${metrics.eyebrowsRaised}%`;
            eyebrowsValue.textContent = `${Math.round(metrics.eyebrowsRaised)}%`;
        }

        // Lengua visible
        const tongueFill = document.getElementById('tongue-visible-fill');
        const tongueValue = document.getElementById('tongue-visible-value');
        if (tongueFill && tongueValue) {
            tongueFill.style.width = `${metrics.tongueVisible}%`;
            tongueValue.textContent = `${Math.round(metrics.tongueVisible)}%`;
        }
    }

    /**
     * Configura la vista de gestión de ejercicios:
     * botón de nuevo ejercicio, exportar/importar JSON.
     *
     * @returns {void}
     * @private
     */
    setupExercisesView() {
        const addExerciseBtn = document.getElementById('add-exercise');
        addExerciseBtn.addEventListener('click', () => {
            this.showExerciseModal();
        });

        // Botón de exportar JSON
        const exportJsonBtn = document.getElementById('export-json');
        exportJsonBtn.addEventListener('click', () => {
            exerciseManager.exportToJSON();
        });

        // Botón de importar JSON
        const importJsonBtn = document.getElementById('import-json');
        const jsonFileInput = document.getElementById('json-file-input');

        importJsonBtn.addEventListener('click', () => {
            jsonFileInput.click();
        });

        jsonFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    await exerciseManager.importFromFile(file);
                    // Recargar listas
                    this.loadExercisesList();
                    this.loadExercisesIntoSelect();
                    alert('Ejercicios importados correctamente');
                } catch (error) {
                    alert('Error al importar ejercicios: ' + error.message);
                }
                // Resetear input
                e.target.value = '';
            }
        });
    }

    /**
     * Renderiza la grilla de tarjetas de ejercicios en la vista de ejercicios.
     * Muestra un estado vacío si no hay ejercicios.
     *
     * @returns {void}
     */
    loadExercisesList() {
        const grid = document.getElementById('exercises-grid');
        const exercises = exerciseManager.getAllExercises();

        if (exercises.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <p>No hay ejercicios creados aún</p>
                    <p style="font-size: 0.875rem; margin-top: 0.5rem;">Haz clic en "Nuevo Ejercicio" para comenzar</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = exercises.map(exercise => `
            <div class="exercise-card">
                <div class="exercise-card-header">
                    <h3 class="exercise-card-title">${exercise.name}</h3>
                </div>
                <span class="exercise-card-type">${exerciseManager.getTypeName(exercise.type)}</span>
                <p class="exercise-card-description">${exercise.description || 'Sin descripción'}</p>
                <div class="exercise-card-meta">
                    <svg style="width: 1rem; height: 1rem;" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    ${exerciseManager.formatDuration(exercise.duration)}
                </div>
                <div class="exercise-card-actions">
                    <button class="btn btn-primary btn-sm" onclick="app.editExercise('${exercise.id}')">
                        Editar
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="app.deleteExercise('${exercise.id}')">
                        Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Muestra el modal de creación/edición de ejercicio.
     * Si se pasa un ID, precarga los datos del ejercicio existente.
     *
     * @param {?string} [exerciseId=null] - ID del ejercicio a editar, o `null` para crear nuevo
     * @returns {void}
     */
    showExerciseModal(exerciseId = null) {
        const modal = document.getElementById('exercise-modal');
        const form = document.getElementById('exercise-form');
        const title = document.getElementById('modal-title');

        if (exerciseId) {
            const exercise = exerciseManager.getExerciseById(exerciseId);
            if (exercise) {
                title.textContent = 'Editar Ejercicio';
                document.getElementById('exercise-id').value = exercise.id;
                document.getElementById('exercise-name').value = exercise.name;
                document.getElementById('exercise-desc').value = exercise.description || '';
                document.getElementById('exercise-duration-input').value = exercise.duration;

                const typeRadio = document.querySelector(`input[name="exercise-type"][value="${exercise.type}"]`);
                if (typeRadio) typeRadio.checked = true;
            }
        } else {
            title.textContent = 'Nuevo Ejercicio';
            form.reset();
            document.getElementById('exercise-id').value = '';
        }

        modal.classList.add('active');
    }

    /**
     * Abre el modal para editar un ejercicio existente.
     *
     * @param {string} exerciseId - ID del ejercicio a editar
     * @returns {void}
     */
    editExercise(exerciseId) {
        this.showExerciseModal(exerciseId);
    }

    /**
     * Elimina un ejercicio previa confirmación del usuario.
     * Recarga la lista de ejercicios y el selector.
     *
     * @param {string} exerciseId - ID del ejercicio a eliminar
     * @returns {void}
     */
    deleteExercise(exerciseId) {
        if (confirm('¿Estás seguro de que quieres eliminar este ejercicio?')) {
            exerciseManager.deleteExercise(exerciseId);
            this.loadExercisesList();
            this.loadExercisesIntoSelect();
        }
    }

    /**
     * Configura la vista de revisión: filtro por ejercicio.
     *
     * @returns {void}
     * @private
     */
    setupReviewView() {
        const filterSelect = document.getElementById('filter-exercise');
        filterSelect.addEventListener('change', (e) => {
            sessionReviewer.filterByExercise(e.target.value);
        });
    }

    /**
     * Carga y renderiza la lista de sesiones en la vista de revisión.
     *
     * @returns {void}
     */
    loadSessionsList() {
        const container = document.getElementById('sessions-list');
        const sessions = sessionRecorder.getAllSessions();
        sessionReviewer.renderSessionsList(container, sessions);
    }

    /**
     * Configura los event listeners de cierre para todos los modales
     * (ejercicio y sesión), incluyendo overlay, botón X y cancelar.
     *
     * @returns {void}
     * @private
     */
    setupModals() {
        // Modal de ejercicio
        const exerciseModal = document.getElementById('exercise-modal');
        const closeExerciseModal = document.getElementById('close-modal');
        const cancelExercise = document.getElementById('cancel-exercise');
        const exerciseForm = document.getElementById('exercise-form');

        closeExerciseModal.addEventListener('click', () => {
            exerciseModal.classList.remove('active');
        });

        cancelExercise.addEventListener('click', () => {
            exerciseModal.classList.remove('active');
        });

        exerciseModal.querySelector('.modal-overlay').addEventListener('click', () => {
            exerciseModal.classList.remove('active');
        });

        exerciseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveExercise();
        });

        // Modal de sesión
        const sessionModal = document.getElementById('session-modal');
        const closeSessionModal = document.getElementById('close-session-modal');

        closeSessionModal.addEventListener('click', () => {
            sessionReviewer.closeSessionModal();
        });

        sessionModal.querySelector('.modal-overlay').addEventListener('click', () => {
            sessionReviewer.closeSessionModal();
        });
    }

    /**
     * Guarda un ejercicio nuevo o actualizado desde el formulario del modal.
     * Valida los datos antes de guardar y recarga las listas.
     *
     * @returns {void}
     */
    saveExercise() {
        const exerciseData = {
            name: document.getElementById('exercise-name').value,
            description: document.getElementById('exercise-desc').value,
            duration: document.getElementById('exercise-duration-input').value,
            type: document.querySelector('input[name="exercise-type"]:checked').value
        };

        const validation = exerciseManager.validateExercise(exerciseData);

        if (!validation.isValid) {
            alert('Errores:\n' + validation.errors.join('\n'));
            return;
        }

        const exerciseId = document.getElementById('exercise-id').value;

        if (exerciseId) {
            exerciseManager.updateExercise(exerciseId, exerciseData);
        } else {
            exerciseManager.createExercise(exerciseData);
        }

        // Cerrar modal
        document.getElementById('exercise-modal').classList.remove('active');

        // Recargar listas
        this.loadExercisesList();
        this.loadExercisesIntoSelect();
    }
}

// Inicializar aplicación cuando el DOM esté listo
let app;

document.addEventListener('DOMContentLoaded', async () => {
    app = new OrofacialApp();
    await app.init();
});
