import sys
import pypdf

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

r = pypdf.PdfReader(r"C:\HospitalManagementSystem\team2 (1).pdf")
print("PAGES:", len(r.pages))
for i, p in enumerate(r.pages):
    print(f"--- PAGE {i+1} ---")
    print(p.extract_text())

