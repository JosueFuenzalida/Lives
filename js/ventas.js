// ==========================================
// MÓDULO DE VENTAS (js/ventas.js)
// ==========================================
window.VentasModule = {
    categoriaSeleccionada: null,

    // 1. DIBUJAR LOS BOTONES DE CATEGORÍAS EN PANTALLA
    renderBotonesPrendas: function() {
        const contenedor = document.getElementById('prendas-container');
        if (!contenedor) return;

        contenedor.innerHTML = "";
        const categorias = window.AppState.db.ajustes.categorias || [];

        categorias.forEach(cat => {
            const boton = document.createElement('button');
            boton.className = 'btn-prenda';
            
            // Si el botón ya estaba seleccionado, mantenerlo iluminado
            if (this.categoriaSeleccionada?.id === cat.id) {
                boton.classList.add('active');
            }

            boton.innerHTML = `<span>${cat.icono || '👕'}</span> ${cat.nombre}`;
            
            // Al hacer clic en un botón de ropa
            boton.addEventListener('click', () => {
                this.categoriaSeleccionada = cat;
                
                // Quitamos el color activo a todos los botones y se lo ponemos solo a este
                document.querySelectorAll('.btn-prenda').forEach(b => b.classList.remove('active'));
                boton.classList.add('active');

                // Si está la lógica automática, calculamos el número que viene
                this.calcularCodigoAutomatico();
            });

            contenedor.appendChild(boton);
        });
    },

    // 2. ACTUALIZAR EL MENÚ DESPLEGABLE DE CLIENTAS
    actualizarSelectClientes: function() {
        const select = document.getElementById('venta-clienta');
        if (!select) return;

        select.innerHTML = '<option value="">-- Seleccionar Clienta --</option>';
        const clientes = window.AppState.db.clientes || [];

        clientes.forEach(cli => {
            const option = document.createElement('option');
            option.value = cli.id;
            option.textContent = cli.nombre;
            select.appendChild(option);
        });
    },

    // 3. GENERADOR DE CÓDIGO AUTOMÁTICO (Etiquetar Después)
    calcularCodigoAutomatico: function() {
        const modo = window.AppState.db.ajustes.modoCodigo || 'manual';
        const inputCodigo = document.getElementById('venta-codigo');
        if (!inputCodigo) return;
        
        if (modo === 'manual') {
            inputCodigo.removeAttribute('readonly');
            return;
        }

        // Si es automático, bloqueamos el cuadro para evitar errores de tipeo
        inputCodigo.setAttribute('readonly', 'true');

        if (!this.categoriaSeleccionada) {
            inputCodigo.value = "SELECCIONE PRENDA";
            return;
        }

        // Buscamos el Live corriendo en el historial para contar sus prendas
        const liveActual = window.AppState.db.historialLives.find(l => l.idLive === window.AppState.currentLive);
        let contador = 0;

        if (liveActual && liveActual.ventas) {
            // Contamos cuántas prendas vendidas en este live coinciden con el prefijo (ej: "BEB")
            liveActual.ventas.forEach(v => {
                if (v.codigo.startsWith(this.categoriaSeleccionada.prefijo)) {
                    contador++;
                }
            });
        }

        const siguienteNumero = contador + 1;
        const numeroFormateado = String(siguienteNumero).padStart(2, '0');
        
        inputCodigo.value = `${this.categoriaSeleccionada.prefijo}-${numeroFormateado}`;
    },

    // 4. REGISTRAR LA PRENDA EN LA MEMORIA
    registrarVenta: function() {
        const inputCodigo = document.getElementById('venta-codigo');
        const selectClienta = document.getElementById('venta-clienta');
        const inputPrecio = document.getElementById('venta-precio');

        if (!inputCodigo || !selectClienta || !inputPrecio) return;

        const codigo = inputCodigo.value.trim();
        const idClienta = selectClienta.value;
        const precio = parseInt(inputPrecio.value);

        // Validaciones rigurosas antes de guardar
        if (!codigo || codigo === "" || codigo === "SELECCIONE PRENDA") {
            alert("❌ Por favor, genera o ingresa un código de prenda.");
            return;
        }
        if (!idClienta || idClienta === "") {
            alert("❌ Debes seleccionar a la clienta.");
            return;
        }
        if (isNaN(precio) || precio <= 0) {
            alert("❌ Por favor, ingresa un precio válido.");
            return;
        }

        const datosClienta = window.AppState.db.clientes.find(c => c.id === idClienta);
        
        // Estructura de la venta
        const nuevaVenta = {
            idVenta: 'VEN-' + Date.now(),
            codigo: codigo.toUpperCase(),
            idClienta: idClienta,
            nombreClienta: datosClienta ? datosClienta.nombre : 'Desconocida',
            precio: precio,
            fechaHora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Buscamos la sesión del Live en el historial para insertarle la venta
        const indexLive = window.AppState.db.historialLives.findIndex(l => l.idLive === window.AppState.currentLive);
        
        if (indexLive !== -1) {
            window.AppState.db.historialLives[indexLive].ventas.push(nuevaVenta);
            
            // Guardamos físicamente en el almacenamiento del teléfono
            localStorage.setItem('RopasLive_Historial', JSON.stringify(window.AppState.db.historialLives));

            // Simulación visual del ticket impreso en pantalla
            alert(`📝 ¡VENTA REGISTRADA!\n\nTicket:\n-----------------------\nCódigo: ${nuevaVenta.codigo}\nClienta: ${nuevaVenta.nombreClienta}\nPrecio: $${nuevaVenta.precio.toLocaleString('es-CL')}\n-----------------------`);

            // Limpiamos los campos para la siguiente prenda del directo
            inputPrecio.value = "";
            if (window.AppState.db.ajustes.modoCodigo === 'manual') {
                inputCodigo.value = "";
            } else {
                // Si es automático, actualiza al tiro el número siguiente (ej: si era PAN-01, cambia a PAN-02)
                this.calcularCodigoAutomatico();
            }
        } else {
            alert("❌ Error: No se encontró la sesión del Live activo.");
        }
    }
};

// ==========================================
// ESCUCHA DE EVENTOS EN LA INTERFAZ
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const btnRegistrar = document.getElementById('btn-registrar-imprimir');

    if (btnRegistrar) {
        btnRegistrar.addEventListener('click', () => {
            window.VentasModule.registrarVenta();
        });
    }
});
