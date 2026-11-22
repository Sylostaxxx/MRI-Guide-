"""Build the unlabeled quiz plate by removing the publisher's independent Labels group."""
import argparse
import hashlib
from pathlib import Path
import subprocess
import tempfile
from xml.dom import minidom

from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument("svg", type=Path)
parser.add_argument("webp", type=Path)
args = parser.parse_args()
source = args.svg.read_bytes()
if hashlib.sha256(source).hexdigest() != (
    "4b62e9aa1d0e6b7f598c2d2222b4471d8996443da9a5c0884ac884a1329480aa"
):
    raise SystemExit("Unexpected source SVG revision.")
document = minidom.parseString(source)
layers = {
    item.getAttribute("inkscape:label"): item
    for item in document.documentElement.childNodes
    if item.nodeType == item.ELEMENT_NODE and item.hasAttribute("inkscape:label")
}
if set(layers) != {"Back", "Main", "New", "Labels"}:
    raise SystemExit("Unexpected SVG layer layout.")
node = layers["Labels"]
if node.getAttribute("id") != "layer2" or len(node.getElementsByTagName("text")) != 9:
    raise SystemExit("Unexpected label artwork.")
node.parentNode.removeChild(node)
if document.getElementsByTagName("text"):
    raise SystemExit("Text remains in the quiz artwork.")
with tempfile.TemporaryDirectory() as directory:
    svg = Path(directory, "brain.svg")
    png = Path(directory, "brain.png")
    svg.write_bytes(document.toxml(encoding="UTF-8"))
    subprocess.run(["inkscape", str(svg), "--export-width=650",
                    f"--export-filename={png}"], check=True)
    with Image.open(png) as image:
        image.save(args.webp, "WEBP", lossless=True)
