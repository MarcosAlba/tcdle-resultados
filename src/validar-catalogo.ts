import { readFileSync } from "node:fs";
import { problemasCatalogo } from "./validar.ts";
import type { CatalogoCarreras } from "./tipos.ts";

const cat = JSON.parse(readFileSync("datos/carreras-tc.json", "utf8")) as CatalogoCarreras;
const problemas = problemasCatalogo(cat);
if (problemas.length) {
    console.error(problemas.join("\n"));
    process.exit(1);
}
console.log(`OK: ${cat.carreras.length} carreras`);
