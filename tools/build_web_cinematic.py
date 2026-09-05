#!/usr/bin/env python3
from pathlib import Path
import math, os, urllib.request, subprocess
import numpy as np
import cv2
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw
import vtk
from vtk.util.numpy_support import vtk_to_numpy

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets'/'cinematic'; TMP=ROOT/'.cinematic-build'
OUT.mkdir(parents=True,exist_ok=True); TMP.mkdir(exist_ok=True)
UA={'User-Agent':'YellowDrive-Cinematic/1.0'}

def get(url,name):
    p=TMP/name
    if p.exists() and p.stat().st_size>1000:return p
    print('download',url)
    req=urllib.request.Request(url,headers=UA)
    with urllib.request.urlopen(req,timeout=120) as r, open(p,'wb') as f:
        while True:
            b=r.read(1024*1024)
            if not b:break
            f.write(b)
    return p

# Exact source asset families chosen for this project: Karol Miklas 911,
# Tief Etz, Asphalt Track and Fir Tree 01. Web delivery uses lower resolution
# derivatives of those same sources, never substitute car/landscape assets.
CAR=get('https://raw.githubusercontent.com/esc5221/drive-game/main/public/models/911.glb','911.glb')
EXR=get('https://dl.polyhaven.org/file/ph-assets/HDRIs/exr/2k/tief_etz_2k.exr','tief_etz_2k.exr')
ASPH=get('https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/asphalt_track/asphalt_track_diff_1k.jpg','asphalt_track_diff_1k.jpg')
TWIG=get('https://dl.polyhaven.org/file/ph-assets/Models/png/1k/fir_tree_01/fir_tree_01_twig_diff_1k.png','fir_tree_01_twig_diff_1k.png')
ALPHA=get('https://dl.polyhaven.org/file/ph-assets/Models/png/1k/fir_tree_01/fir_tree_01_twig_alpha_1k.png','fir_tree_01_twig_alpha_1k.png')

# GitHub's OpenCV wheel cannot reliably decode this EXR, so decode losslessly
# with FFmpeg first. This keeps the real Tief Etz panorama and avoids the
# brown-blur failure from the realtime HDRI attempt.
exr_png=TMP/'tief_etz_decoded.png'
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(EXR),'-frames:v','1',str(exr_png)],check=True)
pano=np.array(Image.open(exr_png).convert('RGB'))
pano_img=Image.fromarray(pano)
pano_img=ImageEnhance.Brightness(pano_img).enhance(.82)
pano_img=ImageEnhance.Contrast(pano_img).enhance(1.05)
pano_img=ImageEnhance.Color(pano_img).enhance(.94)
pano=np.array(pano_img)
PH,PW=pano.shape[:2]
asph=np.array(Image.open(ASPH).convert('RGB'))
W,H=1280,720

def project(yaw_deg,pitch_deg,fov_deg):
    yaw=np.deg2rad(yaw_deg);pitch=np.deg2rad(pitch_deg);fov=np.deg2rad(fov_deg)
    aspect=W/H
    xs=np.linspace(-math.tan(fov/2)*aspect,math.tan(fov/2)*aspect,W,dtype=np.float32)
    ys=np.linspace(math.tan(fov/2),-math.tan(fov/2),H,dtype=np.float32)
    xx,yy=np.meshgrid(xs,ys);zz=np.ones_like(xx)
    n=np.sqrt(xx*xx+yy*yy+zz*zz);xx/=n;yy/=n;zz/=n
    cp,sp=math.cos(pitch),math.sin(pitch);cy,sy=math.cos(yaw),math.sin(yaw)
    y2=cp*yy-sp*zz;z2=sp*yy+cp*zz
    x3=cy*xx+sy*z2;z3=-sy*xx+cy*z2;y3=y2
    lon=np.arctan2(x3,z3);lat=np.arcsin(np.clip(y3,-1,1))
    mx=((lon/(2*np.pi)+.5)*PW).astype(np.float32);my=((.5-lat/np.pi)*PH).astype(np.float32)
    return cv2.remap(pano,mx,my,cv2.INTER_LINEAR,borderMode=cv2.BORDER_WRAP)

