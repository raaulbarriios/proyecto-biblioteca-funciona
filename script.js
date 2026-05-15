/**
 * BiblioTech - Versión Simplificada con Firebase Firestore
 */

const app = {
    state: {
        currentUser: null,
        books: [],
        activeView: 'dashboard',
        cart: []
    },

    init() {
        this.renderLoginForm();
        this.bindEvents();
        this.setupRealtimeData();
        
        // Comprobar si hay sesión iniciada (simulada localmente para simplificar)
        const savedUser = sessionStorage.getItem('bibliotech_user');
        if (savedUser) {
            this.state.currentUser = JSON.parse(savedUser);
            this.showApp();
        }
    },

    bindEvents() {
        // Evento de Login
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Evento de Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Navegación Sidebar
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                if(view) this.switchView(view);
            });
        });

    },

    renderLoginForm() {
        const container = document.getElementById('dynamic-login-fields');
        if (!container) return;
        
        const fields = [
            { id: 'username', label: 'Correo electrónico', type: 'email', icon: 'bx-envelope', placeholder: 'tu@correo.com', attr: 'autocomplete="email" required' },
            { id: 'password', label: 'Contraseña', type: 'password', icon: 'bx-lock-alt', placeholder: '••••••••', attr: 'required', toggle: true }
        ];

        let html = '';
        fields.forEach(f => {
            const toggleHtml = f.toggle ? `<button type="button" id="toggle-pw" class="pw-toggle"><i class='bx bx-show'></i></button>` : '';
            html += `
                <div class="form-group">
                    <label for="${f.id}">${f.label}</label>
                    <div class="input-wrap">
                        <i class='bx ${f.icon}'></i>
                        <input type="${f.type}" id="${f.id}" placeholder="${f.placeholder}" ${f.attr}>
                        ${toggleHtml}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;

        // Mostrar/Ocultar contraseña (opcional de la UI)
        const togglePw = document.getElementById('toggle-pw');
        if(togglePw) {
            togglePw.addEventListener('click', () => {
                const input = document.getElementById('password');
                if (input.type === 'password') {
                    input.type = 'text';
                    togglePw.innerHTML = "<i class='bx bx-hide'></i>";
                } else {
                    input.type = 'password';
                    togglePw.innerHTML = "<i class='bx bx-show'></i>";
                }
            });
        }
    },

    async login() {
        const email = document.getElementById('username').value.toLowerCase().trim();
        const pass = document.getElementById('password').value;
        const errorMsg = document.getElementById('login-error');
        const loginBtnText = document.getElementById('login-btn-text');

        if (!email || !pass) {
            errorMsg.textContent = "Introduce correo y contraseña";
            errorMsg.classList.remove('hidden');
            return;
        }

        if (loginBtnText) loginBtnText.innerText = "Iniciando...";
        errorMsg.classList.add('hidden');

        try {
            // Iniciar sesión con Firebase Auth
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, pass);
            const userEmail = userCredential.user.email;
            
            // Determinar rol
            let role = 'colegio';
            let name = 'Colegio';
            if (userEmail.includes('admin')) {
                role = 'admin';
                name = 'Administrador';
            }

            this.state.currentUser = { name: name, role: role, email: userEmail };
            sessionStorage.setItem('bibliotech_user', JSON.stringify(this.state.currentUser));
            
            if (role === 'admin') {
                window.location.href = 'gestor_bd.html'; // Admin va directo al Gestor
                return;
            }

            // Éxito en login colegio
            document.getElementById('login-form').reset();
            if (loginBtnText) loginBtnText.innerText = "Iniciar Sesión";
            this.showApp();
            
        } catch (error) {
            console.error("Error Auth:", error);
            errorMsg.textContent = "Correo o contraseña incorrectos.";
            errorMsg.classList.remove('hidden');
            if (loginBtnText) loginBtnText.innerText = "Iniciar Sesión";
        }
    },

    async logout() {
        this.state.cart = [];
        try {
            await firebase.auth().signOut();
        } catch(e) {
            console.error(e);
        }
        this.state.currentUser = null;
        sessionStorage.removeItem('bibliotech_user');
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('login-screen').classList.add('active');
    },

    showApp() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');

        // Info del usuario
        document.getElementById('current-user-name').textContent = this.state.currentUser.name;
        document.getElementById('current-user-role').textContent = this.state.currentUser.role === 'admin' ? 'Administrador (Modo Colegio)' : 'Colegio';
        document.getElementById('user-avatar-char').textContent = this.state.currentUser.name.charAt(0);

        // Todos ven el menú de colegios ahora (el admin gestiona en su propio html)
        const adminNav = document.getElementById('admin-nav');
        if (adminNav) adminNav.classList.add('hidden');
        document.getElementById('school-nav').classList.remove('hidden');

        // Cargar las reservas de este colegio en su pestaña
        this.setupReservasRealtimeData();

        this.switchView('dashboard');
    },

    // ===== CARRITO DE PEDIDOS =====

    agregarAlCarrito(id, titulo, disponibles) {
        if (!this.state.currentUser) return;

        const existing = this.state.cart.find(item => item.id === id);
        if (existing) {
            // Ya está en el carrito: preguntar nueva cantidad
            const qty = prompt(`"${titulo}" ya está en el carrito (${existing.cantidad} und.)\n¿Nueva cantidad?`, existing.cantidad);
            if (!qty) return;
            const n = parseInt(qty);
            if (isNaN(n) || n <= 0) { alert('Cantidad no válida.'); return; }
            if (n > disponibles) { alert(`Solo hay ${disponibles} disponibles.`); return; }
            existing.cantidad = n;
        } else {
            const qty = prompt(`¿Cuántos ejemplares de "${titulo}" quieres reservar?`, '1');
            if (!qty) return;
            const n = parseInt(qty);
            if (isNaN(n) || n <= 0) { alert('Cantidad no válida.'); return; }
            if (n > disponibles) { alert(`Solo hay ${disponibles} disponibles.`); return; }
            this.state.cart.push({ id, titulo, cantidad: n, disponibles });
        }

        this.renderCart();
        // Mostrar FAB
        const fab = document.getElementById('cart-fab');
        if (fab) fab.classList.remove('hidden');
    },

    renderCart() {
        const itemsEl = document.getElementById('cart-items');
        const countEl = document.getElementById('cart-count');
        const summaryEl = document.getElementById('cart-summary');
        if (!itemsEl) return;

        const totalLibros = this.state.cart.reduce((s, i) => s + i.cantidad, 0);
        if (countEl) countEl.textContent = this.state.cart.length;
        if (summaryEl) {
            summaryEl.textContent = this.state.cart.length > 0
                ? `${this.state.cart.length} título(s) • ${totalLibros} ejemplar(es) en total`
                : '';
        }

        if (this.state.cart.length === 0) {
            itemsEl.innerHTML = `<div class="cart-empty"><i class='bx bx-cart-alt'></i>Tu carrito está vacío.<br>Añade libros desde el catálogo.</div>`;
            return;
        }

        itemsEl.innerHTML = this.state.cart.map((item, idx) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <span class="cart-item-title" title="${item.titulo}">${item.titulo}</span>
                    <div class="cart-item-controls">
                        <button class="cart-qty-btn" onclick="app.changeCartQty(${idx}, -1)">&#8722;</button>
                        <span class="cart-qty">${item.cantidad}</span>
                        <button class="cart-qty-btn" onclick="app.changeCartQty(${idx}, 1)">+</button>
                        <span style="font-size:0.75rem; color:#94a3b8; margin-left:4px;">disp: ${item.disponibles}</span>
                    </div>
                </div>
                <button class="cart-remove" onclick="app.removeFromCart(${idx})" title="Quitar">
                    <i class='bx bx-trash'></i>
                </button>
            </div>
        `).join('');
    },

    changeCartQty(idx, delta) {
        const item = this.state.cart[idx];
        if (!item) return;
        const newQty = item.cantidad + delta;
        if (newQty <= 0) { this.removeFromCart(idx); return; }
        if (newQty > item.disponibles) { alert(`Solo hay ${item.disponibles} disponibles.`); return; }
        item.cantidad = newQty;
        this.renderCart();
    },

    removeFromCart(idx) {
        this.state.cart.splice(idx, 1);
        this.renderCart();
        if (this.state.cart.length === 0) {
            document.getElementById('cart-fab').classList.add('hidden');
        }
    },

    openCart() {
        document.getElementById('cart-panel').classList.add('open');
        document.getElementById('cart-overlay').classList.remove('hidden');
        this.renderCart();
    },

    closeCart() {
        document.getElementById('cart-panel').classList.remove('open');
        document.getElementById('cart-overlay').classList.add('hidden');
    },

    async confirmarPedido() {
        if (this.state.cart.length === 0) {
            alert('El carrito está vacío.');
            return;
        }
        const totalLibros = this.state.cart.reduce((s, i) => s + i.cantidad, 0);
        if (!confirm(`¿Confirmar pedido de ${this.state.cart.length} título(s) con ${totalLibros} ejemplar(es)?`)) return;

        const btn = document.getElementById('confirm-order-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

        try {
            // Usamos una transacción para descontar el stock de forma atómica y segura
            await db.runTransaction(async (transaction) => {
                const librosRef = db.collection('Libros');
                const reservasRef = db.collection('Reservas');

                // 1. Leer el stock actual de todos los libros del carrito dentro de la transacción
                const reads = await Promise.all(
                    this.state.cart.map(item => transaction.get(librosRef.doc(item.id)))
                );

                // 2. Validar que hay suficiente stock para cada libro
                for (let i = 0; i < this.state.cart.length; i++) {
                    const snap = reads[i];
                    const item = this.state.cart[i];
                    if (!snap.exists) {
                        throw new Error(`El libro "${item.titulo}" ya no existe en la base de datos.`);
                    }
                    const disponiblesActuales = snap.data().disponibles || 0;
                    if (disponiblesActuales < item.cantidad) {
                        throw new Error(`Stock insuficiente para "${item.titulo}". Disponibles: ${disponiblesActuales}, pedidos: ${item.cantidad}.`);
                    }
                }

                // 3. Descontar el stock y crear las reservas
                for (let i = 0; i < this.state.cart.length; i++) {
                    const snap = reads[i];
                    const item = this.state.cart[i];
                    const nuevoDisponibles = snap.data().disponibles - item.cantidad;
                    const nuevoStatus = nuevoDisponibles > 0 ? 'Disponible' : 'Agotado';

                    // Actualizar stock del libro
                    transaction.update(librosRef.doc(item.id), {
                        disponibles: nuevoDisponibles,
                        status: nuevoStatus
                    });

                    // Crear el registro de reserva
                    const nuevaReservaRef = reservasRef.doc(); // genera ID automático
                    transaction.set(nuevaReservaRef, {
                        colegio: this.state.currentUser.name,
                        email: this.state.currentUser.email,
                        libro_id: item.id,
                        libro_titulo: item.titulo,
                        cantidad: item.cantidad,
                        fecha: new Date().toISOString(),
                        estado: 'pendiente'
                    });
                }
            });

            this.state.cart = [];
            this.renderCart();
            this.closeCart();
            document.getElementById('cart-fab').classList.add('hidden');
            alert('¡Pedido enviado correctamente! El stock ha sido actualizado.');
        } catch (error) {
            console.error('Error al enviar pedido:', error);
            alert('Error al enviar el pedido: ' + error.message);
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = "<i class='bx bx-send'></i> Confirmar Pedido"; }
        }
    },

    switchView(viewId) {
        this.state.activeView = viewId;
        
        // Cambiar vista activa
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const viewEl = document.getElementById(`view-${viewId}`);
        if(viewEl) viewEl.classList.add('active');

        // Cambiar nav activo
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll(`.nav-item[data-view="${viewId}"]`).forEach(i => i.classList.add('active'));

        // Título de la vista
        document.getElementById('view-title').textContent = viewId.charAt(0).toUpperCase() + viewId.slice(1);

        // Renderizar datos dependiendo de la vista
        if (viewId === 'inventario' || viewId === 'catalogo') {
            this.renderBooks();
        }
    },

    // Cargar datos en tiempo real desde Firebase Firestore
    setupRealtimeData() {
        db.collection('Libros').onSnapshot((snapshot) => {
            this.state.books = [];
            snapshot.forEach(doc => {
                this.state.books.push({ id: doc.id, ...doc.data() });
            });
            
            // Actualizar vistas si estamos en ellas
            if (this.state.activeView === 'inventario' || this.state.activeView === 'catalogo') {
                this.renderBooks();
            }
            this.updateDashboardStats();
        }, (error) => {
            console.error("Error cargando base de datos:", error);
        });
    },

    // Cargar historial de reservas del colegio actual
    setupReservasRealtimeData() {
        if (!this.state.currentUser) return;

        // Solo leemos las reservas que correspondan a este usuario
        db.collection('Reservas')
            .where('email', '==', this.state.currentUser.email)
            .onSnapshot((snapshot) => {
                const tbody = document.getElementById('mis-pedidos-tbody');
                if (!tbody) return;
                
                tbody.innerHTML = '';

                if (snapshot.empty) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#666;">No tienes reservas realizadas.</td></tr>';
                    return;
                }

                const reservas = [];
                snapshot.forEach(doc => reservas.push({ id: doc.id, ...doc.data() }));
                
                // Ordenar localmente por fecha (más recientes primero) para evitar problemas de índices complejos en Firestore
                reservas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

                reservas.forEach(res => {
                    const date = new Date(res.fecha).toLocaleString('es-ES');
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="font-weight:bold; color:#1e293b;">${res.libro_titulo}</td>
                        <td style="font-weight:bold;">${res.cantidad}</td>
                        <td>${date}</td>
                        <td><span class="status-pill reservado">Reservada</span></td>
                        <td style="color:#64748b; font-style:italic;">En revisión por el administrador</td>
                    `;
                    tbody.appendChild(tr);
                });
            }, (error) => {
                console.error("Error al cargar mis reservas:", error);
            });
    },

    renderBooks() {
        const tbody = document.getElementById('inventario-tbody'); // Tabla Admin
        const grid = document.getElementById('catalogo-grid'); // Cuadrícula Colegio

        if (tbody) tbody.innerHTML = '';
        if (grid) grid.innerHTML = '';

        this.state.books.forEach(book => {
            const statusColor = book.disponibles > 0 ? 'color: #10b981' : 'color: #ef4444';
            const statusText = book.disponibles > 0 ? 'Disponible' : 'Agotado';

            // ======= VISTA ADMIN (Tabla) =======
            if (this.state.currentUser?.role === 'admin' && tbody) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${book.titulo}</td>
                    <td>${book.autor}</td>
                    <td>${book.categoria || 'N/A'}</td>
                    <td>${book.total || 0}</td>
                    <td>${book.disponibles || 0}</td>
                    <td style="${statusColor}; font-weight:bold">${statusText}</td>
                    <td>
                        <a href="scripts_admin/gestor_bd.html" target="_blank" class="btn-primary" style="text-decoration:none; padding:4px 10px; font-size:12px; border-radius:4px">Ir al Gestor DB</a>
                    </td>
                `;
                tbody.appendChild(tr);
            }

            // ======= VISTA COLEGIO (Tarjetas) =======
            // Mostramos las tarjetas siempre que exista el contenedor grid, para que el Admin también las vea
            if (grid) {
                const card = document.createElement('div');
                card.style.cssText = "background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s;";
                
                const coverHtml = book.portada_url 
                    ? `<img src="${book.portada_url}" style="width:100%; height:200px; object-fit: cover; display:block; background:#f8fafc;">`
                    : `<div style="width:100%; height:180px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#cbd5e1;">
                           <i class='bx bx-book-alt' style="font-size:3rem;"></i>
                       </div>`;

                card.innerHTML = `
                    ${coverHtml}
                    <div style="padding: 1.25rem; flex: 1; display: flex; flex-direction: column;">
                        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
                            <h3 style="margin: 0; font-size:1.1rem; font-weight:700; color:#1e293b; line-height:1.3; flex:1; padding-right:10px;">${book.titulo}</h3>
                            <span style="font-size:0.7rem; padding:3px 8px; background:#eff6ff; color:#2563eb; border-radius:12px; font-weight:700; white-space:nowrap;">${book.edad_recomendada || 'Todas'}</span>
                        </div>
                        <p style="color: #64748b; font-size: 0.85rem; margin:0 0 4px 0;">Por <strong style="color:#475569">${book.autor}</strong></p>
                        <p style="font-size: 0.75rem; color: #94a3b8; margin:0 0 12px 0;">${book.editorial || ''} • <span style="color:#64748b">${book.categoria || 'General'}</span></p>
                        
                        <div style="flex-grow: 1;">
                            <p style="font-size: 0.85rem; color: #475569; line-height:1.5; margin-bottom:1.25rem; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">
                                ${book.sinopsis || 'Sin sinopsis disponible.'}
                            </p>
                        </div>

                        <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top:1rem;">
                            <span style="${statusColor}; font-weight:700; font-size:0.85rem;">${statusText} (${book.disponibles} disp.)</span>
                            <button onclick="app.agregarAlCarrito('${book.id}', '${book.titulo ? book.titulo.replace(/'/g, "\\'") : ''}', ${book.disponibles})"
                                    class="btn-primary"
                                    style="padding: 8px 16px; font-size: 0.8rem; display:inline-flex; align-items:center; gap:6px; width:auto; border-radius:8px;"
                                    ${book.disponibles <= 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                                <i class='bx bx-cart-add' style="font-size:1.1rem;"></i> Añadir
                            </button>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            }
        });

        // Botón en vista admin para abrir el gestor
        const addBtn = document.getElementById('add-book-btn');
        if (addBtn) {
            // Redirigir la acción de "Añadir libro" al gestor externo
            addBtn.onclick = () => window.open('scripts_admin/gestor_bd.html', '_blank');
            addBtn.innerHTML = "<i class='bx bx-data'></i> Abrir Gestor DB";
        }
    },

    updateDashboardStats() {
        const statsEl = document.getElementById('dashboard-stats');
        if (!statsEl) return;

        const total = this.state.books.length;
        const disp = this.state.books.filter(b => b.disponibles > 0).length;

        statsEl.innerHTML = `
            <div style="background: #eff6ff; padding: 20px; border-radius: 10px; border: 1px solid #bfdbfe;">
                <p style="margin:0; font-size:14px; color:#1d4ed8; text-transform:uppercase; font-weight:bold">Total de Libros en BD</p>
                <h2 style="margin:10px 0 0 0; font-size:36px; color:#1e3a8a">${total}</h2>
            </div>
            <div style="background: #ecfdf5; padding: 20px; border-radius: 10px; border: 1px solid #a7f3d0;">
                <p style="margin:0; font-size:14px; color:#047857; text-transform:uppercase; font-weight:bold">Títulos Disponibles</p>
                <h2 style="margin:10px 0 0 0; font-size:36px; color:#065f46">${disp}</h2>
            </div>
        `;
    }
};

// Iniciar aplicación
document.addEventListener('DOMContentLoaded', () => app.init());
window.app = app;
