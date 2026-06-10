const { PrismaClient } = require('../../node_modules/@prisma/client');
const { PrismaPg } = require('../../node_modules/@prisma/adapter-pg');
require('dotenv').config({ path: '../../.env.local' });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    'No DATABASE_URL in environment! Loaded from path:',
    require('path').resolve('../../.env.local')
  );
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const events = await prisma.event.findMany({
    select: { id: true, slug: true, status: true },
  });
  console.log('--- Events in DB ---');
  console.log(JSON.stringify(events, null, 2));

  const guests = await prisma.guest.findMany({
    take: 5,
    select: { id: true, name: true, slug: true, event_id: true },
  });
  console.log('--- Guests in DB ---');
  console.log(JSON.stringify(guests, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