def road_asphalt(bg,strength=.18,horizon=400,cx=640):
    tile=cv2.resize(asph,(1000,1000),interpolation=cv2.INTER_AREA)
    src=np.float32([[0,0],[999,0],[999,999],[0,999]])
    dst=np.float32([[cx-95,horizon],[cx+105,horizon],[W-25,H],[25,H]])
    M=cv2.getPerspectiveTransform(src,dst);warped=cv2.warpPerspective(tile,M,(W,H))
    mask=np.zeros((H,W),np.uint8);cv2.fillConvexPoly(mask,dst.astype(np.int32),255)
    grad=np.linspace(0,1,H).reshape(H,1);fade=np.clip((grad-horizon/H)/(1-horizon/H),0,1)
    a=cv2.GaussianBlur((mask/255.0)*fade*strength,(0,0),2.4)
    return np.clip(bg*(1-a[...,None])+warped*a[...,None],0,255).astype(np.uint8)

# Four related real Tief-Etz camera directions. They become the virtual drone's
# changing framing while the car travels through the story.
views=[(52,-6,80,620),(56,-4,70,650),(61,-3,64,675),(57,-5,60,645)]
road_frames=[]
for yaw,pitch,fov,cx in views:
    im=road_asphalt(project(yaw,pitch,fov),.19,400,cx)
    pil=Image.fromarray(im)
    pil=ImageEnhance.Brightness(pil).enhance(.84)
    pil=ImageEnhance.Contrast(pil).enhance(1.08)
    road_frames.append(pil)
road_sprite=Image.new('RGB',(W*4,H))
for i,im in enumerate(road_frames):road_sprite.paste(im,(i*W,0))
road_sprite.save(OUT/'roads-sprite-hq.webp','WEBP',quality=84,method=6)

twig=Image.open(TWIG).convert('RGB');alpha=Image.open(ALPHA).convert('L')
if twig.size!=alpha.size:alpha=alpha.resize(twig.size,Image.Resampling.LANCZOS)
fir=twig.copy();fir.putalpha(alpha)
fir.thumbnail((512,512),Image.Resampling.LANCZOS)
fir.save(OUT/'fir-foreground.webp','WEBP',quality=82,method=6)

# Render the actual Porsche from the GLB to transparent views. These are not a
# CSS approximation and not a generic replacement vehicle.
ren=vtk.vtkRenderer();ren.SetBackground(0,0,0);ren.SetBackgroundAlpha(0)
win=vtk.vtkRenderWindow();win.SetOffScreenRendering(1);win.SetSize(720,500);win.SetAlphaBitPlanes(1);win.SetMultiSamples(4);win.AddRenderer(ren)
imp=vtk.vtkGLTFImporter();imp.SetFileName(str(CAR));imp.SetRenderWindow(win);imp.Update()
ren.AutomaticLightCreationOff()
for pos,intensity,color in [((-5,-6,8),2.7,(1,.87,.70)),((5,2,5),1.5,(.64,.78,1)),((-2,5,6),1.0,(.82,1,.82))]:
    l=vtk.vtkLight();l.SetLightTypeToSceneLight();l.SetPosition(*pos);l.SetFocalPoint(0,0,0);l.SetIntensity(intensity);l.SetColor(*color);ren.AddLight(l)
