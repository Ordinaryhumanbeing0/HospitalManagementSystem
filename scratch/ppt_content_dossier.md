# Hospital Management System — 14-Slide Presentation Content Dossier

> **Target**: Editable 14-slide PowerPoint (`Hospital_Management_System_Presentation.pptx`) following the 14-slide reference structure ("Review 3 — Implementation & System Design").
> **Strict Rules**:
> - **NO team name** (`TEAM ...`) and **NO student/member names** anywhere on any slide (including Slide 1 and Slide 14).
> - **Human-readable tone**: Keep copy concise, crisp, and presentation-friendly. Include exact technical identifiers (paths, modules, libraries, constraints) only where the slide calls for them.
> - **100% verified against codebase**: Every fact below comes directly from `prisma/schema.prisma`, `src/`, `scripts/`, `package.json`, `scratch/report_dossier.md`, and verified CLI checks.

---

## Global Theme & Chrome Metadata
- **Top-Right Tag (Slides 2–13)**: `REVIEW 3 | 02` through `REVIEW 3 | 13`
- **Bottom-Left Footer (Slides 2–13)**: `SOFTWARE ENGINEERING • EDI • HOSPITAL MANAGEMENT SYSTEM`
- **Bottom-Right Slide Number (Slides 2–13)**: `2` through `13`

---

## Slide 1 — Title Slide (Dark Navy `#10284B` + Royal Blue Bar `#1D5AA8`)
- **College Header (next to MMCOE logo)**:
  - `MARATHWADA MITRA MANDAL'S COLLEGE OF ENGINEERING`
  - `Karvenagar, Pune – 411052 | Savitribai Phule Pune University`
- **Title**: `Hospital Management System`
- **Subtitle**: `Review 3 — Implementation & System Design`
- **Guide Line**: `Guide: Jitendra Chavan`
- **Department Line**: `EDI | Department of Information Technology`
- **Academic Term (optional subtle tag if matching template)**: `2026–27 SEM-I`
- **Omit**: NO team name, NO student names.

---

## Slide 2 — Project Overview (Light `#F5F8FC`)
- **Header Tag**: `REVIEW 3 | 02`
- **Slide Title**: `Project Overview`
- **1-Line Summary**: A full-stack web platform that unifies patient onboarding, conflict-free appointment scheduling, digital health records, and billing in one system.
- **3 White Rounded Cards**:
  1. **Card 1 — `Patient & Staff Portals`**
     Dedicated role-based workspaces for Patients, Doctors, Receptionists, and Administrators with instant role switching and live status updates.
  2. **Card 2 — `Clinical & Billing Operations`**
     Covers doctor shift & leave management, real-time slot booking, digital prescriptions, diagnostic reports, and automated itemized invoicing in INR (`₹`).
  3. **Card 3 — `Centralized Records`**
     Stores all users, appointments, medical histories, payments, notifications, and audit trails in a normalized Neon PostgreSQL database via Prisma ORM.
- **`Problem addressed` (3 Bullets)**:
  - Eliminates manual paper registers and disconnected spreadsheets across front desk, doctors, and billing counters.
  - Prevents simultaneous double-booking of doctor time slots through queued transactions and database-level slot constraints.
  - Protects sensitive clinical and financial records with strict role-based access control and an immutable audit log.

---

## Slide 3 — System Architecture (Light `#F5F8FC`)
- **Header Tag**: `REVIEW 3 | 03`
- **Slide Title**: `System Architecture`
- **Subtitle**: Three-tier Next.js App Router architecture connecting role-based interfaces, server actions, and PostgreSQL.
- **3 Connected White Cards**:
  1. **`1. Frontend`**
     Next.js 15 App Router pages (`src/app/`) with React 19, Tailwind CSS, `DashboardShell`, `Navbar`, `NotificationBell`, and `Modal`.
  2. **`2. Backend`**
     Edge `middleware.ts` + 11 TypeScript Server Action modules (`src/actions/`), Zod validation, RBAC guards, FIFO queues, and `/api/health`.
  3. **`3. Database`**
     Neon Serverless PostgreSQL accessed via Prisma ORM (`src/lib/prisma.ts`) with 14 normalized models, ACID transactions, and indexes.
