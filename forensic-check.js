const fs = require('fs');
const dotenv = require('dotenv');

const envPath = '/Users/siddharthlal/Desktop/Razorpay/recoverai/.env';
const envLocalPath = '/Users/siddharthlal/Desktop/Razorpay/recoverai/.env.local';

let loadedKey = '';
let loadedSecret = '';
let loadedMode = '';
let loadedEnv = '';
let dbUrl = '';

if (fs.existsSync(envLocalPath)) {
  const envLocal = dotenv.parse(fs.readFileSync(envLocalPath));
  for (const k in envLocal) process.env[k] = envLocal[k];
}
if (fs.existsSync(envPath)) {
  const env = dotenv.parse(fs.readFileSync(envPath));
  for (const k in env) {
    if (!process.env[k]) process.env[k] = env[k];
  }
}

loadedKey = process.env.RAZORPAY_KEY_ID || '';
loadedSecret = process.env.RAZORPAY_KEY_SECRET || '';
loadedMode = process.env.RAZORPAY_MODE || '';
loadedEnv = process.env.RAZORPAY_ENVIRONMENT || '';
dbUrl = process.env.DATABASE_URL || '';

const auth = Buffer.from(loadedKey + ':' + loadedSecret).toString('base64');

console.log('--- CREDENTIALS PROBE ---');
console.log('Key Prefix:', loadedKey.substring(0, 9));
console.log('Secret Configured:', Boolean(loadedSecret));
console.log('Mode:', loadedMode);
console.log('Environment:', loadedEnv);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } }
});

async function main() {
  const activeCases = await prisma.recoveryCase.findMany({
    where: {
      OR: [
        { status: 'AWAITING_PAYMENT' },
        { status: 'ACTION_SELECTED' },
        { razorpayOrderId: { not: null } }
      ]
    },
    orderBy: { updatedAt: 'desc' },
    take: 3,
    include: { customer: true, payment: true }
  });

  console.log('\n--- RECENT CASES IN DATABASE ---');
  for (const c of activeCases) {
    console.log({
      caseId: c.id,
      caseNumber: c.caseNumber,
      status: c.status,
      amountPaise: c.amountAtRisk ? c.amountAtRisk.toString() : '0',
      razorpayOrderId: c.razorpayOrderId,
      razorpayPaymentId: c.razorpayPaymentId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    });

    if (c.razorpayOrderId) {
      console.log('\nTesting GET https://api.razorpay.com/v1/orders/' + c.razorpayOrderId);
      try {
        const res = await fetch('https://api.razorpay.com/v1/orders/' + c.razorpayOrderId, {
          headers: { Authorization: 'Basic ' + auth }
        });
        const data = await res.json();
        console.log('HTTP Status:', res.status);
        console.log('Razorpay Response:', JSON.stringify(data, null, 2));
      } catch (err) {
        console.error('Fetch error:', err.message);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
