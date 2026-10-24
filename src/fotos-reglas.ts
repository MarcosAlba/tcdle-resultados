// Reglas puras del paso de fotos: cómo arma la ACTC sus carpetas, cuándo una
// página de Wikipedia es del piloto (y no de un homónimo) y cómo limpiar los
// créditos de Commons. Sin red, para poder testearlas.
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

/** Categorías que confirman que el artículo es de un piloto del TC (o de sus divisionales). */
const CATEGORIAS_TC = /^Categoría:Pilotos de (Turismo Carretera|TC Pista|TC Mouras|TC Pista Mouras)$/;

export function esPilotoDeTc(categorias: readonly string[]): boolean {
    return categorias.some((categoria) => CATEGORIAS_TC.test(categoria));
}

/**
 * La imagen principal tiene que nombrar al piloto: así se descartan fotos de
 * una carrera o de un auto ("TN_APAT_Gran_Premio_..._Carrera_-_34.jpg").
 */
export function archivoNombraAlPiloto(archivo: string, apellido: string): boolean {
    const texto = slug(archivo).replace(/-/g, " ");
    const palabras = slug(apellido).split("-").filter((palabra) => palabra.length > 2);

    return palabras.length > 0 && palabras.some((palabra) => texto.split(" ").includes(palabra));
}

/**
 * Algunas imágenes llevan el nombre del piloto pero muestran su auto en pista.
 * Commons las cataloga como autos ("Number 25 on racing cars", "Blue and
 * orange racing automobiles"); las de la persona no tienen esas categorías.
 */
export function esFotoDeAuto(categoriasCommons: readonly string[]): boolean {
    return categoriasCommons.some((categoria) => /racing (cars|automobiles)/i.test(categoria));
}

/** Vertical o cuadrada: se recorta desde arriba; apaisada: por la zona de interés. */
export function esRetrato(ancho: number, alto: number): boolean {
    return ancho > 0 && alto > 0 && ancho / alto <= 1.1;
}

/**
 * Parte de la imagen donde está la cara: en las muy altas (cuerpo entero),
 * el cuadrado de arriba; si no, toda la imagen.
 */
export function zonaDeLaCara(ancho: number, alto: number): { left: number; top: number; width: number; height: number } {
    return ancho / alto < 0.7 ? { left: 0, top: 0, width: ancho, height: ancho } : { left: 0, top: 0, width: ancho, height: alto };
}

/** Commons devuelve el autor como HTML ("<a href=...>Adriel 00</a>"). */
export function limpiarHtml(html: string | undefined): string {
    return String(html ?? "")
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}