- **Bottom Flow & URL**:
  - **Request flow:** Browser UI → `src/middleware.ts` (JWT Edge Guard) → Server Actions (`src/actions/*` + Zod + RBAC) → Prisma Client → Neon PostgreSQL.
  - **Local dev URL:** `http://localhost:3000` (with health endpoint at `GET /api/health`).

---

## Slide 4 — Technology Stack (Dark Navy `#10284B`)
- **Header Tag**: `REVIEW 3 | 04`
- **Slide Title**: `Technology Stack`
- **6 White Rounded Cards (2 cols × 3 rows)**:
  1. **Frontend**
     Next.js 15.1.7 (App Router), React 19, Tailwind CSS 3.4, Lucide Icons, `Inter` & `JetBrains Mono` fonts.
  2. **Backend**
     Next.js Server Actions (`src/actions/*.ts`), REST Health API (`/api/health`), TypeScript 5.7 (`strict: true`).
  3. **Database**
     Neon Serverless PostgreSQL (`DATABASE_URL` pooled & direct), Prisma ORM 6.4.1 (`prisma/schema.prisma`, `seed.ts`).
  4. **Security & Utilities**
     `jose` HS256 JWT (`hms_auth_token`), `bcryptjs` password hashing, `zod` schema validation, `en-IN` INR currency config.
  5. **Architecture & Concurrency**
     Custom linked-list `FifoQueue<T>` request queues (`appointmentQueue`, `billingQueue`, `notificationQueue`) & 7 OOP domain models.
  6. **Development & Tooling**
     `tsx` script runner, Node.js, JSON DB backup/restore CLI (`scripts/backup-db.ts`, `restore-db.ts`), Prisma CLI.

---

## Slide 5 — Frontend Implementation (Light `#F5F8FC`)
- **Header Tag**: `REVIEW 3 | 05`
- **Slide Title**: `Frontend Implementation`
- **1-Line Summary**: Responsive healthcare UI built with Next.js App Router, custom Tailwind design tokens, and role-tailored portals.
- **3 White Cards with Left Vertical Accent Strips** (Blue, Cyan, Green):
  1. **User Interface** (Blue strip)
     Root layout (`src/app/layout.tsx`), design tokens (`src/app/globals.css`), and shared workspace frame (`src/components/ui/DashboardShell.tsx`).
  2. **Shared Components & State** (Cyan strip)
     Role-aware `Navbar.tsx`, 20s-polling `NotificationBell.tsx`, accessible `Modal.tsx`, and quick-test `DemoSwitcher.tsx`.
  3. **App Router Pages & Flows** (Green strip)
     16 pages covering `/login`, `/register`, 4 role dashboards, `/appointments/book` wizard, `/medical-records`, `/billing`, `/reports`, and `/admin/audit`.
- **`Frontend capabilities visible in the codebase` (4 Bullets)**:
  - **4-step appointment wizard** (`/appointments/book`): department & doctor selection, date picker, live 30-minute slot chips, and confirmation.
  - **Doctor clinical workstation** (`/doctor/dashboard`): waiting room queue, weekly shift/break editor, leave manager, and digital prescription modal.
  - **Billing & printable invoices** (`/billing`): itemized charges, online settlement modal (UPI/Card/Cash), and `window.print()` tax invoice view.
  - **Executive analytics & audit trail** (`/reports`, `/admin/audit`): date/department filters, CSV report download, and searchable security log.

---

