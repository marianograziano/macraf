/**
 * @module SessionReviewer
 * @description Módulo de Revisión de Sesiones.
 * Gestiona la visualización, análisis y renderizado de sesiones grabadas,
 * incluyendo tarjetas de sesión, detalles con estadísticas y gráficas de progreso.
 */

/**
 * Visualizador y analizador de sesiones de ejercicio.
 * Renderiza listas de sesiones, detalles individuales con estadísticas
 * y gráficas de progreso temporal usando Canvas 2D.
 *
 * @class SessionReviewer
 */
class SessionReviewer {
    /**
     * Crea una nueva instancia del revisor de sesiones.
     */
    constructor() {
        /** @type {?Session} Sesión actualmente visualizada en el modal */
        this.currentSessionView = null;
    }

    /**
     * Renderiza la lista completa de sesiones en un contenedor HTML.
     * Si no hay sesiones, muestra un estado vacío.
     *
     * @param {HTMLElement} container - Elemento DOM contenedor
     * @param {Session[]} sessions - Array de sesiones a renderizar
     * @returns {void}
     */
    renderSessionsList(container, sessions) {
        if (!sessions || sessions.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        const sessionsHTML = sessions.map(session => this.renderSessionCard(session)).join('');
        container.innerHTML = sessionsHTML;

        // Agregar event listeners
        sessions.forEach(session => {
            const card = document.querySelector(`[data-session-id="${session.id}"]`);
            if (card) {
                card.addEventListener('click', () => this.showSessionDetails(session));
            }

            const deleteBtn = document.querySelector(`[data-delete-session="${session.id}"]`);
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteSession(session.id);
                });
            }
        });
    }

    /**
     * Genera el HTML de una tarjeta individual de sesión
     * con estado, fecha y estadísticas resumidas.
     *
     * @param {Session} session - Sesión a renderizar
     * @returns {string} HTML de la tarjeta de sesión
     */
    renderSessionCard(session) {
        const statusClass = this.getStatusClass(session.status);
        const statusText = this.getStatusText(session.status);
        const date = new Date(session.startTime);
        const formattedDate = this.formatDate(date);

        return `
            <div class="session-card" data-session-id="${session.id}">
                <div class="session-card-header">
                    <div>
                        <h3 class="session-card-title">${session.exerciseName}</h3>
                        <p class="session-card-date">${formattedDate}</p>
                    </div>
                    <span class="session-card-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="session-card-stats">
                    <div class="stat-item">
                        <span class="stat-value">${session.metrics.completionPercentage}%</span>
                        <span class="stat-label">Completado</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${session.actualDuration}s</span>
                        <span class="stat-label">Duración</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${session.metrics.maxMouthOpening}%</span>
                        <span class="stat-label">Máx. Apertura</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Genera el HTML del estado vacío cuando no hay sesiones registradas.
     *
     * @returns {string} HTML del estado vacío con icono y mensaje
     */
    renderEmptyState() {
        return `
            <div class="empty-state">
                <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M3 9h18" stroke="currentColor" stroke-width="2"/>
                </svg>
                <p>No hay sesiones registradas aún</p>
                <p style="font-size: 0.875rem; margin-top: 0.5rem;">Comienza una sesión de práctica para ver tus resultados aquí</p>
            </div>
        `;
    }

    /**
     * Muestra los detalles de una sesión en un modal con estadísticas y gráfica.
     * Renderiza la gráfica de progreso después de un breve delay para asegurar
     * que el canvas esté disponible en el DOM.
     *
     * @param {Session} session - Sesión a visualizar
     * @returns {void}
     */
    showSessionDetails(session) {
        this.currentSessionView = session;
        const modal = document.getElementById('session-modal');
        const detailsContainer = document.getElementById('session-details');

        if (!modal || !detailsContainer) return;

        detailsContainer.innerHTML = this.renderSessionDetails(session);
        modal.classList.add('active');

        // Renderizar gráfica si hay datos
        if (session.dataPoints && session.dataPoints.length > 0) {
            setTimeout(() => this.renderChart(session), 100);
        }
    }

    /**
     * Genera el HTML de la vista detallada de una sesión,
     * incluyendo grid de estadísticas, canvas para gráfica y botón de eliminación.
     *
     * @param {Session} session - Sesión a renderizar
     * @returns {string} HTML de los detalles de la sesión
     */
    renderSessionDetails(session) {
        const date = new Date(session.startTime);
        const formattedDate = this.formatDate(date);
        const formattedTime = this.formatTime(date);

        return `
            <div class="session-details">
                <div class="session-details-header">
                    <h3>${session.exerciseName}</h3>
                    <p class="session-card-date">${formattedDate} a las ${formattedTime}</p>
                </div>

                <div class="session-stats-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 1.5rem 0;">
                    <div class="stat-card" style="background: var(--color-background); padding: 1rem; border-radius: var(--radius-md);">
                        <div class="stat-value" style="font-size: 2rem; font-weight: 700; color: var(--color-primary);">
                            ${session.metrics.completionPercentage}%
                        </div>
                        <div class="stat-label">Completado</div>
                    </div>
                    <div class="stat-card" style="background: var(--color-background); padding: 1rem; border-radius: var(--radius-md);">
                        <div class="stat-value" style="font-size: 2rem; font-weight: 700; color: var(--color-primary);">
                            ${session.actualDuration}s
                        </div>
                        <div class="stat-label">Duración Real</div>
                    </div>
                    <div class="stat-card" style="background: var(--color-background); padding: 1rem; border-radius: var(--radius-md);">
                        <div class="stat-value" style="font-size: 2rem; font-weight: 700; color: var(--color-primary);">
                            ${session.metrics.avgMouthOpening}%
                        </div>
                        <div class="stat-label">Apertura Promedio</div>
                    </div>
                    <div class="stat-card" style="background: var(--color-background); padding: 1rem; border-radius: var(--radius-md);">
                        <div class="stat-value" style="font-size: 2rem; font-weight: 700; color: var(--color-primary);">
                            ${session.metrics.maxMouthOpening}%
                        </div>
                        <div class="stat-label">Apertura Máxima</div>
                    </div>
                </div>

                ${session.dataPoints && session.dataPoints.length > 0 ? `
                    <div class="chart-container">
                        <h4 class="chart-title">Progreso Durante la Sesión</h4>
                        <canvas id="session-chart" width="800" height="300"></canvas>
                    </div>
                ` : ''}

                <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--color-secondary);">
                    <button class="btn btn-danger btn-sm" onclick="sessionReviewer.deleteSessionFromDetails('${session.id}')">
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        Eliminar Sesión
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza una gráfica de líneas en Canvas 2D con los datos de la sesión.
     * Muestra apertura bucal (azul) y movimiento lateral (verde) vs tiempo.
     * Incluye ejes, líneas de referencia y leyenda.
     *
     * @param {Session} session - Sesión con dataPoints a graficar
     * @returns {void}
     */
    renderChart(session) {
        const canvas = document.getElementById('session-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dataPoints = session.dataPoints;

        if (!dataPoints || dataPoints.length === 0) return;

        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const padding = 40;
        const chartWidth = canvas.width - (padding * 2);
        const chartHeight = canvas.height - (padding * 2);

        // Configurar estilos
        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = 'hsl(210, 10%, 45%)';

        // Dibujar ejes
        ctx.strokeStyle = 'hsl(210, 20%, 90%)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();

        // Etiquetas de ejes
        ctx.fillText('100%', 5, padding);
        ctx.fillText('0%', 10, canvas.height - padding + 5);
        ctx.fillText('Tiempo (s)', canvas.width / 2 - 30, canvas.height - 10);

        // Preparar datos
        const maxTime = Math.max(...dataPoints.map(p => p.timestamp));
        const scaleX = chartWidth / maxTime;
        const scaleY = chartHeight / 100;

        // Dibujar líneas de referencia
        ctx.strokeStyle = 'hsl(210, 20%, 95%)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 100; i += 25) {
            const y = canvas.height - padding - (i * scaleY);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(canvas.width - padding, y);
            ctx.stroke();
        }

        // Dibujar línea de apertura bucal
        ctx.strokeStyle = 'hsl(210, 75%, 55%)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        dataPoints.forEach((point, index) => {
            const x = padding + (point.timestamp * scaleX);
            const y = canvas.height - padding - (point.mouthOpening * scaleY);

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Dibujar línea de movimiento lateral
        ctx.strokeStyle = 'hsl(145, 65%, 50%)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        dataPoints.forEach((point, index) => {
            const x = padding + (point.timestamp * scaleX);
            const y = canvas.height - padding - (point.lateralMovement * scaleY);

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Leyenda
        const legendY = padding - 10;
        ctx.fillStyle = 'hsl(210, 75%, 55%)';
        ctx.fillRect(canvas.width - 200, legendY, 15, 15);
        ctx.fillStyle = 'hsl(210, 10%, 45%)';
        ctx.fillText('Apertura Bucal', canvas.width - 180, legendY + 12);

        ctx.fillStyle = 'hsl(145, 65%, 50%)';
        ctx.fillRect(canvas.width - 200, legendY + 20, 15, 15);
        ctx.fillStyle = 'hsl(210, 10%, 45%)';
        ctx.fillText('Mov. Lateral', canvas.width - 180, legendY + 32);
    }

    /**
     * Elimina una sesión desde la vista de detalles del modal.
     * Requiere confirmación del usuario. Cierra el modal y recarga la lista.
     *
     * @param {string} sessionId - ID de la sesión a eliminar
     * @returns {void}
     */
    deleteSessionFromDetails(sessionId) {
        if (confirm('¿Estás seguro de que quieres eliminar esta sesión?')) {
            sessionRecorder.deleteSession(sessionId);
            this.closeSessionModal();
            // Recargar lista
            const container = document.getElementById('sessions-list');
            if (container) {
                this.renderSessionsList(container, sessionRecorder.getAllSessions());
            }
        }
    }

    /**
     * Elimina una sesión desde la lista principal.
     * Requiere confirmación del usuario y recarga la lista.
     *
     * @param {string} sessionId - ID de la sesión a eliminar
     * @returns {void}
     */
    deleteSession(sessionId) {
        if (confirm('¿Estás seguro de que quieres eliminar esta sesión?')) {
            sessionRecorder.deleteSession(sessionId);
            // Recargar lista
            const container = document.getElementById('sessions-list');
            if (container) {
                this.renderSessionsList(container, sessionRecorder.getAllSessions());
            }
        }
    }

    /**
     * Cierra el modal de detalles de sesión y limpia la referencia.
     *
     * @returns {void}
     */
    closeSessionModal() {
        const modal = document.getElementById('session-modal');
        if (modal) {
            modal.classList.remove('active');
        }
        this.currentSessionView = null;
    }

    /**
     * Mapea un estado de sesión a su clase CSS de badge.
     *
     * @param {('completed'|'partial'|'incomplete'|'in-progress')} status - Estado de la sesión
     * @returns {string} Clase CSS del badge (e.g. 'badge-success')
     */
    getStatusClass(status) {
        const classes = {
            'completed': 'badge-success',
            'partial': 'badge-warning',
            'incomplete': 'badge-danger',
            'in-progress': 'badge-info'
        };
        return classes[status] || '';
    }

    /**
     * Mapea un estado de sesión a su texto legible en español.
     *
     * @param {('completed'|'partial'|'incomplete'|'in-progress')} status - Estado de la sesión
     * @returns {string} Texto legible (e.g. 'Completado')
     */
    getStatusText(status) {
        const texts = {
            'completed': 'Completado',
            'partial': 'Parcial',
            'incomplete': 'Incompleto',
            'in-progress': 'En Progreso'
        };
        return texts[status] || status;
    }

    /**
     * Formatea una fecha al estilo largo argentino (e.g. "15 de febrero de 2026").
     *
     * @param {Date} date - Fecha a formatear
     * @returns {string} Fecha formateada en locale es-AR
     */
    formatDate(date) {
        return new Intl.DateTimeFormat('es-AR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(date);
    }

    /**
     * Formatea una hora en formato HH:MM argentino.
     *
     * @param {Date} date - Fecha de la cual extraer la hora
     * @returns {string} Hora formateada (e.g. "14:30")
     */
    formatTime(date) {
        return new Intl.DateTimeFormat('es-AR', {
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    /**
     * Filtra las sesiones por ejercicio y re-renderiza la lista.
     * Si el ID está vacío, muestra todas las sesiones.
     *
     * @param {string} exerciseId - ID del ejercicio a filtrar, o cadena vacía para mostrar todas
     * @returns {void}
     */
    filterByExercise(exerciseId) {
        const sessions = exerciseId
            ? sessionRecorder.getSessionsByExercise(exerciseId)
            : sessionRecorder.getAllSessions();

        const container = document.getElementById('sessions-list');
        if (container) {
            this.renderSessionsList(container, sessions);
        }
    }
}

// Exportar instancia singleton
const sessionReviewer = new SessionReviewer();
