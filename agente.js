const si = require('systeminformation')
const os = require('os')
const https = require('https')
const http = require('http')
const { execSync } = require('child_process')
const path = require('path')

// ← Cambia esta IP por la del servidor
const SERVIDOR = 'http://192.168.1.28:3000'

async function obtenerDatos() {
    const [cpu, mem, sistema, bios, discos, osInfo] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.system(),
        si.bios(),
        si.diskLayout(),
        si.osInfo()
    ])

    return {
        nombre_equipo: osInfo.hostname,
        marca: sistema.manufacturer,
        modelo_equipo: sistema.model,
        modelo_cpu: cpu.brand,
        cantidad_ram_Gb: parseInt(mem.total / (1024 ** 3)),
        numero_serie: bios.serial,
        almacenamiento: Math.round(discos[0].size / (1024 ** 3)).toString(),
        sistema_operativo: (os.version()).substring(0, 20)
    }
}

async function verificarSerie(serie) {
    return new Promise((resolve, reject) => {
        http.get(`${SERVIDOR}/Agente/Verificar?serie=${encodeURIComponent(serie)}`, (res) => {
            let data = ''
            res.on('data', chunk => data += chunk)
            res.on('end', () => resolve(JSON.parse(data).existe))
        }).on('error', reject)
    })
}

async function registrarEquipo(datos) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(datos)
        const url = new URL(`${SERVIDOR}/Agente/Registrar`)
        const opciones = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }
        const req = http.request(opciones, (res) => {
            let data = ''
            res.on('data', chunk => data += chunk)
            res.on('end', () => resolve(JSON.parse(data)))
        })
        req.on('error', reject)
        req.write(body)
        req.end()
    })
}

function registrarEnArranque() {
    try {
        // Ruta del exe actual
        const exePath = process.execPath
        const nombre = 'OficinaAgente'
        // Agrega al registro de Windows en arranque de usuario
        execSync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${nombre}" /t REG_SZ /d "${exePath}" /f`)
        console.log('Registrado en arranque de Windows')
    } catch (err) {
        console.log('No se pudo registrar en arranque:', err.message)
    }
}

function yaEstaEnArranque() {
    try {
        const nombre = 'OficinaAgente'
        const resultado = execSync(`reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${nombre}"`, { encoding: 'utf8' })
        return resultado.includes('OficinaAgente')
    } catch {
        return false
    }
}

async function main() {
    try {
        // Registrar en arranque si aun no esta
        if (!yaEstaEnArranque()) {
            registrarEnArranque()
        }

        // Obtener datos del equipo
        const datos = await obtenerDatos()
        console.log('Serie detectada:', datos.numero_serie)

        // Verificar si ya existe en el servidor
        const existe = await verificarSerie(datos.numero_serie)

        if (existe) {
            console.log('Equipo ya registrado, cerrando...')
            process.exit(0)
        }

        // Registrar en el servidor
        await registrarEquipo(datos)
        console.log('Equipo registrado correctamente:', datos.nombre_equipo)

    } catch (err) {
        console.error('Error:', err.message)
    } finally {
        process.exit(0)
    }
}

main()