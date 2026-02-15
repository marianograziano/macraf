/**
 * @module ExerciseManager
 * @description Módulo de Gestión de Ejercicios.
 * Maneja la creación, edición, validación, importación/exportación
 * y almacenamiento de ejercicios orofaciales personalizados.
 */

/**
 * @typedef {Object} Exercise
 * @property {string} id - Identificador único del ejercicio (prefijo 'ex_')
 * @property {string} name - Nombre descriptivo del ejercicio
 * @property {string} [description] - Descripción o instrucciones del ejercicio
 * @property {number} duration - Duración en segundos (10-600)
 * @property {('mouth-opening'|'lateral-movement'|'combined')} type - Tipo de ejercicio
 * @property {string} createdAt - Fecha de creación en formato ISO 8601
 * @property {string} [updatedAt] - Fecha de última actualización en formato ISO 8601
 */

/**
 * @typedef {Object} ExerciseData
 * @property {string} name - Nombre del ejercicio
 * @property {string} [description] - Descripción del ejercicio
 * @property {number|string} duration - Duración en segundos
 * @property {string} type - Tipo de ejercicio
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - `true` si los datos son válidos
 * @property {string[]} errors - Lista de mensajes de error (vacía si es válido)
 */

/**
 * @typedef {Object} ImportResult
 * @property {boolean} success - `true` si la importación fue exitosa
 * @property {number} count - Número de ejercicios importados
 * @property {boolean} replaced - `true` si se reemplazaron los existentes
 */

/**
 * Gestor de ejercicios orofaciales.
 * Persiste ejercicios en localStorage y puede cargar/exportar desde JSON.
 *
 * @class ExerciseManager
 * @example
 * const manager = new ExerciseManager();
 * await manager.initializeExercises();
 * const exercise = manager.createExercise({
 *   name: 'Apertura Básica',
 *   duration: 60,
 *   type: 'mouth-opening'
 * });
 */
class ExerciseManager {
    /**
     * Crea una nueva instancia del gestor de ejercicios.
     * Intenta cargar ejercicios desde localStorage o JSON al instanciarse.
     */
    constructor() {
        /** @type {Exercise[]} Lista de ejercicios almacenados */
        this.exercises = [];
        /** @type {?Exercise} Ejercicio seleccionado actualmente */
        this.currentExercise = null;
        /** @type {boolean} Indica si se cargaron ejercicios desde JSON */
        this.jsonLoaded = false;
        this.initializeExercises();
    }

    /**
     * Inicializa ejercicios cargando desde localStorage.
     * Si no hay datos almacenados, carga desde el archivo `exercises.json`.
     *
     * @async
     * @returns {void}
     */
    async initializeExercises() {
        // Primero intentar cargar desde localStorage
        const stored = localStorage.getItem('orofacial_exercises');

        if (stored) {
            try {
                this.exercises = JSON.parse(stored);
                this.jsonLoaded = true;
                console.log(`${this.exercises.length} ejercicios cargados desde localStorage`);
                return;
            } catch (error) {
                console.error('Error al cargar desde localStorage:', error);
            }
        }

        // Si no hay datos en localStorage, cargar desde JSON
        await this.loadFromJSON();
    }

    /**
     * Carga ejercicios desde el archivo `exercises.json` externo.
     * Si falla, inicializa con ejercicios por defecto.
     *
     * @async
     * @returns {void}
     * @throws {Error} Si no se puede leer el archivo (fallback a defaults)
     */
    async loadFromJSON() {
        try {
            const response = await fetch('exercises.json');
            if (!response.ok) {
                throw new Error('No se pudo cargar exercises.json');
            }

            const data = await response.json();
            this.exercises = data.exercises || [];
            this.jsonLoaded = true;

            // Guardar en localStorage
            this.saveExercises();

            console.log(`${this.exercises.length} ejercicios cargados desde JSON`);
        } catch (error) {
            console.error('Error al cargar JSON:', error);
            // Si falla, inicializar con ejercicios por defecto
            this.initializeDefaultExercises();
        }
    }

    /**
     * Persiste la lista de ejercicios actual en localStorage.
     *
     * @returns {void}
     */
    saveExercises() {
        try {
            localStorage.setItem('orofacial_exercises', JSON.stringify(this.exercises));
            console.log('Ejercicios guardados correctamente');
        } catch (error) {
            console.error('Error al guardar ejercicios:', error);
        }
    }

