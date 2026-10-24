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
 * Foto de un piloto de los resultados (datos/fotos-pilotos.json), sacada de la
 * ACTC. La imagen está en datos/fotos/<archivo>.
 */
export interface FotoPiloto {
    /** Nombre como figura en los resultados: "Matías Rodríguez". */
    piloto: string;
    /** "rodriguez-matias.webp" */
    archivo: string;
    /** La imagen original en el sitio de la ACTC. */
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
