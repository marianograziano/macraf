/**
 * Módulo de Gestión de Ejercicios
 * Maneja la creación, edición y almacenamiento de ejercicios personalizados
 */

class ExerciseManager {
    constructor() {
        this.exercises = [];
        this.currentExercise = null;
        this.jsonLoaded = false;
        this.initializeExercises();
    }

    /**
     * Inicializar ejercicios (cargar desde JSON o localStorage)
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
     * Cargar ejercicios desde archivo JSON
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
     * Guardar ejercicios en localStorage
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
     * Inicializar ejercicios por defecto si no hay ninguno
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
     * Generar ID único
     */
    generateId() {
        return 'ex_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Crear nuevo ejercicio
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
     * Actualizar ejercicio existente
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
     * Eliminar ejercicio
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
     * Obtener ejercicio por ID
     */
    getExerciseById(id) {
        return this.exercises.find(ex => ex.id === id);
    }

    /**
     * Obtener todos los ejercicios
     */
    getAllExercises() {
        return [...this.exercises];
    }

    /**
     * Obtener ejercicios por tipo
     */
    getExercisesByType(type) {
        return this.exercises.filter(ex => ex.type === type);
    }

    /**
     * Establecer ejercicio actual
     */
    setCurrentExercise(id) {
        this.currentExercise = this.getExerciseById(id);
        return this.currentExercise;
    }

    /**
     * Obtener ejercicio actual
     */
    getCurrentExercise() {
        return this.currentExercise;
    }

    /**
     * Obtener nombre del tipo de ejercicio
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
     * Formatear duración
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
     * Validar datos de ejercicio
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
     * Exportar ejercicios a JSON
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
     * Importar ejercicios desde archivo JSON
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
     * Resetear a ejercicios del JSON original
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