    /**
     * Inicializa 3 ejercicios por defecto si la lista está vacía:
     * Apertura Bucal Básica (60s), Movimiento Lateral (90s) y Ejercicio Completo (120s).
     *
     * @returns {void}
     */
    initializeDefaultExercises() {
        if (this.exercises.length === 0) {
            const defaultExercises = [
                {
                    id: this.generateId(),
                    name: 'Apertura Bucal Básica',
                    description: 'Abre la boca lo más que puedas y mantén la posición.',
                    duration: 60,
                    type: 'mouth-opening',
                    createdAt: new Date().toISOString()
                },
                {
                    id: this.generateId(),
                    name: 'Movimiento Lateral',
                    description: 'Mueve la mandíbula de lado a lado lentamente.',
                    duration: 90,
                    type: 'lateral-movement',
                    createdAt: new Date().toISOString()
                },
                {
                    id: this.generateId(),
                    name: 'Ejercicio Completo',
                    description: 'Combina apertura bucal y movimientos laterales.',
                    duration: 120,
                    type: 'combined',
                    createdAt: new Date().toISOString()
                }
            ];

            this.exercises = defaultExercises;
            this.saveExercises();
            console.log('Ejercicios por defecto inicializados');
        }
    }

    /**
     * Genera un ID único con prefijo 'ex_' y sufijo aleatorio.
     *
     * @returns {string} ID único con formato `ex_{timestamp}_{random}`
     */
    generateId() {
        return 'ex_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Crea un nuevo ejercicio y lo guarda en la lista.
     *
     * @param {ExerciseData} exerciseData - Datos del nuevo ejercicio
     * @returns {Exercise} El ejercicio creado con ID y timestamp asignados
     */
    createExercise(exerciseData) {
        const exercise = {
            id: this.generateId(),
            name: exerciseData.name,
            description: exerciseData.description || '',
            duration: parseInt(exerciseData.duration),
            type: exerciseData.type,
            createdAt: new Date().toISOString()
        };

        this.exercises.push(exercise);
        this.saveExercises();
        console.log('Ejercicio creado:', exercise.name);

        return exercise;
    }

    /**
     * Actualiza un ejercicio existente por su ID.
     *
     * @param {string} id - ID del ejercicio a actualizar
     * @param {ExerciseData} exerciseData - Nuevos datos del ejercicio
     * @returns {?Exercise} El ejercicio actualizado, o `null` si no se encontró
     */
    updateExercise(id, exerciseData) {
        const index = this.exercises.findIndex(ex => ex.id === id);

        if (index !== -1) {
            this.exercises[index] = {
                ...this.exercises[index],
                name: exerciseData.name,
                description: exerciseData.description || '',
                duration: parseInt(exerciseData.duration),
                type: exerciseData.type,
                updatedAt: new Date().toISOString()
            };

            this.saveExercises();
            console.log('Ejercicio actualizado:', this.exercises[index].name);

            return this.exercises[index];
        }

        return null;
    }

    /**
     * Elimina un ejercicio por su ID.
     *
     * @param {string} id - ID del ejercicio a eliminar
     * @returns {boolean} `true` si se eliminó, `false` si no se encontró
     */
    deleteExercise(id) {
        const index = this.exercises.findIndex(ex => ex.id === id);

        if (index !== -1) {
            const exercise = this.exercises[index];
            this.exercises.splice(index, 1);
            this.saveExercises();
            console.log('Ejercicio eliminado:', exercise.name);

            return true;
        }

        return false;
    }

    /**
     * Busca un ejercicio por su ID.
     *
     * @param {string} id - ID del ejercicio a buscar
     * @returns {?Exercise} El ejercicio encontrado o `undefined`
     */
    getExerciseById(id) {
        return this.exercises.find(ex => ex.id === id);
    }

    /**
     * Obtiene una copia de todos los ejercicios almacenados.
     *
     * @returns {Exercise[]} Copia del array de ejercicios
     */
    getAllExercises() {
        return [...this.exercises];
    }

    /**
     * Filtra ejercicios por tipo.
     *
     * @param {('mouth-opening'|'lateral-movement'|'combined')} type - Tipo a filtrar
     * @returns {Exercise[]} Ejercicios que coinciden con el tipo
     */
    getExercisesByType(type) {
        return this.exercises.filter(ex => ex.type === type);
    }

    /**
     * Establece el ejercicio actual por su ID.
     *
     * @param {string} id - ID del ejercicio a seleccionar
     * @returns {?Exercise} El ejercicio seleccionado o `undefined`
     */
    setCurrentExercise(id) {
        this.currentExercise = this.getExerciseById(id);
        return this.currentExercise;
    }

    /**
     * Obtiene el ejercicio actualmente seleccionado.
     *
     * @returns {?Exercise} Ejercicio actual o `null`
     */
    getCurrentExercise() {
        return this.currentExercise;
    }

    /**
     * Convierte el código de tipo de ejercicio a nombre legible en español.
     *
     * @param {string} type - Código de tipo
     * @returns {string} Nombre legible del tipo
     */
    getTypeName(type) {
        const typeNames = {
            'mouth-opening': 'Apertura Bucal',
            'lateral-movement': 'Movimiento Lateral',
            'combined': 'Combinado'
        };
        return typeNames[type] || type;
    }

    /**
     * Formatea una duración en segundos a un string legible (e.g. "2m 30s").
     *
     * @param {number} seconds - Duración en segundos
     * @returns {string} Duración formateada
     */
    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;

        if (mins > 0) {
            return `${mins}m ${secs}s`;
        }
        return `${secs}s`;
    }

