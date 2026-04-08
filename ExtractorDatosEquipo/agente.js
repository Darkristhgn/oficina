const si = require('systeminformation')
const os = require('os')
const http = require('http')
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const readline = require('readline')

// Importar las funciones de extracción de datos
let datosEquipo;
try {
    datosEquipo = require('./ObtenerDatosEquipo');
} catch (err) {
    console.error('❌ No se encuentra el archivo ObtenerDatosEquipo.js');
    console.error('Asegúrate de que esté en la misma carpeta que agente.exe');
    process.exit(1);
}

// Variable global para el servidor
let SERVIDOR = '';

// Configurar readline para preguntar al usuario
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Configuración de reintentos
const CONFIG = {
    maxReintentos: 2,
    tiempoEsperaMs: 2000,    // 2 segundos entre reintentos
    timeoutConexionMs: 5000  // 5 segundos de timeout por intento
};

// --------------------------------------------------------------
// 1. Preguntar IP del servidor
// --------------------------------------------------------------
function preguntarIP() {
    return new Promise((resolve) => {
        rl.question('Ingrese la IP del servidor (ejemplo: 192.168.1.100): ', (ip) => {
            if (!ip || ip.trim() === '') {
                console.log('IP no válida. Usando localhost por defecto.');
                ip = 'localhost';
            }
            SERVIDOR = `http://${ip.trim()}:3000`;
            console.log(`Conectando a: ${SERVIDOR}`);
            rl.close();
            resolve();
        });
    });
}

// --------------------------------------------------------------
// 2. Obtener datos del equipo USANDO las funciones externas
// --------------------------------------------------------------
async function obtenerDatosDesdeModulos() {
    try {
        console.log('Extrayendo información del equipo...');
        
        const [
            nombreEquipo,
            marca,
            modeloEquipo,
            modeloCpu,
            ramString,
            serie,
            almacenamientoString,
            soCompleto
        ] = await Promise.all([
            datosEquipo.extraerNombreEquipo(si),
            datosEquipo.extraerMarcaEquipo(si),
            datosEquipo.extraerModeloEquipo(si),
            datosEquipo.extraerNombreCpu(si),
            datosEquipo.extraerTamanioRam(si),
            datosEquipo.extraerNumeroSerie(si),
            datosEquipo.extraerTamanioDisco(si),
            datosEquipo.extraerSo(os)
        ]);
        
        // Convertir los valores a los tipos que espera el servidor
        const cantidadRamGb = parseInt(parseFloat(ramString), 10);
        const almacenamientoGb = parseInt(parseFloat(almacenamientoString), 10);
        const sistemaOperativo = soCompleto.substring(0, 20);
        
        return {
            nombre_equipo: nombreEquipo,
            marca: marca,
            modelo_equipo: modeloEquipo,
            modelo_cpu: modeloCpu,
            cantidad_ram_Gb: cantidadRamGb,
            numero_serie: serie,
            almacenamiento: almacenamientoGb.toString(),
            sistema_operativo: sistemaOperativo
        };
    } catch (err) {
        throw new Error(`Error al extraer datos del equipo: ${err.message}`);
    }
}

// --------------------------------------------------------------
// 3. Funciones HTTP con reintentos
// --------------------------------------------------------------
function hacerPeticionHttp(opciones, body = null) {
    return new Promise((resolve, reject) => {
        const req = (opciones.method === 'GET' ? http.get : http.request);
        
        const request = req(opciones, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    reject(new Error('Error al parsear respuesta del servidor'));
                }
            });
        });
        
        request.on('error', reject);
        request.setTimeout(CONFIG.timeoutConexionMs, () => {
            request.destroy();
            reject(new Error('Timeout de conexión'));
        });
        
        if (body) {
            request.write(body);
        }
        request.end();
    });
}

async function verificarSerieConReintentos(serie, intento = 1) {
    try {
        console.log(`Intentando verificar serie (Intento ${intento}/${CONFIG.maxReintentos + 1})...`);
        const url = new URL(`${SERVIDOR}/Agente/Verificar?serie=${encodeURIComponent(serie)}`);
        const opciones = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: 'GET',
            timeout: CONFIG.timeoutConexionMs
        };
        const resultado = await hacerPeticionHttp(opciones);
        return resultado.existe;
    } catch (err) {
        console.log(`✗ Error en intento ${intento}: ${err.message}`);
        if (intento <= CONFIG.maxReintentos) {
            console.log(`Reintentando en ${CONFIG.tiempoEsperaMs/1000} segundos...`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.tiempoEsperaMs));
            return verificarSerieConReintentos(serie, intento + 1);
        } else {
            throw new Error(`No se pudo conectar al servidor después de ${CONFIG.maxReintentos + 1} intentos: ${err.message}`);
        }
    }
}

