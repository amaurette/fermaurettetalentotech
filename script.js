// ===== SISTEMA DE AUTENTICACIÓN =====
class SistemaAutenticacion {
    constructor() {
        this.usuarios = JSON.parse(localStorage.getItem('usuariosMami')) || [];
        this.usuarioActual = JSON.parse(localStorage.getItem('usuarioActualMami')) || null;
        this.inicializarEventos();
        this.actualizarInterfazUsuario();
    }

    inicializarEventos() {
        // Eventos modales
        document.getElementById('btn-iniciar-sesion').addEventListener('click', () => this.mostrarModal('modal-login'));
        document.getElementById('btn-registrarse').addEventListener('click', () => this.mostrarModal('modal-registro'));
        document.getElementById('btn-cerrar-sesion').addEventListener('click', () => this.cerrarSesion());

        // Cerrar modales
        document.querySelectorAll('.cerrar-modal').forEach(boton => {
            boton.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Forms
        document.getElementById('formulario-login').addEventListener('submit', (e) => this.iniciarSesion(e));
        document.getElementById('formulario-registro').addEventListener('submit', (e) => this.registrarUsuario(e));

        // Cerrar modales al hacer click fuera
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    mostrarModal(idModal) {
        document.getElementById(idModal).style.display = 'block';
    }

    registrarUsuario(e) {
        e.preventDefault();
        
        const usuario = {
            nombre: document.getElementById('nombre-registro').value,
            apellido: document.getElementById('apellido-registro').value,
            dni: document.getElementById('dni-registro').value,
            email: document.getElementById('email-registro').value,
            password: document.getElementById('password-registro').value
        };

        // Verificar si el usuario ya existe
        if (this.usuarios.find(u => u.email === usuario.email)) {
            document.getElementById('mensaje-registro').textContent = 'Este email ya está registrado.';
            return;
        }

        this.usuarios.push(usuario);
        localStorage.setItem('usuariosMami', JSON.stringify(this.usuarios));
        
        document.getElementById('mensaje-registro').textContent = '¡Registro exitoso! Ya puedes iniciar sesión.';
        document.getElementById('formulario-registro').reset();
        
        setTimeout(() => {
            document.getElementById('modal-registro').style.display = 'none';
            document.getElementById('mensaje-registro').textContent = '';
        }, 2000);
    }

    iniciarSesion(e) {
        e.preventDefault();
        
        const email = document.getElementById('email-login').value;
        const password = document.getElementById('password-login').value;

        const usuario = this.usuarios.find(u => u.email === email && u.password === password);
        
        if (usuario) {
            this.usuarioActual = usuario;
            localStorage.setItem('usuarioActualMami', JSON.stringify(usuario));
            this.actualizarInterfazUsuario();
            document.getElementById('modal-login').style.display = 'none';
            document.getElementById('formulario-login').reset();
            document.getElementById('mensaje-login').textContent = '';
            
            // Actualizar estado del botón de pago
            if (window.carrito) {
                window.carrito.actualizarEstadoPago();
            }

            this.mostrarNotificacion(`¡Bienvenido ${usuario.nombre}!`);
        } else {
            document.getElementById('mensaje-login').textContent = 'Credenciales incorrectas.';
        }
    }

    cerrarSesion() {
        this.mostrarNotificacion(`¡Hasta pronto ${this.usuarioActual.nombre}!`);
        this.usuarioActual = null;
        localStorage.removeItem('usuarioActualMami');
        this.actualizarInterfazUsuario();
        
        // Actualizar estado del botón de pago
        if (window.carrito) {
            window.carrito.actualizarEstadoPago();
        }
    }

    actualizarInterfazUsuario() {
        const usuarioNoLogueado = document.getElementById('usuario-no-logueado');
        const usuarioLogueado = document.getElementById('usuario-logueado');
        const nombreUsuarioActual = document.getElementById('nombre-usuario-actual');

        if (this.usuarioActual) {
            usuarioNoLogueado.style.display = 'none';
            usuarioLogueado.style.display = 'block';
            nombreUsuarioActual.textContent = `${this.usuarioActual.nombre} ${this.usuarioActual.apellido}`;
        } else {
            usuarioNoLogueado.style.display = 'block';
            usuarioLogueado.style.display = 'none';
        }
    }

    estaLogueado() {
        return this.usuarioActual !== null;
    }

    mostrarNotificacion(mensaje) {
        const notificacionExistente = document.querySelector('.notificacion');
        if (notificacionExistente) {
            notificacionExistente.remove();
        }

        const notificacion = document.createElement('div');
        notificacion.className = 'notificacion';
        notificacion.textContent = mensaje;
        document.body.appendChild(notificacion);

        setTimeout(() => {
            notificacion.remove();
        }, 3000);
    }
}

// ===== SISTEMA DE CARRITO =====
class CarritoCompras {
    constructor() {
        this.carrito = JSON.parse(localStorage.getItem('carritoMami')) || [];
        this.inicializarEventos();
        this.actualizarContador();
    }

    inicializarEventos() {
        // Agregar productos al carrito
        document.querySelectorAll('.boton-agregar-carrito').forEach(boton => {
            boton.addEventListener('click', (e) => {
                const producto = e.target.closest('.tarjeta-producto');
                this.agregarProducto({
                    id: producto.dataset.id,
                    nombre: producto.dataset.nombre,
                    precio: parseFloat(producto.dataset.precio),
                    cantidad: 1
                });
            });
        });

        // Abrir modal carrito
        document.getElementById('icono-carrito').addEventListener('click', (e) => {
            e.preventDefault();
            this.mostrarCarrito();
        });

        // Botón pagar
        document.getElementById('btn-procesar-pago').addEventListener('click', () => this.procesarPago());
        
        // Botón completar pago simulado
        document.getElementById('btn-completar-pago').addEventListener('click', () => this.completarPagoSimulado());
    }

    agregarProducto(producto) {
        const productoExistente = this.carrito.find(p => p.id === producto.id);
        
        if (productoExistente) {
            productoExistente.cantidad += 1;
        } else {
            this.carrito.push(producto);
        }

        this.guardarCarrito();
        this.actualizarContador();
        
        // Mostrar confirmación
        this.mostrarNotificacion(`¡${producto.nombre} agregado al carrito!`);
    }

    eliminarProducto(id) {
        this.carrito = this.carrito.filter(p => p.id !== id);
        this.guardarCarrito();
        this.actualizarContador();
        this.mostrarCarrito();
        this.mostrarNotificacion('Producto eliminado del carrito');
    }

    actualizarCantidad(id, cantidad) {
        const producto = this.carrito.find(p => p.id === id);
        if (producto) {
            producto.cantidad = cantidad;
            if (producto.cantidad <= 0) {
                this.eliminarProducto(id);
            } else {
                this.guardarCarrito();
                this.mostrarCarrito();
            }
        }
    }

    guardarCarrito() {
        localStorage.setItem('carritoMami', JSON.stringify(this.carrito));
    }

    actualizarContador() {
        const totalItems = this.carrito.reduce((sum, producto) => sum + producto.cantidad, 0);
        document.getElementById('contador-carrito').textContent = totalItems;
    }

    mostrarCarrito() {
        const listaCarrito = document.getElementById('lista-carrito');
        const totalCarrito = document.getElementById('total-carrito');

        if (this.carrito.length === 0) {
            listaCarrito.innerHTML = '<p style="text-align: center; padding: 30px; color: #666; font-style: italic;">Tu carrito está vacío</p>';
            totalCarrito.textContent = '0.00';
        } else {
            listaCarrito.innerHTML = this.carrito.map(producto => `
                <div class="item-carrito">
                    <span>${producto.nombre}</span>
                    <div class="controles-cantidad">
                        <button onclick="window.carrito.actualizarCantidad('${producto.id}', ${producto.cantidad - 1})">-</button>
                        <span>${producto.cantidad}</span>
                        <button onclick="window.carrito.actualizarCantidad('${producto.id}', ${producto.cantidad + 1})">+</button>
                    </div>
                    <span>$${(producto.precio * producto.cantidad).toFixed(2)}</span>
                    <button onclick="window.carrito.eliminarProducto('${producto.id}')" class="boton-eliminar">🗑️ Eliminar</button>
                </div>
            `).join('');

            const total = this.carrito.reduce((sum, producto) => sum + (producto.precio * producto.cantidad), 0);
            totalCarrito.textContent = total.toFixed(2);
        }

        this.actualizarEstadoPago();
        document.getElementById('modal-carrito').style.display = 'block';
    }

    actualizarEstadoPago() {
        const btnPagar = document.getElementById('btn-procesar-pago');
        const estaLogueado = window.auth ? window.auth.estaLogueado() : false;
        const carritoVacio = this.carrito.length === 0;

        if (carritoVacio) {
            btnPagar.disabled = true;
            btnPagar.textContent = 'Carrito Vacío';
        } else if (!estaLogueado) {
            btnPagar.disabled = false;
            btnPagar.textContent = 'Iniciar Sesión para Pagar';
        } else {
            btnPagar.disabled = false;
            btnPagar.textContent = 'Proceder al Pago';
        }
    }

    procesarPago() {
        if (!window.auth.estaLogueado()) {
            this.mostrarNotificacion('Debes iniciar sesión para realizar una compra');
            window.auth.mostrarModal('modal-login');
            document.getElementById('modal-carrito').style.display = 'none';
            return;
        }

        if (this.carrito.length === 0) {
            this.mostrarNotificacion('Tu carrito está vacío');
            return;
        }

        // Mostrar modal de simulación de pago
        this.mostrarSimulacionPago();
    }

    mostrarSimulacionPago() {
        const resumenPago = document.getElementById('resumen-pago');
        const total = this.carrito.reduce((sum, producto) => sum + (producto.precio * producto.cantidad), 0);
        
        resumenPago.innerHTML = this.carrito.map(producto => `
            <div style="display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: white; border-radius: 8px;">
                <span>${producto.nombre} x${producto.cantidad}</span>
                <span>$${(producto.precio * producto.cantidad).toFixed(2)}</span>
            </div>
        `).join('') + `
            <div style="display: flex; justify-content: space-between; margin: 15px 0; padding: 15px; background: #4ecdc4; color: white; border-radius: 8px; font-weight: bold;">
                <span>TOTAL</span>
                <span>$${total.toFixed(2)}</span>
            </div>
        `;

        document.getElementById('modal-carrito').style.display = 'none';
        document.getElementById('modal-pago').style.display = 'block';
    }

    completarPagoSimulado() {
        this.mostrarNotificacion('¡Compra realizada con éxito! Gracias por tu pedido.');
        
        // Vaciar carrito después del pago
        this.vaciarCarrito();
        
        // Cerrar modales
        document.getElementById('modal-pago').style.display = 'none';
        document.getElementById('modal-carrito').style.display = 'none';
        
        // Mostrar mensaje de agradecimiento
        setTimeout(() => {
            alert('🎉 ¡Gracias por tu compra! 🎉\n\nTu pedido ha sido procesado exitosamente.\nTe contactaremos pronto para coordinar la entrega.');
        }, 500);
    }

    mostrarNotificacion(mensaje) {
        const notificacionExistente = document.querySelector('.notificacion');
        if (notificacionExistente) {
            notificacionExistente.remove();
        }

        const notificacion = document.createElement('div');
        notificacion.className = 'notificacion';
        notificacion.textContent = mensaje;
        document.body.appendChild(notificacion);

        setTimeout(() => {
            notificacion.remove();
        }, 3000);
    }

    vaciarCarrito() {
        this.carrito = [];
        this.guardarCarrito();
        this.actualizarContador();
    }
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar sistemas
    window.auth = new SistemaAutenticacion();
    window.carrito = new CarritoCompras();
    
    console.log('Sistemas inicializados correctamente');
    console.log('Usuarios registrados:', window.auth.usuarios.length);
    console.log('Productos en carrito:', window.carrito.carrito.length);
    
    // Menu hamburguesa para móviles
    const btnMenu = document.getElementById('btn-menu');
    const listaNav = document.getElementById('lista-nav');
    
    btnMenu.addEventListener('change', function() {
        if (this.checked) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
    });
    
    // Cerrar menú al hacer click en un enlace (móviles)
    listaNav.querySelectorAll('a').forEach(enlace => {
        enlace.addEventListener('click', () => {
            btnMenu.checked = false;
            document.body.style.overflow = 'auto';
        });
    });
});