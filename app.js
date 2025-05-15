// app.js

// Módulos existentes
const express = require("express");
const path = require("path");



// --- NUEVOS MÓDULOS REQUERIDOS ---
const mysql = require('mysql2'); // Para la conexión con MySQL
const cors = require('cors');   // Para permitir peticiones desde diferentes dominios (frontend a backend)

const app = express();
const port = 4000; // Puerto que ya tenías definido

// --- NUEVOS MIDDLEWARES ---
// Habilitar CORS para permitir que tu frontend (PROYECTOP1.HTML) se comunique con esta API
app.use(cors());
// Middleware para parsear el cuerpo de las peticiones JSON (cuando envías datos desde el formulario)
app.use(express.json());
// Middleware para parsear datos de formularios URL-encoded
app.use(express.urlencoded({ extended: true }));


// --- TU CÓDIGO EXISTENTE PARA SERVIR ARCHIVOS ESTÁTICOS Y EL HTML PRINCIPAL ---
// Servir archivos estáticos desde la carpeta 'public'
// Asegúrate de que esta carpeta exista y contenga, por ejemplo, tus archivos CSS o JS del lado del cliente si los tienes.
app.use(express.static(path.join(__dirname, "public")));

// Ruta principal para servir tu archivo HTML
// Si PROYECTOP1.HTML es un archivo directamente en la raíz de tu proyecto:
app.get("/", (req, res) => {
    // Corregí ligeramente el path.join para mayor claridad y robustez
    const filePath = path.join(__dirname, "PROYECTOP1.HTML");
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error("Error al enviar el archivo HTML:", err);
            // Es buena idea enviar una respuesta de error si el archivo no se encuentra
            if (!res.headersSent) {
                res.status(err.status || 500).send("Error al cargar la página principal. Verifica que 'PROYECTOP1.HTML' exista en la raíz del proyecto.");
            }
        }
    });
});
// Si "PROYECTOP1.HTML" es en realidad un directorio y dentro tienes un index.html, sería:
// const filePath = path.join(__dirname, "PROYECTOP1.HTML", "index.html");


// --- NUEVA SECCIÓN: CONFIGURACIÓN DE LA BASE DE DATOS MYSQL ---
// ¡IMPORTANTE! Reemplaza con tus propias credenciales de MySQL.
const dbConfig = {
    host: 'localhost',        // O la IP de tu servidor MySQL si es remoto
    user: 'root', // Reemplaza con tu usuario de MySQL
    password: 'Codigo20071204', // Reemplaza con tu contraseña
    database: 'hotel_reservas_db' // El nombre de la base de datos que creaste
};

// Crear un pool de conexiones a MySQL. Es más eficiente que crear conexiones individuales.
const pool = mysql.createPool(dbConfig);

// Intentar conectar a la base de datos para verificar la configuración
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error al conectar con la base de datos MySQL:', err.message);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Conexión con la base de datos perdida.');
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('La base de datos tiene demasiadas conexiones.');
        }
        if (err.code === 'ECONNREFUSED') {
            console.error('Conexión con la base de datos rechazada. ¿Está el servidor MySQL corriendo?');
        }
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('Acceso denegado para el usuario/contraseña de MySQL. Verifica tus credenciales en dbConfig.');
        }
        // No es necesario terminar la aplicación aquí, pero la API no funcionará sin BD.
        return;
    }
    if (connection) {
        console.log('Conectado exitosamente a la base de datos MySQL como ID ' + connection.threadId);
        connection.release(); // Devolver la conexión al pool
    }
});


// --- NUEVA SECCIÓN: RUTAS DE LA API DE RESERVAS ---

