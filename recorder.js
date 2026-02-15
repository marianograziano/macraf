/**
 * @module SessionRecorder
 * @description Módulo de Grabación de Sesiones.
 * Gestiona la grabación, pausa, reanudación y almacenamiento de datos
 * durante las sesiones de ejercicio orofacial.
 */

/**
 * @typedef {Object} SessionMetrics
 * @property {number} avgMouthOpening - Apertura bucal promedio (0-100%)
 * @property {number} maxMouthOpening - Apertura bucal máxima (0-100%)
 * @property {number} avgLateralMovement - Movimiento lateral promedio (0-100%)
 * @property {number} maxLateralMovement - Movimiento lateral máximo (0-100%)
 * @property {number} completionPercentage - Porcentaje de la duración total completado (0-100)
 */

/**
 * @typedef {Object} DataPoint
 * @property {number} timestamp - Tiempo transcurrido en milisegundos desde el inicio
 * @property {number} mouthOpening - Apertura bucal en el momento (0-100%)
 * @property {number} lateralMovement - Movimiento lateral en el momento (0-100%)
 * @property {Position2D} jawPosition - Posición de la mandíbula normalizada
 */

/**
 * @typedef {Object} Session
 * @property {string} id - Identificador único de sesión (prefijo 'ses_')
 * @property {string} exerciseId - ID del ejercicio asociado
 * @property {string} exerciseName - Nombre del ejercicio
 * @property {string} exerciseType - Tipo del ejercicio
 * @property {number} duration - Duración objetivo en segundos
 * @property {string} startTime - Fecha/hora de inicio en formato ISO 8601
 * @property {?string} endTime - Fecha/hora de fin en formato ISO 8601
 * @property {DataPoint[]} dataPoints - Datos registrados durante la sesión
 * @property {SessionMetrics} metrics - Métricas calculadas de la sesión
 * @property {('in-progress'|'completed'|'partial'|'incomplete')} status - Estado de la sesión
 * @property {number} [actualDuration] - Duración real en segundos
 */

/**
 * @typedef {Object} SessionStats
 * @property {number} totalSessions - Número total de sesiones registradas
 * @property {number} completedSessions - Número de sesiones completadas (≥90%)
 * @property {number} avgCompletionRate - Tasa de completado promedio (0-100%)
 * @property {number} totalTimeMinutes - Tiempo total de ejercicio en minutos
 */

/**
 * Grabador de sesiones de ejercicio orofacial.
 * Registra datos de landmarks y métricas durante las sesiones,
 * con soporte para pausa/reanudación y almacenamiento en localStorage.
 *
 * @class SessionRecorder
 * @example
 * const recorder = new SessionRecorder();
 * recorder.startSession(exercise);
 * // ... registrar datos durante la sesión
 * recorder.recordDataPoint(landmarks, metrics);
 * const result = recorder.stopSession();
 */
class SessionRecorder {
    /**
     * Crea una nueva instancia del grabador de sesiones.
     * Carga sesiones previas desde localStorage al instanciarse.
     */
    constructor() {
        /** @type {Session[]} Historial de sesiones almacenadas */
        this.sessions = [];
        /** @type {?Session} Sesión actualmente en grabación */
        this.currentSession = null;
        /** @type {boolean} Indica si hay una grabación activa */
        this.isRecording = false;
        /** @type {boolean} Indica si la grabación está pausada */
        this.isPaused = false;
        /** @type {?number} Timestamp de inicio de la sesión (ms) */
        this.startTime = null;
        /** @type {?number} Timestamp del momento de pausa (ms) */
        this.pauseTime = null;
        /** @type {number} Tiempo total acumulado en pausa (ms) */
        this.totalPausedTime = 0;
        /** @type {?number} ID del intervalo de grabación */
        this.recordingInterval = null;
        this.loadSessions();
    }

    /**
     * Carga el historial de sesiones desde localStorage.
     * Si los datos están corruptos, reinicia con un array vacío.
     *
     * @returns {void}
     */
    loadSessions() {
        const stored = localStorage.getItem('orofacial_sessions');
        if (stored) {
            try {
                this.sessions = JSON.parse(stored);
                console.log(`${this.sessions.length} sesiones cargadas`);
            } catch (error) {
                console.error('Error al cargar sesiones:', error);
                this.sessions = [];
            }
        }
    }

    /**
     * Persiste el historial de sesiones en localStorage.
     *
     * @returns {void}
     */
    saveSessions() {
        try {
            localStorage.setItem('orofacial_sessions', JSON.stringify(this.sessions));
            console.log('Sesiones guardadas correctamente');
        } catch (error) {
            console.error('Error al guardar sesiones:', error);
        }
    }

