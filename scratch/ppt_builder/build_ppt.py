"""Build a 14-slide editable PowerPoint presentation for the Hospital Management
System following the exact visual layout and structure of the Review 3 reference deck.

Outputs:
- c:\\HospitalManagementSystem\\Hospital_Management_System_Presentation.pptx
- c:\\HospitalManagementSystem\\Hospital_Management_System_Presentation.pdf (via PowerPoint COM)
- c:\\HospitalManagementSystem\\scratch\\ppt_builder\\slides\\slide_01..14.png (via PowerPoint COM)
"""

import os
from pathlib import Path
from PIL import Image
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt

ROOT = Path(r"c:\HospitalManagementSystem")
PPT_DIR = ROOT / "scratch" / "ppt_builder"
SLIDES_DIR = PPT_DIR / "slides"
DIAG_DIR = ROOT / "scratch" / "diagrams"

OUT_PPTX = ROOT / "Hospital_Management_System_Presentation.pptx"
OUT_PDF = ROOT / "Hospital_Management_System_Presentation.pdf"

LOGO_PATH = PPT_DIR / "mmcoe_logo_padded.png"
ER_IMG = DIAG_DIR / "ppt_er_diagram.png"
UC_IMG = DIAG_DIR / "ppt_use_cases.png"

# Exact palette extracted from Vehicle_Rental_Booking_Portal_Review_2.pptx.pdf
NAVY = RGBColor(0x12, 0x2D, 0x4E)
ROYAL_BLUE = RGBColor(0x1E, 0x5F, 0xA8)
CYAN = RGBColor(0x22, 0xD3, 0xEE)
CYAN_ACCENT = RGBColor(0x06, 0xB6, 0xD4)
LIGHT_BG = RGBColor(0xF7, 0xFA, 0xFC)
CARD_BORDER = RGBColor(0xDA, 0xE4, 0xEE)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
DARK_TEXT = RGBColor(0x1E, 0x29, 0x3B)
BODY_TEXT = RGBColor(0x33, 0x41, 0x55)
MUTED_TEXT = RGBColor(0x5B, 0x6C, 0x80)
SUBTITLE_DARK = RGBColor(0xDC, 0xEB, 0xF8)
LIGHT_MUTED = RGBColor(0x94, 0xA3, 0xB8)
LIGHT_BODY = RGBColor(0xE2, 0xE8, 0xF0)
GREEN = RGBColor(0x15, 0x80, 0x3D)
AMBER = RGBColor(0xD9, 0x77, 0x06)
LINE_GRAY = RGBColor(0xCB, 0xD5, 0xE1)

FONT_FAMILY = "Aptos"
SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)
FOOTER_TEXT = "SOFTWARE ENGINEERING \u2022 EDI \u2022 HOSPITAL MANAGEMENT SYSTEM"


def set_bg(slide, color: RGBColor) -> None:
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_rect(
    slide,
    x: float,
    y: float,
    w: float,
    h: float,
    fill_color: RGBColor,
    line_color: RGBColor | None = None,
    line_pt: float = 1.0,
    rounded: bool = False,
):
    shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE
    shp = slide.shapes.add_shape(shape_type, Inches(x), Inches(y), Inches(w), Inches(h))
    if rounded:
        shp.adjustments[0] = 0.08
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill_color
    if line_color is not None:
        shp.line.color.rgb = line_color
        shp.line.width = Pt(line_pt)
    else:
        shp.line.fill.background()
    shp.shadow.inherit = False
    return shp


def add_textbox(
    slide,
    x: float,
    y: float,
    w: float,
    h: float,
    text: str = "",
    size: float = 12,
    bold: bool = False,
    color: RGBColor = DARK_TEXT,
    align=PP_ALIGN.LEFT,
    valign=MSO_ANCHOR.TOP,
    line_spacing: float = 1.2,
):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = valign
    tf.margin_left = Inches(0.04)
    tf.margin_right = Inches(0.04)
    tf.margin_top = Inches(0.02)
    tf.margin_bottom = Inches(0.02)
    p = tf.paragraphs[0]
    p.alignment = align
    p.line_spacing = line_spacing
    run = p.add_run()
    run.text = text
    run.font.name = FONT_FAMILY
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    return tb


