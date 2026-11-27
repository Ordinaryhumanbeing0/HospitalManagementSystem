"""Structured HTML content generator for the Hospital Management System (HMS)
EDI Mini-Project Report (Pages 5+).

Every technical symbol, file path, schema model, enum, RBAC permission,
concurrency mechanism, and test result in this module is sourced directly
from `scratch/report_dossier.md`.
"""

from pathlib import Path
from typing import Dict

BUILDER_DIR = Path(r"c:\HospitalManagementSystem\scratch\report_builder")


def fig_block(fig_num: str, title: str, img_path: str) -> str:
    uri = Path(img_path).resolve().as_uri()
    return (
        f'<div class="figure-block">\n'
        f'  <img src="{uri}" alt="{fig_num}: {title}" />\n'
        f'  <p class="figure-caption">{fig_num}: {title}</p>\n'
        f"</div>\n"
    )


def build_full_html(
    toc_pages: Dict[str, int],
    fig_pages: Dict[str, int],
    tbl_pages: Dict[str, int],
    diagram_paths: Dict[str, str],
) -> str:
    css = (BUILDER_DIR / "report.css").read_text(encoding="utf-8")

    def tp(k: str) -> str:
        return str(toc_pages.get(k, ""))

    def fp(k: str) -> str:
        return str(fig_pages.get(k, ""))

    def tblp(k: str) -> str:
        return str(tbl_pages.get(k, ""))

    # ------------------------------------------------------------------
    # FRONT MATTER (Pages 5 - 9+)
    # ------------------------------------------------------------------
    toc_rows = [
        ("0.0.1", "Project Scope", tp("scope"), False),
        ("", "Certificate", tp("certificate"), False),
        ("", "Acknowledgement", tp("acknowledgement"), False),
        ("", "List of Figures", tp("lof"), False),
        ("", "List of Tables", tp("lot"), False),
        ("", "List of Abbreviations", tp("loa"), False),
        ("1", "INTRODUCTION", tp("ch1"), True),
        ("1.1", "Introduction to Hospital Management System", tp("s1_1"), False),
        ("1.2", "Aim", tp("s1_2"), False),
        ("1.3", "Motivation", tp("s1_3"), False),
        ("1.4", "Key Objectives", tp("s1_4"), False),
        ("2", "LITERATURE SURVEY", tp("ch2"), True),
        ("2.1", "Literature Survey", tp("s2_1"), False),
        ("2.2", "Gap Analysis", tp("s2_2"), False),
        ("2.3", "Problem Statement", tp("s2_3"), False),
        ("3", "PROJECT REQUIREMENT SPECIFICATIONS", tp("ch3"), True),
        ("3.1", "Introduction and Project Scope", tp("s3_1"), False),
        ("3.2", "Functional Requirements", tp("s3_2"), False),
        ("3.3", "External Interface Requirements", tp("s3_3"), False),
        ("3.4", "System Requirements", tp("s3_4"), False),
        ("3.5", "System Implementation Plan", tp("s3_5"), False),
        ("4", "SYSTEM IMPLEMENTATION", tp("ch4"), True),
        ("4.1", "Proposed System Architecture", tp("s4_1"), False),
        ("4.2", "Algorithm", tp("s4_2"), False),
        ("4.3", "Methodologies", tp("s4_3"), False),
        ("5", "COURSEWISE WORKING MODULES", tp("ch5"), True),
        ("5.1", "Worklet 1: Patient &amp; User Management (OOP, DBMS, Networks)", tp("s5_1"), False),
        ("5.2", "Worklet 2: Appointment Scheduling &amp; EHR (DSA, OS, SE)", tp("s5_2"), False),
        ("5.3", "Worklet 3: Billing, Reports &amp; System Administration (DBMS, Web Tech)", tp("s5_3"), False),
        ("6", "TESTING", tp("ch6"), True),
        ("6.1", "Test Plan", tp("s6_1"), False),
        ("6.2", "Test Cases", tp("s6_2"), False),
        ("6.3", "Test Results", tp("s6_3"), False),
        ("7", "OTHER SPECIFICATION", tp("ch7"), True),
        ("7.1", "Advantages", tp("s7_1"), False),
        ("7.2", "Limitations", tp("s7_2"), False),
        ("7.3", "Applications", tp("s7_3"), False),
        ("8", "IMPLEMENTATION AND RESULT", tp("ch8"), True),
        ("8.1", "Methodology", tp("s8_1"), False),
        ("8.2", "Results", tp("s8_2"), False),
        ("9", "PROJECT PLAN", tp("ch9"), True),
        ("10", "CONCLUSION AND FUTURE WORK", tp("ch10"), True),
        ("", "Bibliography", tp("bib"), False),
        ("", "References", tp("ref"), False),
    ]

    toc_html_rows = "\n".join(
        f'<tr class="{"toc-chapter-row" if bold else ""}">'
        f'<td class="sec-col">{sec}</td>'
        f'<td class="title-col">{title}</td>'
        f'<td class="page-col">{pg}</td></tr>'
        for sec, title, pg, bold in toc_rows
    )

    lof_rows = [
        ("Figure 4.1", "Three-Tier System Architecture of the Hospital Management System", fp("fig_arch")),
        ("Figure 4.2", "Authentication and Role-Based Access Control (RBAC) Flow", fp("fig_auth")),
        ("Figure 4.3", "Concurrent Appointment Booking Sequence with Queue &amp; PostgreSQL Index", fp("fig_book")),
        ("Figure 5.1", "Use Case Diagram Across Patient, Doctor, Receptionist, and Admin Actors", fp("fig_uc")),
        ("Figure 5.2", "Database Entity-Relationship and OOP Domain Class Diagram", fp("fig_er")),
        ("Figure 5.3", "Billing Lifecycle and Payment State Transition Diagram", fp("fig_bill")),
        ("Figure 9.1", "Semester Project Plan and Worklet Integration Gantt Chart", fp("fig_gantt")),
    ]
    lof_html_rows = "\n".join(
        f'<tr><td class="num-col">{n}</td><td class="desc-col">{t}</td><td class="pg-col">{p}</td></tr>'
        for n, t, p in lof_rows
    )

    lot_rows = [
        ("Table 2.1", "Comparative Literature Survey of Healthcare Information Systems", tblp("tbl_lit")),
        ("Table 2.2", "Gap Analysis Between Existing Systems and Proposed HMS", tblp("tbl_gap")),
        ("Table 3.1", "Role-Based Access Control (RBAC) Permission Matrix", tblp("tbl_rbac")),
        ("Table 3.2", "Hardware, Software, and Runtime Environment Requirements", tblp("tbl_sysreq")),
        ("Table 4.1", "PostgreSQL Database Models and Relations (prisma/schema.prisma)", tblp("tbl_schema")),
        ("Table 5.1", "Academic Coursewise Subject-to-Module Mapping", tblp("tbl_course")),
        ("Table 5.2", "OOP Domain Classes and Encapsulated Methods (src/lib/domain/models.ts)", tblp("tbl_oop")),
        ("Table 5.3", "Inventory of Server Actions and REST API Endpoints", tblp("tbl_actions")),
        ("Table 6.1", "Functional, Concurrency, and Security Test Cases", tblp("tbl_tc")),
        ("Table 6.2", "Verified Build, Static Check, Unit, and Live Database Results", tblp("tbl_results")),
        ("Table 8.1", "Seeded Demo Accounts and Live PostgreSQL Table Counts", tblp("tbl_seed")),
        ("Table 9.1", "Project Plan Milestones and Deliverables", tblp("tbl_plan")),
    ]
    lot_html_rows = "\n".join(
        f'<tr><td class="num-col">{n}</td><td class="desc-col">{t}</td><td class="pg-col">{p}</td></tr>'
        for n, t, p in lot_rows
    )

    abbr_rows = [
        ("ACID", "Atomicity, Consistency, Isolation, Durability"),
        ("API", "Application Programming Interface"),
        ("CLI", "Command-Line Interface"),
        ("CRUD", "Create, Read, Update, Delete"),
        ("CSV", "Comma-Separated Values"),
        ("CUID", "Collision-Resistant Unique Identifier"),
        ("DBMS", "Database Management System"),
        ("DSA", "Data Structures and Algorithms"),
        ("EDI", "Engineering Design and Innovation"),
        ("EHR", "Electronic Health Record"),
        ("ERD", "Entity-Relationship Diagram"),
        ("FIFO", "First-In, First-Out"),
        ("GST", "Goods and Services Tax"),
        ("HMS", "Hospital Management System"),
        ("HS256", "HMAC using SHA-256"),
        ("HTTP", "Hypertext Transfer Protocol"),
        ("INR", "Indian Rupee (&#8377;)"),
        ("JSON", "JavaScript Object Notation"),
        ("JWT", "JSON Web Token"),
        ("KPI", "Key Performance Indicator"),
        ("OOP", "Object-Oriented Programming"),
        ("OPD", "Outpatient Department"),
        ("ORM", "Object-Relational Mapping"),
        ("OS", "Operating Systems"),
        ("RBAC", "Role-Based Access Control"),
        ("RSC", "React Server Components"),
        ("SE", "Software Engineering"),
        ("SQL", "Structured Query Language"),
        ("SRS", "Software Requirement Specification"),
        ("UI", "User Interface"),
        ("UML", "Unified Modeling Language"),
        ("UPI", "Unified Payments Interface"),
    ]
    abbr_html_rows = "\n".join(
        f'<tr><td class="abbr-col">{a}</td><td>{m}</td></tr>'
        for a, m in abbr_rows
    )

    front_matter = f"""
<div class="front-title">CONTENTS</div>
<table class="toc-table">
  <thead><tr><th>Section</th><th>Title</th><th>Page</th></tr></thead>
  <tbody>
    {toc_html_rows}
  </tbody>
</table>

<div class="page-break"></div>
<div class="front-title">LIST OF FIGURES</div>
<table class="list-table">
  <thead><tr><th>Figure No.</th><th>Title</th><th>Page</th></tr></thead>
  <tbody>
    {lof_html_rows}
  </tbody>
</table>

<div class="page-break"></div>
<div class="front-title">LIST OF TABLES</div>
<table class="list-table">
  <thead><tr><th>Table No.</th><th>Title</th><th>Page</th></tr></thead>
  <tbody>
    {lot_html_rows}
  </tbody>
</table>

<div class="page-break"></div>
<div class="front-title">LIST OF ABBREVIATIONS</div>
<table class="abbr-table">
  <thead><tr><th>Abbreviation</th><th>Meaning</th></tr></thead>
  <tbody>
    {abbr_html_rows}
  </tbody>
</table>
"""

    # ------------------------------------------------------------------
    # CHAPTER 1: INTRODUCTION
    # ------------------------------------------------------------------
    ch1 = """
<div class="chapter-start">
  <div class="chapter-header">
    <div class="chapter-num">Chapter 1</div>
    <div class="chapter-name">INTRODUCTION</div>
  </div>

  <h2 class="sec-heading">1.1 Introduction to Hospital Management System</h2>
  <p>
    Healthcare delivery in modern outpatient clinics and multi-specialty hospitals requires tight coordination among
    patients, physicians, front-desk receptionists, and hospital administrators. Paper registers and disconnected
    spreadsheets routinely introduce scheduling collisions, delayed clinical record retrieval, billing discrepancies,
    and weak access accountability. The <strong>Hospital Management System (HMS)</strong> is a full-stack web
    application developed using Next.js 15 (App Router), React 19, TypeScript, Prisma ORM, and Neon Serverless
    PostgreSQL to centralize and automate end-to-end hospital workflows.
  </p>
  <p>
    The system organizes clinical and administrative operations into three synchronized worklets: Patient &amp; User
    Management (Worklet 1), Appointment Scheduling &amp; Electronic Health Records (Worklet 2), and Billing, Analytics
    &amp; System Administration (Worklet 3). Role-tailored portals under <code>/admin</code>, <code>/doctor</code>,
    <code>/receptionist</code>, and <code>/patient</code> are protected by Edge Middleware
    (<code>src/middleware.ts</code>) and server-side RBAC guards (<code>src/lib/auth/rbac.ts</code>), ensuring that
    sensitive patient histories and financial records remain strictly scoped to authorized roles.
  </p>

  <h2 class="sec-heading">1.2 Aim</h2>
  <p>
    The aim of this project is to design, implement, and verify a secure, concurrency-safe, database-driven Hospital
    Management System that automates patient onboarding, doctor schedule management, conflict-free appointment booking,
    digital prescriptions and medical report history, itemized Indian Rupee (INR) billing, analytical reporting, and
    tamper-evident audit logging across a unified Next.js and PostgreSQL architecture.
  </p>

  <h2 class="sec-heading">1.3 Motivation</h2>
  <p>
    In busy Outpatient Departments (OPDs), multiple patients and receptionists often attempt to reserve the same
    specialist time slot concurrently. Without serialized request queuing, transactional validation, and database
    uniqueness guarantees, double-bookings occur and disrupt clinical schedules. Furthermore, decoupled billing and
    consultation workflows lead to missed charges or manual calculation errors, while unlogged record edits compromise
    institutional accountability. Building HMS as an integrated Engineering Design and Innovation (EDI) project
    provides a practical testbed to apply foundational IT subjects—including Object-Oriented Programming, Data
    Structures, Database Management Systems, Computer Networks, Operating Systems, Software Engineering, and Web
    Technology—to a real-world healthcare operations domain.
  </p>

  <h2 class="sec-heading">1.4 Key Objectives</h2>
  <ul>
    <li><strong>Unified Role-Based Portal:</strong> Provide dedicated dashboards and operational pages for <code>ADMIN</code>, <code>DOCTOR</code>, <code>RECEPTIONIST</code>, and <code>PATIENT</code> roles enforced by HS256 JWT cookies and PostgreSQL-verified session checks.</li>
    <li><strong>Race-Condition-Free Appointment Scheduling:</strong> Guarantee zero double-bookings under concurrent requests by combining an in-memory linked-list FIFO queue (<code>AppointmentRequestQueue</code>), Prisma interactive transactions (<code>prisma.$transaction</code>), and a PostgreSQL partial unique index (<code>unique_active_appointment_slot</code>).</li>
    <li><strong>Dynamic Availability &amp; Leave Awareness:</strong> Compute 30-minute consultation slots dynamically from <code>DoctorSchedule</code> shift bounds, break windows (<code>breakStartTime</code>–<code>breakEndTime</code>), active <code>DoctorLeave</code> dates, and non-cancelled bookings.</li>
    <li><strong>Automated Consultation-to-Billing Pipeline:</strong> Enable doctors to record diagnoses and structured medication lists in <code>Prescription</code> records while atomically transitioning the appointment to <code>COMPLETED</code> and generating an itemized <code>Bill</code> (consultation fee, medication charges, and 5% GST) in Indian Rupees (<code>&#8377;</code>).</li>
    <li><strong>Multi-Channel Payments &amp; Printable Invoices:</strong> Support partial and full settlements across <code>CASH</code>, <code>CARD</code>, <code>UPI</code>, <code>INSURANCE</code>, and <code>NET_BANKING</code> via <code>BillingRequestQueue</code> with browser-printable tax invoices.</li>
    <li><strong>Observability, Auditability &amp; Recovery:</strong> Persist critical user, clinical, and financial events in <code>AuditLog</code>, monitor database connectivity via <code>GET /api/health</code>, export CSV operational reports, and provide CLI backup/restore scripts (<code>scripts/backup-db.ts</code>, <code>scripts/restore-db.ts</code>).</li>
  </ul>
</div>
"""

    # ------------------------------------------------------------------
    # CHAPTER 2: LITERATURE SURVEY
    # ------------------------------------------------------------------
    ch2 = """
<div class="chapter-start">
  <div class="chapter-header">
    <div class="chapter-num">Chapter 2</div>
    <div class="chapter-name">LITERATURE SURVEY</div>
  </div>

  <h2 class="sec-heading">2.1 Literature Survey</h2>
  <p>
    Healthcare Management Information Systems (HMIS) have evolved from single-machine desktop applications into
    cloud-native, multi-tenant web platforms. Traditional hospital ERPs (such as legacy client-server deployments) rely
    on heavy local installations and manual synchronization across reception, pharmacy, and accounts desks. Modern
    open-source and commercial platforms address interoperability and digital medical records, yet vary significantly
    in architectural complexity, concurrency guarantees, and Indian OPD localization.
  </p>

  <p class="table-caption">Table 2.1: Comparative Literature Survey of Healthcare Information Systems</p>
  <table>
    <thead>
      <tr>
        <th>System / Study</th>
        <th>Architecture &amp; Stack</th>
        <th>Strengths</th>
        <th>Observed Shortcomings</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>OpenMRS</strong> (Open Medical Record System)</td>
        <td>Java Spring MVC / Modular Web Platform, MySQL</td>
        <td>Strong clinical concept dictionary, extensible EHR data model, active global community.</td>
        <td>Steep deployment footprint for small clinics; lacks native Next.js full-stack type safety and built-in Indian INR OPD billing UX.</td>
      </tr>
      <tr>
        <td><strong>OpenEMR</strong></td>
        <td>PHP, Apache/Nginx, MariaDB/MySQL</td>
        <td>Comprehensive outpatient scheduling, e-prescribing, and billing modules.</td>
        <td>Monolithic server-rendered PHP UI; legacy codebase lacks end-to-end static type safety and modern reactive slot-picking workflows.</td>
      </tr>
      <tr>
        <td><strong>Bahmni</strong> (ThoughtWorks)</td>
        <td>OpenMRS + Odoo ERP + OpenELIS microservices</td>
        <td>Full hospital suite integrating clinical records, lab management, and billing.</td>
        <td>High infrastructure complexity (multiple databases and services) unsuitable for lightweight academic or single-clinic deployment.</td>
      </tr>
      <tr>
        <td><strong>Practo Ray / Cloud Clinic Tools</strong></td>
        <td>Proprietary SaaS Cloud Suites</td>
        <td>Polished appointment UI, SMS/in-app reminders, quick onboarding.</td>
        <td>Closed-source vendor lock-in, recurring subscription fees, and limited visibility into transaction isolation or audit schemas.</td>
      </tr>
      <tr>
        <td><strong>Generic Academic CRUD HMS Projects</strong></td>
        <td>Basic PHP/Express + Unindexed SQL</td>
        <td>Simple patient/doctor CRUD and login forms.</td>
        <td>Vulnerable to concurrent booking race conditions, missing RBAC verification on mutations, and no atomic consultation-to-billing pipeline.</td>
      </tr>
    </tbody>
  </table>

  <h2 class="sec-heading">2.2 Gap Analysis</h2>
  <p>
    Reviewing existing literature and open implementations highlights five concrete engineering gaps that directly
    motivate the architecture of the proposed Hospital Management System:
  </p>

  <p class="table-caption">Table 2.2: Gap Analysis Between Existing Systems and Proposed HMS</p>
  <table>
    <thead>
      <tr>
        <th>Gap Dimension</th>
        <th>Limitation in Existing / Legacy Systems</th>
        <th>Proposed HMS Design Resolution</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Slot Concurrency</strong></td>
        <td>Check-then-insert queries outside transactions allow simultaneous requests to double-book the same doctor slot.</td>
        <td>3-layer defense: FIFO task serialization (<code>appointmentQueue</code>), Prisma interactive transaction checks, and PostgreSQL partial unique index <code>unique_active_appointment_slot</code>.</td>
      </tr>
      <tr>
        <td><strong>2. Session &amp; Role Integrity</strong></td>
        <td>Stateless JWTs remain valid even after account deactivation or database re-seeding; client-only UI checks leak mutations.</td>
        <td>Edge <code>middleware.ts</code> guards paired with DB-verified <code>requireAuth()</code>/<code>requireRole()</code> session healing in every Server Action.</td>
      </tr>
      <tr>
        <td><strong>3. Clinical-to-Billing Silos</strong></td>
        <td>Doctors finish consultations without notifying receptionists, causing unbilled visits or manual fee entry errors.</td>
        <td><code>createPrescriptionAction</code> atomically writes the <code>Prescription</code>, marks the appointment <code>COMPLETED</code>, and auto-generates an itemized <code>Bill</code>.</td>
      </tr>
      <tr>
        <td><strong>4. Schedule &amp; Leave Conflicts</strong></td>
        <td>Static slot lists ignore doctor lunch breaks and ad-hoc leave dates, causing patient turn-aways.</td>
        <td><code>getAvailableSlotsAction</code> dynamically filters out <code>breakStartTime</code>–<code>breakEndTime</code> and <code>DoctorLeave</code> intervals; <code>addDoctorLeaveAction</code> detects and notifies impacted patients.</td>
      </tr>
      <tr>
        <td><strong>5. Lightweight Full-Stack Maintainability</strong></td>
        <td>Microservice ERPs require multiple runtimes; naive apps lack type checking and backup utilities.</td>
        <td>Single Next.js 15 + TypeScript strict codebase with Zod validation, 14-model Prisma schema, <code>/api/health</code> monitor, and CLI backup/restore scripts.</td>
      </tr>
    </tbody>
  </table>

  <h2 class="sec-heading">2.3 Problem Statement</h2>
  <p>
    Design and develop a Hospital Management System to automate patient registration, doctor and department management,
    concurrent appointment scheduling, electronic medical record and prescription tracking, itemized billing, and
    analytical reporting using secure web services, ACID-compliant database operations, role-based access control,
    application-level request queuing, and a scalable TypeScript full-stack architecture.
  </p>
</div>
"""

    # ------------------------------------------------------------------
    # CHAPTER 3: PROJECT REQUIREMENT SPECIFICATIONS
    # ------------------------------------------------------------------
    ch3 = """
<div class="chapter-start">
  <div class="chapter-header">
    <div class="chapter-num">Chapter 3</div>
    <div class="chapter-name">PROJECT REQUIREMENT SPECIFICATIONS</div>
  </div>

  <h2 class="sec-heading">3.1 Introduction and Project Scope</h2>
  <p>
    This Software Requirement Specification (SRS) defines the functional capabilities, access-control rules, external
    interfaces, runtime requirements, and implementation plan for the Hospital Management System. The scope encompasses
    four user personas—Administrators (<code>ADMIN</code>), Doctors (<code>DOCTOR</code>), Receptionists
    (<code>RECEPTIONIST</code>), and Patients (<code>PATIENT</code>)—operating across 16 Next.js App Router pages,
    11 Server Action modules, 1 health-monitoring REST endpoint, and a 14-table Neon PostgreSQL database.
  </p>

  <h2 class="sec-heading">3.2 Functional Requirements</h2>
  <ul>
    <li><strong>FR-1 Authentication &amp; Self-Registration:</strong> Users log in with email and password verified against <code>bcryptjs</code> hashes (10 salt rounds) to receive an HTTP-only HS256 JWT cookie (<code>hms_auth_token</code>, 7-day expiry). New patients can self-register via <code>registerPatientAction</code>, which atomically creates both <code>User</code> and <code>Patient</code> records.</li>
    <li><strong>FR-2 Patient, Doctor &amp; Department Administration:</strong> Admins manage departments (<code>createDepartmentAction</code>, <code>updateDepartmentAction</code>, <code>deleteDepartmentAction</code> with active-doctor deletion guard), onboard doctors with specialization, qualification, and consultation fee, toggle active states, and manage patient directories.</li>
    <li><strong>FR-3 Schedule &amp; Leave Management:</strong> Admins and Doctors (own schedule) configure weekly shifts (<code>dayOfWeek</code> 0–6, <code>startTime</code>, <code>endTime</code>, optional <code>breakStartTime</code>/<code>breakEndTime</code>, <code>slotDuration</code>) and register <code>DoctorLeave</code> date ranges that automatically notify patients with conflicting <code>CONFIRMED</code>/<code>SCHEDULED</code> appointments.</li>
    <li><strong>FR-4 Concurrent Appointment Lifecycle:</strong> Authenticated users query dynamic open slots via <code>getAvailableSlotsAction</code> and submit bookings via <code>bookAppointmentAction</code>. Appointments support check-in (<code>checkInAppointmentAction</code>), consultation start (<code>startConsultationAction</code>), rescheduling (<code>rescheduleAppointmentAction</code>), cancellation (<code>cancelAppointmentAction</code>), no-show marking (<code>markNoShowAction</code>), and doctor reassignment (<code>reassignAppointmentAction</code>).</li>
    <li><strong>FR-5 Prescriptions &amp; Medical History Timeline:</strong> Doctors issue digital prescriptions (<code>createPrescriptionAction</code>) with diagnosis, symptoms, follow-up date, and structured medication arrays. Authorized staff upload <code>MedicalReport</code> metadata (9 report categories including Blood Test, MRI, X-Ray, CT Scan, ECG), and <code>getPatientMedicalHistoryAction</code> renders a unified chronological timeline.</li>
    <li><strong>FR-6 Itemized Billing, Payments &amp; Analytics:</strong> Staff generate itemized bills (<code>generateBillAction</code>) combining consultation fees, medication charges (&#8377;250/medication), lab scan charges (&#8377;750/report, up to 2 matching reports), custom line items, discount percentage, and GST (default 5%). Payments are settled via <code>recordPaymentAction</code> across 5 payment methods with overpayment protection. Admins view operational KPIs (<code>getAdminOperationalMetricsAction</code>), 14-day revenue/footfall reports (<code>getRevenueAndFootfallReportsAction</code>), CSV exports (<code>exportReportCsvAction</code>), and audit logs (<code>getAuditLogsAction</code>).</li>
  </ul>

  <p class="table-caption">Table 3.1: Role-Based Access Control (RBAC) Permission Matrix</p>
  <table>
    <thead>
      <tr>
        <th>Module / Server Action</th>
        <th>ADMIN</th>
        <th>DOCTOR</th>
        <th>RECEPTIONIST</th>
        <th>PATIENT</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Admin Metrics, Audit Logs &amp; Revenue Reports</td>
        <td>Full Access</td>
        <td>Denied</td>
        <td>Denied</td>
        <td>Denied</td>
      </tr>
      <tr>
        <td>Department &amp; Doctor Creation / Deletion</td>
        <td>Full Access</td>
        <td>Denied</td>
        <td>Denied</td>
        <td>Denied</td>
      </tr>
      <tr>
        <td>Doctor Profile, Schedule &amp; Leave Updates</td>
        <td>Any Doctor</td>
        <td>Own Profile Only</td>
        <td>Denied</td>
        <td>Denied</td>
      </tr>
      <tr>
        <td>Patient Directory Search (<code>getPatientsAction</code>)</td>
        <td>Allowed</td>
        <td>Allowed</td>
        <td>Allowed</td>
        <td>Denied</td>
      </tr>
      <tr>
        <td>Patient Dossier / Update (<code>updatePatientAction</code>)</td>
        <td>Any Patient</td>
        <td>Any Patient</td>
        <td>Any Patient</td>
        <td>Own Profile Only</td>
      </tr>
      <tr>
        <td>Book Appointment (<code>bookAppointmentAction</code>)</td>
        <td>Any Patient</td>
        <td>Any Patient</td>
        <td>Any Patient</td>
        <td>Own Account Only</td>
      </tr>
      <tr>
        <td>View / Reschedule / Cancel Appointments</td>
        <td>All</td>
        <td>Own Appointments</td>
        <td>All</td>
        <td>Own Appointments</td>
      </tr>
      <tr>
        <td>Start Consultation &amp; Write Prescription</td>
        <td>Allowed</td>
        <td>Assigned Only</td>
        <td>Denied</td>
        <td>Denied</td>
      </tr>
      <tr>
        <td>Upload / View Medical Reports &amp; History</td>
        <td>Any Patient</td>
        <td>Assigned Patients</td>
        <td>Any Patient</td>
        <td>Own History Only</td>
      </tr>
      <tr>
        <td>Generate Bill (<code>generateBillAction</code>)</td>
        <td>Allowed</td>
        <td>Allowed</td>
        <td>Allowed</td>
        <td>Denied</td>
      </tr>
      <tr>
        <td>View Bills &amp; Record Payments</td>
        <td>All Bills</td>
        <td>Scoped in <code>getBillsAction</code></td>
        <td>All Bills</td>
        <td>Own Bills Only</td>
      </tr>
      <tr>
        <td>Notifications (<code>getNotificationsAction</code>)</td>
        <td>Own Inbox</td>
        <td>Own Inbox</td>
        <td>Own Inbox</td>
        <td>Own Inbox</td>
      </tr>
    </tbody>
  </table>

  <h2 class="sec-heading">3.3 External Interface Requirements</h2>
  <ul>
    <li><strong>User Interfaces:</strong> Responsive browser UI rendered with Next.js App Router, Tailwind CSS, <code>Inter</code> and <code>JetBrains Mono</code> typography, <code>lucide-react</code> icons, shared <code>DashboardShell</code>/<code>Navbar</code>/<code>NotificationBell</code>/<code>Modal</code> components, and browser <code>window.print()</code> tax invoice formatting.</li>
    <li><strong>Application &amp; API Interfaces:</strong> Typed Next.js Server Actions (<code>src/actions/*.ts</code>) validated with Zod schemas (<code>src/lib/validations/*.ts</code>) and serialized via <code>toPlainObject()</code>, alongside <code>GET /api/health</code> returning JSON database latency, uptime, Node version, and heap memory telemetry.</li>
    <li><strong>Database Interfaces:</strong> Prisma ORM 6.4.1 communicating over SSL/TLS with Neon Serverless PostgreSQL using pooled (<code>DATABASE_URL</code>) and direct (<code>DATABASE_URL_UNPOOLED</code>) connection strings.</li>
  </ul>

  <h2 class="sec-heading">3.4 System Requirements</h2>
  <p class="table-caption">Table 3.2: Hardware, Software, and Runtime Environment Requirements</p>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>Specification (Development / Verification Environment)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Processor &amp; RAM</strong></td>
        <td>64-bit x86_64 CPU (2+ cores), minimum 8 GB RAM recommended for Next.js compiler and headless browser checks</td>
      </tr>
      <tr>
        <td><strong>Operating System</strong></td>
        <td>Windows 10/11, Linux (Ubuntu 22.04+), or macOS</td>
      </tr>
      <tr>
        <td><strong>Node.js &amp; TypeScript</strong></td>
        <td>Node.js v18.17+ / v20+, TypeScript <code>^5.7.3</code> (strict mode, target <code>ES2022</code>), <code>tsx ^4.19.3</code></td>
      </tr>
      <tr>
        <td><strong>Web &amp; UI Stack</strong></td>
        <td>Next.js <code>^15.1.7</code>, React <code>^19.0.0</code>, Tailwind CSS <code>^3.4.17</code>, <code>lucide-react ^0.475.0</code></td>
      </tr>
      <tr>
        <td><strong>Database &amp; ORM</strong></td>
        <td>Neon Serverless PostgreSQL (PostgreSQL 16 compatible), Prisma <code>^6.4.1</code>, <code>@prisma/client ^6.4.1</code></td>
      </tr>
      <tr>
        <td><strong>Security &amp; Validation</strong></td>
        <td><code>jose ^6.2.10</code> (HS256 JWT), <code>bcryptjs ^3.0.2</code>, <code>zod ^3.24.2</code></td>
      </tr>
    </tbody>
  </table>

  <h2 class="sec-heading">3.5 System Implementation Plan</h2>
  <p>
    Implementation followed an incremental four-phase plan: (1) Schema modeling in <code>prisma/schema.prisma</code>,
    shared utilities, authentication, and RBAC foundation; (2) Worklet 1 modules (User, Patient, Doctor, Department);
    (3) Worklet 2 modules (Schedule, Leave, FIFO Queue, Concurrency-safe Booking, Prescriptions, Medical History); and
    (4) Worklet 3 modules (Billing Queue, Payments, Operational Metrics, Revenue Reports, CSV Export, Audit Logs,
    Backup/Restore CLI scripts) followed by integration verification.
  </p>
</div>
"""

    # ------------------------------------------------------------------
    # CHAPTER 4: SYSTEM IMPLEMENTATION
    # ------------------------------------------------------------------
    ch4 = f"""
<div class="chapter-start">
  <div class="chapter-header">
    <div class="chapter-num">Chapter 4</div>
    <div class="chapter-name">SYSTEM IMPLEMENTATION</div>
  </div>

  <h2 class="sec-heading">4.1 Proposed System Architecture</h2>
  <p>
    The Hospital Management System employs a three-tier full-stack architecture built inside a single Next.js 15 App
    Router codebase. Every request traverses well-defined security, validation, queuing, and persistence boundaries:
  </p>
  <ol>
    <li><strong>Presentation / Client Layer (<code>src/app/**</code>, <code>src/components/ui/**</code>):</strong> Consists of 16 App Router pages sharing <code>DashboardShell</code>, <code>Navbar</code>, <code>NotificationBell</code> (20-second polling), <code>DemoSwitcher</code> (7 quick-switch demo accounts), and <code>Modal</code>. Printable tax invoices use browser <code>window.print()</code> styling in <code>src/app/billing/page.tsx</code>, and analytical tables export CSV via client-side <code>Blob</code> downloads in <code>src/app/reports/page.tsx</code>.</li>
    <li><strong>Application &amp; Business Logic Layer (<code>src/middleware.ts</code>, <code>src/actions/**</code>, <code>src/lib/**</code>):</strong> Edge Middleware intercepts routes matching <code>PROTECTED_PREFIXES</code> (<code>/admin</code>, <code>/doctor</code>, <code>/patient</code>, <code>/receptionist</code>, <code>/dashboard</code>) and verifies the <code>hms_auth_token</code> JWT using <code>jose.jwtVerify</code>. Server Actions validate inputs with Zod, enforce DB-verified RBAC via <code>requireAuth()</code> / <code>requireRole()</code>, serialize critical writes through singleton queues (<code>appointmentQueue</code>, <code>billingQueue</code>, <code>notificationQueue</code>), instantiate OOP domain models from <code>src/lib/domain/models.ts</code>, and record audit entries via <code>logAudit()</code>.</li>
    <li><strong>Data &amp; Persistence Layer (<code>prisma/schema.prisma</code>, <code>src/lib/prisma.ts</code>, <code>scripts/</code>):</strong> Uses a global Prisma Client singleton connected to Neon Serverless PostgreSQL across 14 normalized models, 4 enums, and 47 PostgreSQL indexes including the partial unique index <code>unique_active_appointment_slot</code>.</li>
  </ol>

  {fig_block("Figure 4.1", "Three-Tier System Architecture of the Hospital Management System", diagram_paths["arch"])}

  <p class="table-caption">Table 4.1: PostgreSQL Database Models and Relations (prisma/schema.prisma)</p>
  <table>
    <thead>
      <tr>
        <th>Model Name</th>
        <th>Key Attributes</th>
        <th>Primary Relationships &amp; Constraints</th>
      </tr>
    </thead>
    <tbody>
      <tr><td><code>User</code></td><td><code>id</code>, <code>email</code> (unique), <code>passwordHash</code>, <code>role</code>, <code>name</code>, <code>phone</code>, <code>isActive</code></td><td>1:0..1 <code>Patient</code>/<code>Doctor</code> (Cascade); 1:N <code>AuditLog</code> (SetNull), <code>Notification</code> (Cascade)</td></tr>
      <tr><td><code>Department</code></td><td><code>id</code>, <code>name</code> (unique), <code>description</code></td><td>1:N <code>Doctor</code> (Restrict delete when doctors exist)</td></tr>
      <tr><td><code>Doctor</code></td><td><code>id</code>, <code>userId</code> (unique), <code>departmentId</code>, <code>specialization</code>, <code>qualification</code>, <code>consultationFee</code>, <code>isActive</code></td><td>Belongs to <code>User</code> &amp; <code>Department</code>; 1:N <code>DoctorSchedule</code>, <code>DoctorLeave</code>, <code>Appointment</code>, <code>Prescription</code></td></tr>
      <tr><td><code>Patient</code></td><td><code>id</code>, <code>userId</code> (unique), <code>dateOfBirth</code>, <code>gender</code>, <code>bloodGroup</code>, <code>address</code>, <code>emergencyContact</code>, <code>medicalHistorySummary</code></td><td>Belongs to <code>User</code>; 1:N <code>Appointment</code>, <code>MedicalReport</code>, <code>Prescription</code>, <code>Bill</code></td></tr>
      <tr><td><code>DoctorSchedule</code></td><td><code>id</code>, <code>doctorId</code>, <code>dayOfWeek</code> (0–6), <code>startTime</code>, <code>endTime</code>, <code>breakStartTime</code>, <code>breakEndTime</code>, <code>slotDuration</code>, <code>isActive</code></td><td>N:1 <code>Doctor</code> (Cascade)</td></tr>
      <tr><td><code>DoctorLeave</code></td><td><code>id</code>, <code>doctorId</code>, <code>startDate</code>, <code>endDate</code>, <code>reason</code></td><td>N:1 <code>Doctor</code> (Cascade); indexed on <code>(startDate, endDate)</code></td></tr>
      <tr><td><code>Appointment</code></td><td><code>id</code>, <code>patientId</code>, <code>doctorId</code>, <code>appointmentDate</code>, <code>timeSlot</code>, <code>status</code>, <code>reason</code></td><td>1:0..1 <code>Prescription</code>, <code>Bill</code>; partial unique index <code>unique_active_appointment_slot</code></td></tr>
      <tr><td><code>Prescription</code></td><td><code>id</code>, <code>appointmentId</code> (unique), <code>patientId</code>, <code>doctorId</code>, <code>diagnosis</code>, <code>symptoms</code>, <code>notes</code>, <code>followUpDate</code>, <code>medications</code> (Json)</td><td>1:1 <code>Appointment</code>; N:1 <code>Patient</code> &amp; <code>Doctor</code></td></tr>
      <tr><td><code>MedicalReport</code></td><td><code>id</code>, <code>patientId</code>, <code>doctorId?</code>, <code>title</code>, <code>reportType</code>, <code>fileUrl</code>, <code>notes</code></td><td>N:1 <code>Patient</code> &amp; optional <code>Doctor</code></td></tr>
      <tr><td><code>Bill</code></td><td><code>id</code>, <code>patientId</code>, <code>appointmentId?</code> (unique), <code>totalAmount</code>, <code>discount</code>, <code>paidAmount</code>, <code>status</code>, <code>items</code> (Json)</td><td>1:0..1 <code>Appointment</code>; N:1 <code>Patient</code>; 1:N <code>Payment</code> (Cascade)</td></tr>
      <tr><td><code>Payment</code></td><td><code>id</code>, <code>billId</code>, <code>amount</code>, <code>method</code>, <code>transactionRef</code>, <code>receivedAt</code></td><td>N:1 <code>Bill</code> (Cascade)</td></tr>
      <tr><td><code>Notification</code></td><td><code>id</code>, <code>userId</code>, <code>title</code>, <code>message</code>, <code>isRead</code></td><td>N:1 <code>User</code> (Cascade)</td></tr>
      <tr><td><code>AuditLog</code></td><td><code>id</code>, <code>userId?</code>, <code>action</code>, <code>details</code>, <code>ipAddress</code>, <code>createdAt</code></td><td>N:0..1 <code>User</code> (SetNull); indexed on <code>userId</code>, <code>action</code>, <code>createdAt</code></td></tr>
      <tr><td><code>SystemSetting</code></td><td><code>id</code>, <code>key</code> (unique), <code>value</code>, <code>description</code></td><td>Stores localization settings (e.g., <code>INR</code> currency config)</td></tr>
    </tbody>
  </table>

  <h2 class="sec-heading">4.2 Algorithm</h2>
  <p>
    Two core algorithms govern system correctness: (A) <strong>Session Healing &amp; Role Verification</strong>
    (<code>src/lib/auth/rbac.ts</code>) and (B) <strong>Three-Layer Concurrent Appointment Booking</strong>
    (<code>src/actions/appointment.ts</code> &amp; <code>src/lib/queue/appointment-queue.ts</code>).
  </p>

  <p><strong>Algorithm 1: Session Verification and Self-Healing (<code>requireAuth()</code>)</strong></p>
  <pre>1. Read HTTP-only cookie 'hms_auth_token' and verify HS256 signature via verifyJWT().
2. Query PostgreSQL User by session.id OR lowercased session.email (with patient &amp; doctor relations).
3. Reject if user record does not exist or dbUser.isActive == false.
4. If dbUser.role == PATIENT and dbUser.patient == null, auto-create default Patient profile.
5. If userId, patientId, doctorId, or role drifted (e.g., after DB re-seed), re-sign and refresh JWT cookie.
6. Return hydrated SessionUser to caller; requireRole(allowedRoles) validates membership.</pre>

  {fig_block("Figure 4.2", "Authentication and Role-Based Access Control (RBAC) Flow", diagram_paths["auth"])}

  <p><strong>Algorithm 2: Concurrency-Safe Appointment Booking (<code>bookAppointmentAction()</code>)</strong></p>
  <pre>1. Validate input (doctorId, appointmentDate 'YYYY-MM-DD', timeSlot 'HH:mm', reason) with bookAppointmentSchema.
2. Verify caller via requireAuth(); resolve patientId (auto-creating Patient row if missing for PATIENT role).
3. Enqueue booking task into singleton appointmentQueue (FifoQueue&lt;BookingTask&gt;, O(1) enqueue/dequeue).
4. Inside sequential queue worker, execute prisma.$transaction(..., maxWait: 15000, timeout: 30000):
   a. Verify target Doctor exists and isActive == true.
   b. Reject if appointmentDate falls within any DoctorLeave [startDate, endDate].
   c. Verify DoctorSchedule for dayOfWeek is active and timeSlot matches generated 30-min intervals
      outside [breakStartTime, breakEndTime] and not in the past.
   d. Reject if patient already has non-CANCELLED appointment at same date &amp; timeSlot.
   e. Reject if doctor already has non-CANCELLED appointment at same date &amp; timeSlot.
   f. INSERT Appointment (status: CONFIRMED); PostgreSQL index unique_active_appointment_slot
      enforces uniqueness atomically at database level even across parallel server workers.
5. On commit, record logAudit('APPOINTMENT_BOOKED') and trigger notifications via notificationQueue.</pre>

  {fig_block("Figure 4.3", "Concurrent Appointment Booking Sequence with Queue & PostgreSQL Index", diagram_paths["book"])}

  <h2 class="sec-heading">4.3 Methodologies</h2>
  <p>
    Development followed a modular, schema-first full-stack methodology:
  </p>
  <ul>
    <li><strong>Schema-First Type Safety:</strong> Prisma schema definitions generate strict TypeScript clients consumed directly by Server Actions and converted into plain JSON-safe DTOs using <code>toPlainObject()</code> (<code>src/lib/utils.ts</code>) to safely pass <code>Decimal</code> and <code>Date</code> values across React Server/Client boundaries.</li>
    <li><strong>Defense-in-Depth Security:</strong> Passwords are never stored in plaintext (10-round <code>bcryptjs</code>), Edge Middleware guards role route prefixes, and every Server Action independently checks session status and ownership constraints.</li>
    <li><strong>Transactional Atomicity:</strong> Multi-table mutations—such as patient registration (<code>User</code> + <code>Patient</code>), prescription completion (<code>Prescription</code> + <code>Appointment</code> + <code>Bill</code>), and payment settlement (<code>Payment</code> + <code>Bill</code>)—execute inside <code>prisma.$transaction</code> blocks.</li>
  </ul>
</div>
"""

    # ------------------------------------------------------------------
    # CHAPTER 5: COURSEWISE WORKING MODULES
    # ------------------------------------------------------------------
    ch5 = f"""
<div class="chapter-start">
  <div class="chapter-header">
    <div class="chapter-num">Chapter 5</div>
    <div class="chapter-name">COURSEWISE WORKING MODULES</div>
  </div>

  <p>
    In alignment with the Engineering Design and Innovation (EDI) curriculum and the team-wise worklet specification
    (<code>team2 (1).md</code>), the Hospital Management System integrates eight foundational Information Technology
    subjects across three synchronized working modules.
  </p>

  <p class="table-caption">Table 5.1: Academic Coursewise Subject-to-Module Mapping</p>
  <table>
    <thead>
      <tr>
        <th>Academic Subject</th>
        <th>Applied Engineering Concepts in HMS</th>
        <th>Primary Source Artifacts</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Basic Programming</strong></td>
        <td>Input sanitization, Zod schema rules, 30-min slot generator (<code>generateTimeSlots</code>), GST/discount/subtotal math, <code>en-IN</code> INR currency formatting.</td>
        <td><code>src/lib/validations/*.ts</code>, <code>src/lib/config/currency.ts</code>, <code>src/actions/billing.ts</code></td>
      </tr>
      <tr>
        <td><strong>Object-Oriented Programming (OOP)</strong></td>
        <td>Encapsulation and domain behavior modeling across 7 ES6 TypeScript classes representing appointments, clinical records, billing, reports, and notifications.</td>
        <td><code>src/lib/domain/models.ts</code></td>
      </tr>
      <tr>
        <td><strong>Data Structures (DSA)</strong></td>
        <td>Custom singly linked-list <code>FifoQueue&lt;T&gt;</code> with <i>O</i>(1) enqueue, dequeue, and peek operations; chronological descending merge-sort of clinical timelines.</td>
        <td><code>src/lib/queue/appointment-queue.ts</code>, <code>src/lib/queue/billing-queue.ts</code>, <code>src/actions/medical-record.ts</code></td>
      </tr>
      <tr>
        <td><strong>Database Management Systems (DBMS)</strong></td>
        <td>3NF 14-model relational schema, foreign-key cascade/restrict rules, 47 PostgreSQL B-tree &amp; partial unique indexes, <code>aggregate</code> and <code>groupBy</code> queries.</td>
        <td><code>prisma/schema.prisma</code>, <code>src/actions/admin.ts</code>, <code>src/actions/report.ts</code></td>
      </tr>
      <tr>
        <td><strong>Computer Networks</strong></td>
        <td>HTTP-only cookie transport, HS256 JWT signing/verification, Next.js Server Action RPC, Edge route guarding, and <code>GET /api/health</code> telemetry endpoint.</td>
        <td><code>src/lib/auth/jwt.ts</code>, <code>src/lib/auth/session.ts</code>, <code>src/middleware.ts</code>, <code>src/app/api/health/route.ts</code></td>
      </tr>
      <tr>
        <td><strong>Operating Systems (OS)</strong></td>
        <td>FIFO request serialization preventing race conditions, ACID transaction isolation, immutable <code>AuditLog</code> trails, and CLI snapshot backup/restore utilities.</td>
        <td><code>src/lib/auth/audit.ts</code>, <code>scripts/backup-db.ts</code>, <code>scripts/restore-db.ts</code></td>
      </tr>
      <tr>
        <td><strong>Software Engineering (SE)</strong></td>
        <td>Modular 3-worklet architecture, SRS specification, UML modeling (Use Case, ERD/Class, Sequence, State), and multi-scenario verification suites.</td>
        <td><code>src/types/index.ts</code>, <code>scratch/test-*.ts</code></td>
      </tr>
      <tr>
        <td><strong>Web Technology</strong></td>
        <td>Next.js 15 App Router, React 19 components, Tailwind CSS design tokens, printable tax invoices, and client-side CSV report export.</td>
        <td><code>src/app/**/page.tsx</code>, <code>src/components/ui/*</code></td>
      </tr>
    </tbody>
  </table>

  <h2 class="sec-heading">5.1 Worklet 1: Patient &amp; User Management (OOP, DBMS, Networks)</h2>
  <p>
    Worklet 1 governs identity, authentication, department organization, and patient/doctor directory management across
    <code>src/actions/auth.ts</code>, <code>src/actions/patient.ts</code>, <code>src/actions/doctor.ts</code>, and
    <code>src/actions/department.ts</code>. Multi-parameter searches filter patients and doctors by name, email, phone,
    or department with pagination (<code>patientSearchSchema</code>, <code>doctorSearchSchema</code>). Deletion guards
    prevent removing a <code>Department</code> while doctors remain assigned, and <code>toggleDoctorActiveAction</code> /
    <code>togglePatientActiveAction</code> enable safe soft deactivation without breaking historical audit or billing
    links.
  </p>

  {fig_block("Figure 5.1", "Use Case Diagram Across Patient, Doctor, Receptionist, and Admin Actors", diagram_paths["uc"])}

  <p class="table-caption">Table 5.2: OOP Domain Classes and Encapsulated Methods (src/lib/domain/models.ts)</p>
  <table>
    <thead>
      <tr>
        <th>Class Name</th>
        <th>Encapsulated Domain Methods</th>
        <th>Functional Responsibility</th>
      </tr>
    </thead>
    <tbody>
      <tr><td><code>AppointmentModel</code></td><td><code>isCancellable()</code>, <code>isReschedulable()</code>, <code>isCheckableIn()</code>, <code>isStartable()</code>, <code>isConsultable()</code>, <code>getFormattedTime()</code>, <code>getDateString()</code>, <code>isPastDate()</code></td><td>Enforces legal status transitions and human-readable slot/date formatting.</td></tr>
      <tr><td><code>MedicalReportModel</code></td><td><code>isImagingReport()</code>, <code>getDisplaySummary()</code></td><td>Classifies radiology scans (X-Ray, MRI, CT, Ultrasound) and summarizes diagnostic notes.</td></tr>
      <tr><td><code>PrescriptionModel</code></td><td><code>getMedicationCount()</code>, <code>getFormattedMedicationList()</code></td><td>Parses JSON medication arrays and formats dosage instructions.</td></tr>
      <tr><td><code>BillModel</code></td><td><code>getBalance()</code>, <code>isFullyPaid()</code>, <code>isPartiallyPaid()</code>, <code>static formatCurrency()</code>, <code>getItemCount()</code>, <code>getCollectionPercentage()</code></td><td>Normalizes itemized JSON structures and computes outstanding INR balances.</td></tr>
      <tr><td><code>PaymentModel</code></td><td><code>isValidPayment(outstandingBalance)</code>, <code>getFormattedMethod()</code></td><td>Guards against non-positive or excess payments within floating-point tolerance (<code>+0.001</code>).</td></tr>
      <tr><td><code>ReportModel</code></td><td><code>toCsvString()</code></td><td>Transforms revenue/footfall aggregate datasets into downloadable multi-section CSV files.</td></tr>
      <tr><td><code>NotificationModel</code></td><td><code>getTimeAgo()</code></td><td>Formats relative timestamps (<code>Just now</code>, <code>Xm ago</code>, <code>Xh ago</code>, <code>Yesterday</code>, <code>Xd ago</code>).</td></tr>
    </tbody>
  </table>

  {fig_block("Figure 5.2", "Database Entity-Relationship and OOP Domain Class Diagram", diagram_paths["er"])}

  <h2 class="sec-heading">5.2 Worklet 2: Appointment Scheduling &amp; EHR (DSA, OS, SE)</h2>
  <p>
    Worklet 2 implements dynamic slot computation, concurrent booking, consultation progression, digital prescriptions,
    and patient medical history timelines. The custom singly linked-list <code>FifoQueue&lt;T&gt;</code>
    (<code>src/lib/queue/appointment-queue.ts</code>) maintains <code>head</code>, <code>tail</code>, and
    <code>length</code> pointers to guarantee <i>O</i>(1) <code>enqueue()</code>, <code>dequeue()</code>, and
    <code>peek()</code> performance. <code>AppointmentRequestQueue</code> wraps each booking in a promise processed
    sequentially via <code>processNext()</code> while tracking live telemetry (<code>currentPending</code>,
    <code>totalProcessed</code>, <code>totalSuccessful</code>, <code>totalErrors</code>, <code>peakQueueSize</code>)
    exposed to administrators via <code>getAppointmentQueueMetricsAction</code>.
  </p>
  <p>
    During clinical consultations, <code>createPrescriptionAction</code> (aliased as
    <code>completeConsultationAction</code> in <code>src/actions/medical-record.ts</code>) executes a single
    <code>prisma.$transaction</code> that upserts the <code>Prescription</code>, marks the appointment
    <code>COMPLETED</code>, and—if no bill exists yet—automatically creates an itemized <code>Bill</code> combining
    the doctor's consultation fee, medication charges (&#8377;250 per prescribed medicine), and 5% GST. Patients and
    assigned doctors inspect a unified descending clinical timeline built by <code>getPatientMedicalHistoryAction</code>
    combining prescriptions, lab reports, and completed consultations.
  </p>

  <h2 class="sec-heading">5.3 Worklet 3: Billing, Reports &amp; System Administration (DBMS, Web Tech)</h2>
  <p>
    Worklet 3 unifies revenue collection, operational analytics, notifications, auditing, and database backup/recovery.
    <code>BillingRequestQueue</code> (<code>src/lib/queue/billing-queue.ts</code>) serializes
    <code>generateBillAction</code> and <code>recordPaymentAction</code> so concurrent payment submissions cannot
    corrupt <code>paidAmount</code> or status transitions (<code>UNPAID</code> &rarr; <code>PARTIALLY_PAID</code>
    &rarr; <code>PAID</code>). Similarly, <code>NotificationRequestQueue</code> serializes notification creation for
    <code>NotificationBell.tsx</code>.
  </p>

  {fig_block("Figure 5.3", "Billing Lifecycle and Payment State Transition Diagram", diagram_paths["bill"])}

  <p class="table-caption">Table 5.3: Inventory of Server Actions and REST API Endpoints</p>
  <table>
    <thead>
      <tr>
        <th>Module / Endpoint</th>
        <th>Exported Actions / Handlers</th>
      </tr>
    </thead>
    <tbody>
      <tr><td><code>src/actions/auth.ts</code></td><td><code>loginAction</code>, <code>registerPatientAction</code>, <code>logoutAction</code>, <code>getAuthUserAction</code></td></tr>
      <tr><td><code>src/actions/patient.ts</code></td><td><code>getPatientsAction</code>, <code>getPatientByIdAction</code>, <code>createPatientAction</code>, <code>updatePatientAction</code>, <code>deletePatientAction</code>, <code>getPatientFullDossierAction</code>, <code>togglePatientActiveAction</code></td></tr>
      <tr><td><code>src/actions/department.ts</code></td><td><code>getDepartmentsAction</code>, <code>getDepartmentByIdAction</code>, <code>createDepartmentAction</code>, <code>updateDepartmentAction</code>, <code>deleteDepartmentAction</code></td></tr>
      <tr><td><code>src/actions/doctor.ts</code></td><td><code>getDoctorsAction</code>, <code>getDoctorByIdAction</code>, <code>createDoctorAction</code>, <code>updateDoctorAction</code>, <code>updateDoctorScheduleAction</code>, <code>toggleDoctorActiveAction</code>, <code>addDoctorLeaveAction</code>, <code>getDoctorLeavesAction</code>, <code>deleteDoctorLeaveAction</code>, <code>deleteDoctorAction</code></td></tr>
      <tr><td><code>src/actions/appointment.ts</code></td><td><code>getAvailableSlotsAction</code>, <code>bookAppointmentAction</code>, <code>rescheduleAppointmentAction</code>, <code>cancelAppointmentAction</code>, <code>getAppointmentsAction</code>, <code>getAppointmentByIdAction</code>, <code>updateAppointmentStatusAction</code>, <code>getAppointmentQueueMetricsAction</code>, <code>checkInAppointmentAction</code>, <code>startConsultationAction</code>, <code>markNoShowAction</code>, <code>reassignAppointmentAction</code></td></tr>
      <tr><td><code>src/actions/medical-record.ts</code></td><td><code>createPrescriptionAction</code> (alias <code>completeConsultationAction</code>), <code>uploadMedicalReportAction</code>, <code>getPatientMedicalHistoryAction</code></td></tr>
      <tr><td><code>src/actions/billing.ts</code></td><td><code>generateBillAction</code>, <code>recordPaymentAction</code>, <code>getBillsAction</code>, <code>getBillByIdAction</code></td></tr>
      <tr><td><code>src/actions/report.ts</code></td><td><code>getRevenueAndFootfallReportsAction</code>, <code>exportReportCsvAction</code></td></tr>
      <tr><td><code>src/actions/admin.ts</code></td><td><code>getAdminOperationalMetricsAction</code></td></tr>
      <tr><td><code>src/actions/audit.ts</code></td><td><code>getAuditLogsAction</code></td></tr>
      <tr><td><code>src/actions/notification.ts</code></td><td><code>createNotificationHelper</code>, <code>getNotificationsAction</code>, <code>markNotificationAsReadAction</code>, <code>markAllNotificationsAsReadAction</code></td></tr>
      <tr><td><code>src/app/api/health/route.ts</code></td><td><code>GET /api/health</code> (executes <code>SELECT 1</code>, returns DB latency, uptime, Node version, heap MB)</td></tr>
    </tbody>
  </table>
</div>
"""

    # ------------------------------------------------------------------
    # CHAPTER 6: TESTING
    # ------------------------------------------------------------------
    ch6 = """
<div class="chapter-start">
  <div class="chapter-header">
    <div class="chapter-num">Chapter 6</div>
    <div class="chapter-name">TESTING</div>
  </div>

  <h2 class="sec-heading">6.1 Test Plan</h2>
  <p>
    The verification strategy combines static type and schema validation, live database connectivity and credential
    verification, in-memory unit tests covering data structures, OOP domain classes, currency formatting, and JWT
    cryptography, and integration test scripts authored in <code>scratch/test-*.ts</code>. During final report
    verification, all non-destructive checks were executed directly against the repository and live Neon PostgreSQL
    instance, while database-mutating scripts (such as <code>scratch/test-concurrency.ts</code> and
    <code>scratch/test-team3-e2e.ts</code>) were inspected by source without modifying live seeded records.
  </p>

  <h2 class="sec-heading">6.2 Test Cases</h2>
  <p class="table-caption">Table 6.1: Functional, Concurrency, and Security Test Cases</p>
  <table>
    <thead>
      <tr>
        <th>Test ID</th>
        <th>Module &amp; Scenario</th>
        <th>Expected Behavior</th>
        <th>Verification Basis</th>
      </tr>
    </thead>
    <tbody>
      <tr><td><strong>TC-01</strong></td><td>TypeScript Compilation (<code>npx tsc --noEmit</code>)</td><td>Zero type errors under <code>strict: true</code> across all <code>src/</code> files.</td><td>Executed &amp; Passed</td></tr>
      <tr><td><strong>TC-02</strong></td><td>Prisma Schema Integrity (<code>npx prisma validate</code>)</td><td>All 14 models, 4 enums, and relations validate cleanly.</td><td>Executed &amp; Passed</td></tr>
      <tr><td><strong>TC-03</strong></td><td>Seeded Auth Credentials (<code>scratch/test-login.ts</code>)</td><td>5/5 seeded users authenticate via <code>bcryptjs.compare()</code> against DB hashes.</td><td>Executed &amp; Passed (5/5)</td></tr>
      <tr><td><strong>TC-04</strong></td><td>JWT Sign &amp; Verify (<code>signJWT</code> / <code>verifyJWT</code>)</td><td>HS256 token preserves <code>id</code>, <code>email</code>, <code>role</code>, and <code>patientId</code> round-trip.</td><td>Unit Check Passed</td></tr>
      <tr><td><strong>TC-05</strong></td><td><code>FifoQueue&lt;T&gt;</code> &amp; Request Queues</td><td><i>O</i>(1) FIFO ordering preserved; concurrent <code>appointmentQueue</code>, <code>billingQueue</code>, and <code>notificationQueue</code> tasks serialize without overlap.</td><td>Unit Check Passed</td></tr>
      <tr><td><strong>TC-06</strong></td><td>Domain Models &amp; INR Formatting</td><td><code>AppointmentModel</code>, <code>MedicalReportModel</code>, <code>PrescriptionModel</code>, <code>BillModel</code>, <code>PaymentModel</code>, and <code>formatCurrency(150000)</code> return exact domain outputs (<code>&#8377;1,50,000.00</code>).</td><td>Unit Check Passed</td></tr>
      <tr><td><strong>TC-07</strong></td><td>Live PostgreSQL Indexes &amp; Seed State</td><td>47 indexes active including <code>unique_active_appointment_slot</code>; INR <code>SystemSetting</code> and seeded accounts verified.</td><td>Executed &amp; Passed</td></tr>
      <tr><td><strong>TC-08</strong></td><td>10-Way Concurrent Slot Booking</td><td>10 simultaneous requests for one slot yield exactly 1 winner and 9 conflict rejections without double-booking.</td><td>Inspected in <code>test-concurrency.ts</code> &amp; <code>test-team2-edge-cases.ts</code></td></tr>
      <tr><td><strong>TC-09</strong></td><td>Partial, Full &amp; Overpayment Guards</td><td><code>PaymentModel.isValidPayment()</code> and <code>recordPaymentAction</code> transition <code>UNPAID</code> &rarr; <code>PARTIALLY_PAID</code> &rarr; <code>PAID</code> and reject excess amounts.</td><td>Unit + Inspected in <code>test-team3-e2e.ts</code></td></tr>
      <tr><td><strong>TC-10</strong></td><td>ESLint Configuration (<code>npm run lint</code>)</td><td>Interactive ESLint setup prompt fails in non-interactive CI/CLI because <code>.eslintrc.*</code> is unconfigured.</td><td>Executed (Exited 1 — Known Gap)</td></tr>
    </tbody>
  </table>

  <h2 class="sec-heading">6.3 Test Results</h2>
  <p class="table-caption">Table 6.2: Verified Build, Static Check, Unit, and Live Database Results</p>
  <table>
    <thead>
      <tr>
        <th>Verification Command / Suite</th>
        <th>Outcome</th>
        <th>Observed Metrics / Output</th>
      </tr>
    </thead>
    <tbody>
      <tr><td><code>npx tsc --noEmit</code></td><td><strong>PASSED</strong> (Exit 0)</td><td>0 TypeScript compilation errors across <code>src/</code>.</td></tr>
      <tr><td><code>npx prisma validate</code></td><td><strong>PASSED</strong> (Exit 0)</td><td><code>The schema at prisma\schema.prisma is valid.</code></td></tr>
      <tr><td><code>npx tsx scratch/verify-db.ts</code></td><td><strong>PASSED</strong> (Exit 0)</td><td>Verified INR <code>SystemSetting</code>, 9 users, 3 doctors, 4 patients, 2 bills, and <code>AuditLog</code> trail.</td></tr>
      <tr><td><code>npx tsx scratch/test-login.ts</code></td><td><strong>PASSED</strong> (Exit 0)</td><td>5/5 seeded login accounts verified with <code>bcryptjs.compare</code>.</td></tr>
      <tr><td>In-Memory Unit Suite (<code>npx tsx -</code>)</td><td><strong>PASSED</strong> (11/11)</td><td>11/11 assertions passed across <code>FifoQueue</code>, all 3 queues, 5 domain models, <code>formatCurrency</code>, and JWT.</td></tr>
      <tr><td>Live PostgreSQL <code>pg_indexes</code> Check</td><td><strong>PASSED</strong> (Exit 0)</td><td>Confirmed 47 indexes including partial unique index <code>unique_active_appointment_slot</code>.</td></tr>
      <tr><td><code>npm run lint</code> (<code>next lint</code>)</td><td><strong>FAILED</strong> (Exit 1)</td><td>Repository lacks <code>.eslintrc.*</code> / <code>eslint.config.*</code>; Next.js prompts interactively to configure ESLint.</td></tr>
    </tbody>
  </table>
</div>
"""

    # ------------------------------------------------------------------
    # CHAPTER 7: OTHER SPECIFICATION
    # ------------------------------------------------------------------
    ch7 = """
<div class="chapter-start">
  <div class="chapter-header">
    <div class="chapter-num">Chapter 7</div>
    <div class="chapter-name">OTHER SPECIFICATION</div>
  </div>

  <h2 class="sec-heading">7.1 Advantages</h2>
  <ul>
    <li><strong>End-to-End Type Safety &amp; Validation:</strong> Strict TypeScript (<code>tsc --noEmit</code> passing with zero errors), Zod input schemas, and <code>toPlainObject()</code> serialization prevent runtime shape mismatches between PostgreSQL and React components.</li>
    <li><strong>Multi-Layered Concurrency Safety:</strong> Combining <code>appointmentQueue</code>, Prisma transactions, and the PostgreSQL partial unique index <code>unique_active_appointment_slot</code> eliminates double-booking while permitting cancelled slots to be safely re-booked.</li>
    <li><strong>Self-Healing Sessions &amp; RBAC:</strong> <code>requireAuth()</code> validates active status against PostgreSQL on every protected action, preventing stale JWT usage after account deactivation or re-seeding.</li>
    <li><strong>Seamless Clinical-to-Financial Automation:</strong> Completing a consultation in <code>createPrescriptionAction</code> automatically generates an itemized INR bill with 5% GST, reducing billing leakage.</li>
    <li><strong>Built-In Observability &amp; Recovery:</strong> Includes <code>AuditLog</code> history, <code>GET /api/health</code> DB latency diagnostics, CSV reporting, and JSON database snapshot backup/restore scripts.</li>
  </ul>

  <h2 class="sec-heading">7.2 Limitations</h2>
  <ul>
    <li><strong>Single-Process In-Memory Queues:</strong> <code>appointmentQueue</code>, <code>billingQueue</code>, and <code>notificationQueue</code> reside on <code>globalThis</code>; multi-instance serverless deployments rely on the PostgreSQL partial unique index rather than cross-node queue memory.</li>
    <li><strong>URL-Based Medical Report Metadata:</strong> <code>MedicalReport</code> persists external or static <code>fileUrl</code> links rather than binary multipart uploads to cloud object storage (such as S3 or Vercel Blob).</li>
    <li><strong>Polling-Based Notifications:</strong> <code>NotificationBell.tsx</code> polls <code>getNotificationsAction</code> every 20 seconds instead of streaming updates over WebSockets or Server-Sent Events.</li>
    <li><strong>Scope &amp; Tooling Gaps Identified in Audit:</strong> <code>scripts/backup-db.ts</code> and <code>restore-db.ts</code> cover 13 tables but omit <code>doctorLeave</code>; <code>npm run lint</code> lacks a preconfigured ESLint config file; <code>src/actions/report.ts</code> initializes per-department <code>consultations</code> count to <code>0</code>; and <code>getBillByIdAction</code> / <code>recordPaymentAction</code> scope ownership strictly for <code>PATIENT</code> while relying on role trust for <code>DOCTOR</code>.</li>
  </ul>

  <h2 class="sec-heading">7.3 Applications</h2>
  <ul>
    <li><strong>Outpatient Clinics &amp; Polyclinics:</strong> Multi-doctor scheduling with break windows, leave conflict alerts, and rapid walk-in check-in by receptionists.</li>
    <li><strong>Specialty Diagnostic &amp; Consultation Centers:</strong> Unified patient history timelines linking prescriptions and diagnostic report categories (Blood Test, MRI, X-Ray, CT Scan, ECG).</li>
    <li><strong>Academic &amp; Healthcare Software Training:</strong> Serves as a reference full-stack architecture demonstrating transactional concurrency control, RBAC, and coursewise IT integration.</li>
  </ul>
</div>
"""

    # ------------------------------------------------------------------
    # CHAPTER 8: IMPLEMENTATION AND RESULT
    # ------------------------------------------------------------------
    ch8 = """
<div class="chapter-start">
  <div class="chapter-header">
    <div class="chapter-num">Chapter 8</div>
    <div class="chapter-name">IMPLEMENTATION AND RESULT</div>
  </div>

  <h2 class="sec-heading">8.1 Methodology</h2>
  <p>
    The implemented system runs as a unified Next.js 15 application connected to Neon Serverless PostgreSQL.
    <code>prisma/seed.ts</code> populates realistic Indian healthcare entities—including 5 clinical departments
    (Cardiology, Neurology, Orthopedics, Pediatrics, General Medicine), 3 doctors with Indian Rupee consultation
    fees (&#8377;800–&#8377;1,500), 4 patients across Mumbai, Bengaluru, Delhi, and Hyderabad, 19 weekly
    <code>DoctorSchedule</code> records, a sample <code>DoctorLeave</code> triggering conflict detection, appointments
    across multiple lifecycle states, prescriptions, medical reports, bills, payments, notifications, and audit logs.
    A <code>DemoSwitcher</code> component enables evaluators to switch among 7 seeded accounts from the UI.
  </p>

  <h2 class="sec-heading">8.2 Results</h2>
  <p>
    Live read-only inspection of the Neon PostgreSQL database and application routes confirmed full operational
    readiness across all 16 frontend routes, 11 Server Action modules, and the <code>/api/health</code> endpoint.
    Table 8.1 summarizes the verified live database state alongside the seeded demo dataset.
  </p>

  <p class="table-caption">Table 8.1: Seeded Demo Accounts and Live PostgreSQL Table Counts</p>
  <table>
    <thead>
      <tr>
        <th>Database Table / Entity</th>
        <th>Live Row Count</th>
        <th>Representative Seeded Records &amp; Verified Observations</th>
      </tr>
    </thead>
    <tbody>
      <tr><td><code>User</code></td><td>9</td><td><code>admin@hospital.com</code> (ADMIN), <code>reception@hospital.com</code> (RECEPTIONIST), 3 Doctors, 4 Patients</td></tr>
      <tr><td><code>Department</code></td><td>5</td><td>Cardiology, Neurology, Orthopedics, Pediatrics, General Medicine</td></tr>
      <tr><td><code>Doctor</code></td><td>3</td><td><code>dr.malhotra@hospital.com</code> (&#8377;1,200), <code>dr.patel@hospital.com</code> (&#8377;1,500), <code>dr.iyer@hospital.com</code> (&#8377;800)</td></tr>
      <tr><td><code>Patient</code></td><td>4</td><td><code>patient.aarav@example.com</code> (O+), <code>patient.priyanka@example.com</code> (A+), <code>patient.rohan@example.com</code> (B-), <code>patient.ananya@example.com</code> (AB+)</td></tr>
      <tr><td><code>DoctorSchedule</code></td><td>19</td><td>Active weekday/weekend 30-min consultation blocks with configured break intervals</td></tr>
      <tr><td><code>DoctorLeave</code></td><td>1</td><td>Seeded leave record for Dr. Patel demonstrating conflict detection in admin metrics</td></tr>
      <tr><td><code>Appointment</code></td><td>10</td><td>Spans <code>CONFIRMED</code>, <code>COMPLETED</code>, <code>CANCELLED</code>, and leave-conflicted states under <code>unique_active_appointment_slot</code></td></tr>
      <tr><td><code>Prescription</code></td><td>2</td><td>JSON medication arrays with diagnosis, symptoms, and follow-up dates</td></tr>
      <tr><td><code>MedicalReport</code></td><td>4</td><td>Diagnostic report metadata linked to patients and ordering physicians</td></tr>
      <tr><td><code>Bill</code> / <code>Payment</code></td><td>2 / 1</td><td>Includes &#8377;1,365 <code>UNPAID</code> bill for Priyanka and settled payment transaction record</td></tr>
      <tr><td><code>Notification</code> / <code>AuditLog</code></td><td>8 / 11</td><td>Role notifications and chronological audit trail for logins, bookings, and billing</td></tr>
      <tr><td><code>SystemSetting</code></td><td>6</td><td>Stores localized Indian currency (<code>INR</code>, <code>&#8377;</code>, <code>en-IN</code>) and system parameters</td></tr>
    </tbody>
  </table>
</div>
"""

    # ------------------------------------------------------------------
    # CHAPTER 9: PROJECT PLAN
    # ------------------------------------------------------------------
    ch9 = f"""
<div class="chapter-start">
  <div class="chapter-header">
    <div class="chapter-num">Chapter 9</div>
    <div class="chapter-name">PROJECT PLAN</div>
  </div>

  <p>
    The project was executed over a 12-week academic semester divided into six structured milestones, beginning with
    requirement analysis and database design and concluding with worklet integration, concurrency testing, and final
    documentation.
  </p>

  {fig_block("Figure 9.1", "Semester Project Plan and Worklet Integration Gantt Chart", diagram_paths["gantt"])}

  <p class="table-caption">Table 9.1: Project Plan Milestones and Deliverables</p>
  <table>
    <thead>
      <tr>
        <th>Phase</th>
        <th>Timeline</th>
        <th>Primary Activities</th>
        <th>Verified Deliverables</th>
      </tr>
    </thead>
    <tbody>
      <tr><td><strong>Phase 1: Analysis &amp; Design</strong></td><td>Weeks 1–2</td><td>SRS authoring, RBAC definition, ER modeling, UML diagrams</td><td>SRS, ERD, 14-model <code>prisma/schema.prisma</code></td></tr>
      <tr><td><strong>Phase 2: Core &amp; Worklet 1</strong></td><td>Weeks 3–4</td><td>Auth (<code>jose</code> JWT, <code>bcryptjs</code>), Edge Middleware, Patient/Doctor/Dept CRUD</td><td><code>src/lib/auth/*</code>, <code>src/middleware.ts</code>, Worklet 1 UI &amp; Actions</td></tr>
      <tr><td><strong>Phase 3: Worklet 2 (Scheduling &amp; EHR)</strong></td><td>Weeks 5–7</td><td><code>FifoQueue</code>, <code>AppointmentRequestQueue</code>, slot engine, prescriptions, history</td><td><code>src/lib/queue/*</code>, <code>appointment.ts</code>, <code>medical-record.ts</code>, partial unique index</td></tr>
      <tr><td><strong>Phase 4: Worklet 3 (Billing &amp; Admin)</strong></td><td>Weeks 8–9</td><td><code>BillingRequestQueue</code>, invoices, analytics, audit logs, backup/restore CLI</td><td><code>billing.ts</code>, <code>report.ts</code>, <code>admin.ts</code>, <code>audit.ts</code>, <code>scripts/*</code></td></tr>
      <tr><td><strong>Phase 5: Integration &amp; Testing</strong></td><td>Weeks 10–11</td><td>TypeScript strict build, concurrency stress tests, RBAC &amp; edge-case verification</td><td><code>tsc --noEmit</code>, <code>prisma validate</code>, <code>scratch/test-*.ts</code></td></tr>
      <tr><td><strong>Phase 6: Final Review &amp; Report</strong></td><td>Week 12</td><td>Codebase audit, PlantUML architecture/UML generation, EDI mini-project report</td><td><code>Hospital_Management_System_Report.pdf</code></td></tr>
    </tbody>
  </table>
</div>
"""

    # ------------------------------------------------------------------
    # CHAPTER 10: CONCLUSION AND FUTURE WORK
    # ------------------------------------------------------------------
    ch10 = """
<div class="chapter-start">
  <div class="chapter-header">
    <div class="chapter-num">Chapter 10</div>
    <div class="chapter-name">CONCLUSION AND FUTURE WORK</div>
  </div>

  <p>
    <strong>Conclusion:</strong> The Hospital Management System successfully demonstrates an integrated, full-stack
    healthcare operations platform uniting Patient &amp; User Management, Concurrency-Safe Appointment Scheduling &amp;
    Electronic Health Records, and Itemized Billing, Reporting &amp; Administration. Built with Next.js 15, React 19,
    strict TypeScript, Zod, Prisma ORM, and Neon Serverless PostgreSQL, the system enforces defense-in-depth RBAC
    across 16 pages and 11 Server Action modules while guaranteeing zero double-bookings through a three-layer
    architecture (<code>AppointmentRequestQueue</code>, Prisma interactive transactions, and PostgreSQL partial unique
    index <code>unique_active_appointment_slot</code>). Static type checking (<code>npx tsc --noEmit</code>), schema
    validation (<code>npx prisma validate</code>), live credential checks, and 11/11 in-memory unit checks on queues,
    domain models, currency formatting, and JWT cryptography passed cleanly.
  </p>

  <p><strong>Future Work:</strong></p>
  <ul>
    <li><strong>Cloud Object Storage for Medical Reports:</strong> Integrate pre-signed uploads (AWS S3 or Vercel Blob) with MIME-type and size validation so diagnostic PDFs and DICOM/radiology images are stored directly rather than referenced via <code>fileUrl</code>.</li>
    <li><strong>Distributed Queue &amp; Real-Time Events:</strong> Replace single-process in-memory queues with Redis/Upstash locks for multi-region serverless scaling, and upgrade 20-second notification polling to Server-Sent Events (SSE) or WebSockets.</li>
    <li><strong>CI Linting &amp; Automated Backup Hardening:</strong> Configure ESLint (<code>eslint.config.mjs</code>), add <code>doctorLeave</code> to <code>scripts/backup-db.ts</code> and <code>restore-db.ts</code>, fix department consultation count incrementation in <code>src/actions/report.ts</code>, and enforce doctor-level scoping in <code>getBillByIdAction</code>.</li>
    <li><strong>Telemedicine &amp; HL7/FHIR Interoperability:</strong> Add video consultation links, automated SMS/email reminders, and FHIR-compliant clinical record export.</li>
  </ul>
</div>
"""

    # ------------------------------------------------------------------
    # BIBLIOGRAPHY & REFERENCES (Pages matching template 20 & 21)
    # ------------------------------------------------------------------
    bib_and_ref = """
<div class="chapter-start">
  <div class="chapter-header">
    <div class="chapter-name">BIBLIOGRAPHY</div>
  </div>
  <ol class="bib-list">
    <li>Abraham Silberschatz, Henry F. Korth, and S. Sudarshan, <em>Database System Concepts</em>, 7th Edition, McGraw-Hill Education, 2019. (Relational normalization, ACID transactions, and concurrency control).</li>
    <li>Ian Sommerville, <em>Software Engineering</em>, 10th Edition, Pearson Education, 2015. (SRS specification, UML modeling, and modular software verification).</li>
    <li>Abraham Silberschatz, Peter Baer Galvin, and Greg Gagne, <em>Operating System Concepts</em>, 10th Edition, Wiley, 2018. (Process synchronization, queuing, and race-condition prevention).</li>
    <li>Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, and Clifford Stein, <em>Introduction to Algorithms</em>, 4th Edition, MIT Press, 2022. (Linked-list FIFO queue data structures and asymptotic complexity).</li>
    <li>Andrew S. Tanenbaum and David J. Wetherall, <em>Computer Networks</em>, 5th Edition, Pearson, 2011. (HTTP/TLS client-server communication and web security primitives).</li>
  </ol>
</div>

<div class="chapter-start">
  <div class="chapter-header">
    <div class="chapter-name">REFERENCES</div>
  </div>
  <ol class="bib-list">
    <li>A. C. Babu, V. N. C. Sai Teja, A. D. Reddy, E. N. Kumar, and V. Srinivas, &ldquo;Web Based Hospital Management System,&rdquo; in <em>Proc. 2023 9th International Conference on Advanced Computing and Communication Systems (ICACCS)</em>, Vol. 1, pp. 1109&ndash;1113, 2023.</li>
    <li>N. A. Kumar J. and S. Suresh, &ldquo;A Proposal of Smart Hospital Management Using Hybrid Cloud, IoT, ML, and AI,&rdquo; in <em>Proc. 2019 International Conference on Communication and Electronics Systems (ICCES)</em>, pp. 1082&ndash;1085, 2019.</li>
    <li>A. Raut, D. Maru, R. Schwarz, et al., &ldquo;Design and implementation of an affordable, public sector electronic medical record in rural Nepal,&rdquo; <em>BMJ Health &amp; Care Informatics</em> (<em>Journal of Innovation in Health Informatics</em>), 2017.</li>
    <li>C. J. Seebregts, B. W. Mamlin, P. G. Biondich, H. S. F. Fraser, D. Jazayeri, et al., &ldquo;The OpenMRS Implementers Network,&rdquo; <em>International Journal of Medical Informatics</em>, Vol. 78, No. 11, pp. 711&ndash;720, Nov. 2009.</li>
    <li>N. Mohammed-Rajput, D. Smith, B. W. Mamlin, P. G. Biondich, and B. N. Doebbeling, &ldquo;OpenMRS, a global medical records system collaborative: factors influencing successful implementation,&rdquo; <em>AMIA Annual Symposium Proceedings</em>, 2011.</li>
    <li>T. Cayirli and E. Veral, &ldquo;Outpatient Scheduling in Health Care: A Review of Literature,&rdquo; <em>Production and Operations Management</em>, Vol. 12, No. 4, pp. 519&ndash;549, Winter 2003.</li>
    <li>R. S. Sandhu, E. J. Coyne, H. L. Feinstein, and C. E. Youman, &ldquo;Role-Based Access Control Models,&rdquo; <em>IEEE Computer</em>, Vol. 29, No. 2, pp. 38&ndash;47, Feb. 1996.</li>
    <li>A. U. R. Butt, T. Mahmood, T. Saba, S. A. O. Bahaj, F. S. Alamri, M. W. Iqbal, and A. R. Khan, &ldquo;An Optimized Role-Based Access Control Using Trust Mechanism in E-Health Cloud Environment,&rdquo; <em>IEEE Access</em>, Vol. 11, pp. 138813&ndash;138826, 2023.</li>
    <li>M. S. Baihan, &ldquo;Role-based Access Control Solution for GraphQL-based Fast Healthcare Interoperability Resources Health Application Programming Interface,&rdquo; in <em>Proc. 2022 IEEE International Conference on E-health Networking, Application &amp; Services (HealthCom)</em>, pp. 1&ndash;6, 2022.</li>
    <li>P. A. Bernstein and N. Goodman, &ldquo;Concurrency Control in Distributed Database Systems,&rdquo; <em>ACM Computing Surveys</em>, Vol. 13, No. 2, pp. 185&ndash;221, June 1981.</li>
  </ol>
</div>
"""

    return (
        f"<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n"
        f'<meta charset="utf-8" />\n'
        f"<title>Hospital Management System - EDI Mini Project Report</title>\n"
        f"<style>\n{css}\n</style>\n"
        f"</head>\n<body>\n"
        f"{front_matter}\n"
        f"{ch1}\n{ch2}\n{ch3}\n{ch4}\n{ch5}\n{ch6}\n{ch7}\n{ch8}\n{ch9}\n{ch10}\n{bib_and_ref}\n"
        f"</body>\n</html>"
    )


