#!/usr/bin/env python3
from pathlib import Path
import urllib.request, math
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw
import numpy as np
import vtk
from vtk.util.numpy_support import vtk_to_numpy

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'cinematic'
TMP = ROOT / '.cinematic-build'
OUT.mkdir(parents=True, exist_ok=True)
TMP.mkdir(exist_ok=True)
UA = {'User-Agent': 'YellowDrive-Topdown/1.0'}

CAR = TMP / 'porsche-uncompressed.glb'
if not CAR.exists():
    raise SystemExit('Missing decompressed Porsche asset')


def get(url, name):
    p = TMP / name
    if p.exists() and p.stat().st_size > 1000:
        return p
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r, open(p, 'wb') as f:
        while True:
            b = r.read(1024 * 1024)
            if not b:
                break
            f.write(b)
    return p


ASPH = get('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/asphalt_track/asphalt_track_diff_1k.jpg', 'asphalt_track_diff_1k.jpg')
TWIG = get('https://dl.polyhaven.org/file/ph-assets/Models/png/1k/fir_tree_01/fir_tree_01_twig_diff_1k.png', 'fir_tree_01_twig_diff_1k.png')
ALPHA = get('https://dl.polyhaven.org/file/ph-assets/Models/png/1k/fir_tree_01/fir_tree_01_twig_alpha_1k.png', 'fir_tree_01_twig_alpha_1k.png')

# ---------------------------------------------------------------------------
# Dark top-down country road made only from the selected Asphalt Track and
# Fir Tree source families. The road is deliberately straight and calm so the
# scroll motion remains clean and readable.
W, H = 1280, 2400
road_w = 500
road_x0 = (W - road_w) // 2
road_x1 = road_x0 + road_w

asphalt = Image.open(ASPH).convert('RGB')
asphalt = ImageEnhance.Brightness(asphalt).enhance(.42)
asphalt = ImageEnhance.Contrast(asphalt).enhance(1.08)

canvas = Image.new('RGB', (W, H), (8, 11, 9))
# Side ground: same asphalt family, much darker and slightly green-tinted.
side_tile = asphalt.resize((520, 520), Image.Resampling.LANCZOS)
side_arr = np.array(side_tile).astype(np.float32)
side_arr[..., 0] *= .40
side_arr[..., 1] *= .54
side_arr[..., 2] *= .42
side_tile = Image.fromarray(np.clip(side_arr, 0, 255).astype(np.uint8))
for y in range(0, H, side_tile.height):
    for x in range(0, W, side_tile.width):
        canvas.paste(side_tile, (x, y))

road_tile = asphalt.resize((road_w, 620), Image.Resampling.LANCZOS)
for y in range(0, H, road_tile.height):
    canvas.paste(road_tile, (road_x0, y))

# Dark shoulders and crisp European road markings.
d = ImageDraw.Draw(canvas, 'RGBA')
d.rectangle((road_x0 - 22, 0, road_x0, H), fill=(18, 20, 17, 235))
d.rectangle((road_x1, 0, road_x1 + 22, H), fill=(18, 20, 17, 235))
d.line((road_x0 + 28, 0, road_x0 + 28, H), fill=(210, 212, 204, 205), width=5)
d.line((road_x1 - 28, 0, road_x1 - 28, H), fill=(210, 212, 204, 205), width=5)
center = W // 2
for y in range(-120, H + 120, 150):
    d.rounded_rectangle((center - 4, y, center + 4, y + 72), radius=4, fill=(224, 225, 216, 210))

# Fir Tree foliage is kept strictly outside the road and shoulder. Previously
# parts of the flat top-view texture could overlap the asphalt and read like
# brown tape/branches lying on the carriageway. Trees now sit clearly beside it.
twig = Image.open(TWIG).convert('RGB')
alpha = Image.open(ALPHA).convert('L')
if twig.size != alpha.size:
    alpha = alpha.resize(twig.size, Image.Resampling.LANCZOS)
