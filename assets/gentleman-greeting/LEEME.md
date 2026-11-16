# Assets del saludo y la despedida

`frases.json` tiene dos catálogos de 20 frases: `inicio` y `cierre`. Cada frase tiene su
ilustración PNG en esta misma carpeta, elegida por **posición**, no por nombre:

| Catálogo | Frase | Archivo |
| --- | --- | --- |
| `inicio[0]` | la primera de `inicio` | `inicio_01.png` |
| `inicio[19]` | la última de `inicio` | `inicio_20.png` |
| `cierre[0]` | la primera de `cierre` | `cierre_01.png` |
| `cierre[19]` | la última de `cierre` | `cierre_20.png` |

El índice es la única fuente de verdad: la extensión sortea un índice, guarda ese índice en la
entrada y de ahí salen la frase y el PNG. Nunca se eligen por separado, así que no pueden quedar
desfasados.

## Reglas al tocar los catálogos

- **Agregar una frase** al final: agregá el PNG con el número siguiente, o la frase queda sin arte
  (cae al aviso de texto con emojis).
- **Reordenar o borrar** una frase: hay que renombrar los PNG afectados, porque el número es la
  posición.
- Los PNG son cuadrados (256×256): la extensión los dibuja a 7 filas de alto (126 px con la celda
  de 9×18 px, o sea 14 columnas de ancho), centrados, con la frase en rosa debajo. El alto se
  cambia en una sola constante de la extensión (`FILAS_DE_ARTE`); el tope de ancho se deriva de
  ella (`FILAS_DE_ARTE * 2`), porque con un PNG cuadrado el ancho en columnas es el doble del alto
  en filas.
- Las frases arrancan siempre con `ABUELAAAAA`. La extensión repone el prefijo si falta, pero no es
  la idea depender de eso.

## Origen del arte

Paquete de pixel art `gentle_shell_frases_pixelart_transparente` (20 ilustraciones de inicio + 20
de cierre, en 24/32/48/64/256 px). Acá se usa la variante de **256×256 px**.

Regla: la fuente nunca puede ser más chica que el alto de dibujo (7 filas × 18 px = 126 px). Si
algún día se baja `FILAS_DE_ARTE`, se puede volver a una variante menor; si se sube por encima de
256 px, hay que generar arte de mayor resolución.

## Frases ajustadas

El paquete traía dos ilustraciones que no representaban su frase. Se cambió la **frase**, no el
dibujo, porque el índice seguía siendo válido:

| Índice | Frase original | Frase actual | Por qué |
| --- | --- | --- | --- |
| `cierre[0]` | ¡el GENTLEMAN se fue a dormir, los bugs no! | ¡se cerró la sesión y hubo festejo! | El arte muestra festejo, no a alguien durmiendo |
| `cierre[18]` | ¡el GENTLEMAN apaga el monitor con estilo! | ¡monitor apagado, error que nunca existió! | El arte muestra un facepalm con un monitor tachado |
