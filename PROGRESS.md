# MRI Study Lab progress

## Artifact Academy and image re-audit

- Physics now opens the expanded Artifact Academy at the existing simulator route. Twelve lessons cover motion, sampling, field and tissue effects, RF hardware, EPI and TOF. Each links to an existing Physics Academy chapter and an original troubleshooting scenario with progressive hints and answer rationales.
- The 12 new text cases use the shared practice engine, bringing the eligible continuous-practice bank to 346 items. The artifact expansion target is 150 new questions and 50 licensed real-image examples. This increment contributes zero clinical artifact images and leaves the timed exam banks unchanged.
- Motion, phase wrap and type 1 chemical shift have side-by-side synthetic comparisons. The 3 T chemical-shift model converts a 440 Hz fat–water offset to pixels using receiver bandwidth. The other two phantoms are qualitative.
- Rechecked 24 visual questions, including the previously reported disc-level marker, and the three allowlisted Atlas plates. Added missing-image and attribution guards. Independent clinical review remains pending.
- Updated the coverage inventory to reflect the existing upper- and lower-limb illustrations and eight hand/wrist questions. The lower-extremity bank remains 71 of 300, with seven knee MRI items. Dedicated IAC/CPA, MRV and sinus datasets and questions, other lower-extremity MRI, larger artifact curriculum, and end-to-end troubleshooting with clinical cases remain open.

## Study Center variety and body-region browsing

- Sequence Recognition now uses the continuous practice engine. The old link opens a 47-question deck with 12 new sequence questions. The focused session saves separately and gives every eligible item a turn before cycling.
- Added 6 hand and wrist questions and 6 long-bone questions, for 24 new study-only items overall. The continuous practice bank has 334 eligible items. The scored registry blueprint and mock forms use their existing bank.
- Anatomy Explorer now indexes 26 regions or structure groups and distinguishes real MRI, illustrated references, and text coverage. Hand and long-bone sections include organized anatomical subdivisions and seven attributed OpenStax plates across the body index. Hand and wrist MRI remain unavailable, and long-bone illustrations cover bones that lack verified MRI packs.

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

The current milestone reuses the scalar NIfTI-1 parser shared with the existing library. The atlas explicitly checks for its supported axis-aligned RAS+ grid. The existing DICOM preview supports a subset of uncompressed monochrome inputs. Compressed DICOM, general affine orientation and segmentation imports, persistent imported volumes and measurements remain open. Zoom and pan are available in the atlas.

## Remaining development

- Verify distribution terms, de-identification, image provenance, and label geometry per pack. Continue with spine, musculoskeletal, body, cardiac, vascular, and specialized MRI.
- Extend anatomy reference cards across the full label set. Add study targets, Pencil pressure and structure-linked ink, and anatomy mastery views.
- Build real-localizer protocol simulations with sequence parameters, positioning, coils, procedure challenges, and cited educational feedback. The existing simulator has schematic planning challenges and local reference image/DICOM preview.
- Extend the existing physics sandbox into sequence, encoding, k-space, contrast, artifact, and safety simulations.
- Expand identification practice into the memory arcade and spaced repetition. Replace the eight-question pre-study bank with original, cited ARRT and ARMRIT-aligned coverage, timed exams, review, and adaptive difficulty.
- Add notebook tags, bookmarks, recall exercises, and persistent volume management. Current study backups exclude image downloads and the saved IndexedDB reference snapshot.
- Extend browser automation to backup import and multi-tab use. Verify physical iPad Safari, Home Screen installation, and real Apple Pencil input.

## Real MRI planning

The Slice Planner loads brain, cervical spine and knee localizers from the original bundled MRI volumes. Orthogonal views share a cursor. The prescription uses millimetres from the affine for stack translation, gap, thickness, FOV and saturation slab placement. Angulation is single-axis. Lumbar spine and shoulder use the labeled schematic fallback. The Protocol Builder remains a separate exercise.

## Study Center

- Organ systems covers all 11 with one representative structure per system, original schematic illustrations, educational descriptions and personal notes. Brain, knee and cardiovascular sections link to real MRI. Broader structure coverage and more body-region images remain open.
- The Artifact Simulator displays synthetic teaching examples for motion ghosts, phase wrap and chemical shift. The positioning, recognition, pathology, safety and clinical rotation modules are educational decision exercises. Sequence recognition currently uses text cues, and the virtual rotation guides one brain exam with feedback and a link to hands-on planning.
- The mastery dashboard reports independent accuracy and assisted attempts separately. Training results and organ notes use the existing study-backup format.