def build_front_page2_html() -> str:
    css = (BUILDER_DIR / "report.css").read_text(encoding="utf-8")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Page 2 - Project Scope</title>
<style>
{css}
.p2-heading {{
  font-size: 13pt;
  font-weight: bold;
  margin: 0 0 6pt 0;
}}
.p2-sub {{
  font-size: 12.5pt;
  font-weight: bold;
  margin: 12pt 0 6pt 0;
}}
</style>
</head>
<body>
  <div class="p2-heading">Project Scope</div>
  <p>
    The <strong>Hospital Management System (HMS)</strong> is a full-stack clinical and hospital operations
    platform engineered with Next.js 15 (App Router), React 19, TypeScript, Prisma ORM, and Neon Serverless
    PostgreSQL. It replaces fragmented manual registers with three integrated worklets: <strong>Worklet 1</strong>
    (Patient &amp; User Management), <strong>Worklet 2</strong> (Appointment Scheduling &amp; Electronic Health
    Records), and <strong>Worklet 3</strong> (Billing, Reports &amp; System Administration), serving
    <code>ADMIN</code>, <code>DOCTOR</code>, <code>RECEPTIONIST</code>, and <code>PATIENT</code> roles across
    16 pages, 11 Server Action modules, 1 health API route (<code>GET /api/health</code>), and a 14-model
    PostgreSQL schema.
  </p>

  <div class="p2-sub">Key Objectives</div>
  <ul>
    <li><strong>Role-Based Security &amp; Access Control:</strong> Enforce HS256 JWT authentication via HTTP-only cookies (<code>hms_auth_token</code>), Edge Middleware route guards (<code>src/middleware.ts</code>), and PostgreSQL-verified session healing (<code>requireAuth()</code>, <code>requireRole()</code>).</li>
    <li><strong>Conflict-Free Concurrent Scheduling:</strong> Prevent double-booking under simultaneous requests using a three-layer architecture: linked-list FIFO queue serialization (<code>AppointmentRequestQueue</code>), Prisma interactive transactions (<code>prisma.$transaction</code>), and the PostgreSQL partial unique index <code>unique_active_appointment_slot</code>.</li>
    <li><strong>Dynamic Availability &amp; Leave Awareness:</strong> Compute 30-minute slots from <code>DoctorSchedule</code> shift timings while excluding breaks (<code>breakStartTime</code>&ndash;<code>breakEndTime</code>), active <code>DoctorLeave</code> intervals, and existing non-cancelled appointments.</li>
    <li><strong>Automated Consultation-to-Billing Workflow:</strong> Atomically save digital <code>Prescription</code> records, transition visits to <code>COMPLETED</code>, and generate itemized Indian Rupee (<code>&#8377;</code>) bills with 5% GST and multi-channel payment tracking via <code>BillingRequestQueue</code>.</li>
    <li><strong>Auditability, Analytics &amp; Recovery:</strong> Maintain immutable <code>AuditLog</code> trails, provide 14-day revenue/footfall analytics with CSV export, and support JSON database backup/restore scripts.</li>
  </ul>

  <div class="p2-sub">Scope</div>
  <p>
    The system is scoped to outpatient clinics, polyclinics, and multi-specialty consultation centers requiring
    centralized patient registration, specialist directory and schedule management, conflict-free appointment
    booking, longitudinal medical history timelines, automated invoicing, and administrative oversight. Academically,
    the project demonstrates applied Engineering Design and Innovation (EDI) integration across Basic Programming,
    Object-Oriented Programming, Data Structures, Database Management Systems, Computer Networks, Operating
    Systems, Software Engineering, and Web Technology.
  </p>
</body>
</html>"""


def build_front_page4_html() -> str:
    css = (BUILDER_DIR / "report.css").read_text(encoding="utf-8")
    members = [
        ("TY125", "CHINMAY PALASKAR"),
        ("TY144", "SHARVARI ARALKAR"),
        ("TY136", "PRANAV CHAVAN"),
        ("TY141", "SWARAJ KATKAR"),
        ("TY126", "DHIRAJ BHOSALE"),
        ("TY146", "TANUSHREE PATIL"),
        ("TY142", "SARTHAK PATIL"),
        ("TY148", "SAIRAM PAMPATWAR"),
        ("TY133", "SARTHAK LOHAR"),
        ("TY147", "TANISHKA MAPARE"),
        ("TY140", "SHIVTEJ BHOSALE"),
        ("TY134", "AMOL JAWARE"),
    ]
    rows = "\n".join(
        f'<tr><td class="roll-col">{r}</td><td>{n}</td></tr>'
        for r, n in members
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Page 4 - Acknowledgement</title>
<style>
{css}
.ack-title {{
  font-size: 16pt;
  font-weight: bold;
  text-align: center;
  text-transform: uppercase;
  margin: 4pt 0 18pt 0;
}}
.ack-table {{
  width: 82%;
  margin: 14pt auto 0 auto;
  font-size: 9.5pt;
  line-height: 1.25;
}}
.ack-table th, .ack-table td {{
  padding: 2.5pt 8pt;
  border: 0.6pt solid #000000;
}}
.ack-table th {{
  background-color: #f4f4f4;
  text-align: center;
}}
.ack-table td.roll-col {{
  width: 24%;
  text-align: center;
  font-weight: bold;
}}
</style>
</head>
<body>
  <div class="ack-title">ACKNOWLEDGEMENT</div>
  <p>
    We express our sincere gratitude to our project guide, <strong>Jitendra Chavan</strong>, and EDI Coordinator
    <strong>Ms. P. R. Balage</strong>, for their guidance, encouragement, and support throughout the preparation of
    the <strong>Hospital Management System</strong> project.
  </p>
  <p>
    We are thankful to the Department of Information Technology and Marathwada Mitra Mandal&rsquo;s College of
    Engineering for providing the academic environment and opportunity to apply concepts from our foundational
    subjects to a practical healthcare operations and clinical workflow management problem.
  </p>
  <p>
    We also acknowledge the learning resources and academic references that supported our understanding of
    database management systems, data structures, algorithms, object-oriented programming, computer networks,
    operating systems, software engineering, and web technology.
  </p>
  <p>
    Finally, we thank everyone who directly or indirectly contributed to the development and documentation of this
    project.
  </p>

  <table class="ack-table">
    <thead>
      <tr>
        <th>Roll No</th>
        <th>Name of the Student</th>
      </tr>
    </thead>
    <tbody>
      {rows}
    </tbody>
  </table>
</body>
</html>"""
