import { appConfig } from "../../../src/lib/config";

async function main() {
  console.log("==================================================");
  console.log("VIREON RAZORPAY LIVE DIAGNOSTIC PROBE");
  console.log("==================================================\n");

  const keyId = process.env.RAZORPAY_KEY_ID || appConfig.razorpay.keyId || "rzp_test_recoverai_demo";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || appConfig.razorpay.keySecret || "recoverai_demo_secret";

  console.log("1. Environment Credentials Probe:");
  console.log("   - Key ID Prefix:", keyId.substring(0, 9));
  console.log("   - Key ID Configured:", keyId.startsWith("rzp_test_") ? "YES (TEST MODE)" : keyId.startsWith("rzp_live_") ? "YES (LIVE MODE)" : "NO");
  console.log("   - Secret Configured:", Boolean(keySecret) ? "YES" : "NO");
  console.log("   - Environment Mode:", process.env.RAZORPAY_ENVIRONMENT || "test");

  console.log("\n2. Live Razorpay Cloud API Probe (POST https://api.razorpay.com/v1/orders):");
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  try {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: 2500000,
        currency: "INR",
        receipt: `diag_${Date.now()}`,
      }),
    });

    const data = await res.json();
    console.log("   - HTTP Status:", res.status);
    console.log("   - Safe Error Code:", data?.error?.code || "NONE (SUCCESS)");
    console.log("   - Safe Error Description:", data?.error?.description || "Order Created Successfully");
    console.log("   - Safe Order ID:", data?.id ? `${data.id.substring(0, 8)}... (Length: ${data.id.length})` : "NONE");

    if (res.status === 401) {
      console.log("\n[DIAGNOSTIC CONCLUSION]:");
      console.log("   - Key 'rzp_test_recoverai_demo' is an unregistered placeholder credential in .env.");
      console.log("   - When Razorpay's real Checkout.js iframe loads in the browser, api.razorpay.com returns 401 Authentication failed.");
      console.log("   - This causes Razorpay's iframe to display: 'Oops! Something went wrong. Payment Failed'.");
    }
  } catch (err: any) {
    console.error("   - Network/Fetch Probe Error:", err.message);
  }
}

main();
