const NOTIFY_TO = process.env.REVIEW_ALERT_TO || 'info@heatspan.com';
const RESEND_FROM = process.env.RESEND_FROM || 'Heatspan Website <onboarding@resend.dev>';

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({ok:false});
  try{
    const {rating,page,createdAt}=req.body||{};
    const n=Number(rating);
    if(!Number.isInteger(n)||n<1||n>3) return res.status(400).json({ok:false,message:'Invalid rating'});
    const key=process.env.RESEND_API_KEY;
    if(!key) throw new Error('RESEND_API_KEY is not configured');
    const subject=`Bad review alert — ${n} star${n===1?'':'s'} selected`;
    const html=`<h2>Bad review alert</h2><p>A visitor selected <strong>${n} out of 5 stars</strong> from the Heatspan website review prompt.</p><p><strong>Time:</strong> ${createdAt||new Date().toISOString()}</p><p><strong>Page:</strong> ${page||'Contact page'}</p><p>The customer was then sent to Heatspan on Google to continue the review process.</p>`;
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from:RESEND_FROM,to:[NOTIFY_TO],subject,html})});
    if(!r.ok) throw new Error(`Resend error ${r.status}: ${await r.text()}`);
    return res.status(200).json({ok:true});
  }catch(err){console.error(err);return res.status(500).json({ok:false,message:'Unable to send alert'});}
}
