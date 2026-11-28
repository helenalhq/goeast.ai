"""QA the downloadable fictional assets. Run: python scripts/verify-arrival-sample-packs.py"""
import json
from pathlib import Path
from PIL import Image
from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
packs = json.loads((root / 'lib/arrival-sample-packs.json').read_text())
for key, case in packs["cases"].items():
    pdf = PdfReader(root / "public/samples" / (case["file"] + ".pdf"))
    assert len(pdf.pages) == 4
    text = " ".join(" ".join(page.extract_text().split()) for page in pdf.pages)
    assert case["verdict"] in text and case["finding"] in text
    assert packs["hotel"]["phone"] in text and packs["checked"] in text
    assert "not a real booking" in text.lower() and "Recheck before departure" in text
    assert sum(len(page.get("/Annots") or []) for page in pdf.pages) >= len(case["sourceIds"])
    print(f"{key}: 4 pages, route, fallback, hotel, recheck, and linked sources")
img = Image.open(root / 'public/samples/shanghai-driver-card.png')
assert img.size == (900, 1420)
img.verify()
