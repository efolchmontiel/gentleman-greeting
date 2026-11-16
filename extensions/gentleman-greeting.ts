// @ts-nocheck
// Saludo y despedida del Gentleman, como entrada propia en el transcript de Pi.
//
// Por qué appendEntry + registerEntryRenderer y no un widget: los widgets se dibujan arriba
// del editor, o sea después del chat. Una entrada custom queda en el transcript, debajo de
// [Extensions], y no participa del contexto del modelo.
//
// Cada frase tiene su propia ilustración PNG, dibujada con el Kitty Graphics Protocol vía
// renderImage de pi-tui: la TUI ya detecta capacidades y conoce la geometría real de la celda,
// así que no hace falta escribir secuencias de escape a mano. Sin soporte gráfico cae a texto
// con emojis.
//
// Formato del aviso (ilustración centrada arriba, texto rosa debajo):
//        [PNG de la frase]
//   ABUELAAAAA · <frase>
// El bloque se centra en el ancho disponible del componente y se recalcula en cada render, así
// que un cambio de tamaño de la terminal (SUPER+F, split, fullscreen) reacomoda el aviso sin
// crear otra entrada ni volver a elegir la frase.
//
// El índice es la única fuente de verdad: la frase y su imagen salen del mismo sorteo.
//   frases.json inicio[0]  → inicio_01.png   …   inicio[19] → inicio_20.png
//   frases.json cierre[0]  → cierre_01.png   …   cierre[19] → cierre_20.png
// Por eso, al agregar o mover una frase en `frases.json` hay que renombrar o agregar el PNG en
// esa misma posición: no hay tabla de nombres que mantener a mano.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getCapabilities, getPngDimensions, renderImage, visibleWidth } from "@earendil-works/pi-tui";

const TIPO_ENTRADA = "gentleman-greeting";

/** Herramientas que cierran la sesión. Si querés la despedida en otra, agregá su nombre. */
const HERRAMIENTAS_DE_CIERRE = ["mem_session_finalize"];

/**
 * Motivos de session_start que disparan el saludo. Un fork replica el historial y vuelve a
 * emitir session_start con reason "startup", así que además se dedupe por contenido.
 */
const MOTIVOS_DE_SALUDO = ["startup"];

/** Prefijo fijo de todos los mensajes. No se toca: es la gracia. */
const PREFIJO = "ABUELAAAAA";

const ROSA = "\u001b[38;2;255;59;167m";
const RESET = "\u001b[0m";

/**
 * Homes del agente donde puede estar la instalación, en el mismo orden que usa el harness:
 * variable GENTLE_PI_AGENT_HOME, variable PI_CODING_AGENT_DIR, y los dos defaults históricos.
 */
function homesDelAgente() {
  return [
    process.env.GENTLE_PI_AGENT_HOME,
    process.env.PI_CODING_AGENT_DIR,
    join(homedir(), ".gentle-shell", "agent"),
    join(homedir(), ".pi", "agent"),
  ].filter(Boolean);
}

/**
 * Carpeta de los assets, en orden de preferencia:
 *   1. `GENTLEMAN_GREETING_DIR`, escape manual para setups raros.
 *   2. Junto a esta extensión: `<paquete>/extensions/x.ts` → `<paquete>/assets/gentleman-greeting`.
 *      Es la ruta que funciona cuando se instala como paquete (`gentle-shell install`), porque el
 *      paquete se usa en su lugar, no se copia al agent home.
 *   3. `<agent home>/assets/gentleman-greeting`, que es lo que deja `install.sh`/`install.ps1`.
 * Gana la primera que tenga `frases.json`; sin ninguna se usa la última candidata (y la extensión
 * cae al catálogo mínimo, que es el comportamiento honesto).
 */
