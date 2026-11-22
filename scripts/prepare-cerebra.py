"""Build browser atlas assets from the extracted CerebrA release (nibabel, h5py, numpy)."""
import csv
import gzip
import hashlib
import json
from pathlib import Path
import sys

import nibabel as nib
import numpy as np

source = Path(sys.argv[1])
output = Path(__file__).resolve().parents[1] / "atlas"
output.mkdir(exist_ok=True)
t1_name = "mni_icbm152_t1_tal_nlin_sym_09c.mnc"
t1 = nib.as_closest_canonical(nib.load(source / t1_name))
labels = nib.as_closest_canonical(nib.load(source / "CerebrA.nii"))
assert t1.shape == labels.shape and np.allclose(t1.affine, labels.affine)

signal = t1.get_fdata(dtype=np.float32)
seg = labels.get_fdata(dtype=np.float32)
assert np.isfinite(signal).all() and np.isfinite(seg).all()
assert np.equal(seg, np.rint(seg)).all() and 0 <= seg.min() < seg.max() <= 255
seg = seg.astype(np.uint8)
names = {}
anchors = {}
with (source / "CerebrA_LabelDetails.csv").open(newline="") as descriptor:
    rows = csv.reader(descriptor)
    next(rows)
    next(rows)
    for _, name, right, left, *_ in rows:
        for code, side in [(int(right), "Right"), (int(left), "Left")]:
            points = np.column_stack(np.where(seg == code))
            assert len(points), (code, name)
            middle = points.mean(axis=0)
            representative = points[np.argmin(np.sum((points - middle) ** 2, axis=1))]
            if name in {"Brainstem", "Third Ventricle", "Fourth Ventricle", "Optic Chiasm"} or name.startswith("Vermal "):
                names[code] = {"name": name.strip(), "subdivision": side}
            else:
                assert (middle[0] + t1.affine[0, 3] > 0) == (side == "Right"), (code, name, middle)
                names[code] = {"name": f"{side} {name.strip()}", "hemisphere": side}
            label = representative.tolist()
            anchors[code] = label
assert set(np.unique(seg)) == {0, *names}

assets = []
for filename, title, array, original in [
    ("cerebra-t1.nii.gz", "T1 MRI", signal, t1_name),
    ("cerebra-labels.nii.gz", "anatomical labels", seg, "CerebrA.nii"),
]:
    volume = nib.Nifti1Image(array, t1.affine)
    volume.set_sform(t1.affine, code=4)
    volume.set_qform(t1.affine, code=4)
    volume.header.set_xyzt_units("mm")
    data = gzip.compress(volume.to_bytes(), mtime=0)
    (output / filename).write_bytes(data)
    assets.append({"title": title, "path": "./atlas/" + filename, "sourceFile": original,
                   "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})

manifest = {
    "id": "cerebra-icbm152-v1",
    "source": "https://doi.org/10.12751/g-node.be5e62",
    "publication": "https://doi.org/10.1038/s41597-020-0557-9",
    "license": "CC0-1.0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
    "attribution": "Ana L. Manera, Mahsa Dadar, Vladimir Fonov and D. Louis Collins. Symmetric MNI-ICBM152 2009c T1 reference by Fonov et al.",
    "region": "Brain",
    "sequence": "T1-weighted population average",
    "orientation": "RAS+, MNI152 space, 1 mm isotropic",
    "labelSource": "CerebrA_LabelDetails.csv",
    "processing": "Reordered the original MINC axes to RAS+ and converted to NIfTI float32. Encoded source integer labels as uint8. Gzip compressed both without spatial resampling.",
    "volumes": assets,
    "labels": names,
    "anchors": anchors,
    "notices": ["CerebrA-LICENSE.txt", "ICBM-LICENSE.txt"]
}
(output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
(output / "CerebrA-LICENSE.txt").write_bytes((source / "LICENSE").read_bytes())
