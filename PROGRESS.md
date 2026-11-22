# MRI Study Lab progress

## Verified in this milestone

- The CerebrA brain pack uses the publisher’s symmetric population-average T1 MRI and 102 anatomical label IDs. Both volumes share a 1 mm RAS+ grid. Automated checks compare affine matrices, file checksums, all label lookup points, and thalamic laterality.
- The atlas supports linked axial, coronal, and sagittal slices, orientation markers, interactive overlays, search, identification practice, per-label notes, and pointer and Pencil strokes saved by slice. Eight structure groups have educational reference cards.
- Combined study backup reads the original browser storage keys. Restore merges notebook entries, quiz history, scan notes, and atlas drawings. It accepts legacy notebook and scan-note JSON files. Tests cover repeated imports, conflicts, and rollback after a failed write.
- The versioned offline shell includes the main app, sequence library, and atlas interface. The selected atlas pack is stored separately. Browser-level offline and Safari behavior need confirmation.

- The Physics Sandbox includes live T1 recovery, T2 and T2* decay plots, an idealized spin-echo signal estimate, and proton Larmor frequency. Automated checks verify the mathematical relationships.

## Coverage

| Region | Image coverage |
| --- | --- |
| Brain | Partial. Symmetric T1 population average with CerebrA labels. Separate existing T1, T2, PD, and MRA examples. No complete diagnostic exam packs. |
| Cervical and lumbar spine, knee, shoulder | Schematic planning practice. No bundled real-image packs. |
| Thoracic spine, neck, elbow, wrist, hand, hip, ankle, foot | No verified bundled image packs. |
| Chest, abdomen, pelvis, cardiac, breast, vascular, fetal, and other specialized exams | No verified bundled image packs. |

The brain pack documents file provenance in [atlas/manifest.json](atlas/manifest.json). It contains a population average. The original sequence examples remain downloads from the separately licensed [NiiVue demo collection](https://github.com/niivue/niivue-demo-images#licenses). Each uses its native voxel axes without verified patient orientation.

## Imaging library assessment

| Library | Fit for the next milestone |
| --- | --- |
| NiiVue | Browser-first NIfTI and overlays. Evaluate its WebGL2 renderer for general affine orientation, pan and zoom, and measurements on iPad before replacing the existing viewer. |
| Cornerstone3D | Candidate for DICOM stack, volume, tools, and compressed transfer-syntax support. Verify codec workers, offline packaging, and iPad resource use before integrating. |
| dicomParser | Useful for DICOM metadata and byte parsing. Pair with codecs and a renderer for compressed pixels and display. |
| OHIF | Full viewer platform suited to DICOMweb workflows. A broader integration than the current static app needs for local learning packs. |
| Papaya | A possible NIfTI viewer fallback. Compare its touch controls, segmentation picking, and offline distribution with NiiVue. |

The current milestone reuses the scalar NIfTI-1 parser shared with the existing library. The atlas explicitly checks for its supported axis-aligned RAS+ grid. The existing DICOM preview supports a subset of uncompressed monochrome inputs. Compressed DICOM, general affine orientation and segmentation imports, persistent imported volumes, measurements, and pan and zoom remain open.

## Remaining development

- Verify distribution terms, de-identification, image provenance, and label geometry per pack. Continue with spine, musculoskeletal, body, cardiac, vascular, and specialized MRI.
- Extend anatomy reference cards across the full label set. Add study targets, Pencil pressure and structure-linked ink, and anatomy mastery views.
- Build real-localizer protocol simulations with sequence parameters, positioning, coils, procedure challenges, and cited educational feedback. The existing simulator has schematic planning challenges and local reference image/DICOM preview.
- Extend the existing physics sandbox into sequence, encoding, k-space, contrast, artifact, and safety simulations.
- Expand identification practice into the memory arcade and spaced repetition. Replace the eight-question pre-study bank with original, cited ARRT and ARMRIT-aligned coverage, timed exams, review, and adaptive difficulty.
- Add notebook tags, bookmarks, recall exercises, and persistent volume management. Current study backups exclude image downloads and the saved IndexedDB reference snapshot.
- Add browser automation for offline return visits, note migration, atlas editing, and mobile navigation. Verify Safari, installed iPad behavior, and real Apple Pencil input.
