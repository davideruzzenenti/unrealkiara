# Kiara — Visual language

## Tipografia

- **Fraunces** (serif) — titoli, voce poetica, citazioni. Dà l'anima.
- **Manrope** (sans) — testi, UI, prezzi, hashtag. Pulizia e vendibilità.

## Palette

Calore = desiderabilità. Un solo accento d'azione (corallo). Niente decorazione
gratuita: respiro, contrasto morbido, percezione premium-soft.

| Gruppo | Nome | Hex |
|---|---|---|
| Neutri caldi · base | Avorio | `#F7F0E6` |
| | Panna | `#FFF8EE` |
| | Champagne | `#E9D7BA` |
| | Miele | `#D8B88A` |
| | Oro | `#C8A45D` |
| | Tortora | `#9A8171` |
| | Cacao | `#5D463B` |
| Caldi morbidi · atmosfera | Pesca | `#F5B895` |
| | Albicocca | `#F2A878` |
| | Rosa | `#F2A3A1` |
| | **Corallo ✦ (unico accento azione)** | `#E97962` |
| Freddi rari · contrasto occasionale | Pistacchio | `#C9DCA8` |
| | Salvia | `#AFC9AA` |
| | Acqua | `#9EDBD6` |
| | Turchese | `#6EC7C8` |

Regola: nucleo caldo sempre, freddi usati raramente e mai come sfondo. Nessun blu
freddo, nessun verde brillante, nessun colore fuori palette.

## Fotografia

- Luce naturale, morbida; grana leggera, qualità editoriale/pellicola
- Formato 1:1, editoriale minimalista italiano
- Sguardo laterale, mai posa "fototessera" o selfie da specchio
- Lasciare spazio negativo per overlay testo quando previsto dal format
- Mood intimo da diario, non da catalogo

## Armadio (come si veste)

Tre palette outfit, legate alle "stagioni della luce" non alla moda:

| Palette | Colori | Quando |
|---|---|---|
| Neutri caldi | avorio, champagne, sabbia, cacao | base |
| Caldi morbidi | pesca, albicocca, rosa, corallo | atmosfera |
| Freddi rari | pistacchio, salvia, acqua, turchese | contrasto occasionale |

Non indossa mai: fast fashion con logo visibile, colori saturi o freddi brillanti,
sportswear fuori contesto, tacchi alti, gioielli vistosi, più di un accessorio per
volta.

## Immagini di riferimento

Solo `ref-face-front.jpg` è oggi effettivamente caricata dal generatore
(`kiara-mcp-server.js`). Le altre sono referenziate solo dentro `index.html` come
galleria per un lettore umano — un agente che genera immagini deve aprirle a mano
dal path quando gli serve quel riferimento specifico.

| File | Scopo | Usata dal generatore? |
|---|---|---|
| `img/ref-face-front.jpg` | identità volto, frontale — seed principale | sì |
| `img/ref-face-sheet.png` | volto, 6 angolazioni | no |
| `img/ref-face-expr.png` | espressioni spontanee (non da modella) | no |
| `img/ref-body-sheet.png` | proporzioni corpo, rotazioni | no |
| `img/ref-stile-neutri-caldi.png` | palette armadio — neutri caldi | no |
| `img/ref-stile-caldi-morbidi.png` | palette armadio — caldi morbidi | no |
| `img/ref-stile-freddi-rari.png` | palette armadio — freddi rari | no |
| `img/ref-profumo.png` | firma olfattiva / mood gelsomino | no |
| `img/ref-drop-01.png` | esempio post formato Drop | no (solo esempio) |
| `img/ref-world-01.png` | esempio post formato World | no (solo esempio) |
| `img/ref-duet-01.png` | esempio post formato Duet | no (solo esempio) |
| `img/ref-sera-03.png` | esempio slide carousel "Sera Vol. 01" | no (solo esempio) |
| `img/ref-stile-sheet.png` | riepilogo armadio | no |
