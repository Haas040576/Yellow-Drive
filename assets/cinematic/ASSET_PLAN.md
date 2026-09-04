# Yellow Drive Cinematic Demo – Asset Plan

This folder belongs only to the `cinematic-demo` branch. The production website on `main` must remain untouched.

## Creative direction

One continuous cinematic drive through a believable Central-European / Alpine roadside environment. No generative-AI backgrounds. The visual language should feel like an automotive commercial: natural materials, restrained camera movement, shallow depth of field where appropriate, realistic reflections, warm late-day light, and clean Yellow Drive brand accents.

## Scroll story

1. **Opening** – car emerges into frame, low tracking shot, minimal copy.
2. **Station 01: Anmeldung** – car brakes and stops. Camera settles. HTML copy appears while the car remains stationary.
3. **Drive 01 → 02** – car accelerates, camera moves from low rear three-quarter to higher follow shot.
4. **Station 02: Theorie** – second stop. Subtle Yellow Drive roadside marker / graphic, no fake floating 3D UI baked into the render.
5. **Drive 02 → 03** – longer cinematic section, slight curve, reflections and road movement carry the scene.
6. **Station 03: Praxis** – third stop, strongest vehicle close-up.
7. **Finale** – car drives toward open road / light, CTA remains real HTML on top of the render.

## Source assets

### Vehicle
- `free_porsche_911_carrera_4s.zip` – user supplied Sketchfab model.
- Use only for the demo render; remove or de-emphasize Porsche branding if the demo is presented publicly as a generic driving-school concept.
- Keep original license/author information with the source asset.

### Road surface
- `asphalt_track_4k.blend` – user supplied Poly Haven asphalt material.
- Use as primary road PBR material.

### Final environment / lighting
- Poly Haven `sunset_forest` – preferred final forest lighting/environment for the cinematic sequence.
  https://polyhaven.com/a/sunset_forest
- Alternative / reference: Poly Haven `tief_etz` – Central-European-looking forest-road curve, useful for environment reference and reflection tests.
  https://polyhaven.com/a/tief_etz
- Do **not** use Camdeboo Road as the visible final environment; its arid South-African vegetation does not fit Yellow Drive / Bavaria. Keep it only as an optional lighting test.

### Road shoulder / terrain
- Poly Haven `grass_path_3` – compacted dirt, gravel and sparse grass for believable road edges.
  https://polyhaven.com/a/grass_path_3
- Recommended maps for Blender: diffuse, normal GL, roughness, displacement (2K or 4K).

### Foreground vegetation
- Prefer procedural scattering / simple modeled vegetation using the environment palette instead of many unrelated downloaded objects.
- Optional Poly Haven `grass_medium_01` for close roadside patches.
  https://polyhaven.com/a/grass_medium_01
- Trees should primarily come from the HDRI/background plus a few foreground instances only if parallax requires them.

### Roadside objects
- Build Yellow Drive station markers, lane markings, guardrails and simple signs ourselves in Blender from basic geometry. This is intentional: it keeps the scene stylistically coherent and avoids the “asset pack” look.

## Licensing / visual provenance

Poly Haven assets are CC0 and Poly Haven states that its asset library is hand-crafted and avoids generative AI. Keep this file as provenance documentation for the demo.

## Web delivery target

Blender source assets stay out of the public website bundle. Final output goes into this folder only after rendering/optimization:

- `frames/yd_0001.webp` … `frames/yd_0xxx.webp`, or
- a web-optimized scrub video if testing proves it superior.

The existing `cinematic.js` scroll controller should map scroll progress to the rendered sequence, with deliberate hold ranges at Anmeldung, Theorie and Praxis.