The [CHAOS training release](https://doi.org/10.5281/zenodo.3431873) is a candidate for abdominal MRI. Its T1 dual-echo and T2 SPIR DICOM series have liver, kidney and spleen masks. A deployable example still needs an individual series and mask alignment check.

## Advanced Anatomy Explorer

- Added OpenStax textbook plates for all 11 systems and 22 selectable structures with region and system filters. Source links, licenses and file hashes are in [anatomy-plates.js](anatomy-plates.js). Most plates are from Anatomy and Physiology 2e under CC BY-NC-SA 4.0. The reproductive plate is from the first edition under CC BY 4.0. The bundle retains original callouts and uses WebP delivery.
- The four viewing modes use MRI, textbook plates, licensed brain, knee and cardiac sectional plates, and a side-by-side layout. Curated links open corresponding MRI structures. The MRI volumes and textbook plates use independent coordinate spaces. Illustration points are checked landmarks on specific figures. Aligned illustration layers and registered overlays remain unavailable.
- MRI layer controls use existing pack labels, with color, combined visibility, opacity, isolation and per-pack preferences included in study backup. Cervical labels are point landmarks. Unsupported categories are marked unavailable. Linked slice viewing, window/level, zoom, pan and slice drawings are available.
- MRI practice supports current slices, enabled-layer coverage, individual structures, and optional time limits. Guided illustration exercises support taps and drag-and-drop on three labeled plates. A six-question mixed exam covers the brain, heart and knee and reports assisted answers separately. Broader exam coverage remains open.
- Full-resolution MRI volumes still use the existing downloadable packs and storage keys. Textbook plates are cached with the application shell. Physical iPad and Apple Pencil validation and protocol reference image export remain open.

## MRI-first interface consolidation

- Main navigation has Anatomy, Clinical, Physics, Practice and My Study Space. Settings links to image packs, backups, and offline help. Legacy study tools remain reachable through their section. The home image is an axial T1 from the bundled CerebrA volume.
- A single above-image question panel serves MRI and illustration practice, with progress, persistent hint accounting, retry controls, feedback, and optional MRI structure review. MRI suppresses study overlays and saved ink while a question is active. Yellow hints use the source mask or landmark. Existing visual preferences return on exit.
- Labeled textbook plates remain study references. Illustration questions use a verified unlabeled Wikimedia Commons asset allowlist, currently covering brain, cardiac and knee anatomy. The brain SVG has a separate label layer that can be removed reproducibly without editing its anatomical layers. The mixed quiz covers those three regions. Cervical identification remains available on MRI. Quiz assets are licensed CC BY-SA 4.0 and cached offline.
- Structure links and bookmarks use the original pack and label IDs. Curated organ cards share MRI notes for the exact mapped structure; legacy organ notes remain available in My Study Space. Bookmarks are included in backups. The large MRI packs and existing saved reference images stay in their current storage.
- The five sections organize existing educational activities. A full registry bank and manufacturer-specific console models remain open. Physical iPad and Apple Pencil testing remains open.

## Registry preparation

| Measure | Current release |
| --- | --- |
| Original bank | 232 items. All items have a source, a topic and objective mapping, and explanations for each option. |
| ARRT MRI forms | Exam A has 230 items, including exactly 200 scored across the eight February 2025 categories and 30 simulated pilots. A 115-item half-length form shares items with Exam A. |
| Additional forms | B–E need 920 more eligible items, including 120 pilots, for four non-overlapping forms. Randomized full-length forms also await deeper category pools. The 2,500-item target is in progress. |
| Visual coverage | 21 real MRI items, including 19 eligible for Exam A and two supplemental cardiac items. Images cover brain, cervical and upper thoracic spine, knee, and left atrium. Full anatomical coverage, multi-sequence cases, and real artifact and pathology cases are outstanding. |
| Calculation coverage | 20 formula items with independently recomputed displayed answer keys in automated tests. |
| ARMRIT | Separate official profile and subject filters for single-best-answer practice. Full-length ARMRIT simulation is outstanding. |
| Study and review | Daily warm-up, subject and custom quizzes, image and calculation practice, missed and spaced review, weak-topic practice, per-item timing, session history, and assisted-answer tracking. |
| Sources and review | Every item has a public reference. Visual files include source attribution, licenses, voxel coordinates, and checksums. Independent clinical review and difficulty calibration are outstanding. |
| Offline and storage | Registry questions and reference images are part of the offline shell. Active sessions, answers, flags, and history are stored locally and included in Settings backups. |

## Study Center V2 and Physics Academy

| Milestone | Delivered |
| --- | --- |
| Continuous practice | Optional open-ended practice with eight subjects, four difficulty labels, pause, resume, saved drafts, cumulative session statistics, immediate feedback and linked explanations. The bank cycles once eligible items have been seen. |
| Trouble Questions | IndexedDB attempt log, retained misses, search and filters, focused retries, explanation and MRI links, bookmarks, and notebook integration. Completed legacy registry tutor answers import idempotently. Timed results remain in the registry system. |
| Bank expansion and review | 47 original practice-only items added to the 232-item registry bank, for 279 authored items including 30 pilots. Continuous mode serves 249 eligible items. The 500-item milestone needs 221 additional authored items. Four optional, table-checked Larmor variants are separate from authored counts. No additional full mock forms. Editorial and automated checks are complete for this release. Independent clinical review and difficulty calibration remain open. |
| Physics Academy | First ten chapters plus a K-space chapter. Each has dual explanations, interactive visual, clinical example, pitfalls, glossary terms, authoritative references, external video links, and a five-item quiz drawn from the shared practice bank. Each lesson can be bookmarked, marked complete, and linked to a note. |
| Remaining curriculum | 30 additional assigned chapters, broader visual coverage, and further video curation remain. Current links open the verified publisher pages. Playback is external and requires an internet connection. |
| Analytics and storage | Separate study dashboard with subject accuracy, weak topics, due counts, recent daily performance, streak and independently mastered concepts. Mastery reset leaves the attempt log in place. Version 3 Settings backups include version 1 Study Center data and still import older backups. |

## Navigation and guided study recovery

- The website uses global Back and Forward controls and restores the in-page route for home tools, Practice tabs, clinical activities and guided corrections.
- The home recovery card links to saved practice, tutor, timed exam, Academy reading, pre-study recall, clinical cases, real-MRI identification or verified illustrated identification rounds. Practice drafts, checked answers and hint levels stay with the current question. Timed exams continue to use their saved deadline and expiration policy.
- Study Center and Registry tutor corrections use existing distractor explanations, Academy content, worked calculation steps and verified MRI references where available. Incorrect attempts are already recorded or available to Trouble Questions through the tutor log. The follow-up stays in a separate retry so the original session remains recoverable. Atlas and pre-study mistakes also retain their existing history. The legacy slider challenges still use their built-in feedback.
- Numerical questions and selected conceptual families use progressive hints. 117 of 249 published nonpilot bank items currently have hints, including 36 with three levels. A question without an applicable authored hint has no hint control. Clinical cases and pre-study recall also have their own cues. The MRI and verified illustration quizzes reserve the exact target highlight for the final hint. Assisted credit and highest hint level are recorded even after hints are hidden.

## Image question repair and lower-extremity expansion

- Audited 21 existing image questions. Repaired 16 markers, verified five unmarked questions and added three knee MRI questions. There are 24 active image questions. Every active image question has source geometry, a license, expected key, and a review date. Separate overlays remain aligned on zoom and rotation. Independent clinical review remains pending. The details and candidate dataset decisions are in [the image-question audit](./IMAGE-QUESTION-AUDIT.md).
- The Lower Extremity category contains 71 of the planned 300 questions, including 61 new authored items. Counts by region are hip and pelvis 12/55, thigh 8/25, knee 23/100, lower leg 8/30, ankle 11/55, and foot 9/35. Seven use verified real MRI, all from the knee DESS volume. They include numbered, marker-dot, segmentation-outline and comparative tasks. The existing Atlas offers mask-based tap practice for femur and femoral cartilage.
- Continuous study, missed-item filtering, custom quizzes and short timed regional tests share the current study and registry engines. Existing registry forms retain their source distribution. The in-app library records coverage for 24 body areas and offers six regional anatomy references and 12 educational protocol examples. The knee section opens the existing real-localizer Slice Planner and the downloadable Atlas with notes and supported layers.
- Additional knee masks for ligaments and menisci, verified hip and other leg MRI, image-based pathology examples, dedicated non-knee planning datasets, manufacturer-specific workflows, 229 more lower-extremity questions, and physical iPad testing remain outstanding.
