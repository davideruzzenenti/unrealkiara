# Kiara — prompt generazione immagine

## Prompt (blocco da incollare)

```
Kiara, a virtual (AI) influencer. Female. Perceived height:
medium-low. Soft proportionate build, never statuesque.
Warm-blonde short textured hair, never perfect. Brown eyes,
large, slightly off-camera gaze. Light skin with faint freckles.
Natural soft makeup — looks like yesterday's, not today's.

Slow, unhurried presence. She inhabits space without claiming
it — little physical space, strong atmospheric presence; she
does not fill the frame, she occupies it. Shoulders slightly
down, never rigid. Calm on the surface, intensity underneath —
she can look light and serious at the same time. Gaze is lateral
more than frontal; when she does look at camera, it reads as
recognizing someone she knows, not facing a lens. Spontaneous
expressions — older-sister energy, not model energy. Never a
catalogue pose.

Match face to the attached reference images — front, multi-angle
sheet, and expressions. Match body and proportions to the
attached body-sheet reference, if provided. Keep identity
identical across every output.

Preserve Kiara's facial identity, but do not copy the head tilt,
head orientation or shoulder alignment from the references. Use
the references to understand her facial geometry from different
angles, not as a fixed pose template. Head position must follow
the action naturally. Avoid repeating the same tilted, nearly
frontal portrait across scenes.

Preserve Kiara's hairline, hair color, short haircut,
approximate length and naturally wavy texture. Do not replicate
the exact strand arrangement or outer hair silhouette from the
references. Her hair must look soft, flexible and naturally
responsive to gravity, head position, breeze and touch. Vary
individual locks, fringe placement, parting and local volume
plausibly between scenes, while keeping the same recognizable
haircut. Avoid frozen spikes, rigid sculpted tufts and identical
hair geometry across images.

Warm palette for Kiara's clothing and accents only: ivory
#F7F0E6, champagne #E9D7BA, peach #F5B895, cocoa #5D463B, one
coral accent #E97962. Do not recolor the whole scene to match
her outfit — no uniform amber/sepia cast.

Environment: real, ordinary, lived-in — not a styled set or
postcard. Let it keep its natural colors, blues and greens
included. Light matches the actual time/weather/location (sun,
overcast, interior, night) — not automatic soft golden-hour.
Kiara and background share consistent light direction, white
balance and grain. Moderate depth of field, background stays
readable — no default heavy blur. Natural skin texture and
grain, no polished-ad look, film grain, editorial quality,
photorealistic.

Camera physics: the image must be plausible as one exposure
from one consistent viewpoint — focal length, perspective,
framing and depth of field stay mutually consistent (no
wide-angle viewpoint with telephoto-compressed face or
background). Focus behaves optically: similar distances get
similar sharpness, blur falls off gradually, no artificial
cutout blur around hair or shoulders. Lighting, shadows and
exposure match the visible scene's light sources; respect
limited dynamic range. Motion blur on hair, hands or water
matches shutter speed — don't mix frozen subjects with
long-exposure backgrounds unless flash is implied. Night
scenes: keep moon size, stars and exposure physically
compatible. Avoid impossible reflections, scale mismatches
or contradictory vanishing points. When an aesthetic request
conflicts with photographic physics, choose the closest
plausible interpretation.

No mirror selfie or straight-on catalogue pose. No logos or
watermarks. No text, no captions, no overlays — image only.
Square 1:1 format.

Preserve:
- facial geometry (learned from multiple angles, not one fixed pose)
- eye spacing and shape
- nose shape
- mouth shape
- jawline
- cheekbone structure
- apparent age
- hairline, hair color, haircut and approximate length

Avoid:
- changing face shape
- changing eye color
- changing apparent age
- changing body proportions
- overly glamorous styling
- perfect salon hair, frozen spikes, rigid sculpted tufts
- exaggerated makeup
- fashion-model posing
- repeating the same head tilt, orientation or shoulder alignment across scenes
- copying the exact hair strand arrangement or silhouette from the references

Scene, outfit, pose, lighting and expression may change.
Identity must not.

Scene: [DESCRIZIONE SCENA — luogo, outfit, gesto, luce]
```

## Reference images da allegare

Sempre volto (front, multi-angolo, espressioni). Se lo scatto è a figura
intera, aggiungi anche il corpo.

**Con ChatGPT**: allega i file (upload/drag&drop) — un URL incollato in chat
non viene letto come immagine.

| Riferimento | Percorso locale | URL raw (solo API/automazioni) |
|---|---|---|
| Volto | `C:\Users\arzig\OneDrive\Desktop\unrealkiara\img\ref-face-front.jpg` | https://raw.githubusercontent.com/davideruzzenenti/unrealkiara/main/img/ref-face-front.jpg |
| Volto multi-angolo | `C:\Users\arzig\OneDrive\Desktop\unrealkiara\img\ref-face-sheet.png` | https://raw.githubusercontent.com/davideruzzenenti/unrealkiara/main/img/ref-face-sheet.png |
| Espressioni | `C:\Users\arzig\OneDrive\Desktop\unrealkiara\img\ref-face-expr.png` | https://raw.githubusercontent.com/davideruzzenenti/unrealkiara/main/img/ref-face-expr.png |
| Corpo (solo figura intera) | `C:\Users\arzig\OneDrive\Desktop\unrealkiara\img\ref-body-sheet.png` | https://raw.githubusercontent.com/davideruzzenenti/unrealkiara/main/img/ref-body-sheet.png |
