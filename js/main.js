// ==========================================
// 4. CONTROL DE INICIO Y CIERRE DE TRANSMISIÓN (REVISADO)
// ==========================================
function configurarControlLive() {
    const btnStart = document.getElementById('btn-start-live');
    const btnTopSession = document.getElementById('btn-top-session');
    const titleDisplay = document.getElementById('live-title-display');
    const liveDot = document.getElementById('live-dot');
    const initNameInput = document.getElementById('init-live-name');

    const hoy = new Date();
    const fechaFormateada = `${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${hoy.getFullYear()}`;
    if (initNameInput) initNameInput.value = `LIVE ${fechaFormateada}`;

    if (btnStart) {
        btnStart.addEventListener('click', () => {
            const nombreLive = initNameInput.value.trim();

            if (nombreLive === "") {
                alert("❌ Por favor, ingresa un identificador para el Live.");
                return;
            }

            window.AppState.currentLive = nombreLive;

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

            // Cambiar estados visuales superiores del esquema real
            if (titleDisplay) titleDisplay.textContent = nombreLive.toUpperCase();
            if (liveDot) liveDot.style.display = 'block'; // Encender luz roja pulsante
            if (btnTopSession) btnTopSession.style.display = 'block';

            // Forzar salto a la pestaña operativa
            irAPantalla('view-venta');
        });
    }

    if (btnTopSession) {
        btnTopSession.addEventListener('click', () => {
            if (confirm("¿Terminar el Live actual? Se cerrará el registro de este perchero.")) {
                window.AppState.currentLive = null;
                if (titleDisplay) titleDisplay.textContent = "MODO ESPERA";
                if (liveDot) liveDot.style.display = 'none';
                if (btnTopSession) btnTopSession.style.display = 'none';
                
                document.getElementById('init-live-comment').value = "";
                if (initNameInput) initNameInput.value = `LIVE ${fechaFormateada}`;

                irAPantalla('view-inicio');
            }
        });
    }
}
