# Hospital Management System (HMS) — Verified Technical Codebase Dossier

> **Purpose**: 100% directly observed technical reference for `@diagrams` and `@report-writer`, derived exclusively from reading the source files in `c:\HospitalManagementSystem` and executing safe read-only verification commands.

---

## 1. Repository & Tech Stack Overview

| Attribute | Directly Observed Value (`package.json`, `next.config.mjs`, `tsconfig.json`, `src/`) |
|---|---|
| **Package Name / Version** | `hospital-management-system` v`0.1.0` (`private: true`) |
| **Framework** | Next.js `^15.1.7` (App Router, React Server Components, Client Components, Server Actions) |
| **UI Library** | React `^19.0.0`, `react-dom` `^19.0.0` |
| **Language** | TypeScript `^5.7.3` (`strict: true`, `target: "ES2022"`, `paths: { "@/*": ["./src/*"] }`; excludes `node_modules` and `scratch`) |
| **Styling & Icons** | Tailwind CSS `^3.4.17` (`tailwind.config.ts`, `src/app/globals.css`), `lucide-react` `^0.475.0`, `clsx` `^2.1.1`, `tailwind-merge` `^3.0.2`, Google Fonts `Inter` (`--font-sans`) & `JetBrains_Mono` (`--font-mono`) in `src/app/layout.tsx` |
| **Database & ORM** | PostgreSQL (Neon Serverless, `DATABASE_URL` pooled & `DATABASE_URL_UNPOOLED` direct) via Prisma ORM (`@prisma/client` `^6.4.1`, `prisma` `^6.4.1`, singleton in `src/lib/prisma.ts`) |
| **Authentication & Security** | `jose` `^6.2.10` (HS256 JWT in HTTP-only cookie `hms_auth_token`), `bcryptjs` `^3.0.2` (10 salt rounds), Edge Middleware (`src/middleware.ts`), server-side RBAC (`src/lib/auth/rbac.ts`) |
| **Validation** | `zod` `^3.24.2` (`src/lib/validations/*.ts`) |
| **Runtime Tooling** | `tsx` `^4.19.3`, `dotenv` `^16.4.7`, `autoprefixer` `^10.5.4`, `postcss` `^8.5.3` |
| **NPM Scripts (`package.json`)** | `dev`, `build`, `start`, `lint` (`next lint`), `prisma:generate`, `prisma:push`, `prisma:migrate`, `prisma:seed` (`tsx prisma/seed.ts`), `db:test` (`node scratch/test-connection.mjs`), `db:backup` (`tsx scripts/backup-db.ts`), `db:restore` (`tsx scripts/restore-db.ts`) |
| **Localization & Currency** | Indian Healthcare Localization (`en-IN` locale, `INR`, `₹`) via `src/lib/config/currency.ts` and `SystemSetting` table |

---

## 2. System Architecture (3-Tier Full-Stack Next.js)

1. **Presentation / Client Layer (`src/app/**`, `src/components/ui/**`)**:
   - Next.js 15 App Router pages rendered with `DashboardShell`, `Navbar`, `NotificationBell`, `DemoSwitcher`, and `Modal`.
   - Role-specific portals (`/admin/dashboard`, `/admin/audit`, `/doctor/dashboard`, `/patient/dashboard`, `/receptionist/dashboard`) and shared operational modules (`/appointments`, `/appointments/book`, `/patients`, `/doctors`, `/departments`, `/medical-records`, `/billing`, `/reports`).
   - Browser `window.print()` invoice printing modal in `src/app/billing/page.tsx` and client-side `Blob` CSV download in `src/app/reports/page.tsx`.
2. **Application & Business Logic Layer (`src/middleware.ts`, `src/actions/**`, `src/lib/**`)**:
   - **Edge Interception**: `src/middleware.ts` verifies `hms_auth_token` using `jose.jwtVerify` on non-API/static routes and enforces role-prefix redirects (`/admin`, `/doctor`, `/receptionist`, `/patient`, `/dashboard`).
   - **Server Actions (`'use server'`)**: 11 action modules (`admin.ts`, `appointment.ts`, `audit.ts`, `auth.ts`, `billing.ts`, `department.ts`, `doctor.ts`, `medical-record.ts`, `notification.ts`, `patient.ts`, `report.ts`) performing Zod validation, `requireAuth()` / `requireRole()` DB-verified RBAC, queue serialization, Prisma interactive transactions, `logAudit()`, and `createNotificationHelper()`.
   - **REST API Route**: `GET /api/health` (`src/app/api/health/route.ts`) pings PostgreSQL (`SELECT 1`), returning latency, uptime, Node version, and heap memory usage.
   - **In-Memory FIFO Queues (`src/lib/queue/`)**: Linked-list `FifoQueue<T>` backing `AppointmentRequestQueue` (`appointmentQueue`), `BillingRequestQueue` (`billingQueue`), and `NotificationRequestQueue` (`notificationQueue`).
   - **OOP Domain Models (`src/lib/domain/models.ts`)**: `AppointmentModel`, `MedicalReportModel`, `PrescriptionModel`, `BillModel`, `PaymentModel`, `ReportModel`, `NotificationModel`.
3. **Data & Persistence Layer (`prisma/schema.prisma`, `src/lib/prisma.ts`, `scripts/`)**:
   - Neon Serverless PostgreSQL accessed via Prisma Client singleton (`globalForPrisma.prisma`).
   - 14 Prisma models, 4 enums, foreign-key constraints, B-tree indexes, plus a live PostgreSQL partial unique index `unique_active_appointment_slot` on `"Appointment"`.
   - JSON snapshot backup/restore CLI utilities (`scripts/backup-db.ts`, `scripts/restore-db.ts`) storing files in `backups/`.

---

