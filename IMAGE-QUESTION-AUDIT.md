# Registry image audit

Reviewed 2026-11-23. Scope includes every image question in the deployed Registry and Continuous Practice banks, including supplemental cardiac items. The standalone Atlas uses its existing mask-based picking and validated illustration hotspots.

| Outcome | Count | IDs |
| --- | ---: | --- |
| Previously active questions audited | 21 | n01–n15, m01–m04, x01–x02 |
| Marker repair and source re-verification | 16 | n01–n13, m01, m02, x01 |
| Unmarked questions passing review | 5 | n14, n15, m03, m04, x02 |
| New verified knee questions | 3 | le-k-img01–03 |
| Temporarily disabled | 0 | Empty exclusion list in `registry-image-view.js` |
| Pending independent clinical review | 24 | Entire image bank. Source alignment and editorial review do not establish independent clinical verification. |

For each image the generated registry records the file hash, source volume, plane, sequence, voxel, source label and expected answer. Marked items use a clean raster and draw the indicator at source-pixel coordinates through a separate canvas. The initial fit keeps the complete slice and marker within the visible question pane. The reported spine question and adjacent cases use the sagittal T1 stack, and the visible arrow tip follows the published C2–C3, C4–C5, C7–T1 or T3–T4 point label. Older snapshots retain their IDs and existing scoring.

Registered indicators include arrows, numbered leaders, dot leaders, outlined hotspots, and outlines derived from a source segmentation. The outline case traces the femoral cartilage mask boundary. The new two-plane comparison pairs the same source volume in orthogonal reformats. Study prompts show neutral indicators. The final visual hint and answer review change marker emphasis to yellow.

Checksums, integer source label lookups, geometry, expected keys, endpoint bounds, loaded image dimensions, contrasting strokes, and overlay-to-image alignment are tested. New question pools preflight image loads and reject missing or unverified assets. Existing timed sessions retain their deadlines and saved questions. An image load error in an already saved session is shown in place so learners can move to another question. Source NIfTI volumes, previous attempt history and backup data are untouched.

## 2026-11-24 re-audit

- The current 24 registry visual items retain their published source registration. Automated tests rechecked label lookup, affine geometry, source hashes, expected answers and marker endpoints against all four MRI packs. The browser suite exercises the sagittal disc-level overlay under zoom and resize. No deployed question required a new marker or suspension.
- Pool validation now rejects text prompts that explicitly depend on a missing image or arrow, and visual records missing a license URL or checksum. Preflight compares decoded dimensions for each item even when several items reference the same source raster.
- The three Atlas identification plate assets remain subject to the existing unlabeled-image allowlist, file hash checks and hotspot bounds. The 24 registry items still await independent clinical review.

## Dataset decisions

- [Vestibular-Schwannoma-SEG](https://www.cancerimagingarchive.net/collection/vestibular-schwannoma-seg/) offers high-resolution T2-weighted and postcontrast T1 MRI under CC BY 4.0. The published annotations support the tumor use case. Individual normal nerve branches and labyrinth landmarks still need independent annotation before use for atlas grading.
- [Krupa and Bekiesińska-Figatowska, Figure 1](https://pmc.ncbi.nlm.nih.gov/articles/PMC4340093/figure/f1-poljradiol-80-93/) is an attributed noncommercial teaching figure for spinal truncation. The figure is displayed in its original form. The caption leaves the sequence unspecified.

| Candidate | Decision |
| --- | --- |
| [pyKNEEr](https://doi.org/10.5281/zenodo.3820248) | Existing downloadable knee atlas. CC BY-NC-SA 4.0, two labels covering femur and femoral cartilage. Three new questions use these published masks. |
| [Stanford SKM-TEA](https://github.com/StanfordMIMI/skm-tea/blob/main/DATASET.md) | Promising segmentation source with meniscus and additional cartilage masks. The annotation and paired-image distribution paths differ. Download, confirm image redistribution terms and review cases before including slices. |
| [KneeMRI](https://zenodo.org/records/14789903) | CC BY-NC-ND 4.0 and condition labels. Excluded from the derivative marker/reformat pipeline. |
| [13-class knee MRI paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC9847207/) | Study reports ACL, PCL, meniscus and other masks. A redistributable paired image/mask release has not been verified. |
| [MyoSegmenTUM](https://osf.io/svwa7/) | Promising thigh muscle masks of four groups. The original OSF project and file API returned HTTP 401 during inspection. The linked article license alone does not verify redistribution terms for the volume files. |
| [Hip labrum and cartilage studies](https://pmc.ncbi.nlm.nih.gov/articles/PMC11805980/) | Code and article are accessible. Raw source volumes with compatible reuse terms and matching manually verified masks are still needed. |
| Ankle, lower leg, foot | No paired redistributable clinical MRI and confirmed source landmarks integrated. These regions use text and protocol practice. |
