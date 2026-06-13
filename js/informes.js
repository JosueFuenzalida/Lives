// ==========================================
// MÓDULO DE INFORMES (js/informes.js)
// ==========================================
window.InformesModule = {
    
    // 1. INICIALIZAR LA VISTA DE INFORMES
    initInformeView: function() {
        const selectLive = document.getElementById('informe-live-select');
        if (!selectLive) return;

        // Limpiamos las opciones del menú desplegable
        selectLive.innerHTML = "";

        // Traemos el historial de transmisiones desde el Estado Global
        const historial = window.AppState.db.historialLives || [];

        if (historial.length === 0) {
            selectLive.innerHTML = '<option value="">-- No hay historial disponible --</option>';
            document.getElementById('informe-text-out').value = "No se registran transmisiones pasadas para generar informes.";
            return;
        }

        // Llenamos el selector con los nombres de los Lives (empezando por el más reciente)
        // Usamos un bucle inverso para que los últimos queden arriba
        for (let i = historial.length - 1; i >= 0; i--) {
            const live = historial[i];
            const option = document.createElement('option');
            option.value = live.idLive;
            option.textContent = `${live.idLive} (${live.ventas.length} prendas)`;
            selectLive.appendChild(option);
        }

        // Escuchar cuando el usuario cambia de Live en el menú desplegable
        selectLive.removeEventListener('change', this.handleLiveChange);
        selectLive.addEventListener('change', (e) => this.generarTextoInforme(e.target.value));

        // Por defecto, generamos inmediatamente el informe del Live que esté seleccionado arriba
        this.generarTextoInforme(selectLive.value);
    },

    // 2. PROCESAR LOS DATOS Y GENERAR EL TEXTO PLANO
    generarTextoInforme: function(idLive) {
        const txtOut = document.getElementById('informe-text-out');
        if (!txtOut) return;

        if (!idLive || idLive === "") {
            txtOut.value = "Selecciona una transmisión válida.";
            return;
        }

        // Buscamos los datos completos de ese Live específico en el historial
        const datosLive = window.AppState.db.historialLives.find(l => l.idLive === idLive);

        if (!datosLive) {
            txtOut.value = "No se encontraron los datos del Live seleccionado.";
            return;
        }

        const ventas = datosLive.ventas || [];

        if (ventas.length === 0) {
            txtOut.value = `🛍️ Transmission: ${datosLive.idLive}\nFecha: ${datosLive.fecha}\n-----------------------------------\n\nNo se registraron ventas en esta transmisión.`;
            return;
        }

        // --- LÓGICA DE AGRUPACIÓN POR CLIENTA ---
        // Usamos un objeto intermedio para consolidar las compras
        const resumenClientes = {};

        ventas.forEach(venta => {
            // Si es la primera prenda de esta clienta, inicializamos su ficha
            if (!resumenClientes[venta.idClienta]) {
                resumenClientes[venta.idClienta] = {
                    nombre: venta.nombreClienta,
                    prendas: [],
                    totalPagar: 0
                };
            }
            // Agregamos la prenda y sumamos el precio al total
            resumenClientes[venta.idClienta].prendas.push(venta);
            resumenClientes[venta.idClienta].totalPagar += venta.precio;
        });

        // --- CONSTRUCCIÓN DEL CONTENIDO EN TEXTO ---
        let textoFinal = `🛍️ RESUMEN DE VENTAS\n`;
        textoFinal += `🎥 Transmisión: ${datosLive.idLive}\n`;
        textoFinal += `📅 Fecha: ${datosLive.fecha}\n`;
        if (datosLive.comentario) textoFinal += `📝 Nota: ${datosLive.comentario}\n`;
        textoFinal += `===================================\n\n`;

        let totalGeneralTransmision = 0;

        // Recorremos cada clienta agrupada para escribir su detalle
        for (const idCli in resumenClientes) {
            const data = resumenClientes[idCli];
            textoFinal += `👤 CLIENTA: ${data.nombre.toUpperCase()}\n`;
            textoFinal += `-----------------------------------\n`;
            
            // Listamos sus prendas compradas
            data.prendas.forEach(p => {
                textoFinal += `  🔹 [${p.codigo}] - $${p.precio.toLocaleString('es-CL')} (${p.fechaHora})\n`;
            });

            textoFinal += `\n💰 TOTAL A PAGAR: $${data.totalPagar.toLocaleString('es-CL')}\n`;
            textoFinal += `===================================\n\n`;
            
            totalGeneralTransmision += data.totalPagar;
        }

        textoFinal += `📊 REPORTE DE CAJA FINAL\n`;
        textoFinal += `💵 Total Recaudado en el Live: $${totalGeneralTransmision.toLocaleString('es-CL')}\n`;
        textoFinal += `👕 Total Prendas Adjudicadas: ${ventas.length}\n`;
        textoFinal += `✉️ ¡Gracias por comprar en RopasLive!`;

        // Inyectamos el texto construido dentro del cuadro de la interfaz
        txtOut.value = textoFinal;
    },

    // 3. ACCIÓN: COPIAR EL TEXTO AL PORTAPAPELES
    copiarTexto: function() {
        const txtOut = document.getElementById('informe-text-out');
        if (!txtOut || txtOut.value === "") return;

        txtOut.select();
        txtOut.setSelectionRange(0, 99999); // Rango de seguridad para teléfonos móviles

        try {
            navigator.clipboard.writeText(txtOut.value);
            alert("📋 ¡Texto copiado con éxito al portapapeles! Ya puedes pegarlo en cualquier chat.");
        } catch (err) {
            // Alternativa por si el navegador bloquea el portapapeles automático
            alert("Por favor, selecciona todo el texto del cuadro de arriba de forma manual y dale a Copiar.");
        }
    },

    // 4. ACCIÓN: COMPARTIR EN WHATSAPP
    enviarWhatsApp: function() {
        const txtOut = document.getElementById('informe-text-out');
        if (!txtOut || txtOut.value === "") return;

        // Codificamos el texto plano para que sea compatible con un enlace URL de navegador
        const textoCompartir = encodeURIComponent(txtOut.value);
        
        // Creamos la URL universal de la API de WhatsApp
        const urlWhatsApp = `https://api.whatsapp.com/send?text=${textoCompartir}`;

        // Abrimos la aplicación de WhatsApp en el fón o computadora
        window.open(urlWhatsApp, '_blank');
    }
};

// ==========================================
// CONFIGURACIÓN DE LOS BOTONES DE ACCIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const btnCopy = document.getElementById('btn-copy-text');
    const btnWA = document.getElementById('btn-share-whatsapp');

    if (btnCopy) {
        btnCopy.addEventListener('click', () => {
            window.InformesModule.copiarTexto();
        });
    }

    if (btnWA) {
        btnWA.addEventListener('click', () => {
            window.InformesModule.enviarWhatsApp();
        });
    }
});
