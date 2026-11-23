"""Render registry reference slices from the versioned bundled atlas volumes and anchors."""
import hashlib
import json
from pathlib import Path
import numpy as np
import nibabel as nib
from PIL import Image

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
    'm04':('knee',1,2,False),'x01':('heart',1,2,True),'x02':('heart',1,1,False),
    'le-k-img01':('knee',2,2,'number'), 'le-k-img02':('knee',1,1,'dot'),
    'le-k-img03':('knee',2,1,'segmentation')
}
expected={
    'n01':'Thalamus','n02':'Caudate','n03':'Putamen','n04':'Hippocampus','n05':'Brainstem',
    'n06':'Fourth ventricle','n07':'Lateral ventricle','n08':'Cerebellar gray matter','n09':'Optic chiasm',
    'n10':'C2–C3','n11':'C4–C5','n12':'C7–T1','n13':'T3–T4','n14':'Axial','n15':'T1 weighted',
    'm01':'Distal femur','m02':'Femoral articular cartilage','m03':'Coronal',
    'm04':'Scroll source images and review linked reformats through the prescribed superior and inferior landmarks',
    'x01':'Left atrium','x02':'Coronal',
    'le-k-img01':'Distal femur','le-k-img02':'Image B','le-k-img03':'Conforms to the femoral articular surface'
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
    marker = None
    if mark:
        tx = (vox[u]+.5)*width/w
        ty = (h-vox[v]-.5)*height/h
        hx = tx-100 if tx>width/2 else tx+100
        rise = min(62,height*.18)
        hy = ty-rise if ty>height/2 else ty+rise
        marker = {'type': 'arrow' if mark is True else mark,
                  'target':[round(tx,3),round(ty,3)],'origin':[round(hx,3),round(hy,3)]}
        if mark == 'number':
            marker['number'] = 1
        if mark == 'segmentation':
            binary = np.take(labels, vox[axis], axis=axis).T[::-1,:] == code
            # Coalesce voxel boundary segments into runs, without changing the label geometry.
            segments = []
            def runs(edge, horizontal):
                for fixed,row in enumerate(edge if horizontal else edge.T):
                    points = np.flatnonzero(np.diff(np.r_[False,row,False]))
                    for start,end in points.reshape(-1,2):
                        coordinates = [start*width/w,fixed*height/h,end*width/w,fixed*height/h] if horizontal else [
                            fixed*width/w,start*height/h,fixed*width/w,end*height/h]
                        segments.append([round(value,3) for value in coordinates])
            runs(np.diff(np.pad(binary,((1,1),(0,0))),axis=0),True)
            runs(np.diff(np.pad(binary,((0,0),(1,1))),axis=1),False)
            marker['segments'] = segments
    path = output / (id+'-base.webp' if mark else id+'.webp')
    raster.save(path,'WEBP',quality=87)
    records[id]={'path':'./'+str(path),'questionId':id,'region':region,'label':code,
        'labelName':manifest['labels'][str(code)]['name'],'voxel':vox,'axis':axis,'marked':bool(mark),
        'width':width,'height':height,'sequence':manifest['sequence'],'plane':['Sagittal','Coronal','Axial'][axis],
        'marker':marker,'expectedAnswer':expected[id],'verification':'source-verified','reviewed':'2026-11-23',
        'license':manifest['license'],'licenseUrl':manifest['licenseUrl'],'source':manifest['source'],
        'attribution':manifest['attribution'],'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    if id == 'le-k-img02':
        records[id]['comparison'] = 'm04'
Path('registry-images.js').write_text('globalThis.RegistryImages = '+json.dumps(records,ensure_ascii=False,indent=2)+';\n')
