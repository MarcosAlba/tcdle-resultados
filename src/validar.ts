import type { CatalogoCarreras, Carrera } from "./tipos.ts";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Devuelve los problemas de una carrera; vacío si está bien. */
export function problemasCarrera(c: Carrera): string[] {
    const p: string[] = [];
    if (!FECHA.test(c.fecha) || Number.isNaN(Date.parse(c.fecha))) p.push(`fecha inválida "${c.fecha}"`);
    if (!c.nombre) p.push("sin nombre");
    if (c.resultados.length < 2) p.push(`solo ${c.resultados.length} resultados`);
    c.resultados.forEach((r, i) => {
        if (r.posicion !== i + 1) p.push(`posición ${r.posicion} donde iba ${i + 1}`);
        if (!r.piloto) p.push(`posición ${r.posicion} sin piloto`);
        if (!Number.isInteger(r.numero)) p.push(`posición ${r.posicion} sin número`);
    });
    const pilotos = c.resultados.map((r) => r.piloto);
    if (new Set(pilotos).size !== pilotos.length) p.push("piloto repetido");
    return p;
}

export function problemasCatalogo(cat: CatalogoCarreras): string[] {
    const p: string[] = [];
    if (cat.version !== 1) p.push(`versión desconocida ${cat.version}`);
    const ids = new Set<string>();
    for (const c of cat.carreras) {
        if (ids.has(c.id)) p.push(`${c.id}: id repetido`);
        ids.add(c.id);
        for (const m of problemasCarrera(c)) p.push(`${c.id}: ${m}`);
    }
    return p;
}
