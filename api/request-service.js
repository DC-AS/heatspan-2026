const RESEND_ENDPOINT = "https://api.resend.com/emails";
function clean(value,max=1000){if(typeof value!=="string")return "";return value.replace(/[<>]/g,"").trim().slice(0,max)}
export default async function handler(req,res){
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({ok:false,message:"Method not allowed."});}
 try{
  const {firstName,lastName,phone,email,address,customerStatus,serviceNeeded,urgency,message,website}=req.body||{};
  if(website) return res.status(200).json({ok:true});
  const d={firstName:clean(firstName,80),lastName:clean(lastName,80),phone:clean(phone,40),email:clean(email,160),address:clean(address,220),customerStatus:clean(customerStatus,80),serviceNeeded:clean(serviceNeeded,100),urgency:clean(urgency,80),message:clean(message,2500)};
  if(!d.firstName||!d.lastName||!d.phone||!d.email||!d.serviceNeeded||!d.message) return res.status(400).json({ok:false,message:"Please complete all required fields."});
  if(!process.env.RESEND_API_KEY) return res.status(500).json({ok:false,message:"Email service is not configured."});
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  const fields={Name:`${d.firstName} ${d.lastName}`,Phone:d.phone,Email:d.email,"Service Address":d.address||"Not provided","Customer Status":d.customerStatus||"Not provided","Service Needed":d.serviceNeeded,Urgency:d.urgency||"Not provided",Message:d.message};
  const rows=Object.entries(fields).map(([k,v])=>`<tr><td style="padding:8px;border:1px solid #ddd;font-weight:700">${esc(k)}</td><td style="padding:8px;border:1px solid #ddd">${esc(v)}</td></tr>`).join('');
  const payload={from:"Heatspan Website Test <onboarding@resend.dev>",to:["delivered@resend.dev"],subject:`[TEST] New Heatspan Service Request — ${d.serviceNeeded}`,html:`<div style="font-family:Arial,sans-serif;max-width:720px;margin:auto"><h2 style="color:#0648b7">New Heatspan Service Request — TEST MODE</h2><p>This message was generated from the Heatspan Vercel test website.</p><table style="border-collapse:collapse;width:100%">${rows}</table><p style="margin-top:20px;color:#666;font-size:12px">Test mode only. Production delivery to info@heatspan.com will be enabled later.</p></div>`};
  const r=await fetch(RESEND_ENDPOINT,{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify(payload)});
  const result=await r.json();
  if(!r.ok){console.error("Resend error",result);return res.status(502).json({ok:false,message:"We could not send the request. Please call 718-375-3320."});}
  return res.status(200).json({ok:true,id:result.id});
 }catch(e){console.error(e);return res.status(500).json({ok:false,message:"Something went wrong. Please call 718-375-3320."});}
}
