# MRI Study Lab progress

## Verified in this milestone

- The CerebrA brain pack uses the publisher’s symmetric population-average T1 MRI and 102 anatomical label IDs. Both volumes share a 1 mm RAS+ grid. Automated checks compare affine matrices, file checksums, all label lookup points, and thalamic laterality.
- The atlas supports linked axial, coronal, and sagittal slices, orientation markers, interactive overlays, search, identification practice, per-label notes, and pointer and Pencil strokes saved by slice. Eight structure groups have educational reference cards.
- Combined study backup reads the original browser storage keys. Restore merges notebook entries, quiz history, scan notes, and atlas drawings. It accepts legacy notebook and scan-note JSON files. Tests cover repeated imports, conflicts, and rollback after a failed write.
- The versioned offline shell includes the main app, sequence library, and atlas interface. The selected atlas pack is stored separately. Chromium and WebKit automated checks exercise navigation with the origin unavailable. Physical iPad Home Screen and Apple Pencil behavior still need confirmation.

- The Physics Sandbox includes live T1 recovery, T2 and T2* decay plots, an idealized spin-echo signal estimate, and proton Larmor frequency. Automated checks verify the mathematical relationships.

## Coverage

| Region | Image coverage |
| --- | --- |
| Brain | Partial. Symmetric T1 population average with CerebrA labels. Separate existing T1, T2, PD, and MRA examples. No complete diagnostic exam packs. |
| Cervical and upper thoracic spine | 3 T T1 pack with 12 manually placed point landmarks. The overlay shows landmarks rather than segmented volumes. Coverage extends to the T4–T5 landmark. |
| Knee | One preprocessed 3D DESS example with femur and femoral cartilage labels. |
| Lumbar spine, shoulder | Schematic planning practice. No bundled real-image packs. |
| Lower thoracic spine, neck, elbow, wrist, hand, hip, ankle, foot | No verified bundled image packs. |
| Cardiac | Cropped 3D left-atrial MRI and mask from Medical Segmentation Decathlon Task02. |
| Chest, abdomen, pelvis, breast, vascular, fetal, and other specialized exams | No verified bundled image packs. |

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
- Add notebook tags, bookmarks, recall exercises, and persistent volume management. Study backups include the saved IndexedDB protocol reference snapshot. Downloaded atlas packs remain separate.
- Extend browser automation to backup import and multi-tab use. Verify physical iPad Safari, Home Screen installation, and real Apple Pencil input.

## Real MRI planning

The Slice Planner loads brain, cervical spine and knee localizers from the original bundled MRI volumes. Orthogonal views share a cursor. The prescription uses millimetres from the affine for stack translation, gap, thickness, FOV and saturation slab placement. Angulation is single-axis. Lumbar spine and shoulder use the labeled schematic fallback. The Protocol Builder remains a separate exercise.

## Study Center

- Organ systems covers all 11 with one representative structure per system, original schematic illustrations, educational descriptions and personal notes. Brain, knee and cardiovascular sections link to real MRI. Broader structure coverage and more body-region images remain open.
- The Artifact Simulator displays synthetic teaching examples for motion ghosts, phase wrap and chemical shift. The positioning, recognition, pathology, safety and clinical rotation modules are educational decision exercises. Sequence recognition currently uses text cues, and the virtual rotation guides one brain exam with feedback and a link to hands-on planning.
- The mastery dashboard reports independent accuracy and assisted attempts separately. Training results and organ notes use the existing study-backup format.

The [CHAOS training release](https://doi.org/10.5281/zenodo.3431873) is a candidate for abdominal MRI. Its T1 dual-echo and T2 SPIR DICOM series have liver, kidney and spleen masks. A deployable example still needs an individual series and mask alignment check.
