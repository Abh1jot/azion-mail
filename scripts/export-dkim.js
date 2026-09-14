const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const dkimDir = '/var/lib/rspamd/dkim';
  if (!fs.existsSync(dkimDir)) {
    fs.mkdirSync(dkimDir, { recursive: true, mode: 0o755 });
  }

  const domains = await prisma.domain.findMany();
  console.log(`🔍 Exporting DKIM keys for ${domains.length} domains...`);

  for (const d of domains) {
    if (d.dkimPrivateKey) {
      const cleanDomain = d.domain.toLowerCase().trim();
      const selector = d.dkimSelector || 'mail';
      const keyFile = path.join(dkimDir, `${cleanDomain}.${selector}.key`);
      fs.writeFileSync(keyFile, d.dkimPrivateKey, { mode: 0o644 });
      console.log(`✅ DKIM key saved: ${keyFile}`);
    }
  }
}

main()
  .catch((e) => {
    console.error('Error exporting DKIM keys:', e.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
