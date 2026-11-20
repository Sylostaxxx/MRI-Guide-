MRI Study Lab V5 — DICOM Preview PWA

Upload entire folder to HTTPS static hosting (e.g., GitHub Pages). Open in Safari and Add to Home Screen. First launch must be online; offline mode loads after service-worker cache finishes.

DICOM support: uncompressed little-endian grayscale 8-/16-bit DICOM (single-frame or multiframe). Can load multiple slices from one series locally; no server upload. JPEG/JPEG2000/RLE and some enhanced DICOM files are NOT supported yet. DICOM series is session-only; save a single slice snapshot if desired.

Local note data lives in browser localStorage and snapshot in IndexedDB. Export notes regularly; JSON backups do not include images or entire DICOM series. Never import identifiable patient data.

The protocol overlays and physics calculations are educational approximations, not clinical prescriptions.