fir = twig.copy(); fir.putalpha(alpha)
fir.thumbnail((420, 420), Image.Resampling.LANCZOS)
fir = ImageEnhance.Brightness(fir).enhance(.30)
tree_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for i, y in enumerate(range(-80, H + 220, 220)):
    for side in (-1, 1):
        size = int(250 + 70 * (0.5 + 0.5 * math.sin(i * 1.7 + side)))
        f = fir.resize((size, size), Image.Resampling.LANCZOS)
        f = f.rotate((i * 23 + side * 11) % 360, resample=Image.Resampling.BICUBIC, expand=True)
        a = f.getchannel('A').point(lambda v: int(v * .66))
        f.putalpha(a)
        if side < 0:
            x = road_x0 - int(f.width * .96)
        else:
            x = road_x1 - int(f.width * .04)
        tree_layer.alpha_composite(f, (x, y - f.height // 4))

# Hard safety mask: no tree pixel can ever cover the road or its shoulder.
tree_alpha = np.array(tree_layer.getchannel('A'), dtype=np.uint8)
tree_alpha[:, max(0, road_x0 - 34):min(W, road_x1 + 34)] = 0
tree_layer.putalpha(Image.fromarray(tree_alpha, 'L'))
canvas = canvas.convert('RGBA')
canvas.alpha_composite(tree_layer)
canvas = canvas.convert('RGB')

# Night grade + vignette, but keep asphalt readable.
arr = np.array(canvas).astype(np.float32)
yy, xx = np.mgrid[0:H, 0:W]
dx = (xx - W / 2) / (W / 2)
dy = (yy - H / 2) / (H / 2)
vign = np.clip(1 - .34 * (dx * dx + .45 * dy * dy), .52, 1.0)[..., None]
arr *= vign
arr[..., 2] *= 1.05
arr[..., 1] *= .98
canvas = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
canvas.save(OUT / 'road-top.webp', 'WEBP', quality=88, method=6)

# ---------------------------------------------------------------------------
# Actual Porsche 911 Carrera 4S rendered from directly above.
ren = vtk.vtkRenderer(); ren.SetBackground(0, 0, 0); ren.SetBackgroundAlpha(0)
win = vtk.vtkRenderWindow(); win.SetOffScreenRendering(1); win.SetSize(800, 1200); win.SetAlphaBitPlanes(1); win.SetMultiSamples(8); win.AddRenderer(ren)
imp = vtk.vtkGLTFImporter(); imp.SetFileName(str(CAR)); imp.SetRenderWindow(win); imp.Update()
ren.AutomaticLightCreationOff()
for pos, intensity, color in [((0, 8, -4), 3.1, (1.0, .86, .68)), ((-5, 5, 3), 1.1, (.54, .67, 1.0)), ((5, 5, 3), .85, (.74, .82, 1.0))]:
    l = vtk.vtkLight(); l.SetLightTypeToSceneLight(); l.SetPosition(*pos); l.SetFocalPoint(0, 0, 0); l.SetIntensity(intensity); l.SetColor(*color); ren.AddLight(l)
cam = ren.GetActiveCamera()
cam.SetPosition(0, 10, 0)
cam.SetFocalPoint(0, 0, 0)
cam.SetViewUp(0, 0, -1)
cam.ParallelProjectionOn()
ren.ResetCamera()
cam.ParallelProjectionOn()
# ResetCamera chooses a good centered framing; open it slightly for clean margins.
cam.SetParallelScale(cam.GetParallelScale() * 1.08)
ren.ResetCameraClippingRange()

w2i = vtk.vtkWindowToImageFilter(); w2i.SetInput(win); w2i.SetInputBufferTypeToRGBA(); w2i.ReadFrontBufferOff()
win.Render(); w2i.Modified(); w2i.Update()
out = w2i.GetOutput(); dims = out.GetDimensions()
rgba = vtk_to_numpy(out.GetPointData().GetScalars()).reshape(dims[1], dims[0], 4)
rgba = np.flipud(rgba)
car = Image.fromarray(rgba, 'RGBA')
bbox = car.getbbox()
if bbox:
    car = car.crop(bbox)
# Portrait cell for a vertical road. Keep generous transparent margins.
cell = Image.new('RGBA', (360, 620), (0, 0, 0, 0))
car.thumbnail((330, 590), Image.Resampling.LANCZOS)
cell.alpha_composite(car, ((cell.width - car.width) // 2, (cell.height - car.height) // 2))
cell.save(OUT / 'porsche-top.webp', 'WEBP', quality=92, method=6)

print('Built top-down assets:', OUT / 'road-top.webp', OUT / 'porsche-top.webp')
