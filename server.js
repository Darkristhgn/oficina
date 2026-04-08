const dotenv = require('dotenv')
const express = require('express')
const path = require('path')
const mysql = require('mysql2/promise')
const session = require('express-session')

// Extrae los datos necesarios del archivo .env
dotenv.config()

// Crea el servidor
const app = express()

const port = process.env.PORT

// Conexion con la base de datos
async function crearConexion(mysql) {
    let conexion = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    })
    return conexion
}

// Deshabilitamos la transmision de informacion confidencial del servidor
app.disable('x-powered-by')
// Para poder manejar formularios html
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// Manejar la sesion de los usuarios
app.use(session({
    secret: 'mongollongos',
    resave: false,
    saveUninitialized: false
}))

// Sirve los archivos de la carpeta Public
app.use(express.static(__dirname + '/Public'))


// ─── LOGIN ───────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
    res.contentType('text/html')
    res.sendFile(path.join(__dirname, 'Public', 'Paginas', 'login.html'))
})

app.post('/login', async (req, res) => {
    let consultas = await crearConexion(mysql)
    const { username, password } = req.body
    const [[usuario]] = await consultas.query(
        'SELECT * FROM usuarios WHERE usuario = ? AND contraseña = ?',
        [username, password]
    )
    if (!usuario) return res.redirect('/?error=credenciales')
    if (!usuario.admin) return res.redirect('/noadmin')
    req.session.usuario = usuario.usuario
    res.status(303)
    res.redirect('/PaginaAdmin')
})

app.get('/noadmin', (req, res) => {
    res.send('<h1>No tiene acceso a esta pagina, Consulte con su jefe de area</h1>')
})

app.get('/sesion', (req, res) => {
    res.json({ usuario: req.session.usuario })
})

app.get('/logout', (req, res) => {
    req.session.destroy()
    res.status(303)
    res.redirect('/')
})


// ─── PAGINA PRINCIPAL ─────────────────────────────────────────────────────────

app.get('/PaginaAdmin', async (req, res) => {
    res.contentType('text/html')
    res.sendFile(path.join(__dirname, 'Public', 'Paginas', 'main.html'))
})

app.get('/PaginaAdmin/TablaEquipos', async (req, res) => {
    try {
        let conexion = await crearConexion(mysql)
        let [tabla] = await conexion.query(
            `SELECT equipos.id_equipos, equipos.nombre_equipo, equipos.marca, equipos.modelo_equipo,
             equipos.fecha_adquisicion, estado_equipos.nombre AS estado
             FROM equipos
             JOIN estado_equipos ON equipos.estado_id = estado_equipos.id_estado
             ORDER BY equipos.id_equipos ASC`
        )
        res.json(tabla)
    } catch (err) {
        res.status(500).send('Ups... algo fallo en la obtencion de los equipos')
    }
})


// ─── PAGINA COMPUTADORA ───────────────────────────────────────────────────────

app.get('/PagComputadora', (req, res) => {
    res.contentType('text/html')
    res.sendFile(path.join(__dirname, 'Public', 'Paginas', 'computadora.html'))
})

app.get('/PagComputadora/DatosEquipo', async (req, res) => {
    const { id } = req.query
    let consultas = await crearConexion(mysql)
    const [[equipo]] = await consultas.query(
        `SELECT equipos.*, estado_equipos.nombre AS estado
         FROM equipos
         JOIN estado_equipos ON equipos.estado_id = estado_equipos.id_estado
         WHERE equipos.id_equipos = ?`,
        [id]
    )
    res.json(equipo)
})

app.get('/PagComputadora/HistorialM', async (req, res) => {
    const { id } = req.query
    let consultas = await crearConexion(mysql)
    const [mantenimientos] = await consultas.query(
        `SELECT fecha_mantenimiento, tipo_mantenimiento, descripcion
         FROM historial_mantenimientos
         WHERE equipo_id = ?
         ORDER BY fecha_mantenimiento DESC LIMIT 3`,
        [id]
    )
    res.json(mantenimientos)
})

app.get('/PagComputadora/Asignacion', async (req, res) => {
    const { id } = req.query
    let consultas = await crearConexion(mysql)
    const [[asignacion]] = await consultas.query(
        `SELECT asignaciones.*, empleados.nombre_empleado
         FROM asignaciones
         JOIN empleados ON asignaciones.empleado_id = empleados.id_empleado
         WHERE asignaciones.equipo_id = ? AND asignaciones.fecha_fin IS NULL`,
        [id]
    )
    res.json(asignacion || null)
})