## Slide 6 — Backend Modules & Server Actions (Light `#F5F8FC`)
- **Header Tag**: `REVIEW 3 | 06`
- **Slide Title**: `Backend Modules & Server Actions`
- **6 White Cards with Left Vertical Accent Strips** (Blue, Cyan, Green, Amber, Navy, Cyan — 2 cols × 3 rows):
  1. **Auth & Admin (`auth.ts`, `admin.ts`, `audit.ts`)**
     Login, patient self-registration, JWT session healing, operational KPIs, leave-conflict detection, and paginated audit logs.
  2. **Patients & Doctors (`patient.ts`, `doctor.ts`)**
     Multi-field patient search, 360° dossier, doctor onboarding, weekly shift/break updates, leave scheduling, and active-status toggles.
  3. **Appointments (`appointment.ts`)**
     Live slot calculation (excluding breaks, leaves, and booked slots), FIFO-queued atomic booking, check-in, rescheduling, cancellation, and reassignment.
  4. **Medical Records (`medical-record.ts`)**
     Atomic consultation completion (`createPrescriptionAction` → Rx + `COMPLETED` + auto-bill), diagnostic report attachment, and EHR timeline.
  5. **Billing & Reports (`billing.ts`, `report.ts`)**
     Itemized bill generation (consultation + meds + labs + 5% tax), queued partial/full payments, revenue aggregation, and CSV export.
  6. **Departments & Alerts (`department.ts`, `notification.ts`)**
     Department CRUD with safe-delete check (`doctors > 0` guard) and queued user notifications with read/mark-all-read actions.
- **Bottom Note**:
  `11 Server Action modules under src/actions/ paired with Zod validators (src/lib/validations/) and live health check at GET /api/health.`

---

## Slide 7 — Database Design & ER Diagram (Light `#F5F8FC`)
- **Header Tag**: `REVIEW 3 | 07`
- **Slide Title**: `Database Design & ER Diagram`
- **Left Column Bullets (Core Entities)**:
  - **Identity & Access**: `User` (`ADMIN`, `DOCTOR`, `RECEPTIONIST`, `PATIENT`), `Patient`, `Doctor`, `Department`.
  - **Scheduling & Visits**: `DoctorSchedule` (shifts & breaks), `DoctorLeave`, and `Appointment` (9 lifecycle statuses).
  - **Clinical Records**: `Prescription` (1:1 per appointment, JSON medications) and `MedicalReport` (lab/imaging links).
  - **Billing & System**: `Bill`, `Payment` (5 methods), `Notification`, `AuditLog`, and `SystemSetting` (INR defaults).
- **Right Column Visual**: `scratch/diagrams/ppt_er_diagram.png`
- **Bottom Relationship Note**:
  `All 14 tables enforce primary keys, cascading/restricted foreign keys, B-tree indexes, and the live partial unique index unique_active_appointment_slot on ("doctorId", "appointmentDate", "timeSlot") WHERE status <> 'CANCELLED'.`

---

## Slide 8 — User Workflow & System Use Cases (Light `#F5F8FC`)
- **Header Tag**: `REVIEW 3 | 08`
- **Slide Title**: `User Workflow & System Use Cases`
- **Center Full-Width Visual**: `scratch/diagrams/ppt_use_cases.png`
  - **Actors**: `Patient`, `Doctor`, `Receptionist`, `Admin`
  - **Grouped Packages**:
    - `Authentication`: Sign In, Patient Registration, Role Dashboard Redirect
    - `Appointment Booking`: View Available Slots, Book / Reschedule / Cancel Slot, Check-In & Reassign Doctor
    - `Clinical & Medical Records`: Configure Shifts & Leaves, Write Prescription & Complete Visit, Upload Reports & View EHR Timeline
    - `Billing & Payments`: Auto-Generate Bill, Record Payment (UPI/Card/Cash), Print Invoice
    - `Administration & Reporting`: Manage Departments & Doctors, View Analytics & CSV Reports, Inspect Audit Logs
- **Bottom Workflow Line**:
  `End-to-end clinical flow: Patient books slot → Checks in at front desk → Doctor examines & prescribes → System auto-generates bill → Patient/Staff settles payment.`

