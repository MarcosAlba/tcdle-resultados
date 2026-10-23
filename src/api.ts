import { chromium, type Browser, type Page } from "playwright";

const ORIGEN = "https://tiempos.actc.org.ar";
const PAUSA_MS = 2000;

/**
 * Abre /resultados como cualquier visitante (la página pone la cookie de
 * sesión) y pide la API desde ahí, igual que lo hacen los filtros del sitio.
 * Si el sitio pide Turnstile/CAPTCHA se frena: no se resuelve ni se esquiva.
 */
export class ApiActc {
    private constructor(
        private navegador: Browser,
        private pagina: Page,
    ) {}

    static async abrir(): Promise<ApiActc> {
        const navegador = await chromium.launch();
        const pagina = await navegador.newPage();
        const api = new ApiActc(navegador, pagina);
        await api.cargar();
        return api;
    }

    private async cargar(): Promise<void> {
        await this.pagina.goto(`${ORIGEN}/resultados`, { waitUntil: "domcontentloaded" });
    }

    async pedir<T>(ruta: string, reintento = true): Promise<T> {
        await new Promise((r) => setTimeout(r, PAUSA_MS));
        const cuerpo = await this.pagina.evaluate(async (url) => {
            const r = await fetch(url);
            return { status: r.status, texto: await r.text() };
        }, ruta);
        let json: unknown;
        try {
            json = JSON.parse(cuerpo.texto);
        } catch {
            throw new Error(`Respuesta no JSON (${cuerpo.status}) en ${ruta}`);
        }
        const falla = (json ?? {}) as { error?: string; turnstile_required?: boolean };
        if (falla.turnstile_required) {
            throw new Error("El sitio pide Turnstile/CAPTCHA: se frena el scraper.");
        }
        if (falla.error) {
            // La cookie de visitante dura 15 minutos: se recarga la página una vez.
            if (reintento) {
                await this.cargar();
                return this.pedir<T>(ruta, false);
            }
            throw new Error(`${falla.error} en ${ruta}`);
        }
        return json as T;
    }

    async cerrar(): Promise<void> {
        await this.navegador.close();
    }
}