def add_bullets(
    slide,
    x: float,
    y: float,
    w: float,
    h: float,
    items: list[str],
    size: float = 13,
    color: RGBColor = BODY_TEXT,
    space_after: float = 8,
    bullet_char: str = "\u2022 ",
    bold_prefix: bool = False,
):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.04)
    tf.margin_right = Inches(0.04)
    tf.margin_top = Inches(0.02)
    tf.margin_bottom = Inches(0.02)
    for idx, item in enumerate(items):
        p = tf.paragraphs[0] if idx == 0 else tf.add_paragraph()
        p.space_after = Pt(space_after)
        p.line_spacing = 1.22
        if bold_prefix and ":" in item:
            prefix, rest = item.split(":", 1)
            r0 = p.add_run()
            r0.text = f"{bullet_char}{prefix}:"
            r0.font.name = FONT_FAMILY
            r0.font.size = Pt(size)
            r0.font.bold = True
            r0.font.color.rgb = color
            r1 = p.add_run()
            r1.text = rest
            r1.font.name = FONT_FAMILY
            r1.font.size = Pt(size)
            r1.font.bold = False
            r1.font.color.rgb = color
        else:
            r = p.add_run()
            r.text = f"{bullet_char}{item}"
            r.font.name = FONT_FAMILY
            r.font.size = Pt(size)
            r.font.color.rgb = color
    return tb


def add_card(
    slide,
    x: float,
    y: float,
    w: float,
    h: float,
    title: str,
    body: str | list[str],
    accent_color: RGBColor | None = None,
    title_size: float = 15,
    body_size: float = 12,
):
    add_rect(slide, x, y, w, h, WHITE, line_color=CARD_BORDER, line_pt=1.0, rounded=True)
    text_x = x + 0.24
    text_w = w - 0.44
    if accent_color is not None:
        add_rect(slide, x + 0.02, y + 0.08, 0.07, h - 0.16, accent_color)
        text_x = x + 0.26
        text_w = w - 0.46
    add_textbox(
        slide,
        text_x,
        y + 0.18,
        text_w,
        0.36,
        title,
        size=title_size,
        bold=True,
        color=NAVY,
    )
    if isinstance(body, list):
        add_bullets(
            slide,
            text_x,
            y + 0.56,
            text_w,
            h - 0.68,
            body,
            size=body_size,
            color=MUTED_TEXT,
            space_after=4,
            bullet_char="",
        )
    else:
        add_textbox(
            slide,
            text_x,
            y + 0.58,
            text_w,
            h - 0.72,
            body,
            size=body_size,
            bold=False,
            color=MUTED_TEXT,
            line_spacing=1.25,
        )


def add_chrome(slide, title: str, num: int, dark: bool = False) -> None:
    set_bg(slide, NAVY if dark else LIGHT_BG)
    title_col = WHITE if dark else NAVY
    tag_col = WHITE if dark else ROYAL_BLUE
    footer_col = LIGHT_MUTED if dark else MUTED_TEXT
    num_col = LIGHT_BODY if dark else MUTED_TEXT

    add_textbox(slide, 0.58, 0.24, 9.8, 0.56, title, size=25, bold=True, color=title_col)
    add_textbox(
        slide,
        10.95,
        0.32,
        1.80,
        0.35,
        f"REVIEW 3 | {num:02d}",
        size=10,
        bold=True,
        color=tag_col,
        align=PP_ALIGN.RIGHT,
    )
    add_rect(slide, 0.58, 0.86, 12.17, 0.032, CYAN)
    add_textbox(slide, 0.58, 7.12, 9.8, 0.28, FOOTER_TEXT, size=8.5, bold=True, color=footer_col)
    add_textbox(
        slide,
        11.95,
        7.10,
        0.80,
        0.28,
        str(num),
        size=9.5,
        bold=False,
        color=num_col,
        align=PP_ALIGN.RIGHT,
    )


def add_picture_fit(slide, img_path: Path, box_x: float, box_y: float, box_w: float, box_h: float):
    with Image.open(img_path) as im:
        px_w, px_h = im.size
    ratio = px_w / px_h
    box_ratio = box_w / box_h
    if ratio > box_ratio:
        w = box_w
        h = w / ratio
    else:
        h = box_h
        w = h * ratio
    x = box_x + (box_w - w) / 2
    y = box_y + (box_h - h) / 2
    slide.shapes.add_picture(str(img_path), Inches(x), Inches(y), Inches(w), Inches(h))


