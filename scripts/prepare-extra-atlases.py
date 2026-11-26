"""Convert verified source acquisitions downloaded into a local directory.

Requires NumPy, NiBabel, SimpleITK and Pillow. No patient header fields are carried
over. Spatial operations are limited to native-grid permutation, flip and crop.
"""
import argparse
import hashlib
import json
from pathlib import Path

import nibabel as nib
import numpy as np
import SimpleITK as itk
from PIL import Image


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def read_metaimage(path):
    image = itk.ReadImage(str(path))
    data = itk.GetArrayFromImage(image).transpose(2, 1, 0)
    affine = np.eye(4)
    affine[:3, :3] = np.array(image.GetDirection()).reshape(3, 3) @ np.diag(image.GetSpacing())
    affine[:3, 3] = image.GetOrigin()
    return nib.Nifti1Image(data, np.diag([-1, -1, 1, 1]) @ affine)


def write_pack(key, metadata, image, mask, names, sources, crop_margin=None):
    image = nib.as_closest_canonical(image)
    if mask is not None:
        mask = nib.as_closest_canonical(mask)
        assert image.shape == mask.shape and np.allclose(image.affine, mask.affine, atol=1e-4, rtol=0)
    affine = image.affine.copy()
    pixels = np.asarray(image.dataobj)
    label_pixels = np.asarray(mask.dataobj).astype(np.uint8) if mask is not None else None
    if crop_margin is not None:
        low, high = [], []
        for axis, margin in enumerate(crop_margin):
            locations = np.flatnonzero(np.any(label_pixels, axis=tuple(i for i in range(3) if i != axis)))
            voxels = int(np.ceil(margin / nib.affines.voxel_sizes(affine)[axis]))
            low.append(max(0, int(locations[0])-voxels))
            high.append(min(image.shape[axis], int(locations[-1])+voxels+1))
        affine[:3, 3] = nib.affines.apply_affine(affine, low)
        slices = tuple(slice(a,b) for a,b in zip(low,high))
        pixels, label_pixels = pixels[slices], label_pixels[slices]
        assert set(np.unique(label_pixels)) == set(np.unique(mask.dataobj))
        metadata['cropSourceRASVoxels'] = [low, high]
    assert pixels.ndim == 3 and 1 < pixels.size <= 35000000 and np.isfinite(pixels).all()
    anchors = {}
    for label in names:
        points = np.argwhere((label_pixels == label) & (pixels > 0))
        assert len(points), label
        anchors[label] = points[np.argmin(np.sum((points-points.mean(axis=0))**2, axis=1))].tolist()
    if anchors:
        preview_point = next(iter(anchors.values()))
    else:
        preview_point = [n//2 for n in pixels.shape]
    nib_dir = Path('atlas') / key
    nib_dir.mkdir(parents=True, exist_ok=True)
    manifest = {**metadata, 'dimensions':list(pixels.shape),
                'spacingMM':nib.affines.voxel_sizes(affine).tolist(), 'affine':affine[:3].reshape(-1).tolist(),
                'labels':{n:{'name':name} for n,name in names.items()}, 'anchors':anchors, 'volumes':[]}
    for filename, title, data, source in zip(('image','labels'),('MRI','Source labels'),(pixels,label_pixels),sources):
        if data is None:
            continue
        output = nib_dir / (filename+'.nii.gz')
        clean = nib.Nifti1Image(data, affine)
        clean.set_sform(affine,code=1)
        clean.set_qform(affine,code=1)
        nib.save(clean,output)
        manifest['volumes'].append({'title':title,'path':'./'+output.as_posix(),'bytes':output.stat().st_size,
                                    'sha256':digest(output),'sourceFile':source[0],'sourceSha256':digest(source[1])})
    axis = 0 if key == 'lumbar' else 2
    sample = np.take(pixels, preview_point[axis],axis=axis).T[::-1]
    maximum = max(1,np.percentile(sample[sample>0],98))
    preview = Image.fromarray(np.uint8(np.clip(sample/maximum*255,0,255)))
    preview.thumbnail((500,350))
    preview.save(nib_dir/'preview.webp',quality=85)
    (nib_dir/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')


def main(s):
    t2 = s/'iac.nii.gz'
    mask = s/'iac-mask.nii.gz'
    write_pack('iac',{
        'id':'tcia-iac-t2-v1','source':'https://doi.org/10.7937/TCIA.9YTJ-5Q73',
        'collection':'https://www.cancerimagingarchive.net/collection/vestibular-schwannoma-seg/',
        'mirror':'https://huggingface.co/datasets/MedOtter/Vestibular-Schwannoma-SEG/tree/1f92bbfee37b098d9c7b2ac7dbfd0a124421dae9',
        'license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/',
        'attribution':'Shapey et al., Vestibular-Schwannoma-SEG, The Cancer Imaging Archive; NIfTI conversion distributed by MedOtter.',
        'region':'IAC and cerebellopontine angle, vestibular schwannoma case',
        'sequence':'High-resolution axial 3D T2 CISS (TCIA protocol t2_ci3d_tra_1.5mm_v1)',
        'orientation':'RAS+ native voxel grid; axial acquisition, orthogonal reformats.',
        'processing':'Reoriented original NIfTI and source RTSTRUCT-derived labels by axis flips; retained full field of view. No interpolation.',
        'labelsNote':'The original segmentation identifies the vestibular schwannoma and one contoured cochlea. No nerve branches or normal bilateral structures are segmented. Graded quizzes are disabled pending independent anatomical review.'},
        nib.load(t2),nib.load(mask),{1:'Vestibular schwannoma',2:'Source-contoured cochlea'},
        [('dataset/vs_gk_001/t2/image.nii.gz',t2),('dataset/vs_gk_001/t2/mask.nii.gz',mask)])
    mr, labels=s/'spider.mha',s/'masks.mha'
    lumbar_image=read_metaimage(mr)
    lumbar_mask=read_metaimage(labels)
    vertebrae={1:'Lowest lumbar vertebra (source numbering)'}
    vertebrae.update({i:f'Vertebra {i} from the bottom (source numbering)' for i in range(2,8)})
    vertebrae[100]='Spinal canal'
    vertebrae.update({i:f'Intervertebral disc {i-200} from the bottom (source numbering)' for i in range(201,208)})
    write_pack('lumbar',{
        'id':'spider-lumbar-space-v1','source':'https://zenodo.org/records/10159290',
        'collection':'https://spider.grand-challenge.org/data/',
        'license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/',
        'attribution':'Van der Graaf, van Hooff, Buckens et al., SPIDER lumbar spine MRI and segmentation dataset.',
        'region':'Lumbar spine and adjacent imaged anatomy',
        'sequence':'Sagittal 3D T2 SPACE',
        'orientation':'RAS+ native voxel grid; sagittal acquisition, orthogonal reformats.',
        'processing':'Converted MetaImage from LPS to RAS and cropped the native grid around all source labels with margins. No labels removed and no interpolation.',
        'labelsNote':'Indices follow the publisher’s bottom-up numbering. The lowest lumbar vertebra is not automatically L5. No graded questions are enabled pending independent review.'},
        lumbar_image,lumbar_mask,vertebrae,[('images/107_t2_SPACE.mha',mr),('masks/107_t2_SPACE.mha',labels)],
        crop_margin=(30,38,34))
    mr, labels=s/'prostate.nii.gz',s/'prostate-mask.nii.gz'
    source=nib.load(mr)
    write_pack('prostate',{
        'id':'msd-prostate-t2-v1','source':'https://medicaldecathlon.com/',
        'publication':'https://doi.org/10.1038/s41467-022-30695-9',
        'mirror':'https://huggingface.co/datasets/MedOtter/msd-prostate/tree/a29c87536488bb64cd4be2a1da74b823c1cc83fa',
        'license':'CC BY-SA 4.0','licenseUrl':'https://creativecommons.org/licenses/by-sa/4.0/',
        'attribution':'Medical Segmentation Decathlon Task05 Prostate, Radboud University Medical Center contributors.',
        'region':'Prostate and adjacent acquired pelvic anatomy',
        'sequence':'Oblique axial T2-weighted, source channel 0',
        'orientation':'Near-RAS native oblique grid; other planes are voxel-plane reformats. Limited through-plane resolution.',
        'processing':'Extracted the complete T2 channel from the paired T2/ADC source volume and retained its native voxel grid. No interpolation.',
        'labelsNote':'Source-provided peripheral and transition zones. Limited to this acquisition; this is not a complete pelvic or multiparametric exam. Graded quizzes are disabled pending independent anatomical review.'},
        nib.Nifti1Image(np.asarray(source.dataobj)[...,0],source.affine),nib.load(labels),
        {1:'Peripheral zone',2:'Transition zone'},[('imagesTr/prostate_00.nii.gz',mr),('labelsTr/prostate_00.nii.gz',labels)])


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_dir',type=Path)
    main(parser.parse_args().source_dir)
