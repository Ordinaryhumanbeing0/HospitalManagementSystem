'use server';

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { loginSchema, registerPatientSchema, LoginInput, RegisterPatientInput } from '@/lib/validations/auth';
import { createSessionCookie, clearSessionCookie, getSessionUser } from '@/lib/auth/session';
import { logAudit } from '@/lib/auth/audit';
import { ActionResponse, SessionUser } from '@/types';
import { Role } from '@prisma/client';

export async function loginAction(input: LoginInput): Promise<ActionResponse<{ user: SessionUser; redirectUrl: string }>> {
  try {
    const validated = loginSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: 'Invalid login details.',
        errors: validated.error.flatten().fieldErrors,
      };
    }

    const { email, password } = validated.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        patient: { select: { id: true } },
        doctor: { select: { id: true } },
      },
    });

    if (!user) {
      return {
        success: false,
        message: 'Invalid email or password.',
      };
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await logAudit({
        userId: user.id,
        action: 'LOGIN_FAILED',
        details: `Failed login attempt for ${user.email}`,
      });
      return {
        success: false,
        message: 'Invalid email or password.',
      };
    }

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      patientId: user.patient?.id || null,
      doctorId: user.doctor?.id || null,
    };

    await createSessionCookie(sessionUser);

    await logAudit({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      details: `User logged in with role: ${user.role}`,
    });

    let redirectUrl = '/patient/dashboard';
    if (user.role === Role.ADMIN) redirectUrl = '/admin/dashboard';
    else if (user.role === Role.DOCTOR) redirectUrl = '/doctor/dashboard';
    else if (user.role === Role.RECEPTIONIST) redirectUrl = '/receptionist/dashboard';

    return {
      success: true,
      message: 'Login successful.',
      data: {
        user: sessionUser,
        redirectUrl,
      },
    };
  } catch (error) {
    console.error('Error in loginAction:', error);
    return {
      success: false,
      message: 'An unexpected error occurred during login. Please try again.',
    };
  }
}

export async function registerPatientAction(
  input: RegisterPatientInput
): Promise<ActionResponse<{ user: SessionUser; redirectUrl: string }>> {
  try {
    const validated = registerPatientSchema.safeParse(input);
    if (!validated.success) {
      return {
        success: false,
        message: 'Validation failed. Please verify the input fields.',
        errors: validated.error.flatten().fieldErrors,
      };
    }

    const data = validated.data;
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      return {
        success: false,
        message: 'An account with this email address already exists.',
      };
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    // Atomic transaction creating User and Patient profile
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone,
          passwordHash,
          role: Role.PATIENT,
        },
      });

      const newPatient = await tx.patient.create({
        data: {
          userId: newUser.id,
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender,
          bloodGroup: data.bloodGroup || null,
          address: data.address || null,
          emergencyContact: data.emergencyContact || null,
          medicalHistorySummary: data.medicalHistorySummary || null,
        },
      });

      return { user: newUser, patient: newPatient };
    });

    const sessionUser: SessionUser = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      phone: result.user.phone,
      patientId: result.patient.id,
      doctorId: null,
    };

    await createSessionCookie(sessionUser);

    await logAudit({
      userId: result.user.id,
      action: 'PATIENT_REGISTERED',
      details: `New patient account created: ${result.user.name}`,
    });

    return {
      success: true,
      message: 'Registration successful! Welcome to the Hospital Management System.',
      data: {
        user: sessionUser,
        redirectUrl: '/patient/dashboard',
      },
    };
  } catch (error) {
    console.error('Error in registerPatientAction:', error);
    return {
      success: false,
      message: 'Failed to create patient account. Please try again.',
    };
  }
}

export async function logoutAction(): Promise<ActionResponse<void>> {
  try {
    const user = await getSessionUser();
    if (user) {
      await logAudit({
        userId: user.id,
        action: 'LOGOUT',
        details: 'User logged out',
      });
    }
    await clearSessionCookie();
    return { success: true, message: 'Logged out successfully.' };
  } catch (error) {
    console.error('Error in logoutAction:', error);
    return { success: false, message: 'Error logging out.' };
  }
}

export async function getAuthUserAction(): Promise<ActionResponse<SessionUser | null>> {
  try {
    const user = await getSessionUser();
    return { success: true, data: user };
  } catch (error) {
    return { success: false, data: null };
  }
}
