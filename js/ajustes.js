// ==========================================
// MÓDULO DE AJUSTES (js/ajustes.js)
// ==========================================
window.AjustesModule = {

    // 1. CARGAR Y MOSTRAR LOS AJUSTES EN PANTALLA
    initAjustesView: function() {
        const ajustes = window.AppState.db.ajustes;

        // Marcar el modo de código guardado (Manual o Automático)
        const modo = ajustes.modoCodigo || 'manual';
        const radioModo = document.querySelector(`input[name="codigo-mode"][value="${modo}"]`);
        if (radioModo) radioModo.checked = true;

        // Dibujar el formulario dinámico para editar los 4 botones rápidos de prendas
        this.renderFormularioCategorias();

        // Configurar los eventos de los controles de la pantalla (Opciones de radio y archivos)
        this.amarrarEventosAjustes();
    },

    // 2. DIBUJAR LOS CAMPOS DE EDICIÓN DE BOTONES
    renderFormularioCategorias: function() {
        const contenedor = document.getElementById('config-botones-list');
        if (!contenedor) return;

        contenedor.innerHTML = "";
        const categorias = window.AppState.db.ajustes.categorias || [];

        categorias.forEach((cat, index) => {
            const divItem = document.createElement('div');
            divItem.style.display = 'flex';
            divItem.style.gap = '8px';
            divItem.style.marginBottom = '10px';
            divItem.className = 'config-row';

            // Inyectamos tres cuadros de texto por botón: Ícono, Nombre y Prefijo
            divItem.innerHTML = `
                <input type="text" class="form-control input-ico" style="width: 15%; text-align:center; padding:8px;" value="${cat.icono}" data-index="${index}" placeholder="Ico">
                <input type="text" class="form-control input-nom" style="width: 55%; padding:8px;" value="${cat.nombre}" data-index="${index}" placeholder="Nombre Categoria">
                <input type="text" class="form-control input-pre" style="width: 30%; padding:8px; text-transform: uppercase;" value="${cat.prefijo}" data-index="${index}" placeholder="PRE">
            `;
            contenedor.appendChild(divItem);
        });
    },

    // 3. ENLAZAR LOS INTERRUPTORES DE CAMBIO DE TEMA Y COMPORTAMIENTO
    amarrarEventosAjustes: function() {
        // Escuchar el cambio en los botones redondos del Tema de color
        document.querySelectorAll('input[name="theme-opt"]').forEach(radio => {
            radio.removeEventListener('change', this.handleThemeChange);
            radio.addEventListener('change', (e) => {
                const nuevoTema = e.target.value;
                window.AppState.db.ajustes.tema = nuevoTema;
                localStorage.setItem('RopasLive_Ajustes', JSON.stringify(window.AppState.db.ajustes));
                
                // Aplicar el color al body de inmediato
                if (nuevoTema === 'azul') {
                    document.body.removeAttribute('data-theme');
                } else {
                    document.body.setAttribute('data-theme', nuevoTema);
                }
            });
        });

        // Escuchar el cambio entre modo Manual y Automático
        document.querySelectorAll('input[name="codigo-mode"]').forEach(radio => {
            radio.removeEventListener('change', this.handleModeChange);
            radio.addEventListener('change', (e) => {
                window.AppState.db.ajustes.modoCodigo = e.target.value;
                localStorage.setItem('RopasLive_Ajustes', JSON.stringify(window.AppState.db.ajustes));
            });
        });
    },

    // 4. GUARDAR CAMBIOS DE LOS 4 BOTONES DE PRENDAS
    guardarCategoriasEditadas: function() {
        const categorias = window.AppState.db.ajustes.categorias || [];
        
        const inputsIco = document.querySelectorAll('.input-ico');
        const inputsNom = document.querySelectorAll('.input-nom');
        const inputsPre = document.querySelectorAll('.input-pre');

        // Recorremos los campos y actualizamos la memoria
        for (let i = 0; i < categorias.length; i++) {
            categorias[i].icono = inputsIco[i].value.trim() || '👕';
            categorias[i].nombre = inputsNom[i].value.trim() || 'Prenda';
            categorias[i].prefijo = inputsPre[i].value.trim().toUpperCase() || 'PRE';
        }

        window.AppState.db.ajustes.categorias = categorias;
        localStorage.setItem('RopasLive_Ajustes', JSON.stringify(window.AppState.db.ajustes));
        
        alert("✅ Configuración de categorías guardada con éxito. Los botones de ventas se han actualizado.");
    },

    // 5. EXPORTAR COPIA DE SEGURIDAD (.JSON)
    exportarDatosBackup: function() {
        // Estructuramos todo lo que hay en el LocalStorage en un solo objeto masivo
        const dataCompleta = {
            ajustes: window.AppState.db.ajustes,
            clientes: window.AppState.db.clientes,
            historialLives: window.AppState.db.historialLives
        };

        // Convertimos el objeto a texto plano JSON ordenado
        const jsonString = JSON.stringify(dataCompleta, null, 2);
        
        // Truco web para forzar una descarga de archivo en el teléfono o PC
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `RopasLive_Backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // 6. IMPORTAR COPIA DE SEGURIDAD
    importarDatosBackup: function(evento) {
        const archivo = evento.target.files[0];
        if (!archivo) return;

        const lector = new FileReader();
        lector.onload = function(e) {
            try {
                const datosCargados = JSON.parse(e.target.result);

                // Validamos que el archivo tenga la estructura correcta del programa
                if (datosCargados.ajustes && datosCargados.clientes && datosCargados.historialLives) {
                    
                    // Sobrescribimos el almacenamiento físico del fón
                    localStorage.setItem('RopasLive_Ajustes', JSON.stringify(datosCargados.ajustes));
                    localStorage.setItem('RopasLive_Clientes', JSON.stringify(datosCargados.clientes));
                    localStorage.setItem('RopasLive_Historial', JSON.stringify(datosCargados.historialLives));

                    alert("📥 ¡Datos importados con éxito! La aplicación se recargará para aplicar los cambios.");
                    window.location.reload(); // Recarga la app completa para evitar datos corruptos en cache
                } else {
                    alert("❌ El archivo seleccionado no tiene el formato correcto de RopasLive.");
                }
            } catch (err) {
                alert("❌ Error al leer el archivo. Asegúrate de que sea un respaldo .json válido.");
            }
        };
        lector.readAsText(archivo);
    }
};

// ==========================================
// CONFIGURACIÓN DE LOS BOTONES DE LA INTERFAZ
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const btnSaveCat = document.getElementById('btn-save-botones');
    const btnExport = document.getElementById('btn-export-backup');
    const btnImport = document.getElementById('btn-import-backup');
    const fileInput = document.getElementById('file-import-input');

    if (btnSaveCat) {
        btnSaveCat.addEventListener('click', () => window.AjustesModule.guardarCategoriasEditadas());
    }
    if (btnExport) {
        btnExport.addEventListener('click', () => window.AjustesModule.exportarDatosBackup());
    }
    
    // Disparar el selector de archivos oculto al presionar el botón visual
    if (btnImport && fileInput) {
        btnImport.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => window.AjustesModule.importarDatosBackup(e));
    }
});
