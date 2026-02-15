/**
 * Módulo de Grabación de Sesiones
 * Gestiona la grabación de datos durante las sesiones de ejercicio
 */

class SessionRecorder {
    constructor() {
        this.sessions = [];
        this.currentSession = null;
        this.isRecording = false;
        this.isPaused = false;
        this.startTime = null;
        this.pauseTime = null;
        this.totalPausedTime = 0;
        this.recordingInterval = null;
        this.loadSessions();
    }

    /**
     * Cargar sesiones desde localStorage
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
     * Guardar sesiones en localStorage
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
     * Generar ID único
     */
    generateId() {
        return 'ses_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Iniciar nueva sesión
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
     * Pausar sesión actual
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
     * Reanudar sesión
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
     * Registrar punto de datos
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
     * Detener sesión y guardar
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
     * Calcular métricas finales de la sesión
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
     * Obtener tiempo transcurrido en milisegundos
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
     * Obtener tiempo transcurrido formateado
     */
    getFormattedElapsedTime() {
        const ms = this.getElapsedTime();
        const seconds = Math.floor(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;

        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    /**
     * Obtener progreso de la sesión (0-100)
     */
    getProgress() {
        if (!this.currentSession) return 0;

        const elapsed = this.getElapsedTime();
        const total = this.currentSession.duration * 1000;

        return Math.min(100, (elapsed / total) * 100);
    }

    /**
     * Resetear grabador
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
     * Obtener sesión actual
     */
    getCurrentSession() {
        return this.currentSession;
    }

    /**
     * Obtener todas las sesiones
     */
    getAllSessions() {
        return [...this.sessions];
    }

    /**
     * Obtener sesiones por ejercicio
     */
    getSessionsByExercise(exerciseId) {
        return this.sessions.filter(session => session.exerciseId === exerciseId);
    }

    /**
     * Obtener sesión por ID
     */
    getSessionById(id) {
        return this.sessions.find(session => session.id === id);
    }

    /**
     * Eliminar sesión
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
     * Verificar estado
     */
    getIsRecording() {
        return this.isRecording;
    }

    getIsPaused() {
        return this.isPaused;
    }

    /**
     * Obtener estadísticas generales
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