async function registrarEquipoConReintentos(datos, intento = 1) {
    try {
        console.log(`Intentando registrar equipo (Intento ${intento}/${CONFIG.maxReintentos + 1})...`);
        const body = JSON.stringify(datos);
        const url = new URL(`${SERVIDOR}/Agente/Registrar`);
        const opciones = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            },
            timeout: CONFIG.timeoutConexionMs
        };
        const resultado = await hacerPeticionHttp(opciones, body);
        return resultado;
    } catch (err) {
        console.log(`✗ Error en intento ${intento}: ${err.message}`);
        if (intento <= CONFIG.maxReintentos) {
            console.log(`Reintentando en ${CONFIG.tiempoEsperaMs/1000} segundos...`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.tiempoEsperaMs));
            return registrarEquipoConReintentos(datos, intento + 1);
        } else {
            throw new Error(`No se pudo registrar el equipo después de ${CONFIG.maxReintentos + 1} intentos: ${err.message}`);
        }
    }
}

async function probarConexionServidor() {
    console.log('\n--- Probando conexión con el servidor ---');
    try {
        const url = new URL(`${SERVIDOR}/Agente/Verificar?serie=test`);
        const opciones = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: 'GET',
            timeout: CONFIG.timeoutConexionMs
        };
        await hacerPeticionHttp(opciones);
        console.log('✓ Conexión exitosa con el servidor\n');
        return true;
    } catch (err) {
        console.log(`✗ No se pudo conectar al servidor: ${err.message}\n`);
        return false;
    }
}

// --------------------------------------------------------------
// 4. Registro en arranque de Windows
// --------------------------------------------------------------
function registrarEnArranque() {
    try {
        const exePath = process.execPath;
        const nombre = 'OficinaAgente';
        execSync(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${nombre}" /t REG_SZ /d "${exePath}" /f`);
        console.log('✓ Registrado en arranque de Windows');
        return true;
    } catch (err) {
        console.log('✗ No se pudo registrar en arranque:', err.message);
        return false;
    }
}

function yaEstaEnArranque() {
    try {
        const nombre = 'OficinaAgente';
        const resultado = execSync(`reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${nombre}"`, { encoding: 'utf8' });
        return resultado.includes('OficinaAgente');
    } catch {
        return false;
    }
}

// --------------------------------------------------------------
// 5. Copiar desinstalador al escritorio
// --------------------------------------------------------------
function crearDesinstalador() {
    try {
        const escritorio = path.join(os.homedir(), 'Desktop');
        const rutaDesinstalador = path.join(escritorio, 'uninstall.exe');
        
        if (fs.existsSync(rutaDesinstalador)) {
            console.log('✓ Desinstalador ya existe en el escritorio');
            return true;
        }
        
        const exeActual = process.execPath;
        const directorioActual = path.dirname(exeActual);
        const uninstallSource = path.join(directorioActual, 'uninstall.exe');
        
        if (fs.existsSync(uninstallSource)) {
            fs.copyFileSync(uninstallSource, rutaDesinstalador);
            console.log(`✓ Desinstalador copiado a: ${rutaDesinstalador}`);
            return true;
        } else {
            console.log('⚠ No se encontró uninstall.exe para copiar');
            return false;
        }
    } catch (err) {
        console.log('✗ No se pudo crear el desinstalador:', err.message);
        return false;
    }
}

// --------------------------------------------------------------
// 6. Función principal
// --------------------------------------------------------------
async function main() {
    try {
        // Pedir IP del servidor
        await preguntarIP();
        
        // Probar conexión antes de continuar
        const conexionOk = await probarConexionServidor();
        if (!conexionOk) {
            console.log('No se pudo establecer conexión con el servidor. El programa se cerrará.');
            console.log('Verifique que:');
            console.log('  1. La IP del servidor sea correcta');
            console.log('  2. El servidor esté ejecutándose');
            console.log('  3. No haya un firewall bloqueando la conexión');
            process.exit(1);
        }
        
        // Copiar desinstalador al escritorio
        crearDesinstalador();
        
        // Registrar en arranque si no existe
        if (!yaEstaEnArranque()) {
            registrarEnArranque();
        }
        
        // Obtener datos del equipo usando los módulos externos
        const datos = await obtenerDatosDesdeModulos();
        console.log('✓ Serie detectada:', datos.numero_serie);
        
        // Verificar si ya existe en el servidor (con reintentos)
        const existe = await verificarSerieConReintentos(datos.numero_serie);
        
        if (existe) {
            console.log('✓ Equipo ya registrado previamente');
            console.log('Cerrando programa...');
            process.exit(0);
        }
        
        // Registrar el equipo (con reintentos)
        await registrarEquipoConReintentos(datos);
        console.log('✓ Equipo registrado correctamente:', datos.nombre_equipo);
        console.log('✓ Proceso completado con éxito');
        
    } catch (err) {
        console.error('\n❌ ERROR FATAL:', err.message);
        console.log('\nEl programa no pudo completar el registro.');
        console.log('Posibles soluciones:');
        console.log('  1. Verifique su conexión de red');
        console.log('  2. Confirme que el servidor esté funcionando');
        console.log('  3. Ejecute el programa nuevamente');
    } finally {
        console.log('\nEl programa se cerrará en 3 segundos...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        process.exit(0);
    }
}

// Manejar Ctrl+C
process.on('SIGINT', () => {
    console.log('\n\nPrograma interrumpido por el usuario');
    process.exit(0);
});

// Ejecutar
main();