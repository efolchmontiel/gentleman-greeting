# gentleman-greeting

Saludo y despedida del Gentleman para [Gentle Shell](https://github.com/Gentleman-Programming/gentle-shell).
Al arrancar la sesión aparece una ilustración con una frase sorteada; al cerrarla, otra.

20 frases de inicio y 20 de cierre, cada una con su dibujo. La frase y la imagen salen del
**mismo** sorteo, así que nunca pueden desfasarse.

| Inicio | Inicio | Cierre | Cierre |
| :---: | :---: | :---: | :---: |
| <img src="assets/gentleman-greeting/inicio_01.png" width="180"> | <img src="assets/gentleman-greeting/inicio_03.png" width="180"> | <img src="assets/gentleman-greeting/cierre_01.png" width="180"> | <img src="assets/gentleman-greeting/cierre_16.png" width="180"> |

## Qué hace

- **Al arrancar**: agrega una entrada en el transcript con el dibujo y la frase del día.
- **Al cerrar**: se dispara cuando `mem_session_finalize` (Engram) termina bien. También podés
  verla cuando quieras con `/goodbye`, sin cerrar Pi.
- **No repite**: guarda el último índice usado y sortea entre los demás.
- **No consume tokens**: es una entrada de la interfaz, no participa del contexto del modelo.
- **Degrada solo**: si el terminal no soporta imágenes, muestra la frase con 🎩 y 👵.
- **Se reacomoda**: el bloque se centra contra el ancho real de la terminal y se recalcula al
  cambiar de tamaño.

La despedida **no** se dispara al salir con Ctrl+D: ese evento llega con la interfaz ya
desmontada y no se llega a pintar.

## Instalación

Reiniciá Gentle Shell después de instalar.

**Instalador** (copia la extensión y sus assets al agent home):

```bash
git clone https://github.com/efolchmontiel/gentleman-greeting
cd gentleman-greeting
./install.sh            # --dry-run para ver qué haría
```

En Windows, desde PowerShell: `.\install.ps1` (o `.\install.ps1 -DryRun`).

**Como paquete del harness**:

```bash
gentle-shell install git:github.com/efolchmontiel/gentleman-greeting
```

Si el instalador de paquetes te complica (depende de tu versión del harness), el instalador de
arriba hace lo mismo copiando dos carpetas y es la vía probada.

## Terminales

El dibujo usa el **Kitty Graphics Protocol**, vía `@earendil-works/pi-tui`. El harness detecta el
terminal y, si no lo soporta, cae a la frase con emojis: nunca queda un hueco vacío.

| Terminal | Dibujo | Frase |
| --- | :---: | :---: |
| Herdr (probado acá) | sí | sí |
| Kitty | sí | sí |
| Ghostty | sí | sí |
| WezTerm | sí | sí |
| Warp | sí | sí |
| iTerm2 (macOS) | sí | sí |
| Orca (con `ORCA_IMAGE_PROTOCOL=kitty`) | sí | sí |
| **Alacritty** | no | sí |
| tmux / screen | no | sí |
| Windows Terminal | no | sí |
| VS Code / Zed / JetBrains | no | sí |
| Cualquier otro terminal | no | sí |

**Alacritty**: no soporta el protocolo ni lo anuncia, así que ahí vas a ver la frase con 🎩 👵 y no
el pixel art. No es un bug de la extensión, es el fallback.

Los terminales con dibujo sí lo soportan de verdad; los de la columna "no" muestran siempre la
versión de texto, sea cual sea la configuración de la extensión.

## Sistemas operativos

- **Linux: probado.** Se desarrolló y verificó en Omarchy 4.5 (Arch, Wayland) con Herdr.
- **macOS y Windows: no probados.** La extensión es JavaScript puro — no llama binarios externos,
  no depende de rutas POSIX ni de fuentes — así que debería funcionar igual, pero no hay evidencia
  de eso todavía. Para instalar hay un script por plataforma: `install.sh` (Linux/macOS) e
  `install.ps1` (Windows).

## Cambiar las frases

`assets/gentleman-greeting/frases.json` tiene dos listas, `inicio` y `cierre`. El **índice es la
posición**: `cierre[0]` se dibuja con `cierre_01.png`, `cierre[19]` con `cierre_20.png`.

- **Agregar** una frase al final: agregá `inicio_21.png` o `cierre_21.png`. Si falta el PNG, la
  frase igual aparece, sin dibujo.
- **Reordenar o borrar**: renombrá los PNG afectados, porque el número es la posición.
- Las frases arrancan con `ABUELAAAAA`; si una no lo tiene, la extensión lo repone.

Variable `GENTLEMAN_GREETING_DIR`: apunta la extensión a otra carpeta de assets (para probar artes
sin tocar la instalación).

## Créditos

- Ilustraciones: paquete de pixel art `gentle_shell_frases_pixelart_transparente` (20 + 20), usadas
  en su variante de 256×256 px.
- Código: MIT, ver [LICENSE](LICENSE).
