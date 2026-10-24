// Reglas puras del paso de fotos: cómo arma la ACTC las carpetas de sus
// pilotos. Sin red, para poder testearlas.
import { slug } from "./normalizar.ts";

/** Carpeta de la ACTC: apellido y nombre, "ponce-de-leon-gabriel". */
export function slugActc(piloto: string, apellido: string): string {
    const nombre = piloto.endsWith(apellido) ? piloto.slice(0, -apellido.length).trim() : "";
    return slug(apellido + " " + nombre);
}

/**
 * Busca la carpeta del piloto entre las de los listados. La ACTC a veces
 * acorta el segundo nombre ("de-benedictis-juan-b"), por eso vale que una sea
 * el comienzo de la otra, siempre que coincidan apellido y primer nombre.
 */
export function buscarSlugActc(buscado: string, disponibles: readonly string[]): string | null {
    if (disponibles.includes(buscado)) {
        return buscado;
    }
    const candidato = disponibles.find((disponible) => {
        const [corto, largo] = disponible.length < buscado.length ? [disponible, buscado] : [buscado, disponible];
        return largo.startsWith(corto) && corto.split("-").length >= 2;
    });

    return candidato ?? null;
}
