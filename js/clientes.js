// ==========================================
// MÓDULO DE CLIENTES (js/clientes.js)
// ==========================================
window.ClientesModule = {
    // FUNCIÓN PARA DIBUJAR LAS CLIENTAS EN PANTALLA
    renderClientes: function() {
        const listaContenedor = document.getElementById('clientes-list');
        const buscador = document.getElementById('search-clientes');
        const filtro = buscador ? buscador.value.toLowerCase().trim() : "";

        if (!listaContenedor) return;
        listaContenedor.innerHTML = "";

        // Traemos el arreglo de clientes desde el Estado Global
        const listaClientas = window.AppState.db.clientes || [];

        // Si la lista está vacía
        if (listaClientas.length === 0) {
            listaContenedor.innerHTML = `<p style="text-align:center; color:var(--muted-text); margin-top:20px;">No hay clientas registradas. Presiona el botón (+) de abajo para agregar la primera.</p>`;
            return;
        }

        // Filtramos según el texto de búsqueda
        const clientasFiltradas = listaClientas.filter(cliente => {
            return cliente.nombre.toLowerCase().includes(filtro);
        });

        // Si la búsqueda no arroja coincidencias
        if (clientasFiltradas.length === 0) {
            listaContenedor.innerHTML = `<p style="text-align:center; color:var(--muted-text); margin-top:20px;">No se encontraron clientas con "${filtro}".</p>`;
            return;
        }

        // Dibujamos cada clienta en un acordeón limpio
        clientasFiltradas.forEach(cliente => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.padding = '12px';
            card.style.cursor = 'pointer';

            card.innerHTML = `
                <div class="accordion-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:bold; font-size:16px;">👤 ${cliente.nombre}</span>
                    <span style="font-size:12px; color:var(--muted-text);">▼ Detalles</span>
                </div>
                <div class="accordion-content" style="display:none; padding-top:12px; margin-top:10px; border-top:1px solid var(--input-border);">
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Código Único:</strong> ${cliente.id}</p>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <button class="btn-block btn-secondary" style="padding:8px; margin:0; font-size:12px; background:#e74c3c; color:white; border:none;" onclick="window.ClientesModule.eliminarCliente('${cliente.id}')">🗑️ Eliminar Clienta</button>
                    </div>
                </div>
            `;

            // Escuchamos el clic para abrir o cerrar los detalles
            card.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') return; // Evitamos interferir con el botón de borrar

                const content = card.querySelector('.accordion-content');
                const indicator = card.querySelector('.accordion-header span:last-child');
                
                if (content.style.display === 'none') {
                    content.style.display = 'block';
                    indicator.textContent = '▲ Cerrar';
                } else {
                    content.style.display = 'none';
                    indicator.textContent = '▼ Detalles';
                }
            });

            listaContenedor.appendChild(card);
        });
    },

    // FUNCIÓN PARA AGREGAR UNA NUEVA CLIENTA
    agregarCliente: function() {
        const nombre = prompt("Ingresa el NOMBRE COMPLETO de la nueva clienta:");
        
        if (!nombre || nombre.trim() === "") return;
        const nombreLimpio = nombre.trim();

        // Evitamos duplicados exactos
        const existe = window.AppState.db.clientes.some(c => c.nombre.toLowerCase() === nombreLimpio.toLowerCase());
        if (existe) {
            alert("❌ Ya existe una clienta registrada con ese mismo nombre.");
            return;
        }

        // Estructura de la clienta
        const nuevaClienta = {
            id: 'CLI-' + Date.now(), // ID único basado en milisegundos
            nombre: nombreLimpio
        };

        // Guardamos en memoria y en almacenamiento físico
        window.AppState.db.clientes.push(nuevaClienta);
        localStorage.setItem('RopasLive_Clientes', JSON.stringify(window.AppState.db.clientes));

        // Actualizamos la vista de inmediato
        this.renderClientes();
    },

    // FUNCIÓN PARA ELIMINAR UNA CLIENTA
    eliminarCliente: function(idCliente) {
        if (confirm("¿Estás seguro de que deseas eliminar esta clienta? No se borrarán sus compras históricas, pero ya no aparecerá en los menús.")) {
            window.AppState.db.clientes = window.AppState.db.clientes.filter(c => c.id !== idCliente);
            localStorage.setItem('RopasLive_Clientes', JSON.stringify(window.AppState.db.clientes));
            this.renderClientes();
        }
    }
};

// ==========================================
// ESCUCHA DE EVENTOS EN LA INTERFAZ
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const fabAdd = document.getElementById('fab-add-cliente');
    const buscador = document.getElementById('search-clientes');

    if (fabAdd) {
        fabAdd.addEventListener('click', () => {
            window.ClientesModule.agregarCliente();
        });
    }

    if (buscador) {
        buscador.addEventListener('input', () => {
            window.ClientesModule.renderClientes();
        });
    }
});
