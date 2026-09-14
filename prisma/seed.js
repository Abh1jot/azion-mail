const fs = require('fs');
const path = require('path');

// Simple .env parser fallback if DATABASE_URL not yet exported in current shell
if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
}

if (!process.env.DATABASE_URL && process.env.POSTGRES_USER) {
  const user = process.env.POSTGRES_USER || 'azion';
  const pass = process.env.POSTGRES_PASSWORD || 'azion_secure_pass';
  const host = process.env.POSTGRES_HOST || 'localhost';
  const db = process.env.POSTGRES_DB || 'azionmail';
  process.env.DATABASE_URL = `postgresql://${user}:${pass}@${host}:5432/${db}?schema=public`;
}

const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Azion Mail database...');

  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@azioncloud.com';
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'AzionAdmin2026!';
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.SUPERADMIN,
    },
    create: {
      email: adminEmail,
      name: 'Azion Cloud Superadmin',
      passwordHash,
      role: Role.SUPERADMIN,
      twoFactorEnabled: false,
    },
  });

  console.log(`✅ Superadmin created/verified: ${adminUser.email}`);

  // Seed default system settings
  const settings = [
    { key: 'SERVER_HOSTNAME', value: process.env.MAIL_HOST || 'mail.azioncloud.com' },
    { key: 'DEFAULT_MAILBOX_QUOTA_MB', value: '5120' },
    { key: 'ALLOW_USER_REGISTRATION', value: 'true' },
    { key: 'ENABLE_CLAMAV', value: process.env.ENABLE_CLAMAV || 'false' },
    { key: 'WEBMAIL_URL', value: process.env.WEBMAIL_URL || 'http://localhost:8080' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }

  console.log('✅ Default system settings seeded successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
