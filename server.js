const dotenv = require('dotenv')
const express = require('express')
const path = require('path')
const mysql = require('mysql2/promise')
const session = require('express-session')

//Extrae los datos necesarios de el archivo .env
dotenv.config()

//crea el sevidor
const app = express()


const port = process.env.PORT 

//conexion con la base de datos

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


//Deshabilitamos la transmicion informacion confidencial de el servidor para mas seguridad
app.disable('x-powered-by')
//Para poder manejar formularios html
app.use(express.urlencoded({ extended: true }))

app.use(express.json())


//Manejar la sesion de los usuarios
app.use(session({
    secret: 'mongollongos',
    resave: false,
    saveUninitialized: false
}))
//Sirve los archivos de la carpeta Public para poder ser utilizaos en el servidor
app.use(express.static(__dirname +'/Public'))


//Aqui empieza la logica de el servidor para el login 

//Ruta para la pagina inicial
app.get('/',(req,res) =>{
    //tipo de contenido que se envia
    res.contentType('text/html')
    res.sendFile(path.join(__dirname, 'Public','Paginas','login.html'))
})

//logica para el inicio de sesion
app.post('/login',async (req,res)=>{
    let consultas = await crearConexion(mysql);
    
    //trae los datos de el form
    const { username, password } = req.body
    //extrae el arreglo y realiza la consulta
    const [[usuario]] = await consultas.query(
        'SELECT * FROM usuarios WHERE usuario = ? AND contraseña = ?',
        [username, password]
    )
    //mensaje de error para cuentas no registradas
    if (!usuario) return res.redirect('/?error=credenciales')

    if (!usuario.admin) return res.redirect('/noadmin')
    //redireccion a la pagina de admin
    req.session.usuario = usuario.usuario
    res.status(303)
    res.redirect('/PaginaAdmin')

})
//Ruta para enviar a las cuentas que no son administradores a otro lugar
app.get('/noadmin',(req,res)=>{
    
    res.send('<h1>No tiene acceso a esta pagina , Consulte con su jefe de area</h1>')

})

//Apartir de aqui empieza el codigo de la pgaina con todos los equipos

//Ruta para mostrar la pagina con todos los equipos
app.get('/PaginaAdmin',async (req,res) =>{

    //tipo de contenido que se envia
    res.contentType('text/html')
    res.sendFile(path.join(__dirname, 'Public','Paginas','main.html'))
})

//Consulta que toma tods los equipos y los envia para mostrar en la pagina principal
app.get('/PaginaAdmin/TablaEquipos',async (req,res)=>{
    try{
    //Se obtiene la informacion de los equipos
    let conexion = await crearConexion(mysql)
    let [tabla] = await conexion.query('SELECT equipos.id_equipos,equipos.nombre_equipo,equipos.marca,equipos.modelo_equipo,equipos.fecha_adquisicion,estado_equipos.nombre AS estado FROM equipos JOIN estado_equipos ON equipos.estado_id = estado_equipos.id_estado ORDER BY equipos.id_equipos ASC;')
    res.json(tabla);
    }
    catch(err){
        res.status(500)
        res.send('Ups... algo fallo en la obtencion de los equipos',err)
    }
        
})

//envia los datos de la sesion
app.get('/sesion', (req, res) => {
    res.json({ usuario: req.session.usuario })
})
//Maneja el cierre de sesion
app.get('/logout',(req,res)=>{
    req.session.destroy()
    res.status(303)
    res.redirect('/')
})


//Apartir de este punto se encuentra la logica de la pagina con los datos generales del equipo

//Ruta para mostra la pagina indivual de los equipos
app.get('/PagComputadora',(req,res)=>{

    res.contentType('text/html')
    res.sendFile(path.join(__dirname, 'Public','Paginas','computadora.html'))

})

