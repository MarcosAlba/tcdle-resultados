// Fotos de los pilotos de los resultados, para los que TCdle no tiene foto
// propia. Primero la ACTC (los pilotos activos tienen un "torso" con fondo
// transparente); si no está, la imagen principal de su artículo en Wikipedia,
// solo si el artículo es de un piloto del TC y la imagen lo nombra.
// Uso: npm run fotos (no vuelve a bajar las que ya están).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import {
    archivoNombraAlPiloto,
    buscarSlugActc,
    esFotoDeAuto,
    esPilotoDeTc,
    esRetrato,
    limpiarHtml,
    slugActc,
    zonaDeLaCara,
} from "./fotos-reglas.ts";
import type { CatalogoCarreras, CatalogoFotos, FotoPiloto } from "./tipos.ts";

const CARRERAS = "datos/carreras-tc.json";
const SALIDA = "datos/fotos-pilotos.json";
const CARPETA = "datos/fotos";
const ACTC = "https://actc.org.ar";
const CATEGORIAS_ACTC = ["tc", "tcp", "tcm", "tcpk", "tcpm", "tcppk"];
// Wikimedia pide identificarse con un User-Agent que diga quién consulta.
const AGENTE = "tcdle-resultados/0.1 (https://github.com/MarcosAlba/tcdle-resultados)";
const PAUSA_MS = 400;

const esperar = () => new Promise((r) => setTimeout(r, PAUSA_MS));

async function pedir(url: string): Promise<Response> {
    await esperar();
    return fetch(url, { headers: { "User-Agent": AGENTE } });
}

async function pedirJson<T>(url: string): Promise<T> {
    const respuesta = await pedir(url);
    if (!respuesta.ok) {
        throw new Error(`${respuesta.status} en ${url}`);
    }
    return (await respuesta.json()) as T;
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

interface PaginaWiki {
    title: string;
    missing?: string;
    pageimage?: string;
    categories?: { title: string }[];
}

interface InfoImagen {
    width: number;
    height: number;
    thumburl: string;
    descriptionurl: string;
    extmetadata: Record<string, { value: string } | undefined>;
}

async function bajarWikimedia(piloto: string, apellido: string): Promise<{ imagen: Buffer; foto: Omit<FotoPiloto, "piloto" | "archivo"> } | null> {
    const pagina = Object.values(
        (
            await pedirJson<{ query: { pages: Record<string, PaginaWiki> } }>(
                "https://es.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages|categories&piprop=name&cllimit=max&titles=" +
                    encodeURIComponent(piloto)
            )
        ).query.pages
    )[0];

    if (!pagina || pagina.missing !== undefined || !pagina.pageimage) {
        return null;
    }
    // Homónimos: el artículo tiene que ser de un piloto del TC y la imagen tiene que nombrarlo.
    if (!esPilotoDeTc((pagina.categories ?? []).map((categoria) => categoria.title))) {
        return null;
    }
    if (!archivoNombraAlPiloto(pagina.pageimage, apellido)) {
        return null;
    }

    const archivo = Object.values(
        (
            await pedirJson<{ query: { pages: Record<string, { imageinfo?: InfoImagen[]; categories?: { title: string }[] }> } }>(
                "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo|categories&cllimit=max&iiprop=url|size|extmetadata&iiurlwidth=640&titles=" +
                    encodeURIComponent("File:" + pagina.pageimage)
            )
        ).query.pages
    )[0];
    const info = archivo?.imageinfo?.[0];

    // El auto en pista, aunque el archivo lleve el nombre del piloto, no sirve.
    if (!info || esFotoDeAuto((archivo.categories ?? []).map((categoria) => categoria.title))) {
        return null;
    }
    const meta = info.extmetadata;
    const respuesta = await pedir(info.thumburl);
    if (!respuesta.ok) {
        return null;
    }

    return {
        imagen: Buffer.from(await respuesta.arrayBuffer()),
        foto: {
            fuente: "wikimedia",
            autor: limpiarHtml(meta.Artist?.value) || "Autor desconocido",
            licencia: limpiarHtml(meta.LicenseShortName?.value) || null,
            licenciaUrl: meta.LicenseUrl?.value ?? null,
            origenUrl: info.descriptionurl,
        },
    };
}

/**
 * Retrato de 320x400: el torso de la ACTC entero; las de Commons verticales,
 * desde arriba (la cara); las apaisadas, por la zona de interés.
 */
async function convertir(imagen: Buffer, fuente: FotoPiloto["fuente"]): Promise<Buffer> {
    if (fuente === "actc") {
        return sharp(imagen)
            .resize({ width: 320, height: 400, fit: "contain", position: "bottom", background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .webp({ quality: 80 })
            .toBuffer();
    }
    const derecha = await sharp(imagen).rotate().toBuffer();
    const { width = 0, height = 0 } = await sharp(derecha).metadata();
    if (!esRetrato(width, height)) {
        return sharp(derecha).resize({ width: 320, height: 400, fit: "cover", position: sharp.strategy.attention }).webp({ quality: 80 }).toBuffer();
    }

    return sharp(derecha)
        .extract(zonaDeLaCara(width, height))
        .resize({ width: 320, height: 400, fit: "cover", position: "top" })
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
    const catalogo = leerCatalogo();
    const porPiloto = new Map(catalogo.fotos.map((foto) => [foto.piloto, foto]));
    const carpetas = await carpetasActc();
    const sinFoto: string[] = [];

    for (const [piloto, apellido] of pilotos) {
        const existente = porPiloto.get(piloto);
        if (existente && existsSync(`${CARPETA}/${existente.archivo}`)) {
            continue;
        }

        const archivo = slugActc(piloto, apellido) + ".webp";
        const actc = await bajarActc(piloto, apellido, carpetas);
        const resultado = actc
            ? {
                  imagen: actc.imagen,
                  foto: { fuente: "actc" as const, autor: "ACTC", licencia: null, licenciaUrl: null, origenUrl: actc.url },
              }
            : await bajarWikimedia(piloto, apellido);

        if (!resultado) {
            sinFoto.push(piloto);
            continue;
        }

        writeFileSync(`${CARPETA}/${archivo}`, await convertir(resultado.imagen, resultado.foto.fuente));
        porPiloto.set(piloto, { piloto, archivo, ...resultado.foto });
        console.log(`${piloto}: ${resultado.foto.fuente}`);
    }

    const salida: CatalogoFotos = {
        version: 1,
        generado: new Date().toISOString().slice(0, 10),
        fotos: [...porPiloto.values()].sort((a, b) => a.piloto.localeCompare(b.piloto, "es")),
    };
    writeFileSync(SALIDA, JSON.stringify(salida, null, 2) + "\n");
    console.log(`\n${salida.fotos.length} fotos en ${SALIDA}; ${sinFoto.length} pilotos sin foto.`);
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
});
