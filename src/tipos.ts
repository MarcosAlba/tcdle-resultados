/*
 * Contrato del catálogo publicado (datos/carreras-tc.json). TCdle lo copia a
 * src/data/carreras.json, así que un cambio incompatible sube `version`.
 */

export interface Resultado {
    /** 1..n, sin huecos. Incluye a los que abandonaron (con pocas vueltas). */
    posicion: number;
    numero: number;
    /** "Nombre Apellido", ya invertido respecto de la ACTC ("Apellido, Nombre"). */
    piloto: string;
    /** Lo que la ACTC pone antes de la coma: "Ponce de León", "Catalán Magni". */
    apellido: string;
    marca: string;
    vueltas: number;
    /** Diferencia con el ganador tal cual la informa la ACTC; null para el ganador. */
    diferencia: string | null;
}

export interface Carrera {
    /** Estable: "2019-05-rosario" (año, número de fecha y nombre). */
    id: string;
    anio: number;
    fechaNro: number;
    nombre: string;
    circuito: string;
    /** AAAA-MM-DD */
    fecha: string;
    resultados: Resultado[];
}

export interface CatalogoCarreras {
    version: 1;
    /** AAAA-MM-DD */
    generado: string;
    carreras: Carrera[];
}

/**
 * Foto de un piloto de los resultados (datos/fotos-pilotos.json). La imagen
 * está en datos/fotos/<archivo>. Las de Wikimedia Commons piden citar autor y
 * licencia: TCdle los muestra en su página de créditos.
 */
export interface FotoPiloto {
    /** Nombre como figura en los resultados: "Gabriel Ponce de León". */
    piloto: string;
    /** "ponce-de-leon-gabriel.webp" */
    archivo: string;
    fuente: "actc" | "wikimedia";
    /** Texto plano: "Adriel 00", "ACTC". */
    autor: string;
    /** "CC BY-SA 4.0"; null en las de la ACTC. */
    licencia: string | null;
    licenciaUrl: string | null;
    /** Dónde se ve la original (página del archivo en Commons o imagen de la ACTC). */
    origenUrl: string;
}

export interface CatalogoFotos {
    version: 1;
    /** AAAA-MM-DD */
    generado: string;
    fotos: FotoPiloto[];
}

/** Fila cruda de /api/historico/resultados. */
export interface FilaCruda {
    carrera: string;
    circuito: string;
    diferencia: string | null;
    fecha: string;
    marca: string;
    mejor_tiempo: string | null;
    numero: number;
    piloto: string;
    posicion: number;
    tanda: string;
    tanda_orden: number;
    tanda_tipo: string;
    vueltas: number;
}

export interface CarreraOpcion {
    nombre: string;
    nro: number;
}

export interface Tanda {
    nombre: string;
    orden: number;
    tipo: string;
}
