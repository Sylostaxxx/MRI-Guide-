"""Prepare an instructional crop of MSD Task02 case la_003 (nibabel and NumPy)."""
from pathlib import Path
import gzip
import hashlib
import json
import sys

import nibabel as nib
import numpy as np

source = Path(sys.argv[1])
output = Path(__file__).resolve().parents[1] / 'atlas' / 'cardiac'
output.mkdir(parents=True, exist_ok=True)
entries = [
    ('imagesTr', '035de3923ffe7a8bd5e1d8ad8eefb57eeaf9a98074a8f70825aab88464e4e098'),
    ('labelsTr', 'c91fea6782a75ae98de74bdbdd3a9ae4e68998e7dca65b2174cc4d0ecf16e913')
]
volumes = []
for name, sha in entries:
    path = source / (name + '.nii.gz')
    assert hashlib.sha256(path.read_bytes()).hexdigest() == sha
    volumes.append(nib.as_closest_canonical(nib.load(path)))
image, mask = volumes
assert image.shape == mask.shape and np.allclose(image.affine, mask.affine)
assert np.all(np.diag(image.affine)[:3] > 0)
labels = mask.get_fdata(dtype=np.float32)
assert np.array_equal(np.unique(labels), [0, 1])
points = np.argwhere(labels)
margin = np.ceil(30 / np.diag(image.affine)[:3]).astype(int)
lo = np.maximum(0, points.min(axis=0) - margin)
hi = np.minimum(image.shape, points.max(axis=0) + margin + 1)
cut = tuple(slice(a,b) for a,b in zip(lo,hi))
image, mask = (v.slicer[cut] for v in volumes)
centroid = points.mean(axis=0)
anchor = points[np.argmin(np.sum(((points-centroid)*np.diag(image.affine)[:3]) ** 2,axis=1))] - lo
assets = []
for volume, dtype, (original, source_sha), title, filename in zip(
    (image, mask), (np.float32, np.uint8), entries,
    ('Cardiac MRI','Left atrial mask'), ('heart-mri.nii.gz','heart-labels.nii.gz')
):
    data = np.asarray(volume.dataobj,dtype=dtype)
    assert np.isfinite(data).all()
    clean = nib.Nifti1Image(data,volume.affine)
    clean.set_sform(volume.affine,code=2)
    clean.set_qform(volume.affine,code=2)
    clean.header.set_xyzt_units('mm')
    compressed = gzip.compress(clean.to_bytes(),mtime=0)
    (output / filename).write_bytes(compressed)
    assets.append({'title': title,'path': './atlas/cardiac/'+filename,
        'sourceFile': original+'/la_003.nii.gz','sourceSha256':source_sha,
        'bytes':len(compressed),'sha256':hashlib.sha256(compressed).hexdigest()})
manifest = {
    'id':'msd-heart-la003-v1','source':'https://medicaldecathlon.com/',
    'publication':'https://doi.org/10.1038/s41467-022-30695-9',
    'mirror':'https://huggingface.co/datasets/MedOtter/msd-cardiac/tree/f0b3bff6f3933107a25f87a9fc3e1f42c641bb4f',
    'license':'CC-BY-SA-4.0','licenseUrl':'https://creativecommons.org/licenses/by-sa/4.0/',
    'attribution':"Medical Segmentation Decathlon Task02 Heart; King’s College London contributors.",
    'region':'Heart, left atrial region','sequence':'3D cardiac MRI, MSD Task02',
    'orientation':'Axis-aligned RAS+ in the dataset geometry; 1.25 × 1.25 × 1.37 mm',
    'processing':'Cropped the MRI and mask to a shared region around the left atrium with a 30 mm margin; reconstructed clean headers without spatial interpolation.',
    'labels':{'1':{'name':'Left atrium'}},'anchors':{'1':anchor.tolist()},'volumes':assets
}
(output / 'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