def build_presentation() -> None:
    for p in (LOGO_PATH, ER_IMG, UC_IMG):
        if not p.exists():
            raise FileNotFoundError(f"Required image missing: {p}")

    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    blank = prs.slide_layouts[6]

    # ------------------------------------------------------------------
    # SLIDE 1: Title Slide (Dark Navy + Royal Blue Bar, MMCOE Logo, NO team/member names)
    # ------------------------------------------------------------------
    s1 = prs.slides.add_slide(blank)
    set_bg(s1, NAVY)
    add_rect(s1, 10.78, 0.0, 2.553, 7.5, ROYAL_BLUE)
    s1.shapes.add_picture(str(LOGO_PATH), Inches(0.22), Inches(0.14), Inches(1.28), Inches(1.28))

    tb_hdr = s1.shapes.add_textbox(Inches(1.62), Inches(0.26), Inches(9.0), Inches(1.22))
    tf_hdr = tb_hdr.text_frame
    tf_hdr.word_wrap = True
    for idx, line in enumerate(
        [
            "Marathwada Mitra Mandal\u2019s College of Engineering (MMCOE)",
            "Karve Nagar, Pune \u2013 411052",
            "Department of Information Technology",
        ]
    ):
        p = tf_hdr.paragraphs[0] if idx == 0 else tf_hdr.add_paragraph()
        p.alignment = PP_ALIGN.CENTER
        p.space_after = Pt(2)
        r = p.add_run()
        r.text = line
        r.font.name = FONT_FAMILY
        r.font.size = Pt(18 if idx == 0 else 16)
        r.font.bold = True
        r.font.color.rgb = WHITE

    add_textbox(s1, 0.72, 2.55, 9.6, 0.75, "Hospital Management System", size=34, bold=True, color=WHITE)
    add_textbox(
        s1,
        0.72,
        3.28,
        9.6,
        0.48,
        "Review 3 \u2014 Implementation & System Design",
        size=18,
        bold=False,
        color=SUBTITLE_DARK,
    )
    add_rect(s1, 0.72, 3.92, 2.2, 0.04, CYAN)
    add_textbox(
        s1,
        0.72,
        5.38,
        9.6,
        0.38,
        "Guide: Jitendra Chavan",
        size=13.5,
        bold=False,
        color=SUBTITLE_DARK,
    )
    add_textbox(
        s1,
        0.72,
        5.76,
        9.6,
        0.38,
        "EDI | Department of Information Technology  \u2022  2026\u201327 SEM-I",
        size=13,
        bold=False,
        color=SUBTITLE_DARK,
    )

    # ------------------------------------------------------------------
    # SLIDE 2: Project Overview (Light)
    # ------------------------------------------------------------------
    s2 = prs.slides.add_slide(blank)
    add_chrome(s2, "Project Overview", 2, dark=False)
    add_textbox(
        s2,
        0.58,
        1.14,
        12.17,
        0.60,
        "A full-stack web platform that unifies patient onboarding, conflict-free appointment scheduling, digital health records, and billing in one system.",
        size=15.5,
        color=DARK_TEXT,
    )
    cards_s2 = [
        (
            "Patient & Staff Portals",
            "Dedicated role-based workspaces for Patients, Doctors, Receptionists, and Administrators with instant role switching and live updates.",
        ),
        (
            "Clinical & Billing Operations",
            "Covers doctor shift & leave management, real-time slot booking, digital prescriptions, diagnostic reports, and automated INR (\u20b9) invoicing.",
        ),
        (
            "Centralized Records",
            "Stores all users, appointments, medical histories, payments, notifications, and audit trails in Neon PostgreSQL via Prisma ORM.",
        ),
    ]
    for i, (ct, cb) in enumerate(cards_s2):
        add_card(s2, 0.58 + i * 4.16, 2.08, 3.85, 1.65, ct, cb, title_size=15, body_size=12)

    add_textbox(s2, 0.58, 4.22, 12.17, 0.36, "Problem addressed", size=15, bold=True, color=NAVY)
    add_bullets(
        s2,
        0.58,
        4.66,
        12.17,
        2.0,
        [
            "Eliminates manual paper registers and disconnected spreadsheets across front desk, doctors, and billing counters.",
            "Prevents simultaneous double-booking of doctor time slots through queued transactions and database-level slot constraints.",
            "Protects sensitive clinical and financial records with strict role-based access control and an immutable audit log.",
        ],
        size=13,
        color=BODY_TEXT,
        space_after=8,
    )

    # ------------------------------------------------------------------
    # SLIDE 3: System Architecture (Light)
    # ------------------------------------------------------------------
    s3 = prs.slides.add_slide(blank)
    add_chrome(s3, "System Architecture", 3, dark=False)
    add_textbox(
        s3,
        0.58,
        1.08,
        12.17,
        0.40,
        "Three-tier Next.js App Router architecture connecting role-based interfaces, server actions, and PostgreSQL",
        size=13.5,
        color=MUTED_TEXT,
    )
    cards_s3 = [
        (
            "1. Frontend",
            [
                "Next.js 15 App Router (src/app/)",
                "React 19 + Tailwind CSS",
                "DashboardShell, Navbar & Modal UI",
                "16 patient, doctor, staff & admin pages",
            ],
        ),
        (
            "2. Backend",
            [
                "Edge middleware.ts JWT guards",
                "11 Server Action modules (src/actions/)",
                "Zod validation, RBAC & FIFO queues",
                "REST health endpoint (/api/health)",
            ],
        ),
        (
            "3. Database",
            [
                "Neon Serverless PostgreSQL",
                "Prisma ORM (src/lib/prisma.ts)",
                "14 normalized models & ACID txns",
                "47 indexes + partial unique slot lock",
            ],
        ),
    ]
    for i, (ct, cb) in enumerate(cards_s3):
        cx = 0.58 + i * 4.28
        add_card(s3, cx, 1.78, 3.60, 2.25, ct, cb, title_size=15.5, body_size=12)
        if i < 2:
            add_rect(s3, cx + 3.62, 2.88, 0.64, 0.025, ROYAL_BLUE)

    add_textbox(
        s3,
        0.58,
        4.85,
        12.17,
        0.45,
        "Request flow: Browser UI \u2192 src/middleware.ts \u2192 Server Actions (Zod + RBAC) \u2192 Prisma Client \u2192 Neon PostgreSQL",
        size=13.5,
        bold=True,
        color=NAVY,
        align=PP_ALIGN.CENTER,
    )
    add_textbox(
        s3,
        0.58,
        5.50,
        12.17,
        0.38,
        "Local development server: http://localhost:3000  (Health check: GET /api/health)",
        size=12,
        color=MUTED_TEXT,
        align=PP_ALIGN.CENTER,
    )

    # ------------------------------------------------------------------
    # SLIDE 4: Technology Stack (Dark)
    # ------------------------------------------------------------------
    s4 = prs.slides.add_slide(blank)
    add_chrome(s4, "Technology Stack", 4, dark=True)
    cards_s4 = [
        ("Frontend", "Next.js 15.1.7 (App Router), React 19, Tailwind CSS 3.4, Lucide Icons, Inter & JetBrains Mono fonts."),
        ("Backend", "Next.js Server Actions (src/actions/*.ts), REST Health API (/api/health), TypeScript 5.7 (strict mode)."),
        ("Database", "Neon Serverless PostgreSQL (pooled & direct URLs), Prisma ORM 6.4.1 (prisma/schema.prisma, seed.ts)."),
        ("Security & Utilities", "jose HS256 JWT (hms_auth_token), bcryptjs password hashing, Zod validation, en-IN INR currency config."),
        ("Architecture & Concurrency", "Custom linked-list FifoQueue<T> request queues (appointmentQueue, billingQueue, notificationQueue) & 7 OOP domain models."),
        ("Development & Tooling", "tsx script runner, Node.js, JSON DB backup/restore CLI (scripts/backup-db.ts, restore-db.ts), Prisma CLI."),
    ]
    for idx, (ct, cb) in enumerate(cards_s4):
        col = idx % 2
        row = idx // 2
        add_card(
            s4,
            0.58 + col * 6.29,
            1.25 + row * 1.85,
            5.88,
            1.52,
            ct,
            cb,
            title_size=15,
            body_size=12,
        )

    # ------------------------------------------------------------------
    # SLIDE 5: Frontend Implementation (Light)
    # ------------------------------------------------------------------
    s5 = prs.slides.add_slide(blank)
    add_chrome(s5, "Frontend Implementation", 5, dark=False)
    add_textbox(
        s5,
        0.58,
        1.08,
        12.17,
        0.38,
        "Responsive healthcare UI built with Next.js App Router, custom Tailwind design tokens, and role-tailored portals.",
        size=13.5,
        color=MUTED_TEXT,
    )
    cards_s5 = [
        (
            "User Interface",
            "Root layout (src/app/layout.tsx), design tokens (src/app/globals.css), and workspace frame (DashboardShell.tsx).",
            ROYAL_BLUE,
        ),
        (
            "Shared Components & State",
            "Role-aware Navbar.tsx, 20s-polling NotificationBell.tsx, accessible Modal.tsx, and quick-test DemoSwitcher.tsx.",
            CYAN_ACCENT,
        ),
        (
            "App Router Pages & Flows",
            "16 pages covering /login, /register, 4 role dashboards, /appointments/book, /medical-records, /billing, /reports & /admin/audit.",
            GREEN,
        ),
    ]
    for i, (ct, cb, ac) in enumerate(cards_s5):
        add_card(s5, 0.58 + i * 4.16, 1.72, 3.85, 1.75, ct, cb, accent_color=ac, title_size=14.5, body_size=11.5)

    add_textbox(
        s5,
        0.58,
        3.95,
        12.17,
        0.36,
        "Frontend capabilities visible in the codebase",
        size=15,
        bold=True,
        color=NAVY,
    )
    add_bullets(
        s5,
        0.58,
        4.40,
        12.17,
        2.35,
        [
            "4-step appointment wizard (/appointments/book): department & doctor selection, date picker, live 30-min slot chips, and confirmation.",
            "Doctor clinical workstation (/doctor/dashboard): waiting room queue, weekly shift/break editor, leave manager, and prescription modal.",
            "Billing & printable invoices (/billing): itemized charges, online payment modal (UPI/Card/Cash), and window.print() tax invoice view.",
            "Executive analytics & audit trail (/reports, /admin/audit): date/department filters, CSV report download, and searchable security log.",
        ],
        size=12.5,
        color=BODY_TEXT,
        space_after=7,
        bold_prefix=True,
    )

    # ------------------------------------------------------------------
    # SLIDE 6: Backend Modules & Server Actions (Light)
    # ------------------------------------------------------------------
    s6 = prs.slides.add_slide(blank)
    add_chrome(s6, "Backend Modules & Server Actions", 6, dark=False)
    cards_s6 = [
        (
            "auth.ts, admin.ts & audit.ts",
            "Login, patient registration, JWT session healing, operational KPIs, leave-conflict alerts, and paginated audit logs.",
            ROYAL_BLUE,
        ),
        (
            "patient.ts & doctor.ts",
            "Multi-field patient search, 360\u00b0 dossier, doctor onboarding, weekly shift/break updates, leave scheduling, and active toggles.",
            CYAN_ACCENT,
        ),
        (
            "appointment.ts",
            "Live slot calculation (excluding breaks, leaves & booked slots), FIFO-queued atomic booking, check-in, rescheduling & reassignment.",
            GREEN,
        ),
        (
            "medical-record.ts",
            "Atomic consultation completion (createPrescriptionAction \u2192 Rx + COMPLETED + auto-bill), diagnostic reports, and EHR timeline.",
            AMBER,
        ),
        (
            "billing.ts & report.ts",
            "Itemized bill generation (consultation + meds + labs + 5% tax), queued partial/full payments, revenue aggregation, and CSV export.",
            NAVY,
        ),
        (
            "department.ts & notification.ts",
            "Department CRUD with safe-delete guard (doctors > 0 check) and queued user notifications with read/mark-all-read actions.",
            CYAN_ACCENT,
        ),
    ]
    for idx, (ct, cb, ac) in enumerate(cards_s6):
        col = idx % 2
        row = idx // 2
        add_card(
            s6,
            0.58 + col * 6.29,
            1.18 + row * 1.66,
            5.88,
            1.42,
            ct,
            cb,
            accent_color=ac,
            title_size=14,
            body_size=11.5,
        )

    add_textbox(
        s6,
        0.58,
        6.30,
        12.17,
        0.40,
        "11 Server Action modules under src/actions/ paired with Zod validators (src/lib/validations/) and health check at GET /api/health.",
        size=11.5,
        color=MUTED_TEXT,
    )

    # ------------------------------------------------------------------
    # SLIDE 7: Database Design & ER Diagram (Light)
    # ------------------------------------------------------------------
    s7 = prs.slides.add_slide(blank)
    add_chrome(s7, "Database Design & ER Diagram", 7, dark=False)
    add_textbox(
        s7,
        0.58,
        1.14,
        5.15,
        0.40,
        "PostgreSQL schema includes 14 core models:",
        size=14,
        bold=True,
        color=NAVY,
    )
    add_bullets(
        s7,
        0.58,
        1.68,
        5.15,
        4.35,
        [
            "Identity & Access: User (ADMIN, DOCTOR, RECEPTIONIST, PATIENT), Patient, Doctor, and Department.",
            "Scheduling & Visits: DoctorSchedule (shifts & break windows), DoctorLeave, and Appointment (9 lifecycle statuses).",
            "Clinical Records: Prescription (1:1 per appointment, JSON medications) and MedicalReport (lab/imaging report links).",
            "Billing & System: Bill, Payment (5 methods), Notification, AuditLog, and SystemSetting (INR defaults).",
        ],
        size=12.5,
        color=BODY_TEXT,
        space_after=12,
        bold_prefix=True,
    )
    add_rect(s7, 5.88, 1.06, 6.87, 5.28, WHITE, line_color=CARD_BORDER, line_pt=1.0, rounded=True)
    add_picture_fit(s7, ER_IMG, 5.96, 1.14, 6.71, 5.12)

    add_textbox(
        s7,
        0.58,
        6.45,
        12.17,
        0.50,
        "All 14 tables enforce primary keys, foreign keys, 47 indexes, and the partial unique index unique_active_appointment_slot.",
        size=12,
        bold=True,
        color=NAVY,
    )

    # ------------------------------------------------------------------
    # SLIDE 8: User Workflow & System Use Cases (Light)
    # ------------------------------------------------------------------
    s8 = prs.slides.add_slide(blank)
    add_chrome(s8, "User Workflow & System Use Cases", 8, dark=False)
    add_rect(s8, 0.58, 1.04, 12.17, 5.42, WHITE, line_color=CARD_BORDER, line_pt=1.0, rounded=True)
    add_picture_fit(s8, UC_IMG, 0.70, 1.12, 11.93, 5.26)
    add_textbox(
        s8,
        0.58,
        6.58,
        12.17,
        0.42,
        "End-to-end clinical flow: Patient books slot \u2192 Checks in at desk \u2192 Doctor prescribes \u2192 System auto-bills \u2192 Patient/Staff settles payment.",
        size=12.5,
        bold=True,
        color=NAVY,
        align=PP_ALIGN.CENTER,
    )

    # ------------------------------------------------------------------
    # SLIDE 9: Appointment & Billing Flow (Light)
    # ------------------------------------------------------------------
    s9 = prs.slides.add_slide(blank)
    add_chrome(s9, "Appointment & Billing Flow", 9, dark=False)
    steps_s9 = [
        ("01", "Select Specialist", "Patient or staff picks department, doctor, date, and open 30-min slot.", ROYAL_BLUE),
        ("02", "Queue & Lock Slot", "appointmentQueue serializes booking inside an ACID transaction.", CYAN_ACCENT),
        ("03", "Check-In & Exam", "Patient checks in; doctor starts consultation and reviews EHR history.", ROYAL_BLUE),
        ("04", "Prescribe & Bill", "Doctor saves Rx; transaction marks visit COMPLETED & generates INR bill.", CYAN_ACCENT),
        ("05", "Settle & Audit", "billingQueue processes payment, updates PAID status & writes AuditLog.", ROYAL_BLUE),
    ]
    for i, (num_txt, st_title, st_desc, circ_col) in enumerate(steps_s9):
        cx = 1.56 + i * 2.55
        if i < 4:
            add_rect(s9, cx + 0.36, 1.84, 1.83, 0.025, LINE_GRAY)
        circ = s9.shapes.add_shape(
            MSO_SHAPE.OVAL, Inches(cx - 0.38), Inches(1.48), Inches(0.76), Inches(0.76)
        )
        circ.fill.solid()
        circ.fill.fore_color.rgb = circ_col
        circ.line.fill.background()
        circ.shadow.inherit = False
        tf_c = circ.text_frame
        tf_c.vertical_anchor = MSO_ANCHOR.MIDDLE
        pc = tf_c.paragraphs[0]
        pc.alignment = PP_ALIGN.CENTER
        rc = pc.add_run()
        rc.text = num_txt
        rc.font.name = FONT_FAMILY
        rc.font.size = Pt(15)
        rc.font.bold = True
        rc.font.color.rgb = WHITE

        add_textbox(
            s9, cx - 1.10, 2.42, 2.20, 0.38, st_title, size=13.5, bold=True, color=NAVY, align=PP_ALIGN.CENTER
        )
        add_textbox(
            s9, cx - 1.12, 2.86, 2.24, 1.15, st_desc, size=11.5, color=MUTED_TEXT, align=PP_ALIGN.CENTER
        )

    add_card(
        s9,
        0.58,
        4.65,
        5.88,
        1.48,
        "Conflict prevention",
        "Three-layer protection: FIFO AppointmentRequestQueue, in-transaction active-slot & leave checks, and PostgreSQL index unique_active_appointment_slot.",
        accent_color=ROYAL_BLUE,
        title_size=14.5,
        body_size=12,
    )
    add_card(
        s9,
        6.87,
        4.65,
        5.88,
        1.48,
        "Billing & audit records",
        "BillingRequestQueue re-verifies remaining balance inside prisma.$transaction, blocks overpayment, emits notifications, and logs AuditLog.",
        accent_color=GREEN,
        title_size=14.5,
        body_size=12,
    )

    # ------------------------------------------------------------------
    # SLIDE 10: Security & Validation (Dark — 3 cols x 2 rows)
    # ------------------------------------------------------------------
    s10 = prs.slides.add_slide(blank)
    add_chrome(s10, "Security & Validation", 10, dark=True)
    cards_s10 = [
        ("Authentication", "jose HS256 JWT stored in HTTP-only hms_auth_token cookies (7-day expiry) with DB session healing."),
        ("Password protection", "bcryptjs hashing (10 salt rounds) on patient self-registration, login checks, and admin onboarding."),
        ("Role access", "Edge src/middleware.ts route guards + server-side requireAuth() / requireRole() ownership verification."),
        ("Input validation", "7 Zod schema modules (src/lib/validations/) validating dates, HH:mm slots, medications, and payment amounts."),
        ("Audit & Error handling", "logAudit() records auth, clinical & billing actions; Server Actions return typed ActionResponse<T> payloads."),
        ("Environment config", "Neon PostgreSQL URLs (DATABASE_URL, DATABASE_URL_UNPOOLED) and JWT_SECRET externalized via .env."),
    ]
    for idx, (ct, cb) in enumerate(cards_s10):
        col = idx % 3
        row = idx // 3
        add_card(
            s10,
            0.58 + col * 4.16,
            1.35 + row * 2.10,
            3.85,
            1.76,
            ct,
            cb,
            title_size=15,
            body_size=12,
        )

    add_textbox(
        s10,
        0.58,
        5.75,
        12.17,
        0.55,
        "Production readiness: configure a strong JWT_SECRET, enforce strict ESLint rules, and enable cloud object storage before deployment.",
        size=12.5,
        bold=True,
        color=WHITE,
    )

    # ------------------------------------------------------------------
    # SLIDE 11: Core Utilities & Integrations (Light)
    # ------------------------------------------------------------------
    s11 = prs.slides.add_slide(blank)
    add_chrome(s11, "Core Utilities & Integrations", 11, dark=False)
    cards_s11 = [
        (
            "Neon Serverless PostgreSQL",
            "Cloud-hosted ACID Postgres using pooled (DATABASE_URL) and unpooled (DATABASE_URL_UNPOOLED) connections via Prisma singleton.",
        ),
        (
            "Backup & Restore CLI",
            "scripts/backup-db.ts and scripts/restore-db.ts export and upsert-restore JSON snapshots in backups/ (2 snapshots present).",
        ),
        (
            "Health Check & Queues",
            "GET /api/health measures live DB latency (SELECT 1) and heap memory; FifoQueue<T> coordinates booking, billing, and notifications.",
        ),
    ]
    for i, (ct, cb) in enumerate(cards_s11):
        add_card(s11, 0.58 + i * 4.16, 1.40, 3.85, 1.95, ct, cb, title_size=15, body_size=12)

    add_textbox(
        s11,
        0.58,
        3.95,
        12.17,
        0.38,
        "Configuration needed before a live demo",
        size=15,
        bold=True,
        color=NAVY,
    )
    add_bullets(
        s11,
        0.58,
        4.45,
        12.17,
        2.15,
        [
            "Ensure .env contains valid Neon DATABASE_URL, DATABASE_URL_UNPOOLED, and JWT_SECRET values.",
            "Run npx prisma db push and npm run prisma:seed to load 5 departments, 3 doctors, 4 patients, and INR SystemSetting rows.",
            "Start the server with npm run dev and sign in or switch accounts via DemoSwitcher (Admin, Doctor, Receptionist, Patient).",
        ],
        size=13,
        color=BODY_TEXT,
        space_after=10,
    )

    # ------------------------------------------------------------------
    # SLIDE 12: Implementation Status & Validation (Dark)
    # ------------------------------------------------------------------
    s12 = prs.slides.add_slide(blank)
    add_chrome(s12, "Implementation Status & Validation", 12, dark=True)
    cards_s12 = [
        (
            "Code structure",
            "Complete 3-worklet implementation across 16 Next.js pages, 5 UI components, 7 OOP domain models, and 7 Zod modules.",
        ),
        (
            "Server Actions & API",
            "11 Server Action files (src/actions/*.ts), Edge middleware.ts, and GET /api/health verified with strict TypeScript.",
        ),
        (
            "Database assets",
            "14 Prisma models, 4 enums, 47 live PostgreSQL indexes (including unique_active_appointment_slot), seeder & backup scripts.",
        ),
    ]
    for i, (ct, cb) in enumerate(cards_s12):
        add_card(s12, 0.58 + i * 4.16, 1.32, 3.85, 1.75, ct, cb, title_size=15, body_size=12)

    add_textbox(
        s12,
        0.58,
        3.62,
        12.17,
        0.38,
        "Verified checks & recommended demo flow",
        size=15,
        bold=True,
        color=WHITE,
    )
    add_bullets(
        s12,
        0.58,
        4.10,
        12.17,
        2.50,
        [
            "Static & schema checks passed: npx tsc --noEmit (0 errors) and npx prisma validate (schema valid) both exited 0.",
            "Live DB & unit checks passed: verify-db.ts (9 users, INR config), test-login.ts (5/5 logins), and 11/11 queue/model/JWT checks passed.",
            "Observed repo gaps: npm run lint prompts interactively (ESLint unconfigured); backup-db.ts omits DoctorLeave.",
            "Live demo flow: Book slot (/appointments/book) \u2192 Check in \u2192 Issue Rx & auto-bill (/doctor/dashboard) \u2192 Pay & print invoice (/billing).",
        ],
        size=12.5,
        color=LIGHT_BODY,
        space_after=8,
        bold_prefix=True,
    )

    # ------------------------------------------------------------------
    # SLIDE 13: Current Scope & Future Enhancements (Light)
    # ------------------------------------------------------------------
    s13 = prs.slides.add_slide(blank)
    add_chrome(s13, "Current Scope & Future Enhancements", 13, dark=False)
    add_rect(s13, 0.58, 1.32, 5.88, 4.35, WHITE, line_color=CARD_BORDER, line_pt=1.0, rounded=True)
    add_textbox(s13, 0.85, 1.54, 5.34, 0.40, "Core scope in the codebase", size=16, bold=True, color=NAVY)
    add_bullets(
        s13,
        0.85,
        2.06,
        5.34,
        3.40,
        [
            "Role-based portals for Admin, Doctor, Receptionist, and Patient",
            "Doctor weekly shifts, break windows, leave tracking & conflict alerts",
            "Queue-serialized booking, check-in, rescheduling & reassignment",
            "Digital prescriptions, URL-linked lab reports & chronological EHR timeline",
            "Auto-invoicing in INR (\u20b9), partial/full payments, CSV analytics & audit logs",
        ],
        size=12.5,
        color=BODY_TEXT,
        space_after=10,
    )

    add_rect(s13, 6.87, 1.32, 5.88, 4.35, WHITE, line_color=CARD_BORDER, line_pt=1.0, rounded=True)
    add_textbox(s13, 7.14, 1.54, 5.34, 0.40, "Potential next steps", size=16, bold=True, color=NAVY)
    add_bullets(
        s13,
        7.14,
        2.06,
        5.34,
        3.40,
        [
            "Binary diagnostic file uploads to cloud object storage (S3 / Vercel Blob)",
            "Real payment gateway integration (UPI/card webhooks) & server PDF receipts",
            "WebSocket / SSE push notifications to replace 20-second client polling",
            "Multi-instance distributed locking (Redis) for horizontal scaling",
            "Configure ESLint + automated CI/CD integration test pipeline",
        ],
        size=12.5,
        color=BODY_TEXT,
        space_after=10,
    )

    add_textbox(
        s13,
        0.58,
        6.08,
        12.17,
        0.45,
        "Immediate priority: configure ESLint for CI linting, add DoctorLeave to backup/restore scripts, and integrate cloud storage for reports.",
        size=12.5,
        bold=True,
        color=NAVY,
        align=PP_ALIGN.CENTER,
    )

    # ------------------------------------------------------------------
    # SLIDE 14: Conclusion (Dark — NO team name, NO student names)
    # ------------------------------------------------------------------
    s14 = prs.slides.add_slide(blank)
    set_bg(s14, NAVY)
    add_textbox(s14, 0.85, 0.72, 11.6, 0.35, "REVIEW 3 \u2022 CONCLUSION", size=11, bold=True, color=CYAN)
    add_textbox(
        s14,
        0.85,
        1.48,
        11.6,
        0.75,
        "A centralized platform for hospital operations",
        size=30,
        bold=True,
        color=WHITE,
    )
    add_textbox(
        s14,
        0.85,
        2.58,
        11.6,
        1.05,
        "Built as a unified, full-stack Next.js 15 and Neon PostgreSQL healthcare platform covering all three project worklets \u2014 patient & staff management, conflict-free appointment scheduling with EHR records, and automated INR billing with operational analytics and audit trails.",
        size=15.5,
        color=LIGHT_BODY,
        line_spacing=1.32,
    )
    add_textbox(
        s14,
        0.85,
        4.05,
        11.6,
        0.65,
        "Next focus: cloud file storage for diagnostic reports, real-time push notifications, and production CI/CD hardening.",
        size=14,
        bold=True,
        color=WHITE,
    )
    add_textbox(
        s14,
        0.85,
        5.68,
        11.6,
        0.38,
        "QUESTIONS & DISCUSSION \u2022 THANK YOU",
        size=12,
        bold=True,
        color=CYAN,
    )
    add_textbox(
        s14,
        0.85,
        6.68,
        11.6,
        0.32,
        "EDI | Hospital Management System",
        size=10,
        color=LIGHT_MUTED,
    )

    prs.save(str(OUT_PPTX))
    print(f"Saved PPTX: {OUT_PPTX}")


def export_via_powerpoint() -> None:
    import win32com.client

    SLIDES_DIR.mkdir(parents=True, exist_ok=True)
    for f in SLIDES_DIR.glob("*.png"):
        f.unlink()

    ppt_app = win32com.client.Dispatch("PowerPoint.Application")
    pres = ppt_app.Presentations.Open(str(OUT_PPTX.resolve()), WithWindow=False)
    try:
        # 32 = ppSaveAsPDF
        pres.SaveAs(str(OUT_PDF.resolve()), 32)
        # 18 = ppSaveAsPNG (exports Slide1.PNG..Slide14.PNG into SLIDES_DIR)
        pres.SaveAs(str(SLIDES_DIR.resolve()), 18)
    finally:
        pres.Close()
        ppt_app.Quit()
    print(f"Exported PDF: {OUT_PDF} and slide PNGs in {SLIDES_DIR}")


if __name__ == "__main__":
    build_presentation()
    export_via_powerpoint()

