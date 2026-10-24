import { describe, expect, it } from "vitest";
import { buscarSlugActc, slugActc } from "../src/fotos-reglas.ts";

describe("fotos de la ACTC", () => {
    it("arma la carpeta con apellido y nombre", () => {
        expect(slugActc("Gabriel Ponce de León", "Ponce de León")).toBe("ponce-de-leon-gabriel");
        expect(slugActc("Juan Martín Trucco", "Trucco")).toBe("trucco-juan-martin");
    });

    it("encuentra carpetas con el segundo nombre acortado, pero no otro piloto", () => {
        const carpetas = ["de-benedictis-juan-b", "canapino-agustin", "canapino-matias"];

        expect(buscarSlugActc("de-benedictis-juan-bautista", carpetas)).toBe("de-benedictis-juan-b");
        expect(buscarSlugActc("canapino-matias", carpetas)).toBe("canapino-matias");
        expect(buscarSlugActc("canapino-juan", carpetas)).toBeNull();
    });
});
