import 'dotenv/config';
import { PrismaClient, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Please configure it in .env');
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(databaseUrl),
});

async function main() {
  const password = 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const accounts = [
    {
      name: 'User Demo',
      email: 'user@gmail.com',
      role: Role.USER,
    },
    {
      name: 'Admin Demo',
      email: 'admin@gmail.com',
      role: Role.ADMIN,
    },
  ];

  for (const account of accounts) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: {
        name: account.name,
        role: account.role,
        password: hashedPassword,
      },
      create: {
        name: account.name,
        email: account.email,
        role: account.role,
        password: hashedPassword,
      },
    });
  }

  console.log('Seed selesai: user@gmail.com dan admin@gmail.com sudah siap.');
  console.log(`Password untuk keduanya: ${password}`);
}

main()
  .catch((error) => {
    console.error('Seed gagal:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });