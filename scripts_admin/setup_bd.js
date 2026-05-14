const bd = firebase.firestore();
        
async function crearEstructura() {
    const btn = document.getElementById('btn-crear');
    const msg = document.getElementById('mensaje');
    btn.disabled = true;
    btn.innerText = "Creando en la Base de Datos...";

    try {
        const librosRef = bd.collection('Libros');

        // Añadir libro usando el título como ID del documento (tal como en la imagen)
        await librosRef.doc('El señor de los anillos').set({
            titulo: 'El señor de los anillos',
            autor: 'J.R.R. Tolkien',
            categoria: 'Fantasía',
            editorial: 'Minotauro',
            edad_recomendada: '12+',
            sinopsis: 'En la Tierra Media, el Señor Oscuro Sauron ordenó a los Elfos que forjaran los Grandes Anillos de Poder. Tres para los reyes Elfos, siete para los Señores Enanos, y nueve para los Hombres Mortales...',
            total: 10,
            disponibles: 10,
            status: 'Disponible'
        });

        await librosRef.doc('Cien años de soledad').set({
            titulo: 'Cien años de soledad',
            autor: 'Gabriel García Márquez',
            categoria: 'Ficción',
            editorial: 'Sudamericana',
            edad_recomendada: '16+',
            sinopsis: 'La novela narra la historia de la familia Buendía a lo largo de siete generaciones en el pueblo ficticio de Macondo...',
            total: 3,
            disponibles: 1,
            status: 'Disponible'
        });

        // Crear reservas simuladas para poder probar la tabla del Administrador y la de Mis Pedidos del Colegio
        const reservasRef = bd.collection('Reservas');
        await reservasRef.add({
            colegio: 'Colegio',
            email: 'colegio@colegio.com',
            libro_id: 'Cien años de soledad',
            libro_titulo: 'Cien años de soledad',
            cantidad: 2,
            fecha: new Date().toISOString()
        });

        await reservasRef.add({
            colegio: 'Colegio',
            email: 'colegio@colegio.com',
            libro_id: 'El señor de los anillos',
            libro_titulo: 'El señor de los anillos',
            cantidad: 1,
            fecha: new Date(Date.now() - 86400000).toISOString() // Hace 1 día
        });

        msg.innerText = "¡Libros y Reservas creados correctamente en Firebase!";
        msg.className = "mt-4 font-bold text-center text-green-600";
        btn.innerText = "¡Hecho!";
    } catch (error) {
        console.error("Error:", error);
        msg.innerText = "Error: " + error.message;
        msg.className = "mt-4 font-bold text-center text-red-600";
        btn.disabled = false;
        btn.innerText = "Intentar de nuevo";
    }
}