---

## Slide 9 — Appointment & Billing Flow (Light `#F5F8FC`)
- **Header Tag**: `REVIEW 3 | 09`
- **Slide Title**: `Appointment & Billing Flow`
- **5 Numbered Circles (`01`–`05`) with Titles & Short Descriptions**:
  - **`01` — Select Specialist & Slot**: Patient or receptionist picks a department, doctor, date, and open 30-min slot.
  - **`02` — Queue & Lock Slot**: `appointmentQueue` serializes the request inside an ACID transaction and confirms booking.
  - **`03` — Check-In & Consult**: Patient checks in (`CHECKED_IN`); doctor starts exam (`IN_PROGRESS`) and reviews EHR history.
  - **`04` — Prescribe & Auto-Bill**: Doctor saves prescription; transaction marks visit `COMPLETED` and compiles itemized INR bill.
  - **`05` — Settle & Audit**: `billingQueue` processes partial or full payment, updates status (`PAID`), and logs receipt & audit trail.
- **2 Bottom White Cards with Left Accent Strips**:
  1. **Conflict prevention** (Blue strip)
     Three-layer protection: FIFO `AppointmentRequestQueue`, in-transaction active-slot & leave checks, and PostgreSQL partial unique index `unique_active_appointment_slot`.
  2. **Billing & audit records** (Green strip)
     `BillingRequestQueue` re-verifies remaining balance inside `prisma.$transaction`, blocks overpayment, emits notifications, and writes `AuditLog` entries.

---