    /**
     * Valida los datos de un ejercicio antes de crear o actualizar.
     * Verifica nombre, duración (10-600s) y tipo.
     *
     * @param {ExerciseData} exerciseData - Datos a validar
     * @returns {ValidationResult} Resultado de la validación
     */
    validateExercise(exerciseData) {
        const errors = [];

        if (!exerciseData.name || exerciseData.name.trim() === '') {
            errors.push('El nombre del ejercicio es requerido');
        }

        if (!exerciseData.duration || exerciseData.duration < 10) {
            errors.push('La duración debe ser de al menos 10 segundos');
        }

        if (exerciseData.duration > 600) {
            errors.push('La duración no puede exceder 10 minutos');
        }

        if (!exerciseData.type) {
            errors.push('Debes seleccionar un tipo de ejercicio');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Exporta todos los ejercicios a un archivo JSON descargable.
     * Genera un archivo con nombre `ejercicios_orofaciales_{fecha}.json`.
     *
     * @returns {void}
     */
    exportToJSON() {
        const exportData = {
            exercises: this.exercises,
            version: '1.0',
            lastModified: new Date().toISOString()
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `ejercicios_orofaciales_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('Ejercicios exportados a JSON');
    }

    /**
     * Importa ejercicios desde un archivo JSON.
     * Permite reemplazar los ejercicios existentes o combinarlos sin duplicados.
     *
     * @async
     * @param {File} file - Archivo JSON a importar
     * @returns {Promise<ImportResult>} Resultado de la importación
     * @throws {Error} Si el formato del JSON es inválido o no hay ejercicios válidos
     */
    async importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);

                    if (!data.exercises || !Array.isArray(data.exercises)) {
                        throw new Error('Formato de JSON inválido');
                    }

                    // Validar cada ejercicio
                    const validExercises = data.exercises.filter(ex => {
                        return ex.name && ex.duration && ex.type;
                    });

                    if (validExercises.length === 0) {
                        throw new Error('No se encontraron ejercicios válidos en el archivo');
                    }

                    // Preguntar si reemplazar o combinar
                    const replace = confirm(
                        `Se encontraron ${validExercises.length} ejercicios.\n` +
                        `¿Deseas REEMPLAZAR todos los ejercicios actuales?\n\n` +
                        `OK = Reemplazar\nCancelar = Combinar (agregar sin duplicar)`
                    );

                    if (replace) {
                        this.exercises = validExercises;
                    } else {
                        // Combinar ejercicios evitando duplicados por ID
                        const existingIds = new Set(this.exercises.map(ex => ex.id));
                        const newExercises = validExercises.filter(ex => !existingIds.has(ex.id));
                        this.exercises = [...this.exercises, ...newExercises];
                    }

                    this.saveExercises();
                    console.log(`${validExercises.length} ejercicios importados correctamente`);

                    resolve({
                        success: true,
                        count: validExercises.length,
                        replaced: replace
                    });
                } catch (error) {
                    console.error('Error al importar JSON:', error);
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Error al leer el archivo'));
            };

            reader.readAsText(file);
        });
    }

    /**
     * Resetea los ejercicios a los valores originales del archivo JSON.
     * Requiere confirmación del usuario. Elimina personalizaciones.
     *
     * @async
     * @returns {boolean} `true` si se reseteó, `false` si el usuario canceló
     */
    async resetToDefault() {
        if (confirm('¿Estás seguro de que quieres resetear a los ejercicios originales? Se perderán todos los cambios.')) {
            localStorage.removeItem('orofacial_exercises');
            this.exercises = [];
            await this.loadFromJSON();
            return true;
        }
        return false;
    }
}

// Exportar instancia singleton
const exerciseManager = new ExerciseManager();
