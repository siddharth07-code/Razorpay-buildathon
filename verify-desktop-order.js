const fs = require('fs');
const dotenv = require('dotenv');

const envLocal = dotenv.parse(fs.readFileSync('/Users/siddharthlal/Desktop/Razorpay/recoverai/.env.local'));
for (const k in envLocal) process.env[k] = envLocal[k];

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function main() {
  const caseItem = await prisma.recoveryCase.findUnique({
    where: { id: 'cmtdetu4k000h1iuw4sulokr5' },
    include: { customer: true }
  });

  console.log('--- CHECKOUT ENDPOINT SIMULATION ---');
  console.log({
    caseId: caseItem.id,
    caseNumber: caseItem.caseNumber,
    status: caseItem.status,
    amountPaise: Number(caseItem.amountAtRisk),
    razorpayOrderId: caseItem.razorpayOrderId,
    keyIdPrefix: process.env.RAZORPAY_KEY_ID.substring(0, 9),
  });

  const auth = Buffer.from(process.env.RAZORPAY_KEY_ID + ':' + process.env.RAZORPAY_KEY_SECRET).toString('base64');
  const checkRes = await fetch('https://api.razorpay.com/v1/orders/' + caseItem.razorpayOrderId, {
    headers: { Authorization: 'Basic ' + auth }
  });
  const data = await checkRes.json();
  console.log('Razorpay Cloud Verification Status:', checkRes.status);
  console.log('Razorpay Cloud Order ID:', data.id);
  console.log('Razorpay Cloud Amount:', data.amount);
  console.log('Razorpay Cloud Currency:', data.currency);
  console.log('Razorpay Cloud Status:', data.status);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
