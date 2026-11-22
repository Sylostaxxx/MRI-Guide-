# MRI-Guide-
MRI study guide 

## Development

Run `npm test` with Node.js 22 or later. To serve the static app locally, run `npm run dev` and open `http://127.0.0.1:4173/`. GitHub Pages serves the same files under the repository path.

Use **Backup & Help** to export notebook entries, quiz history, scan notes, and atlas drawings together. Import merges with the study data already on the device. Download the Real Brain Atlas once to make its MRI and label volumes available offline. To rebuild these volumes from the original CerebrA archive, extract it and run `python scripts/prepare-cerebra.py /path/to/extracted/archive` with NumPy, nibabel, and h5py installed.

See [PROGRESS.md](PROGRESS.md) for current imaging coverage and remaining work.

The Cervical Spine Atlas uses a cropped T1 volume and the original point-wise landmarks from the [Spine Generic data release](https://github.com/spine-generic/data-single-subject). The pack manifest records source hashes, processing, and attribution.