cam=ren.GetActiveCamera();cam.SetViewUp(0,1,0);cam.SetViewAngle(31)
w2i=vtk.vtkWindowToImageFilter();w2i.SetInput(win);w2i.SetInputBufferTypeToRGBA();w2i.ReadFrontBufferOff()
car_frames=[]
for side in [-2,-1,0,1,2]:
    cam.SetPosition(side,2.1,-8);cam.SetFocalPoint(0,.05,0);ren.ResetCameraClippingRange();win.Render();w2i.Modified();w2i.Update()
    out=w2i.GetOutput();dims=out.GetDimensions();arr=vtk_to_numpy(out.GetPointData().GetScalars()).reshape(dims[1],dims[0],4);arr=np.flipud(arr)
    pil=Image.fromarray(arr,'RGBA');bbox=pil.getbbox();pil=pil.crop(bbox) if bbox else pil
    cell=Image.new('RGBA',(420,300),(0,0,0,0));pil.thumbnail((400,285),Image.Resampling.LANCZOS);cell.alpha_composite(pil,((420-pil.width)//2,(300-pil.height)//2))
    car_frames.append(cell)
car_sprite=Image.new('RGBA',(420*5,300),(0,0,0,0))
for i,im in enumerate(car_frames):car_sprite.alpha_composite(im,(i*420,0))
car_sprite.save(OUT/'porsche-sprite-hq.webp','WEBP',quality=85,method=6)

# --- Pre-rendered scroll film -------------------------------------------------
# 84 film frames are packed into six 4x4 WebP sheets. The browser only scrubs
# these rendered frames. This removes realtime WebGL instability and creates a
# controlled automotive-film look with the user's selected assets.

def blend_cells(cells,x):
    a=int(math.floor(x));b=min(len(cells)-1,a+1);t=x-a
    return Image.blend(cells[a],cells[b],t) if b!=a else cells[a].copy()

def bg_transform(im,zoom=1.0,panx=0,pany=0,rot=0):
    if abs(rot)>1e-4:im=im.rotate(rot,resample=Image.Resampling.BICUBIC,expand=False)
    w=max(W,int(W*zoom));h=max(H,int(H*zoom))
    im=im.resize((w,h),Image.Resampling.LANCZOS)
    cx=w//2+int(panx*W);cy=h//2+int(pany*H)
    left=max(0,min(w-W,cx-W//2));top=max(0,min(h-H,cy-H//2))
    return im.crop((left,top,left+W,top+H))

def car_state(i):
    if i<=20:
        q=i/20;return (0+1.8*q,.38+.42*q,-.06+.08*q,-.6+1.2*q)
    if i<=42:
        q=(i-20)/22;return (1+1.0*q,.78+.18*math.sin(q*math.pi),.02-.05*q,.6-1.4*q)
    if i<=64:
        q=(i-42)/22;return (2+1.0*q,.72+.22*q,-.03+.07*q,-.5+1.0*q)
    q=(i-64)/19;return (3-1.0*q,.95-.58*q,.04-.03*q,.5-.6*q)

def bg_state(i):
    if i<=20:q=i/20;bx=q
    elif i<=42:q=(i-20)/22;bx=1+q
    elif i<=64:q=(i-42)/22;bx=2+q
    else:q=(i-64)/19;bx=3
    zoom=1.02+.08*(math.sin((i/83)*math.pi*2.2)**2)
    panx=.008*math.sin(i*.17);pany=-.006+.008*math.cos(i*.11);rot=.16*math.sin(i*.13)
    return bx,zoom,panx,pany,rot

def compose(i):
    bx,zoom,panx,pany,rot=bg_state(i)
    bg=bg_transform(blend_cells(road_frames,bx),zoom,panx,pany,rot)
    out=bg.convert('RGBA')

    # Close blurred branches create real foreground parallax during driving.
    if (5<i<18) or (25<i<40) or (48<i<62):
        fg=fir.copy();size=int(H*1.0);fg.thumbnail((size,size),Image.Resampling.LANCZOS);fg=fg.filter(ImageFilter.GaussianBlur(1.6))
        fa=fg.getchannel('A').point(lambda a:int(a*.13));fg.putalpha(fa)
        x=-int(fg.width*.4) if i%2==0 else W-int(fg.width*.62);y=-int(fg.height*.1)
        out.alpha_composite(fg,(x,y))

    view,scale,side,tilt=car_state(i)
    cf=blend_cells(car_frames,view)
    w=max(80,int(W*.31*scale));h=max(58,int(w*300/420))
    cf=cf.resize((w,h),Image.Resampling.LANCZOS)
    if abs(tilt)>.01:cf=cf.rotate(tilt,resample=Image.Resampling.BICUBIC,expand=True)
    cx=int(W*(.5+side));cy=int(H*.78)

    shadow=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(shadow)
    sw=int(w*.36);sh=max(8,int(w*.055));d.ellipse((cx-sw,cy-sh//2,cx+sw,cy+sh//2),fill=(0,0,0,70));shadow=shadow.filter(ImageFilter.GaussianBlur(8))
    out=Image.alpha_composite(out,shadow)
    out.alpha_composite(cf,(cx-cf.width//2,cy-int(cf.height*.72)))
    rgb=ImageEnhance.Contrast(out.convert('RGB')).enhance(1.03)
    return rgb

film_frames=[compose(i) for i in range(84)]
film_frames[0].save(OUT/'poster.webp','WEBP',quality=86,method=6)
for sheet_i in range(6):
    sheet=Image.new('RGB',(W*4,H*4),(15,16,14))
    for local in range(16):
        idx=sheet_i*16+local
        if idx>=len(film_frames):break
        x=(local%4)*W;y=(local//4)*H
        sheet.paste(film_frames[idx],(x,y))
    sheet.save(OUT/f'cinematic-{sheet_i}.webp','WEBP',quality=80,method=6)

print('Built:',*(p.name for p in sorted(OUT.glob('*.webp'))))
