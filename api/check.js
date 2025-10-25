// api/check.js
export default async function handler(req,res){
  // CORS
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Vary","Origin");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");
  if(req.method==="OPTIONS")return res.status(204).end();
  if(req.method!=="POST")return res.status(405).json({error:"Method not allowed"});

  try{
    // Parse body
    let body=req.body; if(Buffer.isBuffer(body)) body=body.toString("utf8");
    if(typeof body==="string"){ try{ body=JSON.parse(body);}catch{} }
    const textRaw=(typeof body==="object"&&body!==null)?(body.text??body.message??""):(body??"");
    const text=String(textRaw||"").trim();
    const mode=(typeof body==="object"&&body?.mode)?String(body.mode):"unknown";
    if(!text) return res.status(200).json({status:"fail",issues:["❗ Missing input"],tips:[]});

    const issues=[], tips=[]; const lower=text.toLowerCase();
    // ---- API/public-rules FIRST ----
    let maxSeverity="none"; const bump=s=>{const r={none:0,watchlist:1,restricted:2,prohibited:3}; if(r[s]>r[maxSeverity]) maxSeverity=s;};
    try{
      const mod=await import("./public-rules.js").catch(()=>null);
      const RULES=mod?.default;
      if(Array.isArray(RULES)){
        for(const r of RULES){
          if(r?.scope&&r.scope!=="all"&&r.scope!=="sms") continue;
          let matched=null;
          for(const p of (r.patterns||[])){
            let re=null;
            if(typeof p==="string"){const esc=p.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); re=new RegExp(`\\b${esc}\\b`,"i");}
            else if(p?.regex){ re=new RegExp(p.regex,p.flags||"i");}
            else if(p?.word){const esc=p.word.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); re=new RegExp(`\\b${esc}\\b`,"i");}
            if(re&&re.test(lower)){ matched=p.word||p.regex||"pattern"; break; }
          }
          if(matched){
            bump(r.severity||"watchlist");
            const icon=r.severity==="prohibited"?"🚫":r.severity==="restricted"?"⚠️":"🔎";
            issues.push(`${icon} ${r.name}${matched?`: "${String(matched).slice(0,48)}"`:""}`);
            if(r.tip) tips.push(r.tip);
          }
        }
      }
    }catch{}

    // ---- Length checks (unchanged) ----
    if(text.length>918) issues.push(`📝 Message is very long for SMS concatenation (${text.length} characters).`);
    else if(text.length>160) issues.push(`📝 Message exceeds ~160 characters (may split into multiple SMS) (${text.length} chars).`);

    // ---- LOCAL checks AFTER API rules (unchanged list) ----
    const checks=[
      {icon:"⚠️",msg:"Contains high-risk financial services content",words:["payday loan","cash advance","short-term loan","cryptocurrency","crypto","bitcoin","debt collection","stock alert","tax relief"]},
      {icon:"⚠️",msg:"Contains get-rich-quick/MLM or gambling-adjacent content",words:["work from home","make money fast","secret shopper","easy money","multi-level marketing","mlm","gambling","sweepstakes","get rich","passive income"]},
      {icon:"⚠️",msg:"Contains third-party services content",words:["debt consolidation","debt relief","debt reduction","debt forgiveness","credit repair","lead generation","job alert","broker"]},
      {icon:"🚫",msg:"References controlled substances",words:["tobacco","vaping","vape","cannabis","cbd","marijuana","weed","illegal drug","prescription"]},
      {icon:"🚫",msg:"Contains SHAFT content (Sex/Hate/Alcohol/Firearms/Tobacco/Profanity)",words:["sex","adult","hate","alcohol","beer","wine","firearm","gun","weapon","tobacco","fuck","shit","damn","bitch"]},
      {icon:"🚫",msg:"Contains potential scam/phishing patterns",words:["phishing","fraud","spam","deceptive","fake","scam","virus","malware","click here now","urgent action","verify account","suspended account"]},
      {icon:"🔊",msg:"Uses aggressive/over-promissory marketing language",words:["act now","limited time","free money","guaranteed","risk-free","no obligation","call now","urgent","expires today"]},
      {icon:"🔒",msg:"Requests sensitive personal information in SMS",words:["ssn","social security","credit card","password","pin number","bank account","routing number"]}
    ];
    let highFlag=false;
    for(const {words,msg,icon}of checks){
      const found=words.filter(w=>{const esc=w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");return new RegExp(`\\b${esc}\\b`,"i").test(lower)});
      if(found.length){ highFlag=true; issues.push(`${icon} ${msg}: "${found.join('", "')}"`); }
    }

    // ---- Tips (unchanged) ----
    if(!/https?:\/\//i.test(text)) tips.push("🔗 Consider adding a helpful link (if relevant).");
    if(mode!=="pill") tips.push("📩 Include STOP to opt out and HELP for assistance when opt-in is unknown.");
    if(!/^(hi|hello|hey|greetings|dear)\b/i.test(text)) tips.push("👋 Lead with brand/name for clarity.");

    // ---- Status (API severity takes precedence, then local) ----
    const status = (maxSeverity==="prohibited"||highFlag)?"fail"
                 : (maxSeverity==="restricted"||issues.length)?"warn"
                 : "pass";

    // Counter (unchanged)
    let totals={incremented:false,total:null}; try{ totals=await incrementGlobal("tdlc:checks_total"); }catch{}
    return res.status(200).json({
      status,
      issues:dedupe(issues).slice(0,12),
      tips:dedupe(tips).slice(0,12),
      meta:{mode,length:text.length,severity:maxSeverity},
      totals
    });
  }catch(e){
    return res.status(500).json({status:"warn",issues:["⚠️ Analyzer error on server."],tips:["Using local/offline rules is OK if this persists."],error:String(e?.message||e)});
  }
}

// Upstash (unchanged)
async function incrementGlobal(key){
  const url=process.env.UPSTASH_REDIS_REST_URL, token=process.env.UPSTASH_REDIS_REST_TOKEN;
  if(!url||!token) return {incremented:false,total:null};
  let r=await fetch(`${url}/pipeline`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify([["INCR",key],["GET",key]])});
  if(r.ok){const d=await r.json().catch(()=>null);const raw=Array.isArray(d)?(d[1]?.result??d[0]?.result):null;const t=Number(raw);if(Number.isFinite(t))return{incremented:true,total:t};}
  r=await fetch(`${url}/INCR/${encodeURIComponent(key)}`,{method:"POST",headers:{Authorization:`Bearer ${token}`}});
  if(r.ok){const d=await r.json().catch(()=>null);const t=Number(d?.result);if(Number.isFinite(t))return{incremented:true,total:t};}
  return {incremented:false,total:null};
}
function dedupe(a){return Array.from(new Set(a));}