app.post('/PagComputadora/FinalizarAsignacion', async (req, res) => {
    const { id } = req.query
    let consultas = await crearConexion(mysql)
    await consultas.query(
        `UPDATE asignaciones SET fecha_fin = NOW()
         WHERE equipo_id = ? AND fecha_fin IS NULL`,
        [id]
    )
    res.json({ mensaje: 'Asignacion finalizada' })
})

app.get('/PagComputadora/ListaEmpleados', async (req, res) => {
    let consultas = await crearConexion(mysql)
    const [empleados] = await consultas.query(
        `SELECT empleados.*, areas.nombre_area AS area
         FROM empleados
         JOIN areas ON empleados.area_id = areas.id_area`
    )
    res.json(empleados)
})

app.post('/PagComputadora/Asignar', async (req, res) => {
    const { id_equipo, id_empleado } = req.body
    let consultas = await crearConexion(mysql)
    await consultas.query(
        `INSERT INTO asignaciones (equipo_id, empleado_id, fecha_asignacion)
         VALUES (?, ?, NOW())`,
        [id_equipo, id_empleado]
    )
    res.json({ mensaje: 'Asignacion creada' })
})

app.post('/PagComputadoras/CambiarEstado', async (req, res) => {
    const { id_equipo, id_estado } = req.body
    let consultas = await crearConexion(mysql)
    await consultas.query(
        'UPDATE equipos SET estado_id = ? WHERE id_equipos = ?',
        [id_estado, id_equipo]
    )
    res.json({ mensaje: 'Estado actualizado' })
})

app.get('/PagComputadoras/EstadosEquipo', async (req, res) => {
    let consultas = await crearConexion(mysql)
    const [estados] = await consultas.query('SELECT * FROM estado_equipos')
    res.json(estados)
})


// ─── EMPLEADOS ────────────────────────────────────────────────────────────────

app.get('/Empleados/Areas', async (req, res) => {
    let conexion = await crearConexion(mysql)
    const [areas] = await conexion.query('SELECT * FROM areas')
    res.json(areas)
})

app.post('/Empleados/Nuevo', async (req, res) => {
    const { nombre_empleado, puesto, area_id } = req.body
    let conexion = await crearConexion(mysql)
    await conexion.query(
        'INSERT INTO empleados (nombre_empleado, puesto, area_id) VALUES (?, ?, ?)',
        [nombre_empleado, puesto, area_id]
    )
    res.json({ mensaje: 'Empleado creado correctamente' })
})


// ─── AGENTE ───────────────────────────────────────────────────────────────────

// Verificar si equipo existe por numero de serie
app.get('/Agente/Verificar', async (req, res) => {
    const { serie } = req.query
    let conexion = await crearConexion(mysql)
    const [[equipo]] = await conexion.query(
        'SELECT id_equipos FROM equipos WHERE numero_serie = ?',
        [serie]
    )
    await conexion.end()
    res.json({ existe: !!equipo })
})

// Recibir datos del agente y guardarlos
app.post('/Agente/Registrar', async (req, res) => {
    const { nombre_equipo, marca, modelo_equipo, modelo_cpu, cantidad_ram_Gb, numero_serie, almacenamiento, sistema_operativo } = req.body
    const fecha = new Date().toISOString().split('T')[0]
    let conexion = await crearConexion(mysql)
    await conexion.query(
        `INSERT INTO equipos
         (nombre_equipo, marca, modelo_equipo, modelo_cpu, cantidad_ram_Gb, numero_serie, fecha_adquisicion, estado_id, almacenamiento, sistema_operativo)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [nombre_equipo, marca, modelo_equipo, modelo_cpu, cantidad_ram_Gb, numero_serie, fecha, almacenamiento, sistema_operativo]
    )
    await conexion.end()
    res.json({ mensaje: 'Equipo registrado' })
})


// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((req, res) => {
    res.type('text/plain')
    res.status(404)
    res.send('Error 404\nUps parece que la pagina que buscas no existe, intenta con otra')
})


// ─── INICIAR SERVIDOR ─────────────────────────────────────────────────────────

app.listen(port, () => {
    console.log(`Escuchando el puerto ${port}
    Entra a la pagina principal desde aqui http://localhost:3000`)
})

module.exports = {
    crearConexion: crearConexion
}