import os
import glob
import requests
from PIL import Image

DIAGRAMS_DIR = os.path.dirname(os.path.abspath(__file__))

def render_all():
    puml_files = sorted(glob.glob(os.path.join(DIAGRAMS_DIR, "*.puml")))
    if not puml_files:
        print("No .puml files found!")
        return

    for puml_path in puml_files:
        base = os.path.splitext(puml_path)[0]
        name = os.path.basename(base)
        with open(puml_path, "r", encoding="utf-8") as f:
            source = f.read()

        # Render PNG
        png_path = base + ".png"
        r_png = requests.post(
            "https://kroki.io/plantuml/png",
            data=source.encode("utf-8"),
            headers={"Content-Type": "text/plain"},
            timeout=30,
        )
        if r_png.status_code != 200:
            print(f"[ERROR] {name}.png HTTP {r_png.status_code}: {r_png.text[:300]}")
            continue

        with open(png_path, "wb") as f:
            f.write(r_png.content)

        # Render SVG
        svg_path = base + ".svg"
        r_svg = requests.post(
            "https://kroki.io/plantuml/svg",
            data=source.encode("utf-8"),
            headers={"Content-Type": "text/plain"},
            timeout=30,
        )
        if r_svg.status_code == 200:
            with open(svg_path, "wb") as f:
                f.write(r_svg.content)
        else:
            print(f"[WARN] {name}.svg HTTP {r_svg.status_code}")

        # Verify PNG image
        with Image.open(png_path) as im:
            w, h = im.size
            fmt = im.format
        print(f"[OK] {name}: PNG={w}x{h} ({fmt}, {len(r_png.content)} bytes), SVG={len(r_svg.content)} bytes")

if __name__ == "__main__":
    render_all()
