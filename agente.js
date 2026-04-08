const si = require('systeminformation')
const os = require('os')
const https = require('https')
const http = require('http')
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const readline = require('readline')

// Variable global para el servidor
let SERVIDOR = ''

// Configurar readline para preguntar al usuario
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

function preguntarIP() {
    return new Promise((resolve) => {
        rl.question('Ingrese la IP del servidor (ejemplo: 192.168.1.100): ', (ip) => {
            if (!ip || ip.trim() === '') {
                console.log('IP no válida. Usando localhost por defecto.')
                ip = 'localhost'
            }
            SERVIDOR = `http://${ip.trim()}:3000`
            console.log(`Conectando a: ${SERVIDOR}`)
            rl.close()
            resolve()
        })
    })
}

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
            method: 'POST',
            path: url.pathname,
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
        const exePath = process.execPath
        const nombre = 'OficinaAgente'
        execSync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${nombre}" /t REG_SZ /d "${exePath}" /f`)
        console.log('✓ Registrado en arranque de Windows')
    } catch (err) {
        console.log('✗ No se pudo registrar en arranque:', err.message)
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

function crearDesinstalador() {
    try {
        const escritorio = path.join(os.homedir(), 'Desktop')
        const rutaDesinstalador = path.join(escritorio, 'uninstall.exe')
        
        // Verificar si el desinstalador.exe ya existe
        if (fs.existsSync(rutaDesinstalador)) {
            console.log('✓ Desinstalador ya existe en el escritorio')
            return true
        }
        
        // NOTA: El uninstall.exe debe ser creado durante el build con pkg
        // Este código asume que uninstall.exe está en el mismo directorio que agente.exe
        const exeActual = process.execPath
        const directorioActual = path.dirname(exeActual)
        const uninstallSource = path.join(directorioActual, 'uninstall.exe')
        
        if (fs.existsSync(uninstallSource)) {
            fs.copyFileSync(uninstallSource, rutaDesinstalador)
            console.log(`✓ Desinstalador copiado a: ${rutaDesinstalador}`)
            return true
        } else {
            console.log('⚠ No se encontró uninstall.exe para copiar')
            return false
        }
    } catch (err) {
        console.log('✗ No se pudo crear el desinstalador:', err.message)
        return false
    }
}

async function main() {
    try {
        // Preguntar la IP del servidor
        await preguntarIP()
        
        // Crear desinstalador en el escritorio
        crearDesinstalador()
        
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
        console.log('✓ Equipo registrado correctamente:', datos.nombre_equipo)

    } catch (err) {
        console.error('Error:', err.message)
    } finally {
        process.exit(0)
    }
}

main()