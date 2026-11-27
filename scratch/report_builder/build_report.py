"""2-Pass PDF Builder for Hospital Management System EDI Mini-Project Report.

1. Renders HTML (pages 5+) to PDF via headless Chrome/Edge with US Letter @page.
2. Extracts exact page numbers for Contents, List of Figures, and List of Tables.
3. Re-renders HTML with exact page numbers substituted.
4. Stamps the exact 2.16pt black page border and bottom-right Times-Roman 12pt
   page numbers (starting at 5) matching `project report 1 EDI_IT.pdf`.
5. Merges pages 1-4 of `project report 1 EDI_IT.pdf` verbatim with stamped pages 5+
   into `c:\\HospitalManagementSystem\\Hospital_Management_System_Report.pdf`.
"""

import io
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Callable

from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    DecodedStreamObject,
    DictionaryObject,
    NameObject,
)

ROOT = Path(r"c:\HospitalManagementSystem")
TEMPLATE_PDF = ROOT / "project report 1 EDI_IT.pdf"
BUILDER_DIR = ROOT / "scratch" / "report_builder"
OUTPUT_PDF = ROOT / "Hospital_Management_System_Report.pdf"

CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
]


def find_browser() -> str:
    for p in CHROME_CANDIDATES:
        if os.path.exists(p):
            return p
    raise FileNotFoundError("Neither Chrome nor Edge found for headless PDF rendering.")


