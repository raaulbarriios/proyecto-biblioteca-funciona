/**
 * BiblioTech – Script portal Colegios
 */
const app = {
    state: { currentUser: null, books: [], activeView: 'dashboard', cart: [] },

    init() {
        this.renderLoginForm();
        this.bindEvents();
        this.setupRealtimeData();
        const savedUser = sessionStorage.getItem('bibliotech_user');
        if (savedUser) {
            this.state.currentUser = JSON.parse(savedUser);
            if (this.state.currentUser.role === 'admin') { window.location.href = '../admin/'; return; }
            this.showApp();
        }
    },

    bindEvents() {
        document.getElementById('login-form').addEventListener('submit', (e) => { e.preventDefault(); this.login(); });
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => { const v = item.dataset.view; if(v) this.switchView(v); });
        });
    },

    renderLoginForm() {
        const container = document.getElementById('dynamic-login-fields');
        if (!container) return;
        container.innerHTML = `
            <div class="form-group">
                <label for="username">Correo electrónico</label>
                <div class="input-wrap"><i class='bx bx-envelope'></i>
                    <input type="email" id="username" placeholder="tu@colegio.com" autocomplete="email" required>
                </div>
            </div>
            <div class="form-group">
                <label for="password">Contraseña</label>
                <div class="input-wrap"><i class='bx bx-lock-alt'></i>
                    <input type="password" id="password" placeholder="••••••••" required>
                    <button type="button" id="toggle-pw" class="pw-toggle"><i class='bx bx-show'></i></button>
                </div>
            </div>`;
        document.getElementById('toggle-pw').addEventListener('click', () => {
            const inp = document.getElementById('password');
            inp.type = inp.type === 'password' ? 'text' : 'password';
            document.querySelector('#toggle-pw i').className = inp.type === 'password' ? 'bx bx-show' : 'bx bx-hide';
        });
    },

    async login() {
        const email = document.getElementById('username').value.toLowerCase().trim();
        const pass = document.getElementById('password').value;
        const errorMsg = document.getElementById('login-error');
        const loginBtnText = document.getElementById('login-btn-text');
        if (!email || !pass) { errorMsg.textContent = "Introduce correo y contraseña"; errorMsg.classList.remove('hidden'); return; }
        if (loginBtnText) loginBtnText.innerText = "Iniciando...";
        errorMsg.classList.add('hidden');
        try {
            const cred = await firebase.auth().signInWithEmailAndPassword(email, pass);
            const userEmail = cred.user.email;
            if (userEmail.includes('admin')) {
                sessionStorage.setItem('bibliotech_user', JSON.stringify({ name: 'Administrador', role: 'admin', email: userEmail }));
                window.location.href = '../admin/'; return;
            }
            const name = userEmail.split('@')[0] || 'Colegio';
            this.state.currentUser = { name, role: 'colegio', email: userEmail };
            sessionStorage.setItem('bibliotech_user', JSON.stringify(this.state.currentUser));
            document.getElementById('login-form').reset();
            if (loginBtnText) loginBtnText.innerText = "Iniciar Sesión";
            this.showApp();
        } catch (error) {
            errorMsg.textContent = "Correo o contraseña incorrectos.";
            errorMsg.classList.remove('hidden');
            if (loginBtnText) loginBtnText.innerText = "Iniciar Sesión";
        }
    },

    async logout() {
        this.state.cart = [];
        try { await firebase.auth().signOut(); } catch(e) {}
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
        document.getElementById('current-user-name').textContent = this.state.currentUser.name;
        document.getElementById('current-user-role').textContent = 'Colegio';
        document.getElementById('user-avatar-char').textContent = this.state.currentUser.name.charAt(0).toUpperCase();
        document.getElementById('school-nav').classList.remove('hidden');
        this.setupReservasRealtimeData();
        this.switchView('dashboard');
    },

    agregarAlCarrito(id, titulo, disponibles) {
        if (!this.state.currentUser) return;
        const existing = this.state.cart.find(i => i.id === id);
        if (existing) {
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
        if (summaryEl) summaryEl.textContent = this.state.cart.length > 0 ? `${this.state.cart.length} título(s) • ${totalLibros} ejemplar(es)` : '';
        if (this.state.cart.length === 0) {
            itemsEl.innerHTML = `<div class="cart-empty"><i class='bx bx-cart-alt'></i>Tu carrito está vacío.</div>`;
            return;
        }
        itemsEl.innerHTML = this.state.cart.map((item, idx) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <span class="cart-item-title">${item.titulo}</span>
                    <div class="cart-item-controls">
                        <button class="cart-qty-btn" onclick="app.changeCartQty(${idx},-1)">&#8722;</button>
                        <span class="cart-qty">${item.cantidad}</span>
                        <button class="cart-qty-btn" onclick="app.changeCartQty(${idx},1)">+</button>
                        <span style="font-size:.75rem;color:#94a3b8;margin-left:4px">disp: ${item.disponibles}</span>
                    </div>
                </div>
                <button class="cart-remove" onclick="app.removeFromCart(${idx})"><i class='bx bx-trash'></i></button>
            </div>`).join('');
    },

    changeCartQty(idx, delta) {
        const item = this.state.cart[idx]; if (!item) return;
        const newQty = item.cantidad + delta;
        if (newQty <= 0) { this.removeFromCart(idx); return; }
        if (newQty > item.disponibles) { alert(`Solo hay ${item.disponibles} disponibles.`); return; }
        item.cantidad = newQty; this.renderCart();
    },

    removeFromCart(idx) {
        this.state.cart.splice(idx, 1); this.renderCart();
        if (this.state.cart.length === 0) document.getElementById('cart-fab').classList.add('hidden');
    },

    openCart() { document.getElementById('cart-panel').classList.add('open'); document.getElementById('cart-overlay').classList.remove('hidden'); this.renderCart(); },
    closeCart() { document.getElementById('cart-panel').classList.remove('open'); document.getElementById('cart-overlay').classList.add('hidden'); },

    async confirmarPedido() {
        if (this.state.cart.length === 0) { alert('El carrito está vacío.'); return; }
        const total = this.state.cart.reduce((s, i) => s + i.cantidad, 0);
        if (!confirm(`¿Confirmar pedido de ${this.state.cart.length} título(s) con ${total} ejemplar(es)?`)) return;
        const btn = document.getElementById('confirm-order-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
        try {
            await db.runTransaction(async (transaction) => {
                const librosRef = db.collection('Libros');
                const reads = await Promise.all(this.state.cart.map(item => transaction.get(librosRef.doc(item.id))));
                for (let i = 0; i < this.state.cart.length; i++) {
                    const snap = reads[i]; const item = this.state.cart[i];
                    if (!snap.exists) throw new Error(`El libro "${item.titulo}" ya no existe.`);
                    if ((snap.data().disponibles || 0) < item.cantidad)
                        throw new Error(`Stock insuficiente para "${item.titulo}". Disponibles: ${snap.data().disponibles}, pedidos: ${item.cantidad}.`);
                }
                for (let i = 0; i < this.state.cart.length; i++) {
                    const snap = reads[i]; const item = this.state.cart[i];
                    const nd = snap.data().disponibles - item.cantidad;
                    transaction.update(librosRef.doc(item.id), { disponibles: nd, status: nd > 0 ? 'Disponible' : 'Agotado' });
                    transaction.set(db.collection('Reservas').doc(), {
                        colegio: this.state.currentUser.name, email: this.state.currentUser.email,
                        libro_id: item.id, libro_titulo: item.titulo, cantidad: item.cantidad,
                        fecha: new Date().toISOString(), estado: 'pendiente'
                    });
                }
            });
            this.state.cart = []; this.renderCart(); this.closeCart();
            document.getElementById('cart-fab').classList.add('hidden');
            alert('¡Pedido enviado! El stock ha sido actualizado.');
        } catch (error) {
            alert('Error al enviar el pedido: ' + error.message);
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = "<i class='bx bx-send'></i> Confirmar Pedido"; }
        }
    },

    switchView(viewId) {
        this.state.activeView = viewId;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const viewEl = document.getElementById(`view-${viewId}`); if(viewEl) viewEl.classList.add('active');
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll(`.nav-item[data-view="${viewId}"]`).forEach(i => i.classList.add('active'));
        document.getElementById('view-title').textContent = viewId.charAt(0).toUpperCase() + viewId.slice(1);
        if (viewId === 'catalogo') this.renderBooks();
    },

    setupRealtimeData() {
        db.collection('Libros').onSnapshot((snapshot) => {
            this.state.books = [];
            snapshot.forEach(doc => this.state.books.push({ id: doc.id, ...doc.data() }));
            if (this.state.activeView === 'catalogo') this.renderBooks();
            this.updateDashboardStats();
        });
    },

    setupReservasRealtimeData() {
        if (!this.state.currentUser) return;
        db.collection('Reservas').where('email', '==', this.state.currentUser.email).onSnapshot((snapshot) => {
            const tbody = document.getElementById('mis-pedidos-tbody'); if (!tbody) return;
            tbody.innerHTML = '';
            if (snapshot.empty) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#666;">No tienes reservas realizadas.</td></tr>'; return; }
            const reservas = []; snapshot.forEach(doc => reservas.push({ id: doc.id, ...doc.data() }));
            reservas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            reservas.forEach(res => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight:bold;color:#1e293b;">${res.libro_titulo}</td>
                    <td style="font-weight:bold;">${res.cantidad}</td>
                    <td>${new Date(res.fecha).toLocaleString('es-ES')}</td>
                    <td><span class="status-pill reservado">Reservada</span></td>
                    <td style="color:#64748b;font-style:italic;">En revisión por el administrador</td>`;
                tbody.appendChild(tr);
            });
        });
    },

    renderBooks() {
        const grid = document.getElementById('catalogo-grid'); if (!grid) return;
        grid.innerHTML = '';
        this.state.books.forEach(book => {
            const disponible = book.disponibles > 0;
            const card = document.createElement('div');
            card.style.cssText = "background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.05);border:1px solid #f1f5f9;display:flex;flex-direction:column;transition:transform 0.2s,box-shadow 0.2s;";
            const coverHtml = book.portada_url
                ? `<img src="${book.portada_url}" style="width:100%;height:200px;object-fit:cover;display:block;background:#f8fafc;">`
                : `<div style="width:100%;height:180px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#cbd5e1;"><i class='bx bx-book-alt' style="font-size:3rem;"></i></div>`;
            card.innerHTML = `${coverHtml}
                <div style="padding:1.25rem;flex:1;display:flex;flex-direction:column;">
                    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
                        <h3 style="margin:0;font-size:1.1rem;font-weight:700;color:#1e293b;line-height:1.3;flex:1;padding-right:10px;">${book.titulo}</h3>
                        <span style="font-size:.7rem;padding:3px 8px;background:#eff6ff;color:#2563eb;border-radius:12px;font-weight:700;white-space:nowrap;">${book.edad_recomendada||'Todas'}</span>
                    </div>
                    <p style="color:#64748b;font-size:.85rem;margin:0 0 4px;">Por <strong style="color:#475569">${book.autor}</strong></p>
                    <p style="font-size:.75rem;color:#94a3b8;margin:0 0 12px;">${book.editorial||''} • <span style="color:#64748b">${book.categoria||'General'}</span></p>
                    <div style="flex-grow:1;"><p style="font-size:.85rem;color:#475569;line-height:1.5;margin-bottom:1.25rem;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${book.sinopsis||'Sin sinopsis.'}</p></div>
                    <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #f1f5f9;padding-top:1rem;">
                        <span style="color:${disponible?'#10b981':'#ef4444'};font-weight:700;font-size:.85rem;">${disponible?'Disponible':'Agotado'} (${book.disponibles} disp.)</span>
                        <button onclick="app.agregarAlCarrito('${book.id}','${(book.titulo||'').replace(/'/g,"\\'")}',${book.disponibles})"
                            class="btn-primary" style="padding:8px 16px;font-size:.8rem;display:inline-flex;align-items:center;gap:6px;width:auto;border-radius:8px;"
                            ${!disponible?'disabled style="opacity:.5;cursor:not-allowed;"':''}>
                            <i class='bx bx-cart-add' style="font-size:1.1rem;"></i> Añadir
                        </button>
                    </div>
                </div>`;
            grid.appendChild(card);
        });
    },

    updateDashboardStats() {
        const statsEl = document.getElementById('dashboard-stats'); if (!statsEl) return;
        const total = this.state.books.length;
        const disp = this.state.books.filter(b => b.disponibles > 0).length;
        statsEl.innerHTML = `
            <div style="background:#eff6ff;padding:20px;border-radius:10px;border:1px solid #bfdbfe;">
                <p style="margin:0;font-size:14px;color:#1d4ed8;text-transform:uppercase;font-weight:bold">Total de Libros</p>
                <h2 style="margin:10px 0 0;font-size:36px;color:#1e3a8a">${total}</h2>
            </div>
            <div style="background:#ecfdf5;padding:20px;border-radius:10px;border:1px solid #a7f3d0;">
                <p style="margin:0;font-size:14px;color:#047857;text-transform:uppercase;font-weight:bold">Títulos Disponibles</p>
                <h2 style="margin:10px 0 0;font-size:36px;color:#065f46">${disp}</h2>
            </div>`;
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
window.app = app;
