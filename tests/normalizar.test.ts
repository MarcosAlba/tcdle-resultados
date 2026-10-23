import { describe, expect, it } from "vitest";
import { armarCarrera, corregirMarca, idCarrera, invertirNombre, slug } from "../src/normalizar.ts";
import { problemasCarrera } from "../src/validar.ts";
import type { FilaCruda } from "../src/tipos.ts";

// Recorte de la final de Rosario 2019, tal cual la devuelve la API de la ACTC.
const fila = (posicion: number, numero: number, piloto: string, marca: string, diferencia: string | null): FilaCruda => ({
    carrera: "Rosario",
    circuito: "Rosario- Santa Fe",
    diferencia,
    fecha: "2019-05-05",
    marca,
    mejor_tiempo: null,
    numero,
    piloto,
    posicion,
    tanda: "Final",
    tanda_orden: 15,
    tanda_tipo: "final",
    vueltas: 25,
});

const rosario2019: FilaCruda[] = [
    fila(3, 21, "Ledesma, Christian", "Chevrolet", "4.668"),
    fila(1, 5, "Rossi, Matías", "Ford", null),
    fila(2, 26, "Ponce de León, Gabriel", "Ford", "3.493"),
];

describe("invertirNombre", () => {
    it("pasa de Apellido, Nombre a Nombre Apellido", () => {
        expect(invertirNombre("Rossi, Matías")).toBe("Matías Rossi");
        expect(invertirNombre("Ponce de León, Gabriel")).toBe("Gabriel Ponce de León");
    });
    it("deja igual lo que no tiene coma y limpia espacios", () => {
        expect(invertirNombre("  Canapino ")).toBe("Canapino");
        expect(invertirNombre("Di  Palma,  Luis José")).toBe("Luis José Di Palma");
    });
});

describe("id de carrera", () => {
    it("es estable y sin tildes", () => {
        expect(slug("Concepción del Uruguay")).toBe("concepcion-del-uruguay");
        expect(idCarrera(2019, 5, "Rosario")).toBe("2019-05-rosario");
    });
});

describe("armarCarrera", () => {
    it("ordena por posición, invierte nombres y deja sin diferencia al ganador", () => {
        const c = armarCarrera(2019, 5, rosario2019);
        expect(c.id).toBe("2019-05-rosario");
        expect(c.fecha).toBe("2019-05-05");
        expect(c.resultados.map((r) => r.piloto)).toEqual([
            "Matías Rossi",
            "Gabriel Ponce de León",
            "Christian Ledesma",
        ]);
        expect(c.resultados[0]?.diferencia).toBeNull();
        expect(problemasCarrera(c)).toEqual([]);
    });
    it("falla sin filas", () => {
        expect(() => armarCarrera(2019, 5, [])).toThrow();
    });
});

describe("corregirMarca", () => {
    it("pasa la Y de 2022-2023 a Toyota y deja el resto igual", () => {
        expect(corregirMarca("Y")).toBe("Toyota");
        expect(corregirMarca(" Ford (Mustang) ")).toBe("Ford (Mustang)");
        const c = armarCarrera(2023, 1, [fila(1, 1, "Rossi, Matías", "Y", null), fila(2, 2, "Jakos, Andrés", "Y", "1.0")]);
        expect(c.resultados.map((r) => r.marca)).toEqual(["Toyota", "Toyota"]);
    });
});

describe("problemasCarrera", () => {
    it("avisa una marca sospechosa", () => {
        const c = armarCarrera(2023, 1, [fila(1, 1, "Rossi, Matías", "Ford", null), fila(2, 2, "Jakos, Andrés", "Ford", "1.0")]);
        c.resultados[1]!.marca = "Z";
        expect(problemasCarrera(c).some((m) => m.includes("marca sospechosa"))).toBe(true);
    });

    it("detecta posiciones salteadas y pilotos repetidos", () => {
        const c = armarCarrera(2019, 5, [
            fila(1, 5, "Rossi, Matías", "Ford", null),
            fila(3, 21, "Rossi, Matías", "Chevrolet", "4.668"),
        ]);
        const p = problemasCarrera(c);
        expect(p.some((m) => m.includes("donde iba 2"))).toBe(true);
        expect(p).toContain("piloto repetido");
    });
});