## 3. Database Schema, Enums, Models & Relations (`prisma/schema.prisma`)

### 3.1 Datasource & Generator
- `datasource db`: `provider = "postgresql"`, `url = env("DATABASE_URL")`, `directUrl = env("DATABASE_URL_UNPOOLED")`.
- `generator client`: `provider = "prisma-client-js"`.

### 3.2 Enums
1. **`Role`**: `ADMIN`, `DOCTOR`, `PATIENT`, `RECEPTIONIST`
2. **`AppointmentStatus`**: `SCHEDULED`, `PENDING`, `CONFIRMED`, `CHECKED_IN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `RESCHEDULED`, `NO_SHOW`
3. **`PaymentStatus`**: `UNPAID`, `PARTIALLY_PAID`, `PAID`, `REFUNDED`, `CANCELLED`
4. **`PaymentMethod`**: `CASH`, `CARD`, `UPI`, `INSURANCE`, `NET_BANKING`

### 3.3 All 14 Prisma Models & Exact Fields

1. **`User`**
   - `id` (`String @id @default(cuid())`), `email` (`String @unique`), `passwordHash` (`String`), `role` (`Role @default(PATIENT)`), `name` (`String`), `phone` (`String?`), `isActive` (`Boolean @default(true)`), `createdAt` (`DateTime @default(now())`), `updatedAt` (`DateTime @updatedAt`)
   - Relations: `patient` (`Patient?`), `doctor` (`Doctor?`), `auditLogs` (`AuditLog[]`), `notifications` (`Notification[]`)
   - Indexes: `@@index([email])`, `@@index([role])`
2. **`Department`**
   - `id` (`String @id @default(cuid())`), `name` (`String @unique`), `description` (`String?`), `createdAt`, `updatedAt`
   - Relations: `doctors` (`Doctor[]`)
   - Indexes: `@@index([name])`
3. **`Doctor`**
   - `id` (`String @id @default(cuid())`), `userId` (`String @unique` -> `User`, `onDelete: Cascade`), `departmentId` (`String` -> `Department`, `onDelete: Restrict`), `specialization` (`String`), `qualification` (`String`), `consultationFee` (`Decimal @db.Decimal(10, 2)`), `isActive` (`Boolean @default(true)`), `createdAt`, `updatedAt`
   - Relations: `schedules` (`DoctorSchedule[]`), `leaves` (`DoctorLeave[]`), `appointments` (`Appointment[]`), `medicalReports` (`MedicalReport[]`), `prescriptions` (`Prescription[]`)
   - Indexes: `@@index([departmentId])`
4. **`Patient`**
   - `id` (`String @id @default(cuid())`), `userId` (`String @unique` -> `User`, `onDelete: Cascade`), `dateOfBirth` (`DateTime`), `gender` (`String`), `bloodGroup` (`String?`), `address` (`String?`), `emergencyContact` (`String?`), `medicalHistorySummary` (`String?`), `createdAt`, `updatedAt`
   - Relations: `appointments` (`Appointment[]`), `medicalReports` (`MedicalReport[]`), `prescriptions` (`Prescription[]`), `bills` (`Bill[]`)
   - Indexes: `@@index([userId])`
5. **`AuditLog`**
   - `id` (`String @id @default(cuid())`), `userId` (`String?` -> `User?`, `onDelete: SetNull`), `action` (`String`), `details` (`String?`), `ipAddress` (`String?`), `createdAt` (`DateTime @default(now())`)
   - Indexes: `@@index([userId])`, `@@index([action])`, `@@index([createdAt])`
6. **`DoctorSchedule`**
   - `id` (`String @id @default(cuid())`), `doctorId` (`String` -> `Doctor`, `onDelete: Cascade`), `dayOfWeek` (`Int`), `startTime` (`String`), `endTime` (`String`), `breakStartTime` (`String?`), `breakEndTime` (`String?`), `slotDuration` (`Int @default(30)`), `isActive` (`Boolean @default(true)`), `createdAt`, `updatedAt`
   - Indexes: `@@index([doctorId])`
7. **`DoctorLeave`**
   - `id` (`String @id @default(cuid())`), `doctorId` (`String` -> `Doctor`, `onDelete: Cascade`), `startDate` (`DateTime @db.Date`), `endDate` (`DateTime @db.Date`), `reason` (`String?`), `createdAt`
   - Indexes: `@@index([doctorId])`, `@@index([startDate, endDate])`
8. **`Appointment`**
   - `id` (`String @id @default(cuid())`), `patientId` (`String` -> `Patient`), `doctorId` (`String` -> `Doctor`), `appointmentDate` (`DateTime @db.Date`), `timeSlot` (`String`), `status` (`AppointmentStatus @default(CONFIRMED)`), `reason` (`String?`), `createdAt`, `updatedAt`
   - Relations: `prescription` (`Prescription?`), `bill` (`Bill?`)
   - Indexes in `schema.prisma`: `@@index([doctorId, appointmentDate, timeSlot])`, `@@index([patientId])`, `@@index([doctorId])`, `@@index([appointmentDate])`
   - **Live PostgreSQL Partial Unique Index** (verified via `pg_indexes`, created via `$executeRawUnsafe` in `scratch/test-team2-edge-cases.ts`, not declared in `schema.prisma`):
     `CREATE UNIQUE INDEX unique_active_appointment_slot ON public."Appointment" USING btree ("doctorId", "appointmentDate", "timeSlot") WHERE (status <> 'CANCELLED'::"AppointmentStatus")`
9. **`Prescription`**
   - `id` (`String @id @default(cuid())`), `appointmentId` (`String @unique` -> `Appointment`), `patientId` (`String` -> `Patient`), `doctorId` (`String` -> `Doctor`), `diagnosis` (`String`), `symptoms` (`String?`), `notes` (`String?`), `followUpDate` (`DateTime? @db.Date`), `medications` (`Json`), `createdAt`, `updatedAt`
   - Indexes: `@@index([patientId])`, `@@index([doctorId])`
10. **`MedicalReport`**
    - `id` (`String @id @default(cuid())`), `patientId` (`String` -> `Patient`), `doctorId` (`String?` -> `Doctor?`), `title` (`String`), `reportType` (`String`), `fileUrl` (`String`), `notes` (`String?`), `createdAt`, `updatedAt`
    - Indexes: `@@index([patientId])`, `@@index([doctorId])`
11. **`Bill`**
    - `id` (`String @id @default(cuid())`), `patientId` (`String` -> `Patient`), `appointmentId` (`String? @unique` -> `Appointment?`), `totalAmount` (`Decimal @db.Decimal(10, 2)`), `discount` (`Decimal @default(0.00) @db.Decimal(10, 2)`), `paidAmount` (`Decimal @default(0.00) @db.Decimal(10, 2)`), `status` (`PaymentStatus @default(UNPAID)`), `items` (`Json`), `createdAt`, `updatedAt`
    - Relations: `payments` (`Payment[]`)
    - Indexes: `@@index([patientId])`, `@@index([status])`
12. **`Payment`**
    - `id` (`String @id @default(cuid())`), `billId` (`String` -> `Bill`, `onDelete: Cascade`), `amount` (`Decimal @db.Decimal(10, 2)`), `method` (`PaymentMethod`), `transactionRef` (`String?`), `receivedAt` (`DateTime @default(now())`)
    - Indexes: `@@index([billId])`
13. **`Notification`**
    - `id` (`String @id @default(cuid())`), `userId` (`String` -> `User`, `onDelete: Cascade`), `title` (`String`), `message` (`String`), `isRead` (`Boolean @default(false)`), `createdAt` (`DateTime @default(now())`)
    - Indexes: `@@index([userId])`
14. **`SystemSetting`**
    - `id` (`String @id @default(cuid())`), `key` (`String @unique`), `value` (`String`), `description` (`String?`), `createdAt`, `updatedAt`
    - Indexes: `@@index([key])`

### 3.4 Cardinality Summary
- `User` 1 — 0..1 `Patient` (Cascade)
- `User` 1 — 0..1 `Doctor` (Cascade)
- `User` 1 — 0..* `AuditLog` (SetNull)
- `User` 1 — 0..* `Notification` (Cascade)
- `Department` 1 — 0..* `Doctor` (Restrict)
- `Doctor` 1 — 0..* `DoctorSchedule` (Cascade)
- `Doctor` 1 — 0..* `DoctorLeave` (Cascade)
- `Doctor` 1 — 0..* `Appointment`
- `Patient` 1 — 0..* `Appointment`
- `Appointment` 1 — 0..1 `Prescription`
- `Appointment` 1 — 0..1 `Bill`
- `Patient` 1 — 0..* `MedicalReport`; `Doctor` 0..1 — 0..* `MedicalReport`
- `Patient` 1 — 0..* `Prescription`; `Doctor` 1 — 0..* `Prescription`
- `Patient` 1 — 0..* `Bill`
- `Bill` 1 — 0..* `Payment` (Cascade)

---

## 4. Authentication, Middleware & RBAC Matrix

### 4.1 Authentication & Session Mechanism (`src/lib/auth/*`, `src/middleware.ts`)
- **Password Hashing**: `bcryptjs` with 10 salt rounds (`loginAction`, `registerPatientAction`, `createDoctorAction`, `createPatientAction`, `prisma/seed.ts`).
- **JWT (`src/lib/auth/jwt.ts`)**: `signJWT(payload: SessionUser, expiresIn = '7d')` and `verifyJWT(token)` using `jose` (`SignJWT`, `jwtVerify`) with `HS256` algorithm and `process.env.JWT_SECRET` (fallback hardcoded dev key in `jwt.ts` and `middleware.ts`).
- **Cookie (`src/lib/auth/session.ts`)**: `AUTH_COOKIE_NAME = 'hms_auth_token'`, `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`, `path: '/'`, `maxAge: 604800` (7 days).
- **Session Healing (`src/lib/auth/rbac.ts`, `src/actions/auth.ts`)**: `requireAuth()` and `getAuthUserAction()` re-verify the JWT user against PostgreSQL (`prisma.user.findFirst` by `id` or `email.toLowerCase()`), reject inactive/deleted users (`!dbUser || !dbUser.isActive`), auto-provision a missing `Patient` record if `role === Role.PATIENT`, and silently refresh the JWT cookie if `id`, `patientId`, `doctorId`, or `role` drifted after DB re-seeding.
- **Role Hierarchy (`src/lib/auth/rbac.ts`)**: `ROLE_HIERARCHY = { ADMIN: 4, DOCTOR: 3, RECEPTIONIST: 2, PATIENT: 1 }`.
- **Edge Middleware (`src/middleware.ts`)**:
  - `PROTECTED_PREFIXES = ['/admin', '/doctor', '/patient', '/receptionist', '/dashboard']`.
  - Matcher: `'/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'`.
  - Redirects authenticated users away from `/`, `/login`, `/register` to their `ROLE_DASHBOARDS` target (`/admin/dashboard`, `/doctor/dashboard`, `/receptionist/dashboard`, `/patient/dashboard`).
  - Redirects unauthenticated users hitting `PROTECTED_PREFIXES` to `/login?callbackUrl=...`.
  - Route guards: `/admin` requires `ADMIN`; `/doctor` requires `DOCTOR` or `ADMIN`; `/receptionist` requires `RECEPTIONIST` or `ADMIN`; `/patient` requires `PATIENT` or `ADMIN`.
  - Note: Shared pages (`/appointments`, `/appointments/book`, `/patients`, `/doctors`, `/departments`, `/medical-records`, `/billing`, `/reports`) are NOT in `PROTECTED_PREFIXES` in `middleware.ts`; they authenticate client-side via `getAuthUserAction()` and enforce authorization inside every Server Action.

### 4.2 Exact Observed RBAC Matrix (from Server Actions & Pages)

| Capability / Server Action | `ADMIN` | `DOCTOR` | `RECEPTIONIST` | `PATIENT` |
|---|---|---|---|---|
| `getAdminOperationalMetricsAction` | Allowed | Denied | Denied | Denied |
| `getAuditLogsAction` | Allowed | Denied | Denied | Denied |
| `getRevenueAndFootfallReportsAction` / `exportReportCsvAction` | Allowed | Denied | Denied | Denied |
| `createDepartmentAction` / `updateDepartmentAction` / `deleteDepartmentAction` | Allowed | Denied | Denied | Denied |
| `getDepartmentsAction` / `getDepartmentByIdAction` | Public / All (no `requireAuth()`) | Public / All | Public / All | Public / All |
| `createDoctorAction` / `toggleDoctorActiveAction` / `deleteDoctorAction` | Allowed | Denied | Denied | Denied |
| `updateDoctorAction` / `updateDoctorScheduleAction` / `addDoctorLeaveAction` / `deleteDoctorLeaveAction` | Allowed (any) | Own `doctorId` only | Denied | Denied |
| `getDoctorsAction` / `getDoctorByIdAction` | Public / All (no `requireAuth()`) | Public / All | Public / All | Public / All |
| `getDoctorLeavesAction` | Allowed | Allowed | Allowed | Allowed |
| `getPatientsAction` | Allowed | Allowed | Allowed | Denied |
| `createPatientAction` | Allowed | Denied | Allowed | Self-registers via `registerPatientAction` |
| `deletePatientAction` / `togglePatientActiveAction` | Allowed | Denied | Denied | Denied |
| `getPatientByIdAction` / `updatePatientAction` / `getPatientFullDossierAction` | Allowed (any) | Allowed (any) | Allowed (any) | Own `patientId` only |
| `getAvailableSlotsAction` | Public / All | Public / All | Public / All | Public / All |
| `bookAppointmentAction` | Allowed (any patient) | Allowed (any patient) | Allowed (any patient) | Own `patientId` (auto-resolved/created) |
| `getAppointmentsAction` / `getAppointmentByIdAction` / `rescheduleAppointmentAction` / `cancelAppointmentAction` | Allowed (all) | Own `doctorId` only | Allowed (all) | Own `patientId` only |
| `checkInAppointmentAction` | Allowed | Allowed | Allowed | Own `patientId` only |
| `startConsultationAction` | Allowed | Own `doctorId` only | Denied | Denied |
| `updateAppointmentStatusAction` / `markNoShowAction` | Allowed | Own `doctorId` only | Allowed | Denied |
| `reassignAppointmentAction` | Allowed | Denied | Allowed | Denied |
| `createPrescriptionAction` (`completeConsultationAction`) | Allowed | Own `doctorId` & assigned appointment | Denied | Denied |
| `uploadMedicalReportAction` / `getPatientMedicalHistoryAction` | Allowed (any) | Assigned patients only (checks `prisma.appointment.findFirst({ doctorId, patientId })`) | Allowed (any) | Own `patientId` only |
| `generateBillAction` | Allowed | Allowed | Allowed | Denied |
| `recordPaymentAction` | Allowed | Allowed (code checks `if role === PATIENT`) | Allowed | Own `patientId` bills only |
| `getBillsAction` | Allowed (all) | Appointments where `doctorId == currentUser.doctorId` | Allowed (all) | Own `patientId` bills only |
| `getBillByIdAction` | Allowed | Allowed (note: code only blocks `role === PATIENT` mismatch) | Allowed | Own `patientId` bills only |
| `getNotificationsAction` / `markNotificationAsReadAction` / `markAllNotificationsAsReadAction` | Own `userId` | Own `userId` | Own `userId` | Own `userId` |

---

## 5. Concurrency, Data Structures & OOP Design Patterns

### 5.1 Custom Linked-List FIFO Queues (`src/lib/queue/appointment-queue.ts`, `src/lib/queue/billing-queue.ts`)
- **`FifoQueue<T>`** (linked list via `QueueNode<T> { data: T; next: QueueNode<T> | null }`):
  - `enqueue(item: T)` — $O(1)$ tail insertion
  - `dequeue(): T | null` — $O(1)$ head removal
  - `peek(): T | null` — $O(1)$ inspection
  - `size(): number` / `isEmpty(): boolean` — $O(1)$
- **`AppointmentRequestQueue`** (singleton `appointmentQueue` on `globalThis`):
  - `enqueueTask<T>(taskId, taskFn)` wraps each booking in a `Promise` (`BookingTask<T>`) and processes tasks sequentially (`isProcessing` flag + `processNext()` recursion in `finally`).
  - Tracks metrics: `currentPending`, `totalProcessed`, `totalSuccessful`, `totalErrors`, `peakQueueSize`, `isCurrentlyActive` (`getStats()`, exposed via `getAppointmentQueueMetricsAction`).
- **`BillingRequestQueue`** (singleton `billingQueue`): serializes `generateBillAction` and `recordPaymentAction` to prevent concurrent payment balance race conditions. Tracks `pending`, `totalProcessed`, `totalSuccessful`, `totalErrors`, `isProcessing`.
- **`NotificationRequestQueue`** (singleton `notificationQueue`): serializes `createNotificationHelper` writes chronologically.

### 5.2 Appointment Concurrency & Transaction Integrity (`src/actions/appointment.ts`)
- `bookAppointmentAction` combines **3 layers of defense**:
  1. **Application-level FIFO serialization** via `appointmentQueue.enqueueTask(...)`.
  2. **Prisma Interactive Transaction** (`prisma.$transaction(..., { maxWait: 15000, timeout: 30000 })`) performing inside-transaction validation: active doctor check, `DoctorLeave` overlap check, `DoctorSchedule` weekday & slot bounds check, break-time exclusion, patient duplicate-slot check (`patientId`, `appointmentDate`, `timeSlot`, `status != CANCELLED`), and doctor slot-conflict check (`doctorId`, `appointmentDate`, `timeSlot`, `status != CANCELLED`).
  3. **PostgreSQL Partial Unique Index** (`unique_active_appointment_slot` on `("doctorId", "appointmentDate", "timeSlot") WHERE status <> 'CANCELLED'`) guaranteeing DB-level uniqueness even across multiple Node.js/serverless workers, while allowing cancelled slots to be re-booked.
- **Note on discrepancy vs `README.md`**: `bookAppointmentAction` uses Prisma's default isolation level (`ReadCommitted`) + FIFO queue + transactional `findFirst` check rather than `SELECT ... FOR UPDATE` with `isolationLevel: 'Serializable'` shown in `README.md`.

### 5.3 OOP Domain Models (`src/lib/domain/models.ts`)
1. **`AppointmentModel`**: encapsulates `isCancellable()`, `isReschedulable()`, `isCheckableIn()`, `isStartable()`, `isConsultable()`, `getFormattedTime()`, `getDateString()`, `isPastDate()`.
2. **`MedicalReportModel`**: encapsulates `isImagingReport()` (matches `x-ray`, `mri`, `ct`, `ultrasound`, `scan`, `radiology`) and `getDisplaySummary()`.
3. **`PrescriptionModel`**: encapsulates `getMedicationCount()` and `getFormattedMedicationList()`.
4. **`BillModel`**: encapsulates `itemsData: BillItemsData` normalization, `getBalance()`, `isFullyPaid()`, `isPartiallyPaid()`, `static formatCurrency(val)`, `getItemCount()`, `getCollectionPercentage()`.
5. **`PaymentModel`**: encapsulates `isValidPayment(outstandingBalance)` (`amount > 0 && amount <= outstandingBalance + 0.001`) and `getFormattedMethod()`.
6. **`ReportModel`**: encapsulates `RevenueReportData` and `toCsvString()` for multi-section CSV generation.
7. **`NotificationModel`**: encapsulates `getTimeAgo()` (`Just now`, `Xm ago`, `Xh ago`, `Yesterday`, `Xd ago`).

---

## 6. Validation Schemas (`src/lib/validations/*.ts`)

- **`auth.ts`**: `loginSchema`, `registerPatientSchema` (password >= 8 chars, 1 uppercase, 1 digit; gender enum `Male|Female|Other`; bloodGroup enum), `changePasswordSchema` (with `.refine` password match).
- **`patient.ts`**: `patientProfileSchema`, `updatePatientSchema`, `patientSearchSchema` (`page` default 1, `limit` max 100 default 10).
- **`doctor.ts`**: `doctorScheduleItemSchema` (`dayOfWeek` 0–6, `HH:MM` regex, `slotDuration` 10–120 default 30, optional break times), `doctorLeaveSchema`, `createDoctorSchema`, `updateDoctorSchema`, `doctorSearchSchema`.
- **`department.ts`**: `departmentSchema` (`name` min 2), `updateDepartmentSchema`.
- **`appointment.ts`**: `slotQuerySchema`, `bookAppointmentSchema` (`YYYY-MM-DD`, `HH:mm`, `reason` max 500), `rescheduleAppointmentSchema`, `cancelAppointmentSchema`, `reassignAppointmentSchema`, `appointmentFilterSchema` (`page` default 1, `limit` max 100 default 20).
- **`medical-record.ts`**: `medicationItemSchema`, `createPrescriptionSchema` (>= 1 medication, `diagnosis` min 2, `symptoms` max 1000, `notes` max 2000, `followUpDate` `YYYY-MM-DD`), `uploadMedicalReportSchema` (`reportType` 9-value enum).
- **`billing.ts`**: `billItemSchema` (5 categories: `CONSULTATION`, `LAB_TEST`, `MEDICATION`, `PROCEDURE`, `OTHER`), `generateBillSchema` (`discountPercentage` 0–100 default 0, `taxPercentage` 0–100 default 5), `recordPaymentSchema` (`amount > 0`, `PaymentMethod` nativeEnum), `billFilterSchema`, `reportFilterSchema`.

---

## 7. Server Actions, API Routes, Pages & Utilities Inventory

### 7.1 Server Actions (`src/actions/*.ts`)
- **`auth.ts`**: `loginAction`, `registerPatientAction`, `logoutAction`, `getAuthUserAction`
- **`patient.ts`**: `getPatientsAction`, `getPatientByIdAction`, `createPatientAction`, `updatePatientAction`, `deletePatientAction`, `getPatientFullDossierAction`, `togglePatientActiveAction`
- **`department.ts`**: `getDepartmentsAction`, `getDepartmentByIdAction`, `createDepartmentAction`, `updateDepartmentAction`, `deleteDepartmentAction` (blocks deletion if assigned doctors > 0)
- **`doctor.ts`**: `getDoctorsAction`, `getDoctorByIdAction`, `createDoctorAction`, `updateDoctorAction`, `updateDoctorScheduleAction`, `toggleDoctorActiveAction`, `addDoctorLeaveAction` (detects conflicting `CONFIRMED`/`SCHEDULED` appointments and notifies patients), `getDoctorLeavesAction`, `deleteDoctorLeaveAction`, `deleteDoctorAction`
- **`appointment.ts`**: `getAvailableSlotsAction` (computes shift slots, excludes `breakStartTime`–`breakEndTime`, past slots today, booked non-cancelled slots, inactive doctors, and `DoctorLeave` dates), `bookAppointmentAction`, `rescheduleAppointmentAction`, `cancelAppointmentAction`, `getAppointmentsAction`, `getAppointmentByIdAction`, `updateAppointmentStatusAction`, `getAppointmentQueueMetricsAction`, `checkInAppointmentAction`, `startConsultationAction`, `markNoShowAction`, `reassignAppointmentAction`
- **`medical-record.ts`**: `createPrescriptionAction` (alias `completeConsultationAction` — atomically upserts `Prescription`, sets appointment `COMPLETED`, and auto-generates `Bill` with consultation fee + ₹250/medication + 5% GST if unbilled), `uploadMedicalReportAction`, `getPatientMedicalHistoryAction` (aggregates unified descending `timeline` of `PRESCRIPTION`, `LAB_REPORT`, and `CONSULTATION` events)
- **`billing.ts`**: `generateBillAction` (consultation fee + ₹250/med + ₹750/lab scan [up to 2 matching patient+doctor reports] + custom items, discount, tax, queued via `billingQueue`), `recordPaymentAction` (pessimistic inside-transaction balance re-read, updates `paidAmount` and transitions `UNPAID` -> `PARTIALLY_PAID` -> `PAID`), `getBillsAction` (paginated + Prisma aggregate totals), `getBillByIdAction`
- **`report.ts`**: `getRevenueAndFootfallReportsAction` (date-range & department filtered summary, category breakdown, department revenue, 14-day daily trends), `exportReportCsvAction`
- **`admin.ts`**: `getAdminOperationalMetricsAction` (parallel `Promise.all` counts, `groupBy` status distribution, doctor workload, and `leaveConflictedAppointments`)
- **`audit.ts`**: `getAuditLogsAction` (paginated, filterable by `action` and `userId`)
- **`notification.ts`**: `createNotificationHelper` (via `notificationQueue`), `getNotificationsAction` (latest 20 + `unreadCount`), `markNotificationAsReadAction`, `markAllNotificationsAsReadAction`

### 7.2 API Route (`src/app/api/health/route.ts`)
- `GET /api/health`: executes `prisma.$queryRaw\`SELECT 1\``, returns HTTP `200` (`status: 'HEALTHY'`, DB latency, uptime, Node version, heap MB, ISO timestamp) or HTTP `503` (`status: 'DEGRADED'`).

### 7.3 Frontend Routes (`src/app/**/page.tsx`) & Components (`src/components/ui/*`)
- **Pages (16)**: `/`, `/login`, `/register`, `/admin/dashboard`, `/admin/audit`, `/doctor/dashboard`, `/patient/dashboard`, `/receptionist/dashboard`, `/appointments`, `/appointments/book`, `/patients`, `/doctors`, `/departments`, `/medical-records`, `/billing`, `/reports`.
- **UI Components (5)**: `DashboardShell.tsx`, `Navbar.tsx` (role-tailored nav + mobile drawer), `NotificationBell.tsx` (20s polling), `DemoSwitcher.tsx` (quick-switch between 7 demo accounts: 1 Admin, 3 Doctors, 3 Patients), `Modal.tsx` (Escape key + backdrop close).
- **Backup & Restore Scripts**: `scripts/backup-db.ts` (snapshots 13 tables to `backups/backup-<timestamp>.json`; 2 snapshots exist from `2026-09-22`), `scripts/restore-db.ts` (restores via `upsert` from latest or specified JSON file).

---

## 8. Academic Coursewise Module Mapping (from `team2 (1).md`, `README.md`, & Verified Implementation)

| Subject / Course | Assignment Specification (`team2 (1).md`) | Verified Codebase Implementation |
|---|---|---|
| **Basic Programming** | Validation, booking & scheduling logic, bill calculation, report generation | Zod validation schemas (`src/lib/validations/*`), 30-min slot generation (`generateTimeSlots`), subtotal/discount/tax math (`src/actions/billing.ts`, `medical-record.ts`), `formatCurrency` (`src/lib/config/currency.ts`) |
| **Object-Oriented Programming (OOP)** | Domain classes for User, Patient, Doctor, Department, Appointment, MedicalReport, Prescription, Bill, Payment, Report, Notification | 7 TypeScript ES6 classes in `src/lib/domain/models.ts` (`AppointmentModel`, `MedicalReportModel`, `PrescriptionModel`, `BillModel`, `PaymentModel`, `ReportModel`, `NotificationModel`) with encapsulation and domain methods |
| **Data Structures** | Patient search/sorting, queue for appointment requests, billing requests, and notifications | Singly linked-list `FifoQueue<T>` ($O(1)$ enqueue/dequeue/peek) powering `AppointmentRequestQueue`, `BillingRequestQueue`, and `NotificationRequestQueue` (`src/lib/queue/`), plus chronological timeline sorting in `getPatientMedicalHistoryAction` |
| **Database Management Systems (DBMS)** | 3NF relational schema, CRUD, constraints, indexes, aggregate queries | 14 normalized PostgreSQL models in `prisma/schema.prisma`, 47 indexes including partial unique index `unique_active_appointment_slot`, Prisma `aggregate`/`groupBy` in `admin.ts`, `billing.ts`, `report.ts` |
| **Computer Networks** | Secure login, client-server HTTPS communication, multi-user requests, secure billing/report access | HTTP-only `hms_auth_token` JWT cookies (`jose` HS256), Next.js Server Actions RPC & Edge `middleware.ts` guards, `/api/health` endpoint |
| **Operating Systems** | Authentication logs, file/backup management, thread synchronization for booking, scheduled backup/log management | FIFO request serialization + PostgreSQL ACID transactions (`prisma.$transaction`), immutable `AuditLog` (`src/lib/auth/audit.ts`), `scripts/backup-db.ts` & `scripts/restore-db.ts` |
| **Software Engineering** | SRS, UML (Use Case, Class, Sequence, Activity), ER Diagram, modular structure, unit & integration testing | 3-Worklet modular architecture (`src/actions/`, `src/lib/`, `src/app/`), typed contracts (`src/types/index.ts`), verification suites in `scratch/test-*.ts` |
| **Web Technology** | Login, Dashboards, Appointment, Medical Report, Billing, and Reports pages | Next.js 15 App Router + React 19 + Tailwind CSS UI (`src/app/**/page.tsx`, `src/components/ui/*`), printable tax invoices (`window.print()`), client CSV export |

*(Note: Worklets in `team2 (1).md` / `README.md` are: **Worklet 1**: Patient & User Management; **Worklet 2**: Appointment & Medical Record Management; **Worklet 3**: Billing, Reports & System Administration.)*

---

## 9. Seeded Data & Live Database Snapshot (Verified Read-Only)

- **Seeded Accounts (`prisma/seed.ts`, verified via `npx tsx scratch/verify-db.ts` & `scratch/test-login.ts`)**:
  - Admin: `admin@hospital.com` (`Dr. Rajesh Sharma (Chief Medical Officer)`, `Admin@12345`)
  - Receptionist: `reception@hospital.com` (`Priya Sharma (Front Desk Executive)`, `Staff@12345`)
  - Doctors (`Doctor@12345`): `dr.malhotra@hospital.com` (Cardiology, ₹1,200), `dr.patel@hospital.com` (Neurology, ₹1,500 — seeded with 1 `DoctorLeave` & 1 conflicting appointment), `dr.iyer@hospital.com` (General Medicine, ₹800)
  - Patients (`Patient@12345`): `patient.aarav@example.com` (O+, Mumbai), `patient.priyanka@example.com` (A+, Bengaluru — ₹1,365 `UNPAID` bill), `patient.rohan@example.com` (B-, Delhi), `patient.ananya@example.com` (AB+, Hyderabad)
  - Departments (5): Cardiology, Neurology, Orthopedics, Pediatrics, General Medicine.
- **Live PostgreSQL Table Counts** (queried read-only during this session):
  - `User`: 9, `Department`: 5, `Doctor`: 3, `Patient`: 4, `DoctorSchedule`: 19, `DoctorLeave`: 1, `Appointment`: 10, `Prescription`: 2, `MedicalReport`: 4, `Bill`: 2, `Payment`: 1, `Notification`: 8, `AuditLog`: 11, `SystemSetting`: 6.

---

## 10. Verified Build, Static Checks & Test Suites

### 10.1 Commands Actually Executed in This Session (Verified)
1. **`npx tsc --noEmit`**: **PASSED** (Exit code `0`, zero TypeScript errors across `src/`).
2. **`npx prisma validate`**: **PASSED** (Exit code `0`, `The schema at prisma\schema.prisma is valid`).
3. **`npm run lint` (`next lint`)**: **EXITED 1** — ESLint is not configured in the repository (no `.eslintrc.*` or `eslint.config.*`), so `next lint` prompts interactively to configure Strict/Base ESLint and fails in non-interactive mode.
4. **`npx tsx scratch/verify-db.ts`**: **PASSED** (Exit code `0`, verified `SystemSetting` INR config, 9 users, 3 doctors, 4 patients, 2 bills, and recent `AuditLog` entries).
5. **`npx tsx scratch/test-login.ts`**: **PASSED** (Exit code `0`, 5/5 seeded credential checks passed with `bcryptjs.compare`).
6. **Live PostgreSQL `pg_indexes` & Table Count Check**: **PASSED** (Exit code `0`, verified all 47 PostgreSQL indexes including `unique_active_appointment_slot`).
7. **In-Memory Unit Verification Script** (executed via `npx tsx -`): **PASSED (11/11)** — verified `FifoQueue` $O(1)$ operations, `AppointmentRequestQueue` FIFO serialization, `BillingRequestQueue`, `NotificationRequestQueue`, `AppointmentModel`, `MedicalReportModel`, `PrescriptionModel`, `BillModel`, `PaymentModel`, `formatCurrency` (`₹1,50,000.00`), and `signJWT`/`verifyJWT` (`HS256`).

### 10.2 Existing Test Scripts Inspected in `scratch/` (NOT Executed Live to Preserve DB State)
- `scratch/test-concurrency.ts`: Simulates 10 simultaneous `Promise.all` booking requests on the same slot (expects 1 winner, 9 rejections), atomic rescheduling, prescription creation, and report attachment (mutates/leaves `test.doc@hospital.com` and `patient_concurrent_1..10` users in DB).
- `scratch/test-team2-e2e.ts`: Tests `FifoQueue`, `AppointmentModel`, `PrescriptionModel`, `MedicalReportModel`, `DoctorSchedule`, 10 concurrent bookings via `appointmentQueue`, clinical flow, rescheduling, and cancellation.
- `scratch/test-team2-edge-cases.ts`: 16-section edge-case & concurrency suite (dynamic slot lifecycle, cancel/rebook, reschedule conflict, off-hours, off-day, past date, double-cancel, cross-patient access, doctor-patient privacy, 10-way `appointmentQueue` concurrency stress test, and creation of `unique_active_appointment_slot` partial unique index).
- `scratch/test-team3-e2e.ts`: 9-section billing/reports/notifications suite (`BillModel`, `PaymentModel`, `NotificationModel`, `billingQueue`, partial/multiple/overpayment rejection, cancelled-bill guard, audit log, notifications, DBMS aggregation, `ReportModel` CSV, `SELECT 1`). *(Mutates/deletes existing bills of `patient.aarav@example.com` if run.)*
- `scratch/test-full-workflow.ts`: End-to-end patient-booking -> check-in -> start consultation -> prescription -> auto-bill -> UPI payment -> admin metrics test *(has stale references from an older schema/return shape, e.g., `adminMetrics.data.kpis` instead of top-level `AdminOperationalMetrics` fields)*.
- `scratch/test-step3-step4.ts`: Legacy US-fixture test checking bcrypt, JWT, `'John'` search, Cardiology, deletion guard, and audit log.
- `scratch/test-booking-fix.ts`: Tests resilient `patientId` resolution via `userId` fallback.

---

## 11. Flagged Discrepancies Between Docs (`README.md`, `DESIGN.md`, `team2 (1).md`) and Actual Code

1. **`DESIGN.md` is unrelated to HMS**: `c:\HospitalManagementSystem\DESIGN.md` is a `Coinbase-design-analysis` YAML/Markdown spec; however, its color tokens (`#0052ff`, `#0a0b0d`, `#5b616e`, `#eef0f3`), typography (`Inter`, `JetBrains Mono`), and pill/card geometry (`rounded-pill: 100px`, `rounded-xl: 24px`) were intentionally adapted into `tailwind.config.ts` and `src/app/globals.css`.
2. **Database Schema vs `README.md`**:
   - `prisma/schema.prisma` includes `DoctorLeave`, `SystemSetting`, `User.isActive`, `Doctor.isActive`, `Patient.medicalHistorySummary`, `DoctorSchedule.breakStartTime`/`breakEndTime`, `Prescription.symptoms`/`followUpDate`, and extra `AppointmentStatus` values (`SCHEDULED`, `CHECKED_IN`, `IN_PROGRESS`, `RESCHEDULED`) plus `PaymentStatus.CANCELLED` — none of which appear in `README.md`'s schema preview.
   - `AuditLog` in `prisma/schema.prisma` has `(id, userId, action, details: String?, ipAddress, createdAt)` rather than `(entity, entityId, details: Json?)` shown in `README.md`.
   - `prisma/schema.prisma` defines `@@index([doctorId, appointmentDate, timeSlot])` rather than `@@unique`; the actual uniqueness guard is the partial unique index `unique_active_appointment_slot` in live PostgreSQL.
3. **Auth & API Endpoints vs `README.md`**:
   - `README.md` mentions NextAuth/Auth.js, Drizzle ORM, Uploadthing/S3/Vercel Blob, `@react-pdf/renderer`/`pdfmake`, and REST endpoints (`/api/auth/login`, `/api/doctors/[id]/slots`, `/api/reports/upload`, `/api/billing/[id]/invoice.pdf`).
   - Actual implementation uses custom `jose` HS256 JWT + `bcryptjs` + Next.js Server Actions (`src/actions/*.ts`), Prisma ORM exclusively, URL-based `fileUrl` metadata for medical reports (no binary file upload handler), browser `window.print()` for PDF invoices, and only one REST API route: `GET /api/health` (`src/app/api/health/route.ts`).
4. **Concurrency SQL vs `README.md`**: `README.md` shows `SELECT ... FOR UPDATE` with `isolationLevel: 'Serializable'`, whereas `src/actions/appointment.ts` uses `appointmentQueue` (in-memory FIFO queue) + default-isolation `prisma.$transaction` + `findFirst` check + PostgreSQL partial unique index `unique_active_appointment_slot`.
5. **Backup/Restore Coverage Gap**: `scripts/backup-db.ts` and `scripts/restore-db.ts` back up/restore 13 tables (`systemSettings` through `auditLogs`) but omit `doctorLeave` (`prisma.doctorLeave`).
6. **Missing Script & Unconfigured Linter**: `package.json` defines `"db:test": "node scratch/test-connection.mjs"`, which does not exist in `scratch/`. Also `npm run lint` (`next lint`) fails in non-interactive shells due to missing ESLint configuration.
7. **Other Minor Code Observations (Advantages & Limitations)**:
   - **Limitations**:
     - In-memory `appointmentQueue` / `billingQueue` / `notificationQueue` are single-process singletons (multi-instance serverless deployments rely on the PostgreSQL partial unique index rather than the in-memory queue).
     - `MedicalReport` stores `fileUrl` strings rather than handling binary file uploads or cloud object storage.
     - `NotificationBell` polls every 20 seconds instead of using WebSockets/SSE.
     - `jwt.ts` and `middleware.ts` contain a fallback dev `JWT_SECRET` string if `process.env.JWT_SECRET` is unset.
     - `recordPaymentAction` and `getBillByIdAction` only restrict `Role.PATIENT` to own bills; `getBilling` for `DOCTOR` is scoped in `getBillsAction` but not in `getBillByIdAction`.
     - `src/app/reports/page.tsx` line 174 (`departmentRevenue.consultationCount`) initializes `d.consultations` to `0` in `src/actions/report.ts` and never increments it per department.
   - **Advantages**:
     - End-to-end TypeScript strictness (`npx tsc --noEmit` exits 0), Zod schema validation on inputs, and `toPlainObject` serialization for `Decimal`/`BigInt`/`Date`.
     - Multi-layered appointment concurrency safety (FIFO queue + ACID transaction + PostgreSQL partial unique index) with dynamic break-time and doctor-leave conflict detection.
     - Automated consultation-to-prescription-to-bill workflow in a single atomic transaction (`createPrescriptionAction`).
     - Complete Indian localization (`en-IN`, `₹` INR) backed by `SystemSetting`.
     - Built-in `DemoSwitcher`, `AuditLog` trail, `/api/health` DB latency monitor, and JSON backup/restore CLI scripts.