def render_html_to_pdf(html_path: Path, pdf_path: Path, browser: str) -> None:
    url = html_path.resolve().as_uri()
    cmd = [
        browser,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        "--allow-file-access-from-files",
        f"--print-to-pdf={pdf_path.resolve()}",
        url,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if res.returncode != 0 or not pdf_path.exists():
        raise RuntimeError(
            f"Headless PDF render failed (rc={res.returncode}):\n{res.stderr}"
        )


def make_stamp_page(page_num: int, width: float = 612.0, height: float = 792.0):
    """Create a 1-page transparent overlay PDF with exact template border & page number."""
    # Template border in project report 1 EDI_IT.pdf:
    # Outer edge: x in [24, 588.22], y in [23.784, 768.00], thickness 2.16pt
    # Stroke centered at (25.08, 24.864) with width=562.06, height=742.056
    label = str(page_num)
    # Approximate right-alignment matching template (535.39 for 1-2 digits around x~547)
    x_pos = 547.0 - (len(label) * 6.0)
    y_pos = 51.864

    stream_cmds = (
        "q\n"
        "0 0 0 RG\n"
        "2.16 w\n"
        "25.08 24.864 562.06 742.056 re S\n"
        "Q\n"
        "BT\n"
        "/F_PG 12 Tf\n"
        "0 0 0 rg\n"
        f"1 0 0 1 {x_pos:.2f} {y_pos:.3f} Tm\n"
        f"({label}) Tj\n"
        "ET\n"
    ).encode("latin1")

    writer = PdfWriter()
    page = writer.add_blank_page(width=width, height=height)

    font_dict = DictionaryObject(
        {
            NameObject("/Type"): NameObject("/Font"),
            NameObject("/Subtype"): NameObject("/Type1"),
            NameObject("/BaseFont"): NameObject("/Times-Roman"),
        }
    )
    font_ref = writer._add_object(font_dict)

    resources = DictionaryObject(
        {
            NameObject("/Font"): DictionaryObject({NameObject("/F_PG"): font_ref}),
        }
    )
    page[NameObject("/Resources")] = resources

    stream = DecodedStreamObject()
    stream.set_data(stream_cmds)
    stream_ref = writer._add_object(stream)
    page[NameObject("/Contents")] = stream_ref

    buf = io.BytesIO()
    writer.write(buf)
    buf.seek(0)
    return PdfReader(buf).pages[0]


def normalize_ws(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def find_page_numbers(
    body_pdf: Path,
    toc_targets: list[tuple[str, str]],
    fig_targets: list[tuple[str, str]],
    tbl_targets: list[tuple[str, str]],
) -> tuple[dict[str, int], dict[str, int], dict[str, int]]:
    """Scan rendered body PDF (starting at page 5) and locate exact page numbers."""
    reader = PdfReader(str(body_pdf))
    page_texts: list[tuple[int, str]] = []
    for idx, page in enumerate(reader.pages):
        actual_page = 5 + idx
        txt = normalize_ws(page.extract_text() or "")
        page_texts.append((actual_page, txt))

    # Front matter pages appear before Chapter 1; body sections appear at/after Chapter 1.
    # Detect first page containing "Chapter 1 INTRODUCTION" (case-insensitive).
    ch1_page = 10
    for pg, txt in page_texts:
        if "Chapter 1" in txt and "INTRODUCTION" in txt.upper():
            ch1_page = pg
            break

    toc_pages: dict[str, int] = {
        "scope": 2,
        "certificate": 3,
        "acknowledgement": 4,
    }
    for key, needle in toc_targets:
        n_norm = normalize_ws(needle)
        min_pg = 5 if key in {"lof", "lot", "loa"} else ch1_page
        found = min_pg
        for pg, txt in page_texts:
            if pg >= min_pg and n_norm in txt:
                found = pg
                break
        toc_pages[key] = found

    fig_pages: dict[str, int] = {}
    for key, needle in fig_targets:
        n_norm = normalize_ws(needle)
        found = ch1_page
        for pg, txt in page_texts:
            if pg >= ch1_page and n_norm in txt:
                found = pg
                break
        fig_pages[key] = found

    tbl_pages: dict[str, int] = {}
    for key, needle in tbl_targets:
        n_norm = normalize_ws(needle)
        found = ch1_page
        for pg, txt in page_texts:
            if pg >= ch1_page and n_norm in txt:
                found = pg
                break
        tbl_pages[key] = found

    return toc_pages, fig_pages, tbl_pages


def build_pdf(
    render_html_fn: Callable[[dict[str, int], dict[str, int], dict[str, int]], str],
    toc_targets: list[tuple[str, str]],
    fig_targets: list[tuple[str, str]],
    tbl_targets: list[tuple[str, str]],
    output_pdf: Path = OUTPUT_PDF,
) -> dict:
    browser = find_browser()
    pass1_html = BUILDER_DIR / "_pass1.html"
    pass1_pdf = BUILDER_DIR / "_pass1.pdf"
    final_html = BUILDER_DIR / "report.html"
    body_pdf = BUILDER_DIR / "_body.pdf"

    # Pass 1: placeholder page numbers
    dummy_toc = {k: 99 for k, _ in toc_targets}
    dummy_toc.update({"scope": 2, "certificate": 3, "acknowledgement": 4})
    dummy_fig = {k: 99 for k, _ in fig_targets}
    dummy_tbl = {k: 99 for k, _ in tbl_targets}

    pass1_html.write_text(render_html_fn(dummy_toc, dummy_fig, dummy_tbl), encoding="utf-8")
    render_html_to_pdf(pass1_html, pass1_pdf, browser)

    toc_pages, fig_pages, tbl_pages = find_page_numbers(
        pass1_pdf, toc_targets, fig_targets, tbl_targets
    )

    # Pass 2: exact page numbers
    final_html.write_text(render_html_fn(toc_pages, fig_pages, tbl_pages), encoding="utf-8")
    render_html_to_pdf(final_html, body_pdf, browser)

    # Re-verify page numbers after Pass 2 (in case 1-digit vs 2-digit shifted anything)
    toc_pages2, fig_pages2, tbl_pages2 = find_page_numbers(
        body_pdf, toc_targets, fig_targets, tbl_targets
    )
    if (toc_pages2, fig_pages2, tbl_pages2) != (toc_pages, fig_pages, tbl_pages):
        final_html.write_text(render_html_fn(toc_pages2, fig_pages2, tbl_pages2), encoding="utf-8")
        render_html_to_pdf(final_html, body_pdf, browser)
        toc_pages, fig_pages, tbl_pages = toc_pages2, fig_pages2, tbl_pages2

    # Merge pages 1-4 of template PDF + stamped body pages (5+)
    tpl_reader = PdfReader(str(TEMPLATE_PDF))
    body_reader = PdfReader(str(body_pdf))
    writer = PdfWriter()

    for i in range(4):
        writer.add_page(tpl_reader.pages[i])

    for idx, page in enumerate(body_reader.pages):
        pg_num = 5 + idx
        stamp = make_stamp_page(pg_num)
        page.merge_page(stamp)
        writer.add_page(page)

    with open(output_pdf, "wb") as f:
        writer.write(f)

    return {
        "output_pdf": str(output_pdf),
        "total_pages": len(writer.pages),
        "toc_pages": toc_pages,
        "fig_pages": fig_pages,
        "tbl_pages": tbl_pages,
    }


if __name__ == "__main__":
    # Smoke test with minimal sample HTML
    def _sample(toc_p, fig_p, tbl_p):
        css = (BUILDER_DIR / "report.css").read_text(encoding="utf-8")
        return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>{css}</style></head><body>
<div class="front-title">CONTENTS</div>
<table class="toc-table">
<tr><th>Section</th><th>Title</th><th>Page</th></tr>
<tr class="toc-chapter-row"><td class="sec-col">1</td><td class="title-col">INTRODUCTION</td><td class="page-col">{toc_p.get('ch1', '')}</td></tr>
</table>
<div class="page-break"></div><div class="front-title">LIST OF FIGURES</div>
<div class="page-break"></div><div class="front-title">LIST OF TABLES</div>
<div class="page-break"></div><div class="front-title">LIST OF ABBREVIATIONS</div>
<div class="chapter-start"><div class="chapter-header"><div class="chapter-num">Chapter 1</div><div class="chapter-name">INTRODUCTION</div></div>
<h2 class="sec-heading">1.1 Introduction to Hospital Management System</h2><p>Smoke test body.</p></div>
</body></html>"""

    res = build_pdf(
        _sample,
        toc_targets=[("ch1", "Chapter 1 INTRODUCTION")],
        fig_targets=[],
        tbl_targets=[],
        output_pdf=BUILDER_DIR / "_smoke.pdf",
    )
    print("Smoke test OK:", res)
    for fn in ["_pass1.html", "_pass1.pdf", "_body.pdf", "report.html", "_smoke.pdf"]:
        p = BUILDER_DIR / fn
        if p.exists():
            p.unlink()