// RUTA POST: Para crear una nueva reserva
// Cuando tu formulario HTML envíe datos, lo hará a esta ruta.
app.post('/api/reservas', async (req, res) => {
    // Extraer los datos del cuerpo de la petición (enviados desde el formulario)
    const { nombre, correo_electronico, fecha_entrada, fecha_salida, numero_habitaciones, comentarios } = req.body;

    // Validación básica de los datos recibidos
    if (!nombre || !correo_electronico || !fecha_entrada || !fecha_salida || !numero_habitaciones) {
        return res.status(400).json({ message: 'Todos los campos obligatorios (nombre, correo, fechas, habitaciones) deben ser proporcionados.' });
    }

    // Validación de formato de fecha (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(fecha_entrada) || !dateRegex.test(fecha_salida)) {
        return res.status(400).json({ message: 'El formato de las fechas debe ser YYYY-MM-DD.' });
    }

    const entrada = new Date(fecha_entrada);
    const salida = new Date(fecha_salida);

    if (salida <= entrada) {
        return res.status(400).json({ message: 'La fecha de salida debe ser posterior a la fecha de entrada.' });
    }

    const numHabitacionesInt = parseInt(numero_habitaciones);
    if (isNaN(numHabitacionesInt) || numHabitacionesInt <= 0) {
        return res.status(400).json({ message: 'El número de habitaciones debe ser un entero positivo.' });
    }

    // Preparar el objeto con los datos de la nueva reserva
    const nuevaReserva = {
        nombre,
        correo_electronico,
        fecha_entrada,
        fecha_salida,
        numero_habitaciones: numHabitacionesInt,
        comentarios: comentarios || null // Si no hay comentarios, guardar NULL en la BD
    };

    const query = 'INSERT INTO reservas SET ?';

    try {
        // Usar el pool para ejecutar la consulta SQL
        const [result] = await pool.promise().query(query, nuevaReserva);
        // Enviar una respuesta de éxito al cliente
        res.status(201).json({ message: 'Reserva creada exitosamente', id_reserva: result.insertId, ...nuevaReserva });
    } catch (error) {
        console.error('Error al insertar la reserva en la base de datos:', error);
        res.status(500).json({ message: 'Error interno del servidor al crear la reserva.' });
    }
});

// RUTA GET: Para obtener (listar) todas las reservas
// Tu página HTML usará esta ruta para mostrar las reservas existentes.
app.get('/api/reservas', async (req, res) => {
    const query = 'SELECT id, nombre, correo_electronico, DATE_FORMAT(fecha_entrada, "%Y-%m-%d") AS fecha_entrada, DATE_FORMAT(fecha_salida, "%Y-%m-%d") AS fecha_salida, numero_habitaciones, comentarios, DATE_FORMAT(fecha_creacion, "%Y-%m-%d %H:%i:%s") AS fecha_creacion FROM reservas ORDER BY fecha_creacion DESC';

    try {
        const [rows] = await pool.promise().query(query);
        res.status(200).json(rows); // Enviar la lista de reservas como JSON
    } catch (error) {
        console.error('Error al obtener las reservas de la base de datos:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener las reservas.' });
    }
});


// --- TU CÓDIGO EXISTENTE PARA INICIAR EL SERVIDOR ---
app.listen(port, () => { // Cambiado de 4000 a la variable port
    console.log(`Servidor corriendo en http://localhost:${port}`); // Usando la variable port
    console.log(`Página principal disponible en http://localhost:${port}/`);
    console.log('Endpoints de API de Reservas listos:');
    console.log(`  POST http://localhost:${port}/api/reservas  (para crear una reserva)`);
    console.log(`  GET  http://localhost:${port}/api/reservas  (para listar todas las reservas)`);
});

// --- NUEVA SECCIÓN: MANEJO ELEGANTE DEL CIERRE DEL SERVIDOR ---
// Esto es útil para cerrar correctamente la conexión a la base de datos si detienes el servidor (Ctrl+C)
process.on('SIGINT', async () => {
    console.log('Recibida señal SIGINT. Cerrando servidor y pool de MySQL...');
    if (pool) {
        await pool.end(err => {
            if (err) {
                console.error('Error al cerrar el pool de MySQL:', err);
            } else {
                console.log('Pool de MySQL cerrado exitosamente.');
            }
            process.exit(err ? 1 : 0);
        });
    } else {
        process.exit(0);
    }
});
