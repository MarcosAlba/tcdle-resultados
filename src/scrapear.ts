import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ApiActc } from "./api.ts";
import { armarCarrera } from "./normalizar.ts";
import { problemasCarrera } from "./validar.ts";
import type { CarreraOpcion, CatalogoCarreras, FilaCruda, Tanda } from "./tipos.ts";

const CATEGORIA = "tc";
const SALIDA = "datos/carreras-tc.json";
const ANIO_DESDE = 2010;

interface Opciones {
    carreras: CarreraOpcion[];
    tandas: Tanda[];
}

/** Cache de lo crudo por carrera: reintentar no vuelve a pedir lo que ya se bajó. */
interface Cache {
    tanda: string | null;
    filas: FilaCruda[];
}

function leerAnioArg(): number | null {
    const i = process.argv.indexOf("--anio");
    return i === -1 ? null : Number(process.argv[i + 1]);
}

const consulta = (o: Record<string, string | number>) =>
    Object.entries(o)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");

function leerCatalogo(): CatalogoCarreras {
    if (!existsSync(SALIDA)) return { version: 1, generado: "", carreras: [] };
    return JSON.parse(readFileSync(SALIDA, "utf8")) as CatalogoCarreras;
}

async function main() {
    const soloAnio = leerAnioArg();
    const actual = new Date().getFullYear();
    const anios = soloAnio
        ? [soloAnio]
        : Array.from({ length: actual - ANIO_DESDE + 1 }, (_, i) => actual - i);

    mkdirSync("cache", { recursive: true });
    const catalogo = leerCatalogo();
    const porId = new Map(catalogo.carreras.map((c) => [c.id, c]));
    const api = await ApiActc.abrir();
    const avisos: string[] = [];

    try {
        for (const anio of anios) {
            const { carreras } = await api.pedir<Opciones>(
                `/api/historico/resultados/opciones?${consulta({ año: anio, categoria: CATEGORIA })}`,
            );
            for (const { nro } of carreras) {
                const archivo = `cache/${anio}-${nro}.json`;
                let datos: Cache;
                if (existsSync(archivo)) {
                    datos = JSON.parse(readFileSync(archivo, "utf8")) as Cache;
                } else {
                    const { tandas } = await api.pedir<Opciones>(
                        `/api/historico/resultados/opciones?${consulta({ año: anio, categoria: CATEGORIA, fecha: nro })}`,
                    );
                    const finales = tandas.filter((t) => t.tipo === "final").sort((a, b) => b.orden - a.orden);
                    const tanda = finales[0]?.nombre ?? null;
                    const filas = tanda
                        ? await api.pedir<FilaCruda[]>(
                              `/api/historico/resultados?${consulta({ año: anio, categoria: CATEGORIA, fecha: nro, tanda })}`,
                          )
                        : [];
                    datos = { tanda, filas };
                    // Solo se cachea lo que tiene final: una carrera todavía sin cargar se vuelve a intentar.
                    if (filas.length) writeFileSync(archivo, JSON.stringify(datos));
                }
                if (!datos.filas.length) {
                    avisos.push(`${anio} fecha ${nro}: sin final publicada`);
                    continue;
                }
                const carrera = armarCarrera(anio, nro, datos.filas);
                const problemas = problemasCarrera(carrera);
                if (problemas.length) {
                    avisos.push(`${carrera.id}: ${problemas.join("; ")}`);
                    continue;
                }
                porId.set(carrera.id, carrera);
                console.log(`${carrera.id}: ${carrera.resultados.length} resultados`);
            }
        }
    } finally {
        await api.cerrar();
    }

    const salida: CatalogoCarreras = {
        version: 1,
        generado: new Date().toISOString().slice(0, 10),
        carreras: [...porId.values()].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.fechaNro - b.fechaNro),
    };
    writeFileSync(SALIDA, JSON.stringify(salida, null, 2) + "\n");
    console.log(`\n${salida.carreras.length} carreras en ${SALIDA}`);
    if (avisos.length) console.warn(`\nAvisos:\n${avisos.join("\n")}`);
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
});