## Slide 10 — Security & Validation (Dark Navy `#10284B`)
- **Header Tag**: `REVIEW 3 | 10`
- **Slide Title**: `Security & Validation`
- **6 White Rounded Cards (2 cols × 3 rows)**:
  1. **Authentication**
     `jose` HS256 JWT stored in HTTP-only `hms_auth_token` cookies (7-day expiry, `sameSite: 'lax'`) with DB session healing.
  2. **Password protection**
     `bcryptjs` hashing (10 salt rounds) on registration, login verification, and admin-created doctor/patient accounts.
  3. **Role access**
     Edge `src/middleware.ts` route guards + server-side `requireAuth()` / `requireRole()` checks enforcing ownership on clinical and billing data.
  4. **Input validation**
     7 `zod` schema modules (`src/lib/validations/`) validating dates, `HH:mm` slots, password strength, medications, and payment amounts.
  5. **Audit & Error handling**
     `logAudit()` records login attempts, bookings, consultations, payments, and admin changes; actions return typed `ActionResponse<T>`.
  6. **Environment config**
     Neon PostgreSQL URLs (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`) and `JWT_SECRET` externalized via `.env` (`.env.example` provided).
- **Bottom Production Readiness Line**:
  `Note: Configure a strong production JWT_SECRET, enforce non-self-service checks where needed, and enable ESLint config before cloud deployment.`

---

## Slide 11 — Core Utilities & Integrations (Light `#F5F8FC`)
- **Header Tag**: `REVIEW 3 | 11`
- **Slide Title**: `Core Utilities & Integrations`
- **3 White Rounded Cards**:
  1. **Neon Serverless PostgreSQL**
     Cloud-hosted ACID Postgres using pooled (`DATABASE_URL`) and unpooled (`DATABASE_URL_UNPOOLED`) connections via Prisma singleton.
  2. **Backup & Restore CLI**
     `scripts/backup-db.ts` and `scripts/restore-db.ts` export and upsert-restore JSON snapshots in `backups/` (2 snapshots present).
  3. **Health Check & Queues**
     `GET /api/health` measures live DB latency (`SELECT 1`) and heap usage; `FifoQueue<T>` coordinates booking, billing, and notifications.
- **`Configuration needed before a live demo` (3 Bullets)**:
  - Ensure `.env` contains valid Neon `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and `JWT_SECRET` values.
  - Run `npx prisma db push` and `npm run prisma:seed` to load the 5 departments, 3 doctors, 4 patients, and INR `SystemSetting` rows.
  - Start the app with `npm run dev` (or use `DemoSwitcher` / 1-click demo login cards for Admin, Doctor, Receptionist, and Patient).

---

## Slide 12 — Implementation Status & Validation (Dark Navy `#10284B`)
- **Header Tag**: `REVIEW 3 | 12`
- **Slide Title**: `Implementation Status & Validation`
- **3 White Rounded Cards**:
  1. **Code structure**
     Complete 3-worklet implementation across 16 Next.js pages, 5 UI components, 7 OOP domain models, and 7 Zod validation modules.
  2. **Server Actions & API**
     11 Server Action files (`src/actions/*.ts`), Edge `middleware.ts`, and `GET /api/health` DB monitor verified with strict TypeScript (`tsc --noEmit`).
  3. **Database assets**
     14 Prisma models, 4 enums, 47 live PostgreSQL indexes (including `unique_active_appointment_slot`), seeder, and backup/restore scripts.
- **`Verified checks & recommended demo flow` (4 Bullets)**:
  - **Static & schema checks passed**: `npx tsc --noEmit` (0 errors) and `npx prisma validate` (schema valid) both exited `0`.
  - **Live DB & unit checks passed**: `verify-db.ts` (9 users, INR settings), `test-login.ts` (5/5 role logins), and 11/11 in-memory queue/model/JWT checks passed.
  - **Observed repo gaps**: `npm run lint` prompts because ESLint is unconfigured; `package.json` references missing `scratch/test-connection.mjs`; `backup-db.ts` omits `DoctorLeave`.
  - **Recommended live demo flow**: Book slot (`/appointments/book`) → Check in (`/patient/dashboard`) → Issue Rx & auto-bill (`/doctor/dashboard`) → Pay & print invoice (`/billing`).

---

## Slide 13 — Current Scope & Future Enhancements (Light `#F5F8FC`)
- **Header Tag**: `REVIEW 3 | 13`
- **Slide Title**: `Current Scope & Future Enhancements`
- **2 Large White Rounded Cards**:
  1. **Core scope in the codebase**
     - Role-based portals for Admin, Doctor, Receptionist, and Patient.
     - Doctor weekly shifts, break windows, leave management, and conflict alerts.
     - Queue-serialized booking, check-in, rescheduling, cancellation, and reassignment.
     - Digital prescriptions, URL-linked medical reports, and chronological EHR timeline.
     - Auto-invoicing in INR (`₹`), partial/full payments, CSV analytics, and audit logs.
  2. **Potential next steps**
     - Binary diagnostic file upload to cloud object storage (S3 / Vercel Blob) instead of URL strings.
     - Real payment gateway integration (Razorpay / UPI webhooks) and server-generated PDF receipts.
     - WebSocket / SSE push notifications to replace 20-second client polling.
     - Multi-instance distributed locking (Redis) and ESLint + automated CI test pipeline.
- **Bottom Priority Line**:
  `Immediate priority: Configure ESLint for CI linting, add DoctorLeave to backup/restore scripts, and integrate cloud storage for diagnostic report uploads.`

---

## Slide 14 — Conclusion (Dark Navy `#10284B`)
- **Top Tag**: `REVIEW 3 • CONCLUSION`
- **Large Title**: `Hospital Management System`
- **Summary Paragraph**:
  Built as a unified, full-stack Next.js 15 and Neon PostgreSQL healthcare platform covering all three project worklets — patient & staff management, conflict-free appointment scheduling with EHR records, and automated INR billing with operational analytics and audit trails.
- **Next focus Line**:
  `Next focus: Cloud file storage for lab reports, real-time push notifications, and production CI/CD hardening.`
- **Closing Banner**: `QUESTIONS & DISCUSSION • THANK YOU`
- **Bottom-Left Footer**: `EDI | Hospital Management System` *(NO team name, NO student names)*