function resolverDirAssets() {
  const candidatos = [process.env.GENTLEMAN_GREETING_DIR];
  try {
    const aca = dirname(fileURLToPath(import.meta.url));
    candidatos.push(join(aca, "..", "assets", "gentleman-greeting"));
    candidatos.push(join(aca, "assets", "gentleman-greeting"));
  } catch {
    // Sin import.meta.url (bundle raro) quedan sólo los candidatos del agent home.
  }
  for (const home of homesDelAgente()) {
    candidatos.push(join(home, "assets", "gentleman-greeting"));
  }
  const utiles = candidatos.filter(Boolean);
  return utiles.find((dir) => existsSync(join(dir, "frases.json"))) ?? utiles[0];
}

const DIR_ASSETS = resolverDirAssets();
const ARCHIVO_FRASES = join(DIR_ASSETS, "frases.json");

/**
 * El estado necesita escritura. Si los assets viven dentro de un paquete instalado como global de
 * npm (read-only), el archivo cae al primero que se deje escribir, empezando por el agent home.
 */
let archivoEstado = join(DIR_ASSETS, "estado-frases.json");

function escribirEstado(estado) {
  const destinos = [archivoEstado, ...homesDelAgente().map((home) => join(home, ".gentleman-greeting-state.json"))];
  for (const destino of destinos) {
    try {
      writeFileSync(destino, JSON.stringify(estado));
      archivoEstado = destino;
      return;
    } catch {
      // Probamos el siguiente destino.
    }
  }
}

/**
 * Alto de la ilustración en filas de texto: 7 filas de 18 px = 126 px. Cada PNG es cuadrado, así
 * que con la celda de 9×18 px ocupa 14 columnas (126 px de ancho) y no hace falta fijar el ancho
 * por separado. La fuente es de 256 px: siempre tiene que ser MÁS GRANDE que este alto, para que
 * la terminal reduzca en vez de agrandar (agrandar un PNG chico deja el pixel art borroso).
 */
const FILAS_DE_ARTE = 7;

const EMOJI = { izquierda: "🎩", derecha: "👵" };

// --- catálogos ------------------------------------------------------------------------
// Los catálogos son datos, no lógica: viven en frases.json. Estas dos entradas sólo existen
// para que el aviso nunca quede vacío si el archivo falta o está roto.

const CATALOGO_MINIMO = {
  inicio: [`${PREFIJO} · ¡salió código del GENTLEMAN!`],
  cierre: [`${PREFIJO} · ¡el GENTLEMAN se retira con elegancia!`],
};

/**
 * Garantiza que la frase arranque con el prefijo. Una frase nueva puede escribirse sin él:
 * acá se le repone, así el requisito no depende de la memoria de quien la agregue.
 */
function normalizarFrase(frase) {
  const limpia = String(frase ?? "").trim();
  if (!limpia) {
    return "";
  }
  if (limpia.startsWith(PREFIJO)) {
    return limpia;
  }
  return `${PREFIJO} · ${limpia.replace(/^[·:\-–—]\s*/, "")}`;
}

let catalogos = null;

function cargarCatalogos() {
  if (catalogos) {
    return catalogos;
  }
  try {
    const datos = JSON.parse(readFileSync(ARCHIVO_FRASES, "utf8"));
    const inicio = (Array.isArray(datos.inicio) ? datos.inicio : []).map(normalizarFrase).filter(Boolean);
    const cierre = (Array.isArray(datos.cierre) ? datos.cierre : []).map(normalizarFrase).filter(Boolean);
    catalogos = {
      inicio: inicio.length ? inicio : CATALOGO_MINIMO.inicio,
      cierre: cierre.length ? cierre : CATALOGO_MINIMO.cierre,
    };
  } catch {
    catalogos = CATALOGO_MINIMO;
  }
  return catalogos;
}

// --- selección ------------------------------------------------------------------------
// Elegir al iniciar y al cerrar, nunca en render(). El estado vive en un JSON chico para
// poder evitar la repetición inmediata entre sesiones distintas.