    /**
     * Genera un ID único con prefijo 'ses_' y sufijo aleatorio.
     *
     * @returns {string} ID único con formato `ses_{timestamp}_{random}`
     */
    generateId() {
        return 'ses_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Inicia una nueva sesión de grabación para un ejercicio.
     * Solo permite una sesión activa a la vez.
     *
     * @param {Exercise} exercise - Ejercicio a ejecutar durante la sesión
     * @returns {?Session} La sesión creada, o `null` si ya hay una activa
     */
    startSession(exercise) {
        if (this.isRecording) {
            console.warn('Ya hay una sesión en curso');
            return null;
        }

        this.currentSession = {
            id: this.generateId(),
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            exerciseType: exercise.type,
            duration: exercise.duration,
            startTime: new Date().toISOString(),
            endTime: null,
            dataPoints: [],
            metrics: {
                avgMouthOpening: 0,
                maxMouthOpening: 0,
                avgLateralMovement: 0,
                maxLateralMovement: 0,
                completionPercentage: 0
            },
            status: 'in-progress'
        };

        this.isRecording = true;
        this.isPaused = false;
        this.startTime = Date.now();
        this.totalPausedTime = 0;

        console.log('Sesión iniciada:', this.currentSession.id);
        return this.currentSession;
    }

    /**
     * Pausa la sesión actual de grabación.
     *
     * @returns {boolean} `true` si se pausó, `false` si no hay sesión activa
     */
    pauseSession() {
        if (!this.isRecording || this.isPaused) {
            return false;
        }

        this.isPaused = true;
        this.pauseTime = Date.now();
        console.log('Sesión pausada');
        return true;
    }

    /**
     * Reanuda la sesión pausada. Acumula el tiempo en pausa.
     *
     * @returns {boolean} `true` si se reanudó, `false` si no estaba pausada
     */
    resumeSession() {
        if (!this.isRecording || !this.isPaused) {
            return false;
        }

        this.totalPausedTime += Date.now() - this.pauseTime;
        this.isPaused = false;
        this.pauseTime = null;
        console.log('Sesión reanudada');
        return true;
    }

    /**
     * Registra un punto de datos con las métricas del frame actual.
     * Solo graba si hay sesión activa y no está pausada.
     *
     * @param {FaceLandmark[]} landmarks - Landmarks faciales del frame
     * @param {FacialMetrics} metrics - Métricas calculadas del frame
     * @returns {void}
     */
    recordDataPoint(landmarks, metrics) {
        if (!this.isRecording || this.isPaused || !this.currentSession) {
            return;
        }

        const elapsedTime = this.getElapsedTime();

        const dataPoint = {
            timestamp: elapsedTime,
            mouthOpening: metrics.mouthOpening,
            lateralMovement: metrics.lateralMovement,
            jawPosition: metrics.jawPosition
        };

        this.currentSession.dataPoints.push(dataPoint);
    }

    /**
     * Detiene la sesión, calcula métricas finales y la guarda en el historial.
     * Determina el estado según el porcentaje completado:
     * - ≥90%: 'completed'
     * - ≥50%: 'partial'
     * - <50%: 'incomplete'
     *
     * @returns {?Session} La sesión completada con métricas, o `null` si no había sesión
     */
    stopSession() {
        if (!this.isRecording || !this.currentSession) {
            return null;
        }

        const elapsedTime = this.getElapsedTime();
        const totalDuration = this.currentSession.duration * 1000; // Convertir a ms

        this.currentSession.endTime = new Date().toISOString();
        this.currentSession.actualDuration = Math.round(elapsedTime / 1000); // Segundos
        this.currentSession.metrics.completionPercentage = Math.min(
            100,
            Math.round((elapsedTime / totalDuration) * 100)
        );

        // Calcular métricas finales
        this.calculateFinalMetrics();

        // Determinar estado final
        if (this.currentSession.metrics.completionPercentage >= 90) {
            this.currentSession.status = 'completed';
        } else if (this.currentSession.metrics.completionPercentage >= 50) {
            this.currentSession.status = 'partial';
        } else {
            this.currentSession.status = 'incomplete';
        }

        // Guardar sesión
        this.sessions.unshift(this.currentSession); // Agregar al inicio
        this.saveSessions();

        console.log('Sesión finalizada:', this.currentSession.id);

        const completedSession = this.currentSession;
        this.reset();

        return completedSession;
    }

    /**
     * Calcula promedios y máximos de apertura bucal y movimiento lateral
     * a partir de los puntos de datos registrados durante la sesión.
     *
     * @returns {void}
     * @private
     */
    calculateFinalMetrics() {
        if (!this.currentSession || this.currentSession.dataPoints.length === 0) {
            return;
        }

        const dataPoints = this.currentSession.dataPoints;
        let totalMouthOpening = 0;
        let totalLateralMovement = 0;
        let maxMouth = 0;
        let maxLateral = 0;

        dataPoints.forEach(point => {
            totalMouthOpening += point.mouthOpening;
            totalLateralMovement += point.lateralMovement;

            if (point.mouthOpening > maxMouth) {
                maxMouth = point.mouthOpening;
            }
            if (point.lateralMovement > maxLateral) {
                maxLateral = point.lateralMovement;
            }
        });

        this.currentSession.metrics.avgMouthOpening = Math.round(
            totalMouthOpening / dataPoints.length
        );
        this.currentSession.metrics.maxMouthOpening = Math.round(maxMouth);
        this.currentSession.metrics.avgLateralMovement = Math.round(
            totalLateralMovement / dataPoints.length
        );
        this.currentSession.metrics.maxLateralMovement = Math.round(maxLateral);
    }

    /**
     * Calcula el tiempo transcurrido descontando el tiempo en pausa.
     *
     * @returns {number} Tiempo transcurrido en milisegundos
     */
    getElapsedTime() {
        if (!this.startTime) return 0;

        let elapsed = Date.now() - this.startTime - this.totalPausedTime;

        if (this.isPaused && this.pauseTime) {
            elapsed -= (Date.now() - this.pauseTime);
        }

        return Math.max(0, elapsed);
    }

    /**
     * Obtiene el tiempo transcurrido formateado como "MM:SS".
     *
     * @returns {string} Tiempo formateado (e.g. "02:30")
     */
    getFormattedElapsedTime() {
        const ms = this.getElapsedTime();
        const seconds = Math.floor(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;

        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    /**
     * Calcula el progreso de la sesión respecto a la duración objetivo.
     *
     * @returns {number} Progreso en porcentaje (0-100)
     */
    getProgress() {
        if (!this.currentSession) return 0;

        const elapsed = this.getElapsedTime();
        const total = this.currentSession.duration * 1000;

        return Math.min(100, (elapsed / total) * 100);
    }

    /**
     * Resetea el estado interno del grabador.
     * Limpia la sesión actual, flags y tiempos.
     *
     * @returns {void}
     * @private
     */
    reset() {
        this.currentSession = null;
        this.isRecording = false;
        this.isPaused = false;
        this.startTime = null;
        this.pauseTime = null;
        this.totalPausedTime = 0;

        if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
            this.recordingInterval = null;
        }
    }

    /**
     * Obtiene la sesión actualmente en grabación.
     *
     * @returns {?Session} Sesión actual o `null`
     */
    getCurrentSession() {
        return this.currentSession;
    }

    /**
     * Obtiene una copia de todas las sesiones del historial.
     *
     * @returns {Session[]} Copia del array de sesiones
     */
    getAllSessions() {
        return [...this.sessions];
    }

    /**
     * Filtra las sesiones por ID de ejercicio.
     *
     * @param {string} exerciseId - ID del ejercicio a filtrar
     * @returns {Session[]} Sesiones que corresponden al ejercicio
     */
    getSessionsByExercise(exerciseId) {
        return this.sessions.filter(session => session.exerciseId === exerciseId);
    }

    /**
     * Busca una sesión por su ID.
     *
     * @param {string} id - ID de la sesión a buscar
     * @returns {?Session} La sesión encontrada o `undefined`
     */
    getSessionById(id) {
        return this.sessions.find(session => session.id === id);
    }

    /**
     * Elimina una sesión del historial por su ID.
     *
     * @param {string} id - ID de la sesión a eliminar
     * @returns {boolean} `true` si se eliminó, `false` si no se encontró
     */
    deleteSession(id) {
        const index = this.sessions.findIndex(session => session.id === id);

        if (index !== -1) {
            this.sessions.splice(index, 1);
            this.saveSessions();
            console.log('Sesión eliminada:', id);
            return true;
        }

        return false;
    }

    /**
     * Verifica si hay una grabación activa.
     *
     * @returns {boolean} `true` si está grabando
     */
    getIsRecording() {
        return this.isRecording;
    }

    /**
     * Verifica si la grabación está pausada.
     *
     * @returns {boolean} `true` si está pausada
     */
    getIsPaused() {
        return this.isPaused;
    }

    /**
     * Obtiene estadísticas generales de todas las sesiones registradas.
     *
     * @returns {SessionStats} Resumen estadístico del historial
     */
    getStats() {
        const totalSessions = this.sessions.length;
        const completedSessions = this.sessions.filter(s => s.status === 'completed').length;
        const totalTime = this.sessions.reduce((acc, s) => acc + (s.actualDuration || 0), 0);

        return {
            totalSessions,
            completedSessions,
            avgCompletionRate: totalSessions > 0
                ? Math.round((completedSessions / totalSessions) * 100)
                : 0,
            totalTimeMinutes: Math.round(totalTime / 60)
        };
    }
}

// Exportar instancia singleton
const sessionRecorder = new SessionRecorder();