//Consulta que envia los datos de los equipos a la pagina
app.get('/PagComputadora/DatosEquipo',async (req,res)=>{

    const { id } = req.query
    let consultas = await crearConexion(mysql)
    const [[equipo]] = await consultas.query(
        `SELECT equipos.*,estado_equipos.nombre AS estado FROM equipos JOIN estado_equipos ON equipos.estado_id = estado_equipos.id_estado WHERE equipos.id_equipos = ?`,
        [id]
    )
    res.json(equipo)

})
//GET que toma los datos de los mantenimientos
app.get('/PagComputadora/HistorialM',async (req,res)=>{

    const { id } = req.query
    let consultas = await crearConexion(mysql)
    const [mantenimientos] = await consultas.query(
        `SELECT fecha_mantenimiento,tipo_mantenimiento,descripcion FROM historial_mantenimientos WHERE equipo_id= ? ORDER BY fecha_mantenimiento DESC LIMIT 3 `,
        [id]
    )
    res.json(mantenimientos)
})
//Actualiza el estado de el equipo 
app.post('/PagComputadoras/CambiarEstado',async (req,res)=>{
    const { id_equipo, id_estado } = req.body
        let consultas = await crearConexion(mysql)
        await consultas.query(
            'UPDATE equipos SET estado_id = ? WHERE id_equipos = ?',
            [id_estado, id_equipo]
        )
})
//Consulta para traer los estados de el equipo
app.get('/PagComputadoras/EstadosEquipo', async (req, res) => {
    let consultas = await crearConexion(mysql)
    const [estados] = await consultas.query('SELECT * FROM estado_equipos')
    res.json(estados)
})



//Consulta para verificar si el equipo esta asignado o no
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
//Consulta para terminar la asignacion
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
//consulta para conseguir la lista de empleados para asignar
app.get('/PagComputadora/ListaEmpleados', async (req, res) => {
    let consultas = await crearConexion(mysql)
    const [empleados] = await consultas.query(
        `SELECT empleados.*,areas.nombre_area AS area 
        FROM empleados
        JOIN areas ON empleados.area_id = areas.id_area`
    )
    res.json(empleados)
})
//Logica para Asignar empleados
app.post('/PagComputadora/Asignar', async (req, res) => {
    const { id_equipo, id_empleado } = req.body
    let consultas = await crearConexion(mysql)
    await consultas.query(
        `INSERT INTO asignaciones (equipo_id, empleado_id, fecha_asignacion) 
         VALUES (?, ?, NOW())`,
        [id_equipo, id_empleado]
    )
    
})




//Logica de solo servidor

//Funciona como receptor de errores para cuando no se encuentra cierta direccion
app.use((req, res) => {
    res.type('text/plain')
	res.status(404);
	res.send('Error 404'+
        '\nUps parce que la pagina que buscas no existe intenta con otra');
});

// registrar computadora automaticamente
// Al iniciar el servidor, registra el equipo si no existe
async function registrarEquipoLocal() {
    const extractor = require('systeminformation')
    const so = require('os')
    const importaciones = require('./ExtractorDatosEquipo/ObtenerDatosEquipo')

    try {
        const serialN = await importaciones.extraerNumeroSerie(extractor)
        const conexion = await crearConexion(mysql)

        // Verificar si el equipo ya existe por numero de serie
        const [[existe]] = await conexion.query(
            'SELECT id_equipos FROM equipos WHERE numero_serie = ?',
            [serialN]
        )

        if (existe) {
            console.log(`Equipo ya registrado (serie: ${serialN}), omitiendo...`)
            await conexion.end()
            return
        }

        // Si no existe, extraer todo y registrar
        const pcName    = await importaciones.extraerNombreEquipo(extractor)
        const cpuModel  = await importaciones.extraerNombreCpu(extractor)
        const pcModel   = await importaciones.extraerModeloEquipo(extractor)
        const pcBrand   = await importaciones.extraerMarcaEquipo(extractor)
        const cantRam   = parseInt(await importaciones.extraerTamanioRam(extractor))
        const cantDisk  = await importaciones.extraerTamanioDisco(extractor)
        const Os        = (await importaciones.extraerSo(so)).substring(0, 20)
        const date      = new Date().toISOString().split('T')[0]

        await conexion.query(
            `INSERT INTO equipos 
            (nombre_equipo, marca, modelo_equipo, modelo_cpu, cantidad_ram_Gb, numero_serie, fecha_adquisicion, estado_id, almacenamiento, sistema_operativo) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [pcName, pcBrand, pcModel, cpuModel, cantRam, serialN, date, 1, cantDisk, Os]
        )
        console.log(`Equipo "${pcName}" registrado correctamente`)
        await conexion.end()

    } catch (err) {
        console.log('Error al registrar equipo local:', err.message)
    }
}

//activa el servidor
app.listen(port, async () => {
    console.log(`Escuchando el puerto ${port} 
    Entra a la pagina principal desde aqui http://localhost:3000`)
    await registrarEquipoLocal()
})
module.exports = {

    crearConexion: crearConexion

}