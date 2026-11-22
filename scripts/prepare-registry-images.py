"""Render registry reference slices from the versioned bundled atlas volumes and anchors."""
import gzip
import hashlib
import json
from pathlib import Path
import numpy as np
import nibabel as nib
from PIL import Image, ImageDraw

packs = {'brain': ('atlas/manifest.json', 'cerebra1'),
         'spine': ('atlas/spine/manifest.json', 'spine1'),
         'knee': ('atlas/knee/manifest.json', 'knee1'),
         'heart': ('atlas/cardiac/manifest.json', 'cardiac1')}
# (pack, source label ID, slice-axis, whether to show the arrow)
cases = {
    'n01':('brain',91,2,True),'n02':('brain',49,1,True),'n03':('brain',72,2,True),
    'n04':('brain',99,1,True),'n05':('brain',62,0,True),'n06':('brain',37,2,True),
    'n07':('brain',92,2,True),'n08':('brain',97,1,True),'n09':('brain',68,1,True),
    'n10':('spine',3,0,True),'n11':('spine',5,0,True),'n12':('spine',8,0,True),
    'n13':('spine',11,0,True),'n14':('brain',91,2,False),'n15':('brain',62,0,False),
    'm01':('knee',1,0,True),'m02':('knee',2,0,True),'m03':('knee',2,1,False),
    'm04':('knee',1,2,False),'x01':('heart',1,2,True),'x02':('heart',1,1,False)
}
output = Path('atlas/registry')
output.mkdir(exist_ok=True)
volumes = {}
for region,(path,pack) in packs.items():
    manifest = json.loads(Path(path).read_text())
    values = []
    for source in manifest['volumes']:
        volume = Path(source['path'])
        assert hashlib.sha256(volume.read_bytes()).hexdigest() == source['sha256']
        values.append(nib.load(volume))
    image, labels = values
    assert image.shape == labels.shape and np.array_equal(image.affine,labels.affine)
    assert nib.aff2axcodes(image.affine) == ('R','A','S')
    raw = np.asarray(image.dataobj)
    cap = np.percentile(raw[raw > 0], 99.8)
    volumes[region] = (manifest, raw, np.asarray(labels.dataobj), np.diag(image.affine)[:3], cap)
records = {}
for id,(region,code,axis,mark) in cases.items():
    manifest, raw, labels, spacing, cap = volumes[region]
    vox = manifest['anchors'][str(code)]
    assert labels[tuple(vox)] == code
    u,v = [coordinate for coordinate in range(3) if coordinate != axis]
    sample = np.take(raw, vox[axis], axis=axis).T[::-1,:]
    w,h = sample.shape[1],sample.shape[0]
    raster = Image.fromarray(np.uint8(np.clip(sample/cap*255,0,255))).convert('RGB')
    width = 560
    height = round(width*h*spacing[v]/(w*spacing[u]))
    raster = raster.resize((width,height), Image.Resampling.LANCZOS)
    if mark:
        tx = (vox[u]+.5)*width/w
        ty = (h-vox[v]-.5)*height/h
        # The arrow terminates at the verified voxel center. The shaft stays outside its tip.
        hx = tx-36 if tx>width/2 else tx+36
        hy = ty-36 if ty>height/2 else ty+36
        draw = ImageDraw.Draw(raster)
        draw.line((hx,hy,tx,ty), fill='#161209',width=6)
        draw.line((hx,hy,tx,ty), fill='#ffdb5c',width=3)
        dx,dy = hx-tx,hy-ty
        length = np.hypot(dx,dy)
        dx,dy = dx/length,dy/length
        draw.polygon([(tx,ty),(tx+dx*13-dy*5,ty+dy*13+dx*5),(tx+dx*13+dy*5,ty+dy*13-dx*5)],fill='#ffdb5c')
    path=output/(id+'.webp')
    raster.save(path,'WEBP',quality=87)
    records[id]={'path':'./'+str(path),'region':region,'label':code,
        'labelName':manifest['labels'][str(code)]['name'],'voxel':vox,'axis':axis,'marked':mark,
        'license':manifest['license'],'licenseUrl':manifest['licenseUrl'],'source':manifest['source'],
        'attribution':manifest['attribution'],
        'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
Path('registry-images.js').write_text('globalThis.RegistryImages = '+json.dumps(records,ensure_ascii=False,indent=2)+';\n')
