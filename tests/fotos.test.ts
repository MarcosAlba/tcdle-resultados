import { describe, expect, it } from "vitest";
import { archivoNombraAlPiloto, buscarSlugActc, esFotoDeAuto, esPilotoDeTc, esRetrato, limpiarHtml, slugActc, zonaDeLaCara } from "../src/fotos-reglas.ts";

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

describe("fotos de Wikipedia", () => {
    it("solo acepta artículos de pilotos del TC", () => {
        expect(esPilotoDeTc(["Categoría:Pilotos de automovilismo de Argentina", "Categoría:Pilotos de Turismo Carretera"])).toBe(true);
        expect(esPilotoDeTc(["Categoría:Pilotos de TC Mouras"])).toBe(true);
        expect(esPilotoDeTc(["Categoría:Futbolistas de Argentina"])).toBe(false);
        expect(esPilotoDeTc(["Categoría:Pilotos de Turismo Nacional"])).toBe(false);
    });

    it("descarta imágenes que no nombran al piloto", () => {
        expect(archivoNombraAlPiloto("Gabriel_Ponce_de_León_2019.jpg", "Ponce de León")).toBe(true);
        expect(archivoNombraAlPiloto("Zapallito_Sánchez_2016.jpg", "Sánchez")).toBe(true);
        expect(archivoNombraAlPiloto("TN_APAT_Gran_Premio_Elf_2026,_Domingo._Clase_3,_Carrera_-_34.jpg", "Domenech")).toBe(false);
        expect(archivoNombraAlPiloto("Manocontrol_guerrieri2.jpg", "Guerrieri")).toBe(false);
    });

    it("descarta las fotos del auto en pista según sus categorías de Commons", () => {
        expect(esFotoDeAuto(["Category:Number 25 on racing cars", "Category:Dodge Cherokee in TC Pista"])).toBe(true);
        expect(esFotoDeAuto(["Category:Blue and white racing automobiles"])).toBe(true);
        expect(esFotoDeAuto(["Category:Top Race drivers", "Category:Gustavo Micheloud"])).toBe(false);
    });

    it("recorta las verticales desde arriba", () => {
        expect(esRetrato(903, 1218)).toBe(true);
        expect(esRetrato(2944, 2155)).toBe(false);
        expect(zonaDeLaCara(418, 660)).toEqual({ left: 0, top: 0, width: 418, height: 418 });
        expect(zonaDeLaCara(903, 1218)).toEqual({ left: 0, top: 0, width: 903, height: 1218 });
    });

    it("deja el autor como texto plano", () => {
        expect(limpiarHtml('<a href="//commons.wikimedia.org/wiki/User:X" title="User:X">Adriel 00</a>')).toBe("Adriel 00");
        expect(limpiarHtml(undefined)).toBe("");
    });
});
