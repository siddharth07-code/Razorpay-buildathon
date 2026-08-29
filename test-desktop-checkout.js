const fs = require('fs');
const dotenv = require('dotenv');

const envPath = '/Users/siddharthlal/Desktop/Razorpay/recoverai/.env';
const envLocalPath = '/Users/siddharthlal/Desktop/Razorpay/recoverai/.env.local';

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

const keyId = process.env.RAZORPAY_KEY_ID || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
const auth = Buffer.from(keyId + ':' + keySecret).toString('base64');

console.log('--- CREDENTIALS PROBE ---');
console.log('Key Prefix:', keyId.substring(0, 9));
console.log('Secret Configured:', Boolean(keySecret));
console.log('Mode:', process.env.RAZORPAY_MODE);
console.log('Environment:', process.env.RAZORPAY_ENVIRONMENT);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  const caseItem = await prisma.recoveryCase.findUnique({
    where: { id: 'cmtdetu4k000h1iuw4sulokr5' },
    include: { customer: true, payment: true }
  });

  if (!caseItem) {
    console.error('Case not found');
    return;
  }

  console.log('\n--- ACTIVE CASE BEFORE CHECKOUT ---');
  console.log({
    caseId: caseItem.id,
    caseNumber: caseItem.caseNumber,
    status: caseItem.status,
    amountPaise: caseItem.amountAtRisk ? caseItem.amountAtRisk.toString() : '0',
    storedRazorpayOrderId: caseItem.razorpayOrderId,
  });

  const isStale =
    !caseItem.razorpayOrderId ||
    !caseItem.razorpayOrderId.startsWith('order_') ||
    caseItem.razorpayOrderId.includes('demo') ||
    caseItem.razorpayOrderId.includes('mock') ||
    caseItem.razorpayOrderId.includes('sandbox') ||
    caseItem.razorpayOrderId.includes('simulated') ||
    caseItem.razorpayOrderId === 'order_rzp_sandbox';

  console.log('Is Stale Mock Order:', isStale);

  console.log('\n--- CREATING REAL RAZORPAY TEST ORDER ---');
  const amountRupees = Number(caseItem.amountAtRisk) / 100;
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`
    },
    body: JSON.stringify({
      amount: Number(caseItem.amountAtRisk),
      currency: 'INR',
      receipt: `rcpt_${caseItem.id.substring(0, 8)}_${Date.now()}`,
      notes: {
        vireon_case_id: caseItem.id,
        caseNumber: caseItem.caseNumber,
        source: 'VIREON_Checkout'
      }
    })
  });

  const newOrder = await res.json();
  console.log('Create Order HTTP Status:', res.status);
  console.log('New Order Response:', {
    id: newOrder.id,
    entity: newOrder.entity,
    amount: newOrder.amount,
    currency: newOrder.currency,
    status: newOrder.status,
    attempts: newOrder.attempts
  });

  if (newOrder.id) {
    console.log('\n--- VERIFYING NEW ORDER VIA GET /v1/orders/' + newOrder.id + ' ---');
    const getRes = await fetch(`https://api.razorpay.com/v1/orders/${newOrder.id}`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    const fetchedOrder = await getRes.json();
    console.log('Fetch Order HTTP Status:', getRes.status);
    console.log('Fetched Order Response:', {
      id: fetchedOrder.id,
      entity: fetchedOrder.entity,
      amount: fetchedOrder.amount,
      currency: fetchedOrder.currency,
      status: fetchedOrder.status,
      attempts: fetchedOrder.attempts
    });

    // Update case in database with genuine Razorpay Order
    await prisma.recoveryCase.update({
      where: { id: caseItem.id },
      data: { razorpayOrderId: newOrder.id }
    });
    console.log('\n✓ Updated PostgreSQL recovery case razorpayOrderId to:', newOrder.id);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