function leerEstado() {
  const destinos = [archivoEstado, ...homesDelAgente().map((home) => join(home, ".gentleman-greeting-state.json"))];
  for (const destino of destinos) {
    try {
      const estado = JSON.parse(readFileSync(destino, "utf8"));
      // Recordar dónde estaba, para seguir escribiendo ahí.
      archivoEstado = destino;
      return estado;
    } catch {
      // Probamos el siguiente destino.
    }
  }
  return {};
}

/**
 * Devuelve `{ indice, texto }`. El índice es lo que después elige el PNG: frase e imagen no se
 * sortean por separado, así nunca pueden quedar desfasadas.
 */
function elegirAviso(clave, catalogo) {
  const estado = leerEstado();
  const anterior = estado[clave];
  const opciones = catalogo.map((_, i) => i).filter((i) => i !== anterior);
  const indice =
    opciones.length > 0
      ? opciones[Math.floor(Math.random() * opciones.length)]
      : (anterior ?? 0);
  estado[clave] = indice;
  // Si no se puede escribir el estado, la frase ya elegida sigue siendo válida.
  escribirEstado(estado);
  return { indice, texto: catalogo[indice] };
}

// --- imágenes y render ---------------------------------------------------------------

// El PNG se lee una vez por proceso; null queda cacheado para no reintentar en cada render.
const cachePng = new Map();

/** `inicio[0]` → `inicio_01.png`. El índice es la posición en frases.json. */
function archivoDeArte(momento, indice) {
  return `${momento}_${String(indice + 1).padStart(2, "0")}.png`;
}

function pngBase64(archivo) {
  if (cachePng.has(archivo)) {
    return cachePng.get(archivo);
  }
  let base64 = null;
  try {
    base64 = readFileSync(join(DIR_ASSETS, archivo)).toString("base64");
  } catch {
    base64 = null;
  }
  cachePng.set(archivo, base64);
  return base64;
}

/**
 * Componente del aviso. Pi le pasa el ancho disponible en cada render y lo vuelve a llamar
 * cuando la terminal cambia de tamaño: por eso el centrado se resuelve acá y no en los datos
 * de la entrada (que se eligen una sola vez, al crearla).
 *
 * Devuelve las cadenas tal cual, sin que la TUI las re-envuelva: el payload base64 del
 * protocolo gráfico no son caracteres visibles y, si la mide como texto, la parte en filas.
 */
class Aviso {
  constructor(momento, indice, texto) {
    this.momento = momento;
    this.indice = indice;
    this.texto = texto;
  }
  render(width) {
    return lineasDelAviso(this.momento, this.indice, this.texto, width);
  }
  invalidate() {
    cacheLinea.clear();
  }
}

/**
 * Recorta la frase por grafemas para que nunca desborde el ancho disponible, conservando
 * siempre el prefijo. Es display-only: la frase guardada en la entrada no se toca, así que
 * cambiar el ancho de la ventana no cambia la frase elegida.
 */
function abreviar(texto, ancho) {
  const limpio = String(texto ?? "");
  const limite = Math.max(1, ancho - 1); // una columna de margen a la derecha
  if (visibleWidth(limpio) <= limite) {
    return limpio;
  }
  const elipsis = "\u2026";
  const prefijo = limpio.startsWith(PREFIJO) ? PREFIJO : "";
  const resto = prefijo ? limpio.slice(prefijo.length) : limpio;
  if (visibleWidth(prefijo + elipsis) > limite) {
    // Ni el prefijo entra completo: se recorta el prefijo mismo.
    return recortarA(prefijo || limpio, limite);
  }
  let acumulado = "";
  for (const parte of Array.from(resto)) {
    if (visibleWidth(prefijo + acumulado + parte + elipsis) > limite) {
      break;
    }
    acumulado += parte;
  }
  const abreviada = `${prefijo}${acumulado.trimEnd()}${elipsis}`;
  return visibleWidth(abreviada) <= limite ? abreviada : recortarA(prefijo, limite);
}

