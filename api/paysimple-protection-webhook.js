import crypto from 'crypto';

const PLAN_AMOUNTS = new Set(['28.60', '342.96']);
const NOTIFY_TO = process.env.PARTS_NOTIFICATION_TO || 'info@heatspan.com';
const RESEND_FROM = process.env.RESEND_FROM || 'Heatspan Website <onboarding@resend.dev>';

function collectRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || '').toLowerCase());
  const bb = Buffer.from(String(b || '').toLowerCase());
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

async function sendEmail(event) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not configured');
  const d = event.data || {};
  const amount = Number(d.amount || 0).toFixed(2);
  const plan = amount === '28.60' ? 'Monthly Parts Protection Plan' : amount === '342.96' ? 'Annual Parts Protection Plan' : 'Parts Protection Plan';
  const subject = `New Heatspan Parts Protection signup — ${plan}`;
  const html = `
    <h2>New Parts Protection Plan signup</h2>
    <p>A customer completed a new Parts Protection Plan checkout through the Heatspan website.</p>
    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse">
      <tr><td><strong>Plan</strong></td><td>${plan}</td></tr>
      <tr><td><strong>Amount</strong></td><td>$${amount}</td></tr>
      <tr><td><strong>Payment type</strong></td><td>${d.payment_type || 'Not provided'}</td></tr>
      <tr><td><strong>PaySimple customer ID</strong></td><td>${d.customer_id || 'Not provided'}</td></tr>
      <tr><td><strong>PaySimple order ID</strong></td><td>${d.order_id || 'Not provided'}</td></tr>
      <tr><td><strong>Payment ID</strong></td><td>${d.payment_id || 'Not provided'}</td></tr>
      <tr><td><strong>Status</strong></td><td>${d.payment_status || 'Not provided'}</td></tr>
      <tr><td><strong>Event time</strong></td><td>${event.created_at || new Date().toISOString()}</td></tr>
    </table>
    <p>Open PaySimple to review the customer's full subscription and payment details.</p>`;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: RESEND_FROM, to: [NOTIFY_TO], subject, html })
  });
  if (!r.ok) throw new Error(`Resend error ${r.status}: ${await r.text()}`);
}

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok:false, message:'Method not allowed' });
  try {
    const raw = await collectRawBody(req);
    const secret = process.env.PAYSIMPLE_WEBHOOK_SECRET;
    if (secret) {
      const received = req.headers['paysimple-hmac-sha256'];
      const expected = crypto.createHmac('sha256', secret).update(raw, 'ascii').digest('hex');
      if (!received || !safeEqual(received, expected)) return res.status(401).json({ ok:false, message:'Invalid PaySimple signature' });
    }
    const event = JSON.parse(raw || '{}');
    const d = event.data || {};
    const amount = Number(d.amount || 0).toFixed(2);

    // Only initial website checkout payments for the two Parts Protection prices.
    // Future recurring charges are normally payment_source="subscription" and are intentionally ignored.
    const initialWebsitePurchase = event.event_type === 'payment_created' && d.payment_source === 'embeddable' && PLAN_AMOUNTS.has(amount);
    if (!initialWebsitePurchase) return res.status(200).json({ ok:true, ignored:true });

    await sendEmail(event);
    return res.status(200).json({ ok:true, notified:NOTIFY_TO });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok:false, message:'Webhook processing failed' });
  }
}
