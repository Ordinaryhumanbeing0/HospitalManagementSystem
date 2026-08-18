# 🏥 Hospital Management System (HMS)

> A modern, full-stack Hospital Management System designed for scalable healthcare operations, featuring automated patient registration, doctor scheduling, concurrent appointment booking, medical record and prescription management, automated billing, analytics, and role-based access control.

---

## 📌 Table of Contents

- [Overview & Objectives](#-overview--objectives)
- [System Architecture & Tech Stack](#-system-architecture--tech-stack)
- [Core Worklets & Modules](#-core-worklets--modules)
  - [Worklet 1: Patient & User Management](#worklet-1-patient--user-management)
  - [Worklet 2: Appointment & Medical Record Management](#worklet-2-appointment--medical-record-management)
  - [Worklet 3: Billing, Reports & System Administration](#worklet-3-billing-reports--system-administration)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [Concurrency & Race Condition Handling](#-concurrency--race-condition-handling)
- [Database Design & Schema](#-database-design--schema)
- [Academic & Subject-wise Mapping](#-academic--subject-wise-mapping)
- [Key Performance Indicators (KPIs)](#-key-performance-indicators-kpis)
- [Project Directory Structure](#-project-directory-structure)
- [API & Server Action Specification](#-api--server-action-specification)
- [Getting Started & Setup](#-getting-started--setup)
- [Environment Configuration](#-environment-configuration)

---

## 📖 Overview & Objectives

The **Hospital Management System (HMS)** automates hospital workflows to eliminate manual errors, eliminate appointment scheduling conflicts, ensure secure patient data access, and streamline billing and reporting.

### Primary Objectives:
- **Centralized Healthcare Workflow**: Seamlessly connect Patients, Doctors, Receptionists, and Administrators.
- **Conflict-Free Appointment Scheduling**: Handle concurrent booking requests with transactional integrity and zero double-booking.
- **Robust Medical Record Management**: Secure storage and retrieval of prescriptions, diagnostic reports, and medical history.
- **Automated Billing & Invoicing**: Real-time invoice computation with itemized service breakdown and payment tracking.
- **Role-Based Security**: Strict authentication, granular authorization, and tamper-evident audit logging.

---

## 🛠️ System Architecture & Tech Stack

```
+-------------------------------------------------------------------------------+
|                             Client Layer (Browser)                            |
|             Next.js 14+ (React Server Components, Client Components)          |
+-------------------------------------------------------------------------------+
                                      │  HTTPS / Server Actions / REST
                                      ▼
+-------------------------------------------------------------------------------+
|                       Application Layer (Next.js Fullstack)                   |
|  - Route Handlers & Server Actions   - Role-Based Access Middleware (RBAC)    |
|  - Zod Validation & Error Handling   - Auth.js / NextAuth / JWT Authentication|
|  - Concurrency Lock Manager          - PDF Invoicing Engine                   |
+-------------------------------------------------------------------------------+
                                      │  Prisma / Drizzle ORM (Connection Pool)
                                      ▼
+-------------------------------------------------------------------------------+
|                       Data & Storage Layer                                    |
|  - Neon Serverless PostgreSQL Database (ACID Transactions, Row-Level Locking) |
|  - Cloud Storage (Vercel Blob / Uploadthing / S3 for Medical Reports & PDFs)  |
+-------------------------------------------------------------------------------+
```

### Technology Breakdown

| Component | Technology | Rationale |
|---|---|---|
| **Frontend Framework** | [Next.js (App Router)](https://nextjs.org/) | Server-Side Rendering (SSR) & Server Components for speed, SEO, and secure data fetching |
| **Styling & UI** | CSS Modules / Vanilla CSS / Tailwind CSS + Lucide Icons | Clean, responsive, accessible, and fast-loading healthcare UI |
| **Backend & APIs** | Next.js Server Actions & API Route Handlers | Unified full-stack architecture with end-to-end TypeScript safety |
| **Database** | [Neon PostgreSQL](https://neon.tech/) | Serverless Postgres with instant branching, connection pooling, and strict ACID guarantees |
| **ORM / Data Access** | [Prisma ORM](https://www.prisma.io/) or [Drizzle ORM](https://orm.drizzle.team/) | Type-safe queries, migration management, and native transaction support |
| **Authentication** | NextAuth.js / Auth.js / Jose JWT | Session management, password hashing with `bcrypt`, and secure HTTP-only cookies |
| **File Storage** | Uploadthing / AWS S3 / Vercel Blob | Encrypted storage for lab reports, scans, and documents |
| **Validation** | Zod | Runtime schema validation on both client forms and server endpoints |
| **Document Generation** | `@react-pdf/renderer` or `pdfmake` | Dynamic generation of patient invoices and medical summaries |

---

## 📦 Core Worklets & Modules

Based on the project assignment specification, the system is organized into three synchronized worklets:

### Worklet 1: Patient & User Management
*Focus: Authentication, User Profiles, Role Hierarchy, and Department Management.*

- **User Registration & Authentication**: Secure sign-up/login, password hashing, password reset, and session verification.
- **Role-Based Access Control (RBAC)**: Enforced permission matrix for Admin, Doctor, Patient, and Receptionist/Staff.
- **Patient Profile Management**: Demographics, emergency contacts, blood group, allergies, and insurance info.
- **Doctor & Department Management**: Department allocation (Cardiology, Orthopedics, Pediatrics, etc.), doctor specializations, qualification profiles, and consultation fees.
- **Patient Search & Indexing**: Fast multi-parameter search (Name, Patient ID, Phone number, National ID).

### Worklet 2: Appointment & Medical Record Management
*Focus: Schedule Management, Race-condition-free Booking, and Medical Records.*

- **Doctor Schedule Management**: Define available days, shift timings, time-slot duration (e.g., 15/30 min intervals), and leave management.
- **Appointment Booking & Validation**: Interactive slot selector ensuring doctor availability and slot validity.
- **Cancellation & Rescheduling**: Rescheduling flows with automatic slot reallocation and notifications.
- **Concurrent Appointment Scheduling**: Transaction-isolated slot locking to handle simultaneous user requests.
- **Prescription & Diagnosis Records**: Digital prescription builder linked to consultations with dosage instructions.
- **Medical Report Uploads & History**: Secure file upload for lab reports, scan results, and chronological medical history timeline.

### Worklet 3: Billing, Reports & System Administration
*Focus: Financial Processing, Analytical Dashboards, Audit Logs, and System Maintenance.*

- **Billing Management**: Automated bill calculation factoring consultation fees, lab tests, medications, and room charges.
- **Payment Processing**: Multi-channel payment recording (Cash, Card, UPI, Insurance) with payment status tracking (`PAID`, `PENDING`, `PARTIAL`).
- **Invoice & Receipt Generation**: Instant PDF generation and downloadable receipt for patients.
- **Analytical Dashboards**: Metrics for daily patient footfall, department occupancy, revenue, and doctor consultation counts.
- **Hospital Reports & Data Export**: Tabular summaries with date range filters and CSV/PDF export.
- **System Audit Logs & Monitoring**: Immutable event logs for all critical actions (auth attempts, record changes, financial transactions).
- **Database Backup & Health Check**: Database status indicators and automated snapshot scheduling via Neon.

---

## 👥 Role-Based Access Control (RBAC)

| Resource / Action | Admin | Doctor | Patient | Receptionist |
|---|:---:|:---:|:---:|:---:|
| **User & Staff Management** | Full | None | None | View Only |
| **Department Management** | Full | View | View | View |
| **Doctor Schedule Configuration** | Full | Own Schedule | View Available | View Available |
| **Book Appointments** | Full | For Assigned Patients | Own Appointments | Full |
| **Cancel / Reschedule Appointments** | Full | Assigned Only | Own Only | Full |
| **Write Prescriptions / Clinical Notes** | None | Assigned Patients | None | None |
| **Upload / View Medical Reports** | Full | Assigned Patients | Own Reports | Upload Only |
| **Generate Bills & Process Payments** | Full | None | View Own Invoices | Full |
| **Access System Analytics & Audit Logs**| Full | Department Stats | None | Daily Cash Report |

---

## ⚡ Concurrency & Race Condition Handling

A core requirement is supporting **at least 10 simultaneous appointment requests for the same slot without conflicts or double-booking**.

### Solution Strategy in PostgreSQL (Neon):

1. **Database Unique Constraint**:
   ```sql
   ALTER TABLE "Appointment"
   ADD CONSTRAINT "unique_doctor_active_slot"
   UNIQUE ("doctorId", "appointmentDate", "timeSlot")
   WHERE ("status" NOT IN ('CANCELLED'));
   ```

2. **Pessimistic Row-Level Locking with Prisma Interactive Transactions**:
   ```typescript
   // Atomic appointment booking with row lock
   await prisma.$transaction(async (tx) => {
     // 1. Lock the doctor's schedule slot
     const existing = await tx.$queryRaw`
       SELECT id FROM "Appointment"
       WHERE "doctorId" = ${doctorId}
         AND "appointmentDate" = ${appointmentDate}
         AND "timeSlot" = ${timeSlot}
         AND "status" NOT IN ('CANCELLED')
       FOR UPDATE;
     `;

     if (existing.length > 0) {
       throw new Error("This time slot has already been reserved by another patient.");
     }

     // 2. Safely create appointment within the lock
     return await tx.appointment.create({
       data: {
         patientId,
         doctorId,
         appointmentDate,
         timeSlot,
         status: 'CONFIRMED'
       }
     });
   }, {
     isolationLevel: 'Serializable'
   });
   ```

3. **Queue / Optimistic Concurrency**:
   - Status transitions (`BOOKED`, `PENDING_PAYMENT`, `CANCELLED`) with database timestamps and versioning to reject stale submissions gracefully.

---

## 🗄️ Database Design & Schema

### Entity Relationship Overview

```mermaid
erDiagram
    USERS ||--o{ ROLES : "has"
    USERS ||--o| PATIENTS : "identifies"
    USERS ||--o| DOCTORS : "identifies"
    
    DEPARTMENTS ||--o{ DOCTORS : "employs"
    DOCTORS ||--o{ DOCTOR_SCHEDULES : "defines"
    
    PATIENTS ||--o{ APPOINTMENTS : "books"
    DOCTORS ||--o{ APPOINTMENTS : "attends"
    
    APPOINTMENTS ||--o| PRESCRIPTIONS : "results in"
    APPOINTMENTS ||--o| BILLS : "generates"
    
    PATIENTS ||--o{ MEDICAL_REPORTS : "owns"
    DOCTORS ||--o{ MEDICAL_REPORTS : "issues"
    
    BILLS ||--o{ PAYMENTS : "receives"
    USERS ||--o{ AUDIT_LOGS : "triggers"
    USERS ||--o{ NOTIFICATIONS : "receives"
```

### Key Database Tables (Prisma Schema Preview)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  DOCTOR
  PATIENT
  RECEPTIONIST
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  COMPLETED
  CANCELLED
  NO_SHOW
}

enum PaymentStatus {
  UNPAID
  PARTIALLY_PAID
  PAID
  REFUNDED
}

enum PaymentMethod {
  CASH
  CARD
  UPI
  INSURANCE
  NET_BANKING
}

model User {
  id            String         @id @default(cuid())
  email         String         @unique
  passwordHash  String
  role          Role           @default(PATIENT)
  name          String
  phone         String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  patient       Patient?
  doctor        Doctor?
  auditLogs     AuditLog[]
  notifications Notification[]
}

model Department {
  id          String    @id @default(cuid())
  name        String    @unique
  description String?
  doctors     Doctor[]
  createdAt   DateTime  @default(now())
}

model Doctor {
  id             String           @id @default(cuid())
  userId         String           @unique
  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  departmentId   String
  department     Department       @relation(fields: [departmentId], references: [id])
  specialization String
  qualification  String
  consultationFee Decimal         @db.Decimal(10, 2)
  schedules      DoctorSchedule[]
  appointments   Appointment[]
  medicalReports MedicalReport[]
  prescriptions  Prescription[]
}

model Patient {
  id             String          @id @default(cuid())
  userId         String          @unique
  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  dateOfBirth    DateTime
  gender         String
  bloodGroup     String?
  address        String?
  emergencyContact String?
  appointments   Appointment[]
  medicalReports MedicalReport[]
  prescriptions  Prescription[]
  bills          Bill[]
}

model DoctorSchedule {
  id        String   @id @default(cuid())
  doctorId  String
  doctor    Doctor   @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  dayOfWeek Int      // 0 = Sunday, 1 = Monday, ...
  startTime String   // e.g. "09:00"
  endTime   String   // e.g. "17:00"
  slotDuration Int   @default(30) // in minutes
  isActive  Boolean  @default(true)
}

model Appointment {
  id              String            @id @default(cuid())
  patientId       String
  patient         Patient           @relation(fields: [patientId], references: [id])
  doctorId        String
  doctor          Doctor            @relation(fields: [doctorId], references: [id])
  appointmentDate DateTime          @db.Date
  timeSlot        String            // e.g. "10:30"
  status          AppointmentStatus @default(CONFIRMED)
  reason          String?
  prescription    Prescription?
  bill            Bill?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@unique([doctorId, appointmentDate, timeSlot])
}

model Prescription {
  id            String      @id @default(cuid())
  appointmentId String      @unique
  appointment   Appointment @relation(fields: [appointmentId], references: [id])
  patientId     String
  patient       Patient     @relation(fields: [patientId], references: [id])
  doctorId      String
  doctor        Doctor      @relation(fields: [doctorId], references: [id])
  diagnosis     String
  notes         String?
  medications   Json        // Array of { name, dosage, frequency, duration }
  createdAt     DateTime    @default(now())
}

model MedicalReport {
  id          String   @id @default(cuid())
  patientId   String
  patient     Patient  @relation(fields: [patientId], references: [id])
  doctorId    String?
  doctor      Doctor?  @relation(fields: [doctorId], references: [id])
  title       String
  reportType  String   // Blood Test, MRI, X-Ray, etc.
  fileUrl     String
  notes       String?
  createdAt   DateTime @default(now())
}

model Bill {
  id            String        @id @default(cuid())
  patientId     String
  patient       Patient       @relation(fields: [patientId], references: [id])
  appointmentId String?       @unique
  appointment   Appointment?  @relation(fields: [appointmentId], references: [id])
  totalAmount   Decimal       @db.Decimal(10, 2)
  discount      Decimal       @default(0.00) @db.Decimal(10, 2)
  paidAmount    Decimal       @default(0.00) @db.Decimal(10, 2)
  status        PaymentStatus @default(UNPAID)
  items         Json          // Itemized breakdown: [{ title, cost, quantity }]
  payments      Payment[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model Payment {
  id          String        @id @default(cuid())
  billId      String
  bill        Bill          @relation(fields: [billId], references: [id], onDelete: Cascade)
  amount      Decimal       @db.Decimal(10, 2)
  method      PaymentMethod
  transactionRef String?
  receivedAt  DateTime      @default(now())
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  action    String   // e.g. "AUTH_LOGIN", "CANCEL_APPOINTMENT", "GENERATE_BILL"
  entity    String   // e.g. "Appointment", "User"
  entityId  String?
  details   Json?
  ipAddress String?
  createdAt DateTime @default(now())
}
```

---

## 🎓 Academic & Subject-wise Mapping

| Subject | Project Application |
|---|---|
| **Basic Programming** | Input validation, booking logic, fee calculations, and date-time interval handling. |
| **Object-Oriented Programming (OOP)** | Domain models for `User`, `Doctor`, `Patient`, `Appointment`, `Prescription`, and `Bill` with encapsulation and separation of concerns. |
| **Data Structures** | Priority queues for emergency appointments, indexing/hashing for patient lookups, and chronological lists for timeline views. |
| **Database Management Systems (DBMS)** | Normalization (3NF), relational constraints, indexes, aggregate queries (revenue/footfall), ACID compliance, and connection pooling on Neon. |
| **Computer Networks** | Secure HTTPS client-server communication, REST/Server Action endpoints, JWT token handling, and CORS/CSRF protection. |
| **Operating Systems** | Concurrency control, thread synchronization, race condition prevention, background scheduled cron tasks (backup, notification processing), and audit logging. |
| **Software Engineering** | SRS documentation, UML Diagrams (Use Case, Class, Sequence, Activity, ERD), modular folder structure, and integration testing. |
| **Web Technology** | Next.js Server & Client Components, Responsive UI, Dashboard interfaces, dynamic PDF rendering, and accessible form controls. |

---

## 🎯 Key Performance Indicators (KPIs)

| Sr. No. | Metric | Project Benchmark |
|:---:|---|---|
| **1** | **Functional Completeness** | 100% implementation of all specified modules across Worklets 1, 2, and 3 |
| **2** | **Automation Coverage** | End-to-end automation of patient onboarding, booking, prescription, and billing |
| **3** | **Authentication & RBAC** | 100% role-enforced authorization across all routes and API endpoints |
| **4** | **Database Integrity** | Zero duplicate bookings, referential integrity enforced via foreign keys and constraints |
| **5** | **System Response Time** | Average response time $\le 2$ seconds under normal operational load |
| **6** | **Concurrent Appointment Handling** | Support $\ge 10$ simultaneous booking requests on the same slot without double-booking |
| **7** | **Billing Accuracy** | 100% accurate bill calculation with complete payment audit trail |
| **8** | **Medical Report Availability** | Reports uploaded and accessible within $\le 5$ seconds |
| **9** | **Documentation Quality** | Complete SRS, UML diagrams, ER schema, and setup guide |
| **10** | **System Reliability** | Seamless integration across all 3 worklets with zero unhandled runtime crashes |

---

## 📂 Project Directory Structure

```text
HospitalManagementSystem/
├── prisma/
│   ├── schema.prisma              # Complete database schema definitions
│   └── seed.ts                    # Initial seed data (Admin, Departments, Sample Doctors)
├── public/
│   ├── images/                    # Static assets & icons
│   └── uploads/                   # Local uploads (if not using cloud storage)
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx     # Login page
│   │   │   └── register/page.tsx  # Patient registration page
│   │   ├── (dashboard)/
│   │   │   ├── admin/             # Admin portal (Users, Depts, Audit Logs, Analytics)
│   │   │   ├── doctor/            # Doctor portal (Schedule, Patients, Consultations)
│   │   │   ├── patient/           # Patient portal (Appointments, Medical History, Bills)
│   │   │   └── receptionist/      # Staff portal (Walk-in booking, Billing, Invoices)
│   │   ├── api/                   # API Route Handlers (Uploads, Webhooks, Reports)
│   │   ├── layout.tsx             # Root layout with providers
│   │   ├── page.tsx               # Landing page / Portal entry
│   │   └── globals.css            # Base design system styling
│   ├── components/                # Reusable UI Components
│   │   ├── ui/                    # Buttons, Inputs, Dialogs, Cards, Badges, Tables
│   │   ├── appointments/          # Slot picker, Calendar view, Booking modal
│   │   ├── billing/               # Invoice generator, Payment modal
│   │   ├── medical-records/       # Prescription form, Report uploader
│   │   └── shared/                # Navbar, Sidebar, Breadcrumb, Header
│   ├── lib/                       # Core Utilities & Configurations
│   │   ├── db.ts                  # Neon Postgres Prisma client singleton
│   │   ├── auth.ts                # NextAuth / Auth configuration & session helpers
│   │   ├── rbac.ts                # Role verification & permission helpers
│   │   ├── pdf.ts                 # PDF generation utility for receipts/prescriptions
│   │   └── audit.ts               # Audit logging service
│   ├── actions/                   # Server Actions (Mutations & DB Queries)
│   │   ├── appointments.ts        # Booking, Rescheduling, Cancelling with Locks
│   │   ├── billing.ts             # Bill creation, Payment settlement
│   │   ├── doctors.ts             # Doctor management & schedules
│   │   └── patients.ts            # Patient CRUD & medical record queries
│   └── types/                     # TypeScript interfaces and shared types
├── .env.example                   # Environment variable template
├── next.config.mjs                # Next.js configuration
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # Project documentation
```

---

## 🔌 API & Server Action Specification

### 1. Authentication & Users
- `POST /api/auth/register` - Create patient account
- `POST /api/auth/login` - Authenticate user & issue session
- `GET /api/users/profile` - Fetch current user profile & role

### 2. Appointments & Scheduling
- `GET /api/doctors/[id]/slots?date=YYYY-MM-DD` - Get available 30-min time slots
- `POST /actions/appointments/book` - Atomically book an appointment with lock validation
- `PATCH /actions/appointments/[id]/reschedule` - Reschedule slot
- `DELETE /actions/appointments/[id]/cancel` - Cancel appointment and free slot

### 3. Medical Records & Prescriptions
- `POST /actions/prescriptions/create` - Save diagnosis and medicine array
- `POST /api/reports/upload` - Upload diagnostic report file & metadata
- `GET /api/patients/[id]/history` - Fetch full clinical history timeline

### 4. Billing & Payments
- `POST /actions/billing/generate` - Generate bill for consultation and services
- `POST /actions/billing/pay` - Record payment transaction (Cash/Card/UPI)
- `GET /api/billing/[id]/invoice.pdf` - Stream generated PDF invoice

---

## 🚀 Getting Started & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v18.17+ or v20+
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- A free [Neon PostgreSQL](https://neon.tech/) database account

### Installation Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Ordinaryhumanbeing0/HospitalManagementSystem.git
   cd HospitalManagementSystem
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your Neon PostgreSQL connection string:
   ```env
   # Neon PostgreSQL Connection with Pooling
   DATABASE_URL="postgresql://user:password@ep-cool-project-123456.us-east-2.aws.neon.tech/hms_db?sslmode=require"
   DIRECT_URL="postgresql://user:password@ep-cool-project-123456.us-east-2.aws.neon.tech/hms_db?sslmode=require"

   # Authentication Secret
   NEXTAUTH_SECRET="your-super-secret-key-change-in-production"
   NEXTAUTH_URL="http://localhost:3000"

   # App Base URL
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

4. **Initialize Database Schema**:
   ```bash
   # Push schema directly to Neon DB
   npx prisma db push

   # (Optional) Run seed script for initial roles & sample data
   npx prisma db seed
   ```

5. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Security & Best Practices

- **Password Hashing**: Passwords stored using `bcrypt` with high salt rounds.
- **SQL Injection Prevention**: Prisma ORM parameterized queries and strict input sanitization.
- **CSRF & XSS Protection**: Next.js built-in header protections and strict form validation using Zod.
- **Audit Trails**: Every critical administrative and clinical action is logged with user ID, timestamp, action type, and IP address.
- **Secure File Storage**: File uploads validated for MIME-types and size limits before persistence.

---

## 👥 Contributors & Work Assignment

- **Team 1**: Patient & User Management Module
- **Team 2**: Appointment & Medical Record Management Module
- **Team 3**: Billing, Reporting & System Administration Module

---

## 📄 License
This project is developed for educational and institutional evaluation purposes.
