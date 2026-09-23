import { prisma } from '../src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      patient: { select: { id: true } },
      doctor: { select: { id: true } },
    },
  });
  console.log('Users count:', users.length);
  for (const u of users) {
    console.log(`User: ${u.email} (${u.role}) -> userId: ${u.id}, patientId: ${u.patient?.id || 'none'}, doctorId: ${u.doctor?.id || 'none'}`);
  }
}

main().catch(console.error).finally(() => process.exit(0));
