// Fotos de los pilotos de los resultados: el "torso" con fondo transparente
// que la ACTC publica de los pilotos activos. Los que no tienen foto en la
// ACTC no llevan foto: TCdle les muestra su silueta genérica.
// Uso: npm run fotos (no vuelve a bajar las que ya están).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { buscarSlugActc, slugActc } from "./fotos-reglas.ts";
import type { CatalogoCarreras, CatalogoFotos, FotoPiloto } from "./tipos.ts";

const CARRERAS = "datos/carreras-tc.json";
const SALIDA = "datos/fotos-pilotos.json";
const CARPETA = "datos/fotos";
const ACTC = "https://actc.org.ar";
const CATEGORIAS_ACTC = ["tc", "tcp", "tcm", "tcpk", "tcpm", "tcppk"];
const AGENTE = "tcdle-resultados/0.1 (https://github.com/MarcosAlba/tcdle-resultados)";
const PAUSA_MS = 400;

async function pedir(url: string): Promise<Response> {
    await new Promise((r) => setTimeout(r, PAUSA_MS));
    return fetch(url, { headers: { "User-Agent": AGENTE } });
}

/** Carpetas de fotos que aparecen en los listados de pilotos de cada categoría. */
async function carpetasActc(): Promise<string[]> {
    const carpetas = new Set<string>();
    for (const categoria of CATEGORIAS_ACTC) {
        const html = await (await pedir(`${ACTC}/${categoria}/pilotos`)).text();
        for (const [, carpeta] of html.matchAll(/actc-pilotos\/([a-z0-9-]+)\//g)) {
            carpetas.add(carpeta);
        }
    }
    return [...carpetas];
}

async function bajarActc(piloto: string, apellido: string, carpetas: string[]): Promise<{ imagen: Buffer; url: string } | null> {
    const buscado = slugActc(piloto, apellido);
    // Primero la carpeta de los listados; si no aparece, la que sigue la convención.
    for (const carpeta of new Set([buscarSlugActc(buscado, carpetas), buscado])) {
        if (!carpeta) {
            continue;
        }
        const url = `${ACTC}/uploads/actc-pilotos/${carpeta}/${carpeta}-torso.png`;
        const respuesta = await pedir(url);
        if (respuesta.ok && respuesta.headers.get("content-type")?.startsWith("image/")) {
            return { imagen: Buffer.from(await respuesta.arrayBuffer()), url };
        }
    }
    return null;
}

/** Retrato de 320x400 con el torso entero, apoyado abajo y con fondo transparente. */
function convertir(imagen: Buffer): Promise<Buffer> {
    return sharp(imagen)
        .resize({ width: 320, height: 400, fit: "contain", position: "bottom", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 80 })
        .toBuffer();
}

function leerCatalogo(): CatalogoFotos {
    if (!existsSync(SALIDA)) {
        return { version: 1, generado: "", fotos: [] };
    }
    return JSON.parse(readFileSync(SALIDA, "utf8")) as CatalogoFotos;
}

async function main() {
    const carreras = JSON.parse(readFileSync(CARRERAS, "utf8")) as CatalogoCarreras;
    const pilotos = new Map<string, string>();
    for (const carrera of carreras.carreras) {
        for (const resultado of carrera.resultados) {
            pilotos.set(resultado.piloto, resultado.apellido);
        }
    }

    mkdirSync(CARPETA, { recursive: true });
    const porPiloto = new Map(leerCatalogo().fotos.map((foto) => [foto.piloto, foto]));
    const carpetas = await carpetasActc();
    let sinFoto = 0;

    for (const [piloto, apellido] of pilotos) {
        const existente = porPiloto.get(piloto);
        if (existente && existsSync(`${CARPETA}/${existente.archivo}`)) {
            continue;
        }

        const actc = await bajarActc(piloto, apellido, carpetas);
        if (!actc) {
            sinFoto++;
            continue;
        }

        const archivo = slugActc(piloto, apellido) + ".webp";
        writeFileSync(`${CARPETA}/${archivo}`, await convertir(actc.imagen));
        porPiloto.set(piloto, { piloto, archivo, origenUrl: actc.url } satisfies FotoPiloto);
        console.log(piloto);
    }

    const salida: CatalogoFotos = {
        version: 1,
        generado: new Date().toISOString().slice(0, 10),
        fotos: [...porPiloto.values()].sort((a, b) => a.piloto.localeCompare(b.piloto, "es")),
    };
    writeFileSync(SALIDA, JSON.stringify(salida, null, 2) + "\n");
    console.log(`\n${salida.fotos.length} fotos en ${SALIDA}; ${sinFoto} pilotos sin foto en la ACTC.`);
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
});