/** Recorta por grafemas hasta `limite` columnas visibles. */
function recortarA(texto, limite) {
  let salida = "";
  for (const parte of Array.from(texto)) {
    if (visibleWidth(salida + parte) > limite) {
      break;
    }
    salida += parte;
  }
  return salida;
}

/**
 * Secuencia de la ilustración. El cursor no se mueve (`cursorLibre` en false): la TUI reserva
 * las filas de la imagen con las líneas vacías que se agregan después, y mover el cursor acá
 * dejaba el texto encima del dibujo.
 *
 * IMPORTANTE: sin `imageId` a propósito. Con `imageId` pi-tui registra el id y en cada cambio de
 * tamaño emite `a=d,d=I,i=<id>` antes de re-emitir; en Herdr esa re-transmisión del id recién
 * borrado no vuelve a pintar nada, y la ilustración desaparece. Sin id no hay borrado: la
 * limpieza la hace el `2J` del full render y la imagen se re-emite limpia.
 */
function secuencia(archivo, filas) {
  const base64 = getCapabilities().images ? pngBase64(archivo) : null;
  if (!base64) {
    return null;
  }
  const dimensiones = getPngDimensions(base64);
  if (!dimensiones) {
    return null;
  }
  return renderImage(base64, dimensiones, {
    // El PNG es cuadrado y la celda es de 9×18, así que el alto en filas manda: el ancho en
    // columnas es el doble. Si el tope de ancho no acompaña, recorta el alto y la ilustración
    // sale más chica de lo pedido.
    maxWidthCells: FILAS_DE_ARTE * 2,
    maxHeightCells: filas,
    moveCursor: false,
  });
}

// Las líneas armadas se cachean por ancho: render() se llama muchas veces y no debe
// re-codificar el PNG en cada pasada.
const cacheLinea = new Map();
const CACHE_MAXIMA = 32;

function lineasDelAviso(momento, indice, texto, anchoDisponible) {
  const ancho = Math.max(1, Math.floor(Number(anchoDisponible) || 80));
  const hayGraficos = getCapabilities().images !== null;
  const clave = `${momento}|${indice}|${texto}|${ancho}|${hayGraficos}`;
  if (cacheLinea.has(clave)) {
    return cacheLinea.get(clave);
  }

  // Camino sin gráficos (o con el PNG de esa frase caído): una sola línea, texto con emojis.
  // El margen de los emojis entra en el centrado y, en anchos extremos, se descarta antes que
  // el prefijo: ABUELAAAAA no se negocia, y una línea más ancha que la terminal aborta el render.
  const lineaDeEmojis = () => {
    const conEmojis = ancho >= PREFIJO.length + 8;
    const margen = conEmojis ? 6 : 0;
    const queda = abreviar(texto, Math.max(1, ancho - margen));
    const bloque = visibleWidth(queda) + margen;
    const relleno = " ".repeat(Math.max(0, Math.floor((ancho - bloque) / 2)));
    const adorno = conEmojis ? `${EMOJI.izquierda} ` : "";
    const cierre = conEmojis ? ` ${EMOJI.derecha}` : "";
    return `${relleno}${adorno}${ROSA}${queda}${RESET}${cierre}`;
  };

  let lineas;
  const arte =
    hayGraficos && Number.isInteger(indice) && indice >= 0
      ? secuencia(archivoDeArte(momento, indice), FILAS_DE_ARTE)
      : null;
  // Si la ilustración no entra a lo ancho, mejor el fallback que una imagen cortada por el borde.
  if (!arte || ancho < arte.columns) {
    lineas = [lineaDeEmojis()];
    cacheLinea.set(clave, lineas);
    return lineas;
  }
  const mostrado = abreviar(texto, ancho);
  // Las dos piezas se centran contra el mismo eje (el centro de la terminal), así la imagen
  // queda al medio y el texto también, sin depender del ancho de la otra.
  const rellenoArte = " ".repeat(Math.max(0, Math.floor((ancho - arte.columns) / 2)));
  const rellenoTexto = " ".repeat(Math.max(0, Math.floor((ancho - visibleWidth(mostrado)) / 2)));
  lineas = [
    `${rellenoArte}${arte.sequence}`,
    ...Array(Math.max(0, arte.rows - 1)).fill(""),
    `${rellenoTexto}${ROSA}${mostrado}${RESET}`,
  ];

  if (cacheLinea.size >= CACHE_MAXIMA) {
    const primera = cacheLinea.keys().next().value;
    if (primera !== undefined) {
      cacheLinea.delete(primera);
    }
  }
  cacheLinea.set(clave, lineas);
  return lineas;
}

