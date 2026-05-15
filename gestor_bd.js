const collectionRef = db.collection('Libros');
window.librosData = {}; // Para evitar problemas de comillas al editar

// Configuración dinámica del formulario
const formFields = [
    { id: 'titulo', label: 'Título', type: 'text', col: 'full' },
    { id: 'autor', label: 'Autor', type: 'text', col: 'full' },
    { id: 'categoria', label: 'Categoría', type: 'text', col: 'full' },
    { id: 'editorial', label: 'Editorial', type: 'text', col: 'half' },
    { id: 'edad_recomendada', label: 'Edad Recomendada', type: 'text', col: 'half' },
    { id: 'sinopsis', label: 'Sinopsis', type: 'textarea', col: 'full' },
    { id: 'total', label: 'Total', type: 'number', col: 'half', val: 1, min: 1 },
    { id: 'disponibles', label: 'Disponibles', type: 'number', col: 'half', val: 1, min: 0 }
];

function renderForm() {
    const container = document.getElementById('dynamic-fields');
    if (!container) return;
    
    let html = '';
    formFields.forEach(f => {
        const wrapClass = f.col === 'full' ? 'mb-4' : 'flex-1';
        const isHalf = f.col === 'half';
        
        if (isHalf && f.id === 'editorial' || isHalf && f.id === 'total') {
            html += '<div class="flex gap-4 mb-4">';
        }

        const inputStr = f.type === 'textarea' 
            ? `<textarea id="${f.id}" rows="3" class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"></textarea>`
            : `<input type="${f.type}" id="${f.id}" ${f.val!==undefined?`value="${f.val}"`:''}  ${f.min!==undefined?`min="${f.min}"`:''}  class="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none">`;
        
        html += `
            <div class="${wrapClass}">
                <label class="block text-sm font-medium text-gray-700 mb-1">${f.label}</label>
                ${inputStr}
            </div>
        `;

        if (isHalf && f.id === 'edad_recomendada' || isHalf && f.id === 'disponibles') {
            html += '</div>';
        }
    });
    
    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', renderForm);

// Cargar libros en tiempo real
collectionRef.onSnapshot((snapshot) => {
    const tbody = document.getElementById('tabla-libros');
    tbody.innerHTML = '';
    window.librosData = {};
    
    if (snapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No hay libros en la base de datos. Añade uno.</td></tr>';
        return;
    }

    snapshot.forEach((doc) => {
        const libro = doc.data();
        window.librosData[doc.id] = libro; 

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 transition-colors';
        
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="w-12 h-16 bg-gray-100 rounded border flex items-center justify-center overflow-hidden">
                    ${libro.portada_url 
                        ? `<img src="${libro.portada_url}" class="w-full h-full object-cover">`
                        : `<span style="font-size:1.5rem; color:#cbd5e1;">📚</span>`
                    }
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="font-medium text-gray-900">${libro.titulo}</div>
                <div class="text-sm text-gray-500">${libro.autor} • ${libro.editorial || 'Sin editorial'}</div>
                <div class="text-xs text-gray-400 mt-1 line-clamp-2" style="max-width:300px;">${libro.sinopsis || ''}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    ${libro.categoria || 'Sin categoría'}
                </span>
                <div class="mt-1 text-xs font-bold text-gray-400">${libro.edad_recomendada || ''}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                ${libro.disponibles} / ${libro.total}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="editarLibro('${doc.id}')" class="text-indigo-600 hover:text-indigo-900 mr-3">Editar</button>
                <button onclick="borrarLibro('${doc.id}')" class="text-red-600 hover:text-red-900">Borrar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
});

/**
 * Comprime y redimensiona una imagen en el navegador usando Canvas.
 * Devuelve una cadena base64 (JPEG) que se puede guardar directamente en Firestore.
 */
function comprimirImagen(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
            img.onload = () => {
                const MAX_W = 400;
                const MAX_H = 600;
                let w = img.width;
                let h = img.height;

                if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
                if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H; }

                const canvas = document.createElement('canvas');
                canvas.width  = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);

                resolve(canvas.toDataURL('image/jpeg', 0.75));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function guardarLibro() {
    const id = document.getElementById('book-id').value;
    const titulo = document.getElementById('titulo').value.trim();
    const autor = document.getElementById('autor').value.trim();
    const categoria = document.getElementById('categoria').value.trim();
    const editorial = document.getElementById('editorial').value.trim();
    const edad_recomendada = document.getElementById('edad_recomendada').value.trim();
    const sinopsis = document.getElementById('sinopsis').value.trim();
    const total = parseInt(document.getElementById('total').value) || 1;
    const disponibles = parseInt(document.getElementById('disponibles').value) || 0;
    const fileInput = document.getElementById('book-cover');
    const file = fileInput.files[0];

    if (!titulo || !autor) {
        alert("El título y el autor son obligatorios.");
        return;
    }

    const btn = document.getElementById('btn-save');
    btn.disabled = true;
    btn.innerHTML = 'Procesando...';

    try {
        let portada_url = null;
        
        if (id && window.librosData[id]) {
            portada_url = window.librosData[id].portada_url || null;
        }

        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('El archivo seleccionado no es una imagen válida.');
                btn.disabled = false;
                btn.innerHTML = 'Guardar';
                return;
            }
            btn.innerHTML = 'Procesando imagen...';
            try {
                portada_url = await comprimirImagen(file);
            } catch (imgError) {
                alert('Error al procesar la imagen: ' + imgError.message);
                btn.disabled = false;
                btn.innerHTML = id ? 'Actualizar en BD' : 'Guardar';
                return;
            }
        }

        const data = { 
            titulo, autor, categoria, editorial, edad_recomendada, sinopsis,
            total, disponibles, portada_url,
            status: disponibles > 0 ? 'Disponible' : 'Agotado'
        };

        if (id) {
            await collectionRef.doc(id).update(data);
        } else {
            await collectionRef.doc(titulo).set(data);
        }

        limpiarFormulario();
        alert("¡Libro guardado correctamente!");
    } catch (error) {
        console.error("Error al guardar libro:", error);
        alert("Error al guardar: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = id ? 'Actualizar en BD' : 'Guardar';
    }
}

function borrarLibro(id) {
    if (confirm("¿Estás seguro de que quieres borrar este libro permanentemente?")) {
        collectionRef.doc(id).delete().catch(error => console.error("Error al borrar:", error));
    }
}

function editarLibro(id) {
    const libro = window.librosData[id];
    if(!libro) return;

    document.getElementById('form-title').innerText = "Editar Libro";
    document.getElementById('book-id').value = id;
    document.getElementById('titulo').value = libro.titulo || '';
    document.getElementById('autor').value = libro.autor || '';
    document.getElementById('categoria').value = libro.categoria || '';
    document.getElementById('editorial').value = libro.editorial || '';
    document.getElementById('edad_recomendada').value = libro.edad_recomendada || '';
    document.getElementById('sinopsis').value = libro.sinopsis || '';
    document.getElementById('total').value = libro.total || 1;
    document.getElementById('disponibles').value = libro.disponibles || 0;
    
    const btn = document.getElementById('btn-save');
    btn.innerText = "Actualizar en BD";
    btn.classList.replace('bg-blue-600', 'bg-green-600');
    btn.classList.replace('hover:bg-blue-700', 'hover:bg-green-700');
}

function limpiarFormulario() {
    document.getElementById('form-title').innerText = "Añadir Libro";
    document.getElementById('book-id').value = "";
    document.getElementById('titulo').value = "";
    document.getElementById('autor').value = "";
    document.getElementById('categoria').value = "";
    document.getElementById('editorial').value = "";
    document.getElementById('edad_recomendada').value = "";
    document.getElementById('sinopsis').value = "";
    document.getElementById('total').value = "1";
    document.getElementById('disponibles').value = "1";
    document.getElementById('book-cover').value = "";
    
    const btn = document.getElementById('btn-save');
    btn.innerText = "Guardar";
    btn.classList.remove('bg-green-600');
    btn.classList.add('bg-blue-600');
    btn.classList.remove('hover:bg-green-700');
    btn.classList.add('hover:bg-blue-700');
}

// Cargar Reservas en tiempo real
const reservasRef = db.collection('Reservas');
reservasRef.orderBy('fecha', 'desc').onSnapshot((snapshot) => {
    const tbody = document.getElementById('tabla-reservas');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (snapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No hay reservas registradas aún.</td></tr>';
        return;
    }

    snapshot.forEach((doc) => {
        const res = doc.data();
        const date = new Date(res.fecha).toLocaleString('es-ES');
        const completada = res.estado === 'completada';

        const tr = document.createElement('tr');
        tr.className = completada ? 'bg-green-50 opacity-70 transition-colors' : 'hover:bg-gray-50 transition-colors';

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${date}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${res.colegio}
                <div class="text-xs text-gray-500 font-normal">${res.email || ''}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${res.libro_titulo}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold text-center">${res.cantidad}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                ${completada
                    ? `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">✔ Completada</span>`
                    : `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">⏳ Pendiente</span>`
                }
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                ${completada
                    ? `<button onclick="toggleCompletada('${doc.id}', true)" class="inline-flex items-center gap-1 bg-gray-500 hover:bg-gray-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm">↩ Desmarcar</button>`
                    : `<button onclick="toggleCompletada('${doc.id}', false)" class="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm">✔ Marcar completada</button>`
                }
                <button onclick="borrarReserva('${doc.id}')" class="text-red-500 hover:text-red-700 text-xs font-medium">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
});

function toggleCompletada(id, isCompleted) {
    const nuevoEstado = isCompleted ? 'pendiente' : 'completada';
    const msg = isCompleted ? '¿Desmarcar esta reserva y volver a pendiente?' : '¿Marcar esta reserva como completada?';
    if (confirm(msg)) {
        reservasRef.doc(id).update({ estado: nuevoEstado })
            .catch(error => {
                console.error('Error al actualizar reserva:', error);
                alert('No se pudo actualizar. Inténtalo de nuevo.');
            });
    }
}

async function borrarReserva(id) {
    if (!confirm("¿Estás seguro de borrar este pedido?\n\nSi el pedido está pendiente, los libros volverán a estar disponibles en el stock.")) return;

    try {
        const reservaRef = reservasRef.doc(id);
        const reservaSnap = await reservaRef.get();

        if (!reservaSnap.exists) { alert("Este pedido ya no existe."); return; }

        const reserva = reservaSnap.data();
        const debeRestaurarStock = reserva.estado === 'pendiente' && reserva.libro_id && reserva.cantidad > 0;

        if (debeRestaurarStock) {
            const libroRef = db.collection('Libros').doc(reserva.libro_id);
            await db.runTransaction(async (transaction) => {
                const libroSnap = await transaction.get(libroRef);
                if (libroSnap.exists) {
                    const nuevoDisponibles = (libroSnap.data().disponibles || 0) + reserva.cantidad;
                    const disponiblesFinal = Math.min(nuevoDisponibles, libroSnap.data().total || nuevoDisponibles);
                    transaction.update(libroRef, { disponibles: disponiblesFinal, status: disponiblesFinal > 0 ? 'Disponible' : 'Agotado' });
                }
                transaction.delete(reservaRef);
            });
            alert(`Pedido eliminado. Se han devuelto ${reserva.cantidad} ejemplar(es) de "${reserva.libro_titulo}" al stock.`);
        } else {
            await reservaRef.delete();
            alert("Registro eliminado. El stock no se ha modificado (pedido ya completado).");
        }
    } catch (error) {
        console.error("Error al borrar reserva:", error);
        alert("Error al borrar el pedido: " + error.message);
    }
}
