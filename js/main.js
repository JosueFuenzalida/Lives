// ==========================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ==========================================
window.AppState = {
    currentLive: null,        // Guardará el nombre del live activo (ej: "LIVE 13-06-2026")
    currentView: 'view-inicio', // Pantalla inicial por defecto
    db: {
        ajustes: {},
        clientes: [],
        historialLives: []
    }
};

// ==========================================
// AL INICIAR LA APP (DOMContentLoaded)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar la Base de Datos Local
    initLocalStorage();

    // 2. Aplicar el tema de color guardado
    aplicarTemaGuardado();

    // 3. Configurar la barra de navegación inferior
    configurarNavegacion();

    // 4. Configurar el inicio/cierre de la transmisión
    configurarControlLive();
});

// ==========================================
// 1. GESTIÓN DE BASE DE DATOS LOCAL (localStorage)
// ==========================================
function initLocalStorage() {
    // Si es la primera vez que se abre la app, creamos configuraciones por defecto
    if (!localStorage.getItem('RopasLive_Ajustes')) {
        const LibraryDefaults = {
            tema: 'azul',
            modoCodigo: 'manual',
            categorias: [
                { id: 'cat1', nombre: 'Bebé', prefijo: 'BEB', icono: '🚼' },
                { id: 'cat2', nombre: 'Pantalón', prefijo: 'PAN', icono: '👖' },
                { id: 'cat3', nombre: 'Falda', prefijo: 'FAL', icono: '👗' },
                { id: 'cat4', nombre: 'Polera', prefijo: 'POL', icono: '👕' }
            ]
        };
        localStorage.setItem('RopasLive_Ajustes', JSON.stringify(LibraryDefaults));
    }

    if (!localStorage.getItem('RopasLive_Clientes')) {
        localStorage.setItem('RopasLive_Clientes', JSON.stringify([]));
    }
    if (!localStorage.getItem('RopasLive_Historial')) {
        localStorage.setItem('RopasLive_Historial', JSON.stringify([]));
    }

    // Cargamos todo desde el almacenamiento físico al Estado Global en memoria
    window.AppState.db.ajustes = JSON.parse(localStorage.getItem('RopasLive_Ajustes'));
    window.AppState.db.clientes = JSON.parse(localStorage.getItem('RopasLive_Clientes'));
    window.AppState.db.historialLives = JSON.parse(localStorage.getItem('RopasLive_Historial'));
}

// ==========================================
// 2. APLICAR TEMA DE COLOR
// ==========================================
function aplicarTemaGuardado() {
    const tema = window.AppState.db.ajustes.tema || 'azul';
    const body = document.body;
    
    if (tema === 'azul') {
        body.removeAttribute('data-theme');
    } else {
        body.setAttribute('data-theme', tema);
    }

    const radioBoton = document.querySelector(`input[name="theme-opt"][value="${tema}"]`);
    if (radioBoton) radioBoton.checked = true;
}

// ==========================================
// 3. CONTROL DE NAVEGACIÓN (CAMBIO DE PANTALLAS)
// ==========================================
function configurarNavegacion() {
    const navButtons = document.querySelectorAll('.nav-bar .nav-item');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetView = button.getAttribute('data-target');

            // REGLA DE SEGURIDAD: No dejamos ir a Ventas o Informes si no hay un Live corriendo
            if (!window.AppState.currentLive && (targetView === 'view-venta' || targetView === 'view-informes')) {
                alert('⚠️ Primero debes iniciar una transmisión en la pestaña de Inicio.');
                irAPantalla('view-inicio');
                return;
            }

            irAPantalla(targetView);
        });
    });
}

function irAPantalla(viewId) {
    // Ocultar todas las pantallas y apagar botones
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('.nav-bar .nav-item').forEach(btn => btn.classList.remove('active'));

    // Encender la pantalla seleccionada
    const pantallaDestino = document.getElementById(viewId);
    if (pantallaDestino) pantallaDestino.classList.add('active');

    // Iluminar el botón correspondiente abajo
    const botonNav = document.querySelector(`.nav-bar .nav-item[data-target="${viewId}"]`);
    if (botonNav) botonNav.classList.add('active');

    window.AppState.currentView = viewId;

    // AVISOS MODULARES: Le avisamos a los otros archivos que redibujen sus datos si entramos a su pestaña
    if (viewId === 'view-venta' && window.VentasModule?.renderBotonesPrendas) {
        window.VentasModule.renderBotonesPrendas();
        window.VentasModule.actualizarSelectClientes();
    }
    if (viewId === 'view-clientes' && window.ClientesModule?.renderClientes) {
        window.ClientesModule.renderClientes();
    }
    if (viewId === 'view-informes' && window.InformesModule?.initInformeView) {
        window.InformesModule.initInformeView();
    }
    if (viewId === 'view-ajustes' && window.AjustesModule?.initAjustesView) {
        window.AjustesModule.initAjustesView();
    }
}

// ==========================================
// 4. CONTROL DE INICIO Y CIERRE DE TRANSMISIÓN
// ==========================================
function configurarControlLive() {
    const btnStart = document.getElementById('btn-start-live');
    const btnTopSession = document.getElementById('btn-top-session');
    const titleDisplay = document.getElementById('live-title-display');
    const initNameInput = document.getElementById('init-live-name');

    // Poner la fecha de hoy automáticamente en el campo de texto
    const hoy = new Date();
    const fechaFormateada = `${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${hoy.getFullYear()}`;
    initNameInput.value = `LIVE ${fechaFormateada}`;

    // Acción: INICIAR LIVE
    btnStart.addEventListener('click', () => {
        const nombreLive = initNameInput.value.trim();

        if (nombreLive === "") {
            alert("❌ Por favor, ingresa un nombre para identificar esta transmisión.");
            return;
        }

        window.AppState.currentLive = nombreLive;

        // Si este Live no existe en el historial, lo registramos como nuevo
        const existe = window.AppState.db.historialLives.some(l => l.idLive === nombreLive);
        if (!existe) {
            window.AppState.db.historialLives.push({
                idLive: nombreLive,
                fecha: fechaFormateada,
                comentario: document.getElementById('init-live-comment').value.trim(),
                ventas: []
            });
            localStorage.setItem('RopasLive_Historial', JSON.stringify(window.AppState.db.historialLives));
        }

        // Cambiar textos de la barra superior
        titleDisplay.textContent = nombreLive.toUpperCase();
        btnTopSession.style.display = 'block';

        // Redireccionar directo a la pantalla de Ventas
        irAPantalla('view-venta');
    });

    // Acción: CERRAR LIVE
    btnTopSession.addEventListener('click', () => {
        if (confirm("¿Estás seguro de que deseas cerrar el Live actual? Ya no podrás agregar más ventas a esta sesión.")) {
            window.AppState.currentLive = null;
            titleDisplay.textContent = "SIN LIVE INICIADO";
            btnTopSession.style.display = 'none';
            
            document.getElementById('init-live-comment').value = "";
            initNameInput.value = `LIVE ${fechaFormateada}`;

            irAPantalla('view-inicio');
        }
    });
}

// Hacemos la función pública para que los otros scripts independientes puedan cambiar de pantalla
window.irAPantalla = irAPantalla;
