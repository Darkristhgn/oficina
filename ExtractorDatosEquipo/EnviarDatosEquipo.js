//Import de funciones necesarias
const extractor = require('systeminformation')
const so = require('os');
const importaciones = require('./ObtenerDatosEquipo')
let mysql = require('mysql2/promise')
const servidor = require('../server')

//funcion main psdt:necesario para el codigo pq es asincrono
async function main() {

    
    try {
        //variables asincornas que obtienen los datos de el equipo
        const serialN = await importaciones.extraerNumeroSerie(extractor)
        const pcName = await importaciones.extraerNombreEquipo(extractor)
        const cpuModel = await importaciones.extraerNombreCpu(extractor)
        const pcModel = await importaciones.extraerModeloEquipo(extractor)
        const pcBrand = await importaciones.extraerMarcaEquipo(extractor)
        const cantRam = await importaciones.extraerTamanioRam(extractor)
        const cantDisk = await importaciones.extraerTamanioDisco(extractor)
        const Os = await importaciones.extraerSo(so)
        const date = new Date().toISOString().split('T')[0];
        const conexionBd = await servidor.crearConexion(mysql)

        //resultados en pantalla(no sin escenciales)
        console.log('Modelo de Equipo: ', pcModel)
        console.log(`Nombre de equipo: ${pcName}`)
        console.log('Marca de Equipo: ', pcBrand)
        console.log('Numero de serie:', serialN)
        console.log('Sistema operativo: ', Os)
        console.log('Modelo de Cpu: ', cpuModel)
        console.log('Cantidad de ram: ', cantRam, 'GB')
        console.log('Tamaño de disco: ', cantDisk, 'GB')
        

        try {
            //Insertar datos a la tabla equipos
            await conexionBd.query(
               'INSERT INTO equipos (nombre_equipo,marca,modelo_equipo,modelo_cpu,cantidad_ram_Gb,numero_serie,fecha_adquisicion,estado_id,almacenamiento,sistema_operativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?)',
                [pcName,pcBrand,pcModel,cpuModel,cantRam,serialN,date,1,cantDisk,Os]
            )
            console.log('Datos insertados correctamente')
        }
        catch (err) {
            console.log('Ups algo salio mal en la insercion...', err)
        }
        finally {
            //finalizar conexion con la base de datos
            await conexionBd.end()
            console.log('Finalizo la conexion')
        }
    }
    catch (err) {
        console.log('Ups algo fallo con la extraccion de datos...', err)
    }
    finally {
        console.log('Termino el programa')
    }
    

}
main()