/**
 * Índice de la entrada. Las entradas viejas no lo guardaban: se recupera buscando la frase en
 * el catálogo, así el historial ya escrito sigue mostrando su ilustración mientras la frase
 * siga existiendo con el mismo texto.
 */
function indiceDeLaEntrada(datos, catalogo) {
  if (Number.isInteger(datos.indice) && datos.indice >= 0) {
    return datos.indice;
  }
  const buscado = String(datos.texto ?? "").trim();
  return buscado ? catalogo.indexOf(buscado) : -1;
}

export default function (pi) {
  let yaSeDespidio = false;

  const elegir = (momento) => ({ momento, ...elegirAviso(momento, cargarCatalogos()[momento]) });

  /** Cierre de la entrada de despedida. Un único lugar para el comando y los eventos. */
  const mostrarDespedida = () => pi.appendEntry(TIPO_ENTRADA, elegir("cierre"));

  pi.registerEntryRenderer(TIPO_ENTRADA, (entry) => {
    const datos = entry.data ?? {};
    // Las entradas viejas guardaban `cara` en vez de `momento`.
    const momento = datos.momento ?? (datos.cara === "abuela" ? "cierre" : "inicio");
    const catalogo = cargarCatalogos()[momento] ?? [];
    // Sin caja: el componente mide el ancho que le pasa la TUI en cada render y centra el bloque.
    return new Aviso(momento, indiceDeLaEntrada(datos, catalogo), datos.texto ?? "");
  });

  pi.on("session_start", (event, ctx) => {
    if (!MOTIVOS_DE_SALUDO.includes(event.reason)) {
      return;
    }
    // Un fork replica el historial y vuelve a emitir session_start: sin este chequeo el
    // saludo queda dos veces en el transcript.
    const yaSaludado = ctx.sessionManager
      .getEntries()
      .some((entrada) => entrada?.customType === TIPO_ENTRADA || entrada?.type === TIPO_ENTRADA);
    if (yaSaludado) {
      return;
    }
    pi.appendEntry(TIPO_ENTRADA, elegir("inicio"));
  });

  pi.on("tool_result", (event) => {
    if (yaSeDespidio || event.isError) {
      return;
    }
    if (!HERRAMIENTAS_DE_CIERRE.includes(event.toolName)) {
      return;
    }
    yaSeDespidio = true;
    mostrarDespedida();
  });

  /**
   * Comando manual: muestra la despedida sin cerrar Pi y sin consumir tokens. Mostrarla **no**
   * finaliza la sesión de Engram ni implica que se haya guardado nada: sólo pinta el mensaje.
   */
  pi.registerCommand("goodbye", {
    description: "Muestra la despedida (no finaliza Engram ni cierra Pi)",
    handler: async () => {
      mostrarDespedida();
    },
  });

  // La despedida se dispara únicamente con el resultado exitoso de mem_session_finalize. No se
  // cuelga de frases del usuario (diría que Engram terminó cuando quizá no) ni de
  // session_shutdown (probado: llega con la interfaz en teardown y no se pinta).

  // Nota: NO se cuelga la despedida de session_shutdown. Se probó: la entrada se escribe en la
  // sesión al salir de Pi, pero el frame de salida no la pinta porque el evento llega con la
  // interfaz ya en teardown. Queda documentado en vez de dejar un mecanismo que no se ve.
}
