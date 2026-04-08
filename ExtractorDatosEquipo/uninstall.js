const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const readline = require('readline')
const os = require('os')

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const NOMBRE_AGENTE = 'OficinaAgente'

function preguntarConfirmacion() {
    return new Promise((resolve) => {
        rl.question('¿Está seguro que desea desinstalar el Agente? (s/n): ', (respuesta) => {
            resolve(respuesta.toLowerCase() === 's' || respuesta.toLowerCase() === 'si')
        })
    })
}

function preguntarBorrarArchivo() {
    return new Promise((resolve) => {
        rl.question('¿Desea eliminar también el archivo ejecutable? (s/n): ', (respuesta) => {
            resolve(respuesta.toLowerCase() === 's' || respuesta.toLowerCase() === 'si')
        })
    })
}

function eliminarDelArranque() {
    try {
        execSync(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${NOMBRE_AGENTE}" /f`)
        console.log('✓ Eliminado del arranque de Windows')
        return true
    } catch (err) {
        if (err.message.includes('no se encontró')) {
            console.log('✓ El agente no estaba registrado en el arranque')
            return true
        }
        console.log('✗ Error al eliminar del arranque:', err.message)
        return false
    }
}

function encontrarEjecutable() {
    try {
        const resultado = execSync(`reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${NOMBRE_AGENTE}"`, { encoding: 'utf8' })
        const match = resultado.match(/REG_SZ\s+(.+)/)
        if (match && match[1]) {
            return match[1].trim()
        }
        return null
    } catch {
        return null
    }
}

function eliminarArchivo(rutaEjecutable) {
    try {
        if (rutaEjecutable && fs.existsSync(rutaEjecutable)) {
            fs.unlinkSync(rutaEjecutable)
            console.log('✓ Archivo ejecutable eliminado:', rutaEjecutable)
            
            const directorio = path.dirname(rutaEjecutable)
            try {
                const archivos = fs.readdirSync(directorio)
                if (archivos.length === 0) {
                    fs.rmdirSync(directorio)
                    console.log('✓ Directorio vacío eliminado:', directorio)
                }
            } catch (err) {}
            return true
        } else {
            console.log('✗ No se encontró el archivo ejecutable')
            return false
        }
    } catch (err) {
        console.log('✗ Error al eliminar el archivo:', err.message)
        return false
    }
}

function eliminarDesinstalador() {
    try {
        // Pequeño retraso antes de eliminarse a sí mismo
        const scriptPath = process.argv[1]
        if (scriptPath && fs.existsSync(scriptPath)) {
            const batchPath = path.join(os.tmpdir(), 'delete_uninstaller.bat')
            const batchContent = `@echo off
timeout /t 2 /nobreak > nul
del "${scriptPath}" > nul 2>&1
del "%~f0" > nul 2>&1
`
            fs.writeFileSync(batchPath, batchContent)
            execSync(`start /b "${batchPath}"`)
            console.log('✓ El desinstalador se eliminará automáticamente')
        }
    } catch (err) {
        console.log('✗ No se pudo eliminar el desinstalador automáticamente')
    }
}

async function main() {
    console.log('=== DESINSTALADOR DEL AGENTE ===\n')
    
    const confirmado = await preguntarConfirmacion()
    if (!confirmado) {
        console.log('Desinstalación cancelada.')
        rl.close()
        return
    }
    
    console.log('\nDesinstalando...\n')
    
    eliminarDelArranque()
    
    const borrarArchivo = await preguntarBorrarArchivo()
    
    if (borrarArchivo) {
        const rutaEjecutable = encontrarEjecutable()
        if (rutaEjecutable) {
            eliminarArchivo(rutaEjecutable)
        } else {
            console.log('✗ No se pudo encontrar la ruta del ejecutable')
        }
    }
    
    console.log('\nLimpiando...')
    eliminarDesinstalador()
    
    console.log('\n✓ Desinstalación completada.')
    console.log('El desinstalador se eliminará en unos segundos.')
    
    rl.close()
    
    setTimeout(() => {
        process.exit(0)
    }, 2000)
}

main().catch(err => {
    console.error('Error durante la desinstalación:', err)
    rl.close()
    process.exit(1)
})