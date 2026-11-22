"""Prepare the pyKNEEr demo MRI, femur mask and cartilage mask (NumPy and nibabel)."""
import gzip
import hashlib
import json
from pathlib import Path
import sys

import nibabel as nib
import numpy as np

source = Path(sys.argv[1])
output = Path(__file__).resolve().parents[1] / "atlas" / "knee"
output.mkdir(parents=True, exist_ok=True)


def read_mha(path):
    raw = path.read_bytes()
    marker = b"ElementDataFile = LOCAL\n"
    start = raw.index(marker) + len(marker)
    fields = dict(line.split(" = ", 1) for line in raw[:start].decode().splitlines())
    assert fields["BinaryData"] == "True" and fields["BinaryDataByteOrderMSB"] == "False"
    assert fields.get("CompressedData", "False") == "False" and fields["NDims"] == "3"
    types = {"MET_FLOAT": "<f4", "MET_UCHAR": "u1", "MET_SHORT": "<i2"}
    shape = tuple(map(int, fields["DimSize"].split()))
    pixels = np.frombuffer(raw, dtype=types[fields["ElementType"]], offset=start).reshape(shape, order="F")
    spacing = np.array(fields["ElementSpacing"].split(), dtype=float)
    direction = np.array(fields["TransformMatrix"].split(), dtype=float).reshape(3, 3).T
    offset = np.array(fields["Offset"].split(), dtype=float)
    lps_to_ras = np.diag([-1, -1, 1])
    affine = np.eye(4)
    affine[:3, :3] = lps_to_ras @ direction @ np.diag(spacing)
    affine[:3, 3] = lps_to_ras @ offset
    return nib.as_closest_canonical(nib.Nifti1Image(pixels, affine))


files = ["reference.mha", "reference_f.mha", "reference_fc.mha"]
t1, bone, cartilage = (read_mha(source / file) for file in files)
for volume in [bone, cartilage]:
    assert t1.shape == volume.shape and np.allclose(t1.affine, volume.affine)
t1, bone, cartilage = (volume.slicer[:, ::2, ::2] for volume in [t1, bone, cartilage])
image = t1.get_fdata(dtype=np.float32)
assert np.isfinite(image).all() and image.max() > image.min()
femur = bone.get_fdata() > 0
femoral_cartilage = cartilage.get_fdata() > 0
labels = np.zeros(image.shape, dtype=np.uint8)
labels[femur] = 1
labels[femoral_cartilage] = 2
anchors = {}
for code in (1, 2):
    points = np.column_stack(np.where(labels == code))
    center = points.mean(axis=0)
    anchors[code] = points[np.argmin(np.sum((points - center) ** 2, axis=1))].tolist()

assets = []
for filename, title, array, raw in [
    ("knee-dess.nii.gz", "Knee reference MRI", image, [files[0]]),
    ("knee-labels.nii.gz", "Femur and femoral cartilage labels", labels, files[1:]),
]:
    volume = nib.Nifti1Image(array, t1.affine)
    volume.set_sform(t1.affine, code=2)
    volume.set_qform(t1.affine, code=2)
    volume.header.set_xyzt_units("mm")
    data = gzip.compress(volume.to_bytes(), mtime=0)
    (output / filename).write_bytes(data)
    assets.append({"title": title, "path": "./atlas/knee/" + filename, "sourceFiles": [{"filename": item, "sha256": hashlib.sha256((source / item).read_bytes()).hexdigest()}
                                   for item in raw],
                   "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})

manifest = {
    "id": "pykneer-demo-v4",
    "source": "https://doi.org/10.5281/zenodo.3820248",
    "license": "CC-BY-NC-SA-4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    "attribution": "Serena Bonaretti. pyKNEEr demo images, version 4.",
    "region": "Knee",
    "sequence": "Preprocessed 3D DESS reference",
    "orientation": "Axis-aligned RAS+ in pyKNEEr standardized knee space; not native scanner coordinates.",
    "processing": "Converted MetaImage LPS geometry to RAS+ NIfTI. The MRI and masks were sampled at identical every-other indices in the two high-resolution directions and the two binary masks combined.",
    "labels": {"1": {"name": "Femur"}, "2": {"name": "Femoral cartilage"}},
    "anchors": anchors,
    "notice": "LICENSE.txt",
    "volumes": assets
}
(output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
