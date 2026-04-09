const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')
const readline = require('readline')

const NOMBRE_AGENTE = 'OficinaAgente'

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

function preguntar(texto) {
    return new Promise((resolve) => {
        rl.question(texto, (resp) => {
            resolve(resp.toLowerCase() === 's' || resp.toLowerCase() === 'si')
        })
    })
}

function encontrarRutaAgente() {
    try {
        const resultado = execSync(
            `reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${NOMBRE_AGENTE}"`,
            { encoding: 'utf8' }
        )
        const match = resultado.match(/REG_SZ\s+(.+)/)
        return match ? match[1].trim() : null
    } catch { return null }
}

function eliminarDelArranque() {
    try {
        execSync(
            `reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${NOMBRE_AGENTE}" /f`
        )
        console.log('✓ Eliminado del arranque de Windows')
    } catch (err) {
        if (err.message.includes('no se encontr')) {
            console.log('✓ El agente no estaba en el arranque')
        } else {
            console.log('✗ Error al eliminar del arranque:', err.message)
        }
    }
}

function eliminarArchivo(ruta) {
    try {
        if (ruta && fs.existsSync(ruta)) {
            fs.unlinkSync(ruta)
            console.log('✓ Archivo eliminado:', ruta)
            // Intentar eliminar carpeta si queda vacia
            try {
                const dir = path.dirname(ruta)
                if (fs.readdirSync(dir).length === 0) {
                    fs.rmdirSync(dir)
                    console.log('✓ Carpeta vacia eliminada:', dir)
                }
            } catch {}
        } else {
            console.log('✗ No se encontro el archivo en:', ruta)
        }
    } catch (err) {
        console.log('✗ Error al eliminar archivo:', err.message)
    }
}

function autoEliminar() {
    try {
        const propiaRuta = process.execPath
        const bat = path.join(os.tmpdir(), 'del_uninstall.bat')
        fs.writeFileSync(bat, `@echo off\ntimeout /t 2 /nobreak > nul\ndel "${propiaRuta}" > nul 2>&1\ndel "%~f0" > nul 2>&1\n`)
        execSync(`start /b "${bat}"`)
        console.log('✓ El desinstalador se eliminara automaticamente')
    } catch {
        console.log('⚠ No se pudo programar la autoeliminacion del desinstalador')
    }
}

async function main() {
    console.log('=== DESINSTALADOR DEL AGENTE DE OFICINA ===\n')

    const confirmar = await preguntar('¿Esta seguro que desea desinstalar el Agente? (s/n): ')
    if (!confirmar) {
        console.log('Desinstalacion cancelada.')
        rl.close()
        return
    }

    console.log('\nDesinstalando...\n')

    const rutaAgente = encontrarRutaAgente()
    eliminarDelArranque()

    const borrarExe = await preguntar('¿Desea eliminar tambien el archivo ejecutable del agente? (s/n): ')
    if (borrarExe) {
        if (rutaAgente) {
            eliminarArchivo(rutaAgente)
        } else {
            console.log('✗ No se encontro la ruta del ejecutable en el registro')
        }
    }

    console.log('\nLimpiando desinstalador...')
    autoEliminar()

    console.log('\n✓ Desinstalacion completada.')
    rl.close()

    setTimeout(() => process.exit(0), 2000)
}

main().catch(err => {
    console.error('Error durante la desinstalacion:', err)
    rl.close()
    process.exit(1)
})