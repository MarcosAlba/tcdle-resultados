import type { Carrera, FilaCruda, Resultado } from "./tipos.ts";

/** "Rossi, Matías" → "Rossi". Sin coma, la última palabra. */
export function extraerApellido(crudo: string): string {
    const limpio = crudo.trim().replace(/\s+/g, " ");
    const i = limpio.indexOf(",");
    return i === -1 ? (limpio.split(" ").pop() ?? limpio) : limpio.slice(0, i).trim();
}

/** "Rossi, Matías" → "Matías Rossi". Sin coma se deja como viene. */
export function invertirNombre(crudo: string): string {
    const limpio = crudo.trim().replace(/\s+/g, " ");
    const i = limpio.indexOf(",");
    if (i === -1) return limpio;
    const apellido = limpio.slice(0, i).trim();
    const nombre = limpio.slice(i + 1).trim();
    return nombre ? `${nombre} ${apellido}` : apellido;
}

export function slug(texto: string): string {
    return texto
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

export function idCarrera(anio: number, fechaNro: number, nombre: string): string {
    return `${anio}-${String(fechaNro).padStart(2, "0")}-${slug(nombre)}`;
}

/**
 * Marcas mal cargadas en la ACTC. En 2022 y 2023 los Toyota (Rossi, Jakos y
 * Gini) figuran como "Y": desde 2024 los mismos pilotos aparecen como "Toyota".
 */
const MARCAS_CORREGIDAS: Record<string, string> = { Y: "Toyota" };

export function corregirMarca(marca: string): string {
    const limpia = marca.trim();
    return MARCAS_CORREGIDAS[limpia] ?? limpia;
}

export function normalizarFila(fila: FilaCruda): Resultado {
    return {
        posicion: fila.posicion,
        numero: fila.numero,
        piloto: invertirNombre(fila.piloto),
        apellido: extraerApellido(fila.piloto),
        marca: corregirMarca(fila.marca),
        vueltas: fila.vueltas,
        diferencia: fila.posicion === 1 ? null : fila.diferencia,
    };
}

export function armarCarrera(anio: number, fechaNro: number, filas: FilaCruda[]): Carrera {
    const ordenadas = [...filas].sort((a, b) => a.posicion - b.posicion);
    const primera = ordenadas[0];
    if (!primera) throw new Error(`Sin filas para ${anio} fecha ${fechaNro}`);
    return {
        id: idCarrera(anio, fechaNro, primera.carrera),
        anio,
        fechaNro,
        nombre: primera.carrera,
        circuito: primera.circuito,
        fecha: primera.fecha,
        resultados: ordenadas.map(normalizarFila),
    };
}
