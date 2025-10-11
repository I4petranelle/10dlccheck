// Smoke test for key serverless handlers
// Run with: node scripts/smoke-test.js

const fs = require('fs');
const path = require('path');

function makeReq(options){
  return Object.assign({ method: 'GET', headers: {}, body: null, query: {}, url:'/'}, options || {});
}

function makeRes(){
  const out = { statusCode: 200, headers: {}, body: null };
  return {
    setHeader(k,v){ out.headers[k]=v; },
    status(code){ out.statusCode = code; return this; },
    json(obj){ out.body = typeof obj === 'string' ? obj : JSON.stringify(obj); return out; },
    end(s){ out.body = s; return out; },
    send(s){ out.body = s; return out; },
    getOut(){ return out; }
  };
}

(async function run(){
  console.log('Smoke test starting...');

  // Load handlers
  const globalCount = require('../api/global-count.js').default || require('../api/global-count.js');
  const check = require('../api/check.js').default || require('../api/check.js');
  const sbg = require('../api/sbg-rules.js').default || require('../api/sbg-rules.js');

  // 1) Test GET /api/global-count
  try{
    const req = makeReq({ method: 'GET' });
    const res = makeRes();
    const out = await globalCount(req, res);
    console.log('\napi/global-count.js GET ->', res.getOut());
  }catch(e){ console.error('global-count GET error', e); }

  // 2) Test POST /api/global-count (increment) - but envs likely missing, ensure we don't crash
  try{
    const req = makeReq({ method: 'POST' });
    const res = makeRes();
    const out = await globalCount(req, res);
    console.log('\napi/global-count.js POST ->', res.getOut());
  }catch(e){ console.error('global-count POST error', e); }

  // 3) Test POST /api/check with short text
  try{
    const req = makeReq({ method: 'POST', body: { text: 'ExampleCo: Hello! Reply STOP to opt out.' } });
    const res = makeRes();
    const out = await check(req, res);
    console.log('\napi/check.js POST ->', res.getOut());
  }catch(e){ console.error('check POST error', e); }

  // 4) Test GET /api/sbg-rules
  try{
    const req = makeReq({ method: 'GET' });
    const res = makeRes();
    const out = await sbg(req, res);
    console.log('\napi/sbg-rules.js GET ->', res.getOut());
  }catch(e){ console.error('sbg GET error', e); }

  // 5) Test PUT /api/sbg-rules without key (should return 401)
  try{
    const req = makeReq({ method: 'PUT', headers: {}, body: JSON.stringify({ rules: [{ id: 'r1', pattern: 'loan', category: 'restricted', severity: 'high', enabled: true }] }) });
    const res = makeRes();
    const out = await sbg(req, res);
    console.log('\napi/sbg-rules.js PUT (no key) ->', res.getOut());
  }catch(e){ console.error('sbg PUT error', e); }

  console.log('\nSmoke test finished.');
})();
