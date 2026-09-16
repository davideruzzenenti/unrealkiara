# Kiara image generation script

Questo README riguarda esclusivamente `scripts/generate-kiara.py` e non sostituisce il README principale del repository.

## Cosa fa

Lo script genera un'immagine di Kiara usando:

- `kiara-image-prompt.md` come prompt canonico;
- `img/ref-face-front.jpg` come anchor principale dell'identità;
- `img/ref-face-sheet.png` per coerenza del volto da più angolazioni;
- `img/ref-face-expr.png` per mantenere l'identità anche cambiando espressione;
- `img/ref-body-sheet.png` solo quando viene usato `--full-body`.

La scena cambia; l'identità deve restare stabile.

## Requisiti

- Python 3.10+
- una chiave API OpenAI disponibile nella variabile ambiente `OPENAI_API_KEY`
- pacchetto Python `httpx`

Installa la dipendenza:

```bash
pip install httpx
```

Su Windows PowerShell imposta la chiave per la sessione corrente:

```powershell
$env:OPENAI_API_KEY="la-tua-chiave"
```

Su macOS/Linux:

```bash
export OPENAI_API_KEY="la-tua-chiave"
```

Non salvare la chiave API nel repository.

## Uso base

Dalla root del repository:

```bash
python scripts/generate-kiara.py --scene "Kiara seduta vicino a una finestra, maglione avorio, tazza di caffè, luce naturale del mattino"
```

Lo script usa automaticamente le tre reference del volto.

## Figura intera

Per una scena full body:

```bash
python scripts/generate-kiara.py \
  --scene "Kiara cammina su una strada italiana in pietra, pantaloni champagne e top avorio, luce del tardo pomeriggio" \
  --full-body
```

Con `--full-body` viene allegata anche:

```text
img/ref-body-sheet.png
```

## Salvataggio output

Per default le immagini vengono salvate in:

```text
img/generated/YYYYMMDD-HHMMSS-kiara.png
```

Puoi specificare un file preciso:

```bash
python scripts/generate-kiara.py \
  --scene "ritratto editoriale vicino alla finestra" \
  --output img/generated/kiara-window.png
```

## Salvare i metadata

Con `--metadata` viene creato anche un JSON accanto all'immagine con scena, prompt finale, modello e reference usate:

```bash
python scripts/generate-kiara.py \
  --scene "Kiara in un caffè italiano, luce morbida" \
  --metadata
```

Esempio:

```text
img/generated/20260916-071500-kiara.png
img/generated/20260916-071500-kiara.json
```

Questo rende ogni generazione riproducibile e verificabile.

## Dry run

Per controllare prompt e reference senza consumare API:

```bash
python scripts/generate-kiara.py \
  --scene "Kiara sul balcone al tramonto" \
  --dry-run
```

Lo script mostrerà:

- reference selezionate;
- prompt completo;
- path di output previsto.

## Opzioni principali

```text
--scene TEXT       obbligatorio; descrizione della scena
--full-body        aggiunge la body sheet e richiede una composizione full body
--model MODEL      modello immagini; default: gpt-image-2
--size SIZE        dimensione output; default: 1024x1024
--output PATH      path specifico per il file generato
--metadata         salva anche il JSON dei metadata
--dry-run          non chiama l'API
```

## Regole di identità

Lo script considera le reference in questo ordine di priorità:

1. `ref-face-front.jpg` — identità primaria;
2. `ref-face-sheet.png` — geometria del volto attraverso più angolazioni;
3. `ref-face-expr.png` — gamma espressiva senza identity drift;
4. `ref-body-sheet.png` — proporzioni corporee, solo per figura intera.

Se il testo della scena entra in conflitto con le reference, il prompt finale dice esplicitamente al modello di preservare l'identità visiva delle immagini.

## Source of truth

Non duplicare il prompt nello script.

La fonte da modificare è:

```text
kiara-image-prompt.md
```

Lo script estrae automaticamente il blocco di prompt racchiuso tra triple backtick. In questo modo eventuali correzioni al file `.md` entrano nelle generazioni successive senza dover modificare Python.

## Note importanti

- lo script non modifica le immagini di riferimento;
- lo script non modifica `kiara-image-prompt.md`;
- il README principale del repository non viene usato né sovrascritto;
- `img/generated/` può essere aggiunta a `.gitignore` se non vuoi versionare gli output;
- per scene non full-body evita `--full-body`, così il modello riceve solo le reference realmente utili.
