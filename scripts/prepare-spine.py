"""Prepare the cervical study pack from the publisher's T1 and disc-landmark NIfTI files."""
import gzip
import hashlib
import json
from pathlib import Path
import sys

import nibabel as nib
import numpy as np

source = Path(sys.argv[1])
output = Path(__file__).resolve().parents[1] / "atlas" / "spine"
output.mkdir(parents=True, exist_ok=True)
originals = [
    ("T1w.nii.gz", "7720a3c3bdd6dcf3936b34153140fcb203a95348c33c0c3dc3cfefa759d2f1ea",
     "sub-poly/anat/sub-poly_T1w.nii.gz"),
    ("discs.nii.gz", "7bd60e43e33beef0ebe1fe80439dbe5bd78d419b3442e6d80497ffda57d996b7",
     "derivatives/labels/sub-poly/anat/sub-poly_T1w_labels-disc-manual.nii.gz"),
]
volumes = []
for filename, expected, _ in originals:
    path = source / filename
    assert hashlib.sha256(path.read_bytes()).hexdigest() == expected
    volumes.append(nib.as_closest_canonical(nib.load(path)))

t1, labels = volumes
assert t1.shape == labels.shape and np.allclose(t1.affine, labels.affine)
# Keep the spine and immediately surrounding tissues. Discard the
# craniofacial and peripheral field of view and reconstruct clean headers.
crop = (slice(58, 134), slice(45, 177), slice(8, 230))
t1, labels = (volume.slicer[crop] for volume in volumes)
points = labels.get_fdata()
levels = ["Craniovertebral landmark 1", "Craniovertebral landmark 2",
          "C2–C3 disc", "C3–C4 disc", "C4–C5 disc", "C5–C6 disc",
          "C6–C7 disc", "C7–T1 disc", "T1–T2 disc", "T2–T3 disc",
          "T3–T4 disc", "T4–T5 disc"]
assert set(np.unique(points)) == set(range(len(levels) + 1))
anchors = {}
for index, _ in enumerate(levels, start=1):
    matches = np.argwhere(points == index)
    assert len(matches) == 1
    anchors[index] = matches[0].tolist()

assets = []
for name, title, array, (_, checksum, original) in zip(
    ["cervical-t1.nii.gz", "cervical-landmarks.nii.gz"],
    ["Cervical T1 MRI", "spine landmarks"],
    [t1.get_fdata(dtype=np.float32), points.astype(np.uint8)],
    originals,
):
    volume = nib.Nifti1Image(array, t1.affine)
    volume.set_qform(t1.affine, code=1)
    volume.set_sform(t1.affine, code=1)
    volume.header.set_xyzt_units("mm")
    data = gzip.compress(volume.to_bytes(), mtime=0)
    (output / name).write_bytes(data)
    assets.append({"path": "./atlas/spine/" + name, "title": title, "sourceFile": original,
                   "sourceSha256": checksum, "bytes": len(data),
                   "sha256": hashlib.sha256(data).hexdigest()})

manifest = {
    "id": "spine-generic-poly-t1-v1",
    "source": "https://github.com/spine-generic/data-single-subject",
    "license": "CC-BY-4.0",
    "sourceRevision": "dc0a1771e8a7fb3bbf07d53a84fb7f56de623fed",
    "landmarkConvention": "https://spinalcordtoolbox.com/stable/user_section/command-line/sct_label_utils.html",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    "attribution": "Julien Cohen-Adad and Spine Generic contributors. Manual disc labels by Sandrine Bedard.",
    "region": "Cervical and upper thoracic spine",
    "sequence": "3D T1-weighted MRI at 3 T",
    "orientation": "Native scanner RAS+, 1 mm isotropic",
    "processing": "Reoriented label axes, cropped both volumes to the cervical and upper thoracic region, discarded original headers, and compressed as NIfTI-1 without interpolation.",
    "labels": {i: {"name": name} for i, name in enumerate(levels, start=1)},
    "anchors": anchors,
    "volumes": assets,
}
(output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
