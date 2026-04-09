const si = require('systeminformation')
const os = require('os')
const http = require('http')
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const readline = require('readline')

// ─── CONFIGURACION ────────────────────────────────────────────
const CONFIG = {
    maxReintentos: 2,
    tiempoEsperaMs: 2000,
    timeoutConexionMs: 5000
}

let SERVIDOR = ''

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

// ─── EXTRACCION DE DATOS ──────────────────────────────────────
async function obtenerDatos() {
    console.log('Extrayendo informacion del equipo...')
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
        sistema_operativo: os.version().substring(0, 20)
    }
}

// ─── HTTP ─────────────────────────────────────────────────────
function hacerPeticion(opciones, body = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(opciones, (res) => {
            let data = ''
            res.on('data', chunk => data += chunk)
            res.on('end', () => {
                try { resolve(JSON.parse(data)) }
                catch (e) { reject(new Error('Error al parsear respuesta del servidor')) }
            })
        })
        req.on('error', reject)
        req.setTimeout(CONFIG.timeoutConexionMs, () => {
            req.destroy()
            reject(new Error('Timeout de conexion'))
        })
        if (body) req.write(body)
        req.end()
    })
}

async function conReintentos(fn, intento = 1) {
    try {
        return await fn()
    } catch (err) {
        console.log(`✗ Error en intento ${intento}: ${err.message}`)
        if (intento <= CONFIG.maxReintentos) {
            console.log(`Reintentando en ${CONFIG.tiempoEsperaMs / 1000} segundos...`)
            await new Promise(r => setTimeout(r, CONFIG.tiempoEsperaMs))
            return conReintentos(fn, intento + 1)
        }
        throw new Error(`Fallo despues de ${intento} intentos: ${err.message}`)
    }
}

async function verificarSerie(serie) {
    return conReintentos(async () => {
        console.log('Verificando si el equipo ya esta registrado...')
        const url = new URL(`${SERVIDOR}/Agente/Verificar?serie=${encodeURIComponent(serie)}`)
        const resultado = await hacerPeticion({
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: 'GET'
        })
        return resultado.existe
    })
}

async function registrarEquipo(datos) {
    return conReintentos(async () => {
        console.log('Registrando equipo en el servidor...')
        const body = JSON.stringify(datos)
        const url = new URL(`${SERVIDOR}/Agente/Registrar`)
        return hacerPeticion({
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, body)
    })
}

async function probarConexion() {
    console.log('\n--- Probando conexion con el servidor ---')
    try {
        const url = new URL(`${SERVIDOR}/Agente/Verificar?serie=test`)
        await hacerPeticion({
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: 'GET'
        })
        console.log('✓ Conexion exitosa\n')
        return true
    } catch (err) {
        console.log(`✗ No se pudo conectar: ${err.message}\n`)
        return false
    }
}

// ─── ARRANQUE DE WINDOWS ──────────────────────────────────────
function yaEstaEnArranque() {
    try {
        const resultado = execSync(
            `reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "OficinaAgente"`,
            { encoding: 'utf8' }
        )
        return resultado.includes('OficinaAgente')
    } catch { return false }
}

function registrarEnArranque() {
    try {
        execSync(
            `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "OficinaAgente" /t REG_SZ /d "${process.execPath}" /f`
        )
        console.log('✓ Registrado en arranque de Windows')
    } catch (err) {
        console.log('✗ No se pudo registrar en arranque:', err.message)
    }
}

// ─── DESINSTALADOR ────────────────────────────────────────────
function copiarDesinstalador() {
    try {
        const escritorio = path.join(os.homedir(), 'Desktop')
        const destino = path.join(escritorio, 'uninstall.exe')
        if (fs.existsSync(destino)) {
            console.log('✓ Desinstalador ya existe en el escritorio')
            return
        }
        const origen = path.join(path.dirname(process.execPath), 'uninstall.exe')
        if (fs.existsSync(origen)) {
            fs.copyFileSync(origen, destino)
            console.log(`✓ Desinstalador copiado al escritorio`)
        } else {
            console.log('⚠ No se encontro uninstall.exe junto al agente')
        }
    } catch (err) {
        console.log('✗ No se pudo copiar el desinstalador:', err.message)
    }
}

// ─── IP ───────────────────────────────────────────────────────
function preguntarIP() {
    return new Promise((resolve) => {
        rl.question('Ingrese la IP del servidor (ejemplo: 192.168.1.100): ', (ip) => {
            ip = ip.trim() || 'localhost'
            SERVIDOR = `http://${ip}:3000`
            console.log(`Conectando a: ${SERVIDOR}`)
            rl.close()
            resolve()
        })
    })
}

// ─── MAIN ─────────────────────────────────────────────────────
async function main() {
    try {
        await preguntarIP()

        const conexionOk = await probarConexion()
        if (!conexionOk) {
            console.log('No se pudo conectar al servidor. Verifique que:')
            console.log('  1. La IP sea correcta')
            console.log('  2. El servidor este ejecutandose')
            console.log('  3. No haya firewall bloqueando el puerto 3000')
            process.exit(1)
        }

        copiarDesinstalador()

        if (!yaEstaEnArranque()) {
            registrarEnArranque()
        }

        const datos = await obtenerDatos()
        console.log('✓ Serie detectada:', datos.numero_serie)

        const existe = await verificarSerie(datos.numero_serie)
        if (existe) {
            console.log('✓ Equipo ya registrado, cerrando...')
            process.exit(0)
        }

        await registrarEquipo(datos)
        console.log('✓ Equipo registrado correctamente:', datos.nombre_equipo)

    } catch (err) {
        console.error('\n❌ ERROR:', err.message)
        console.log('\nEl programa no pudo completar el registro.')
        console.log('Verifique su conexion de red y que el servidor este activo.')
    } finally {
        console.log('\nCerrando en 3 segundos...')
        await new Promise(r => setTimeout(r, 3000))
        process.exit(0)
    }
}

process.on('SIGINT', () => {
    console.log('\nInterrumpido por el usuario')
    process.exit(0)
})

main()