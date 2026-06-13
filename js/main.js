// ==========================================
// REGISTRO DEL SERVICE WORKER (PWA)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('🚀 Service Worker operativo y registrado con éxito', reg))
            .catch(err => console.error('❌ Error al registrar el Service Worker', err));
    });
}

// ==========================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ==========================================
window.AppState = {
    currentLive: null,        // Nombre del live activo (ej: "LIVE 13-06-2026")
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

    // Cargamos del almacenamiento físico a la memoria global indexada
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
    const navButtons = document.querySelectorAll('.navigation-bar .nav-link');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetView = button.getAttribute('data-target');

            // REGLA DE SEGURIDAD OPERATIVA: Bloqueo si no hay transmisión abierta
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
    document.querySelectorAll('.navigation-bar .nav-link').forEach(btn => btn.classList.remove('active'));

    // Encender la pantalla seleccionada
    const pantallaDestino = document.getElementById(viewId);
    if (pantallaDestino) pantallaDestino.classList.add('active');

    // Iluminar el botón correspondiente abajo
    const botonNav = document.querySelector(`.navigation-bar .nav-link[data-target="${viewId}"]`);
    if (botonNav) botonNav.classList.add('active');

    window.AppState.currentView = viewId;

    // REDIBUJADO MODULAR: Avisos de refresco entre archivos JS
    if (viewId === 'view-venta' && window.VentasModule?.renderBotonesPrendas) {
        window.VentasModule.renderBotonesPrendas();
        window.VentasModule.actualizarSelectClientes();
        if (window.VentasModule.calcularCodigoAutomatico) {
            window.VentasModule.calcularCodigoAutomatico();
        }
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
    const liveDot = document.getElementById('live-dot');
    const initNameInput = document.getElementById('init-live-name');

    // Poner la fecha automática en el cuadro de texto
    const hoy = new Date();
    const fechaFormateada = `${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${hoy.getFullYear()}`;
    if (initNameInput) initNameInput.value = `LIVE ${fechaFormateada}`;

    // Acción: ENTRAR AL LIVE
    if (btnStart) {
        btnStart.addEventListener('click', () => {
            const nombreLive = initNameInput.value.trim();

            if (nombreLive === "") {
                alert("❌ Por favor, ingresa un identificador para el Live.");
                return;
            }

            window.AppState.currentLive = nombreLive;

            // Registrar nueva sesión de directo si no existía en el historial
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

            // Encender la interfaz de transmisión en vivo superior
            if (titleDisplay) titleDisplay.textContent = nombreLive.toUpperCase();
            if (liveDot) liveDot.style.display = 'block'; // Activar parpadeo rojo
            if (btnTopSession) btnTopSession.style.display = 'block';

            // Salto instantáneo al panel operativo
            irAPantalla('view-venta');
        });
    }

    // Acción: TERMINAR LIVE
    if (btnTopSession) {
        btnTopSession.addEventListener('click', () => {
            if (confirm("¿Terminar el Live actual? Se cerrará el registro de este perchero.")) {
                window.AppState.currentLive = null;
                if (titleDisplay) titleDisplay.textContent = "MODO ESPERA";
                if (liveDot) liveDot.style.display = 'none';
                if (btnTopSession) btnTopSession.style.display = 'none';
                
                if (document.getElementById('init-live-comment')) {
                    document.getElementById('init-live-comment').value = "";
                }
                if (initNameInput) initNameInput.value = `LIVE ${fechaFormateada}`;

                irAPantalla('view-inicio');
            }
        });
    }
}

// Publicamos la función globalmente para intercomunicación entre los módulos
window.irAPantalla = irAPantalla;
