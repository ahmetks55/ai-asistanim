const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8788;
const CONFIG = path.join(__dirname, 'keys.json');

function loadKeys() {
  try { return JSON.parse(fs.readFileSync(CONFIG, 'utf8')); } catch(e) { return {}; }
}
function saveKeys(k) { fs.writeFileSync(CONFIG, JSON.stringify(k, null, 2)); }

function cors(res, origin) {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  });
}

function proxy(targetUrl, headers, body, cb) {
  const u = new URL(targetUrl);
  const req = https.request({
    hostname: u.hostname, port: 443, path: u.pathname, method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    timeout: 60000
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => cb(null, data));
  });
  req.on('error', e => cb(e));
  req.on('timeout', () => { req.destroy(); cb(new Error('timeout')); });
  req.write(body);
  req.end();
}

const ENDPOINTS = {
  nvidia: 'https://integrate.api.nvidia.com/v1/chat/completions',
  nara: 'https://router.bynara.id/v1/chat/completions',
  airforce: 'https://api.airforce/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  cerebras: 'https://api.cerebras.ai/v1/chat/completions',
  zai: 'https://api.z.ai/api/paas/v4/chat/completions',
  siliconflow: 'https://api.siliconflow.cn/v1/chat/completions',
  google: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
  cohere: 'https://api.cohere.com/v2/chat',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  cloudflare: 'https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/ai/v1/chat/completions',
  scaleway: 'https://api.scaleway.ai/v1/chat/completions',
  together: 'https://api.together.xyz/v1/chat/completions',
  fireworks: 'https://api.fireworks.ai/inference/v1/chat/completions',
  deepinfra: 'https://api.deepinfra.com/v1/openai/chat/completions',
  novita: 'https://api.novita.ai/v3/openai/chat/completions',
  ai21: 'https://api.ai21.com/studio/v1/chat/completions',
  upstage: 'https://api.upstage.ai/v1/solar/chat/completions',
  reka: 'https://api.reka.ai/v1/chat/completions',
  nebius: 'https://api.studio.nebius.com/v1/chat/completions',
  baseten: 'https://api.baseten.co/v1/chat/completions',
  sambanova: 'https://api.sambanova.ai/v1/chat/completions',
  xai: 'https://api.x.ai/v1/chat/completions',
  perplexity: 'https://api.perplexity.ai/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  venice: 'https://api.venice.ai/api/v1/chat/completions',
  minimax: 'https://api.minimax.chat/v1/text/chatcompletion_pro',
  moonshot: 'https://api.moonshot.cn/v1/chat/completions',
  stepfun: 'https://api.stepfun.com/v1/chat/completions',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  volcengine: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
  alibaba: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
  baidu: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat',
  sensenova: 'https://api.sensenova.cn/v1/chat/completions',
  xiaomi: 'https://api.xiaomi.com/v1/chat/completions',
  tencent: 'https://hunyuan.tencentcloudapi.com/v1/chat/completions',
  bytedance: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
  github: 'https://models.github.ai/inference/chat/completions',
  llm7: 'https://api.llm7.io/v1/chat/completions',
  ovhcloud: 'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions',
  ollama: 'https://api.ollama.com/v1/chat/completions',
  kilo: 'https://api.kilo.ai/api/gateway/v1/chat/completions',
  opencodezen: 'https://opencode.ai/zen/v1/chat/completions',
  aionlabs: 'https://api.aionlabs.ai/v1/chat/completions',
  agnes: 'https://apihub.agnes-ai.com/v1/chat/completions',
  chutes: 'https://api.chutes.ai/v1/chat/completions',
  glhf: 'https://glhf.chat/api/openai/v1/chat/completions',
  nscale: 'https://inference.api.nscale.com/v1/chat/completions',
  hyperbolic: 'https://api.hyperbolic.xyz/v1/chat/completions',
  iflow: 'https://api.iflow.cn/v1/chat/completions',
  kluster: 'https://api.kluster.ai/v1/chat/completions',
  friendli: 'https://api.friendli.ai/v1/chat/completions',
  lepton: 'https://api.lepton.ai/v1/chat/completions',
  anyscale: 'https://api.endpoints.anyscale.com/v1/chat/completions',
  puter: 'https://api.puter.com/v1/chat/completions',
  aiml: 'https://api.aimlapi.com/v1/chat/completions',
  nagaai: 'https://api.naga.ac/v1/chat/completions',
  paxsenix: 'https://api.paxsenix.org/v1/chat/completions',
  aihubmix: 'https://aihubmix.com/v1/chat/completions',
  fastrouter: 'https://fastrouter.ai/v1/chat/completions',
  literouter: 'https://api.literouter.com/v1/chat/completions',
  swiftrouter: 'https://api.swiftrouter.com/v1/chat/completions',
  unorouter: 'https://api.unorouter.com/v1/chat/completions',
  voidai: 'https://api.voidai.app/v1/chat/completions',
  valorgpt: 'https://api.valorgpt.com/v1/chat/completions',
  zenllm: 'https://api.zenllm.org/v1/chat/completions',
  resurge: 'https://api.resurge.one/v1/chat/completions',
  subaxis: 'https://api.subaxis.dev/v1/chat/completions',
  routeway: 'https://api.routeway.ai/v1/chat/completions',
  requesty: 'https://api.requesty.ai/v1/chat/completions',
  aipooled: 'https://api.ai.pooled.dev/v1/chat/completions',
  llmgateway: 'https://api.llmgateway.io/v1/chat/completions',
  studiolm: 'https://api.studiolm.dev/v1/chat/completions',
  pixazo: 'https://api.pixazo.ai/v1/chat/completions',
  yingsuan: 'https://api.yingsuan.top/v1/chat/completions',
  xeven: 'https://api.xeven.workers.dev/v1/chat/completions',
  ofox: 'https://api.ofox.ai/v1/chat/completions',
  mnnai: 'https://api.mnnai.ru/v1/chat/completions',
  wandb: 'https://api.wandb.ai/v1/chat/completions',
  replicate: 'https://api.replicate.com/v1/chat/completions',
  arcee: 'https://conductor.arcee.ai/v1/chat/completions',
  subnp: 'https://api.subnp.com/v1/chat/completions',
  aichixia: 'https://api.aichixia.xyz/v1/chat/completions',
  pydantic: 'https://ai.pydantic.dev/v1/chat/completions'
};

function huggingFaceVideo(prompt, model, apiKey, cb) {
  const body = JSON.stringify({ inputs: prompt });
  const req = https.request({
    hostname: 'router.huggingface.co', port: 443, path: '/hf-inference/models/' + model, method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    },
    timeout: 120000
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      if (res.statusCode === 200 && res.headers['content-type']?.startsWith('video/')) {
        const base64 = Buffer.from(data, 'binary').toString('base64');
        cb(null, JSON.stringify({ video: 'data:video/mp4;base64,' + base64 }));
      } else {
        cb(null, data);
      }
    });
  });
  req.on('error', e => cb(e));
  req.on('timeout', () => { req.destroy(); cb(new Error('timeout')); });
  req.write(body);
  req.end();
}

function pollinationsVideo(prompt, model, apiKey, cb) {
  const body = JSON.stringify({ model, prompt });
  const req = https.request({
    hostname: 'gen.pollinations.ai', port: 443, path: '/v1/videos/generations', method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    },
    timeout: 120000
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => cb(null, data));
  });
  req.on('error', e => cb(e));
  req.on('timeout', () => { req.destroy(); cb(new Error('timeout')); });
  req.write(body);
  req.end();
}

function pollinationsVideoStatus(jobId, apiKey, cb) {
  const req = https.request({
    hostname: 'gen.pollinations.ai', port: 443, path: '/v1/videos/generations/' + jobId, method: 'GET',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Accept': 'application/json' },
    timeout: 30000
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => cb(null, data));
  });
  req.on('error', e => cb(e));
  req.end();
}

const server = http.createServer((req, res) => {
  const origin = req.headers.origin;
  cors(res, origin);
  if (req.method === 'OPTIONS') return res.end();

  if (req.method === 'GET' && req.url === '/health') {
    return res.end(JSON.stringify({ ok: true }));
  }

  if (req.method === 'GET' && req.url === '/keys') {
    const k = loadKeys();
    const keys = {};
    for (const name of Object.keys(ENDPOINTS)) {
      keys[name] = !!k[name];
    }
    keys.nara = !!k.nara;
    keys.pollinations = !!k.pollinations;
    keys.hf = !!k.hf;
    return res.end(JSON.stringify(keys));
  }

  if (req.method === 'GET' && req.url.startsWith('/video-status')) {
    const url = new URL(req.url, 'http://localhost');
    const jobId = url.searchParams.get('job_id');
    if (!jobId) return res.end(JSON.stringify({ error: 'job_id gerekli' }));
    const keys = loadKeys();
    const k = keys.pollinations || '';
    if (!k) return res.end(JSON.stringify({ error: 'Pollinations key yok' }));
    pollinationsVideoStatus(jobId, k, (err, data) => {
      if (err) return res.end(JSON.stringify({ error: err.message }));
      try {
        const j = JSON.parse(data);
        if (j.status === 'completed' || j.status === 'succeeded') {
          res.end(JSON.stringify({ status: 'completed', video_url: j.video_url || j.output?.video_url }));
        } else if (j.status === 'failed' || j.status === 'error') {
          res.end(JSON.stringify({ status: 'failed', error: j.error || 'İşlem başarısız' }));
        } else {
          res.end(JSON.stringify({ status: j.status || 'processing' }));
        }
      } catch(e) { res.end(JSON.stringify({ status: 'processing' })); }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/save-key') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const p = JSON.parse(body);
        const k = loadKeys();
        k[p.provider] = p.key;
        saveKeys(k);
        res.end(JSON.stringify({ ok: true }));
      } catch(e) { res.end(JSON.stringify({ error: 'Geçersiz veri' })); }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/chat') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const p = JSON.parse(body);
        const keys = loadKeys();

        if (p.provider === 'video') {
          const k = keys.pollinations || '';
          if (!k) return res.end(JSON.stringify({ error: 'Pollinations key yok. Ayarlardan girin.' }));
          pollinationsVideo(p.messages[p.messages.length - 1].content, p.model, k, (err, data) => {
            if (err) return res.end(JSON.stringify({ error: err.message }));
            try {
              const j = JSON.parse(data);
              if (j.video_url || j.url) {
                res.end(JSON.stringify({ video: j.video_url || j.url }));
              } else if (j.id) {
                res.end(JSON.stringify({ job_id: j.id, status: 'processing' }));
              } else {
                res.end(JSON.stringify({ error: j.error?.message || 'Video oluşturulamadı' }));
              }
            } catch(e) { res.end(JSON.stringify({ error: 'Parse hatası' })); }
          });
          return;
        }

        if (p.provider === 'hfvideo') {
          const k = keys.hf || '';
          if (!k) return res.end(JSON.stringify({ error: 'Hugging Face key yok. Ayarlardan girin.' }));
          huggingFaceVideo(p.messages[p.messages.length - 1].content, p.model, k, (err, data) => {
            if (err) return res.end(JSON.stringify({ error: err.message }));
            try {
              const j = JSON.parse(data);
              if (j.video) {
                res.end(JSON.stringify({ video: j.video }));
              } else {
                res.end(JSON.stringify({ error: j.error || j.message || 'Video oluşturulamadı' }));
              }
            } catch(e) { res.end(JSON.stringify({ error: 'Parse hatası' })); }
          });
          return;
        }

        if (p.provider === 'image') {
          const prompt = encodeURIComponent(p.messages[p.messages.length - 1].content);
          const url = 'https://image.pollinations.ai/prompt/' + prompt + '?model=' + p.model + '&width=1024&height=1024';
          return res.end(JSON.stringify({ image: url }));
        }

        const k = keys[p.provider] || '';
        if (!k) return res.end(JSON.stringify({ error: p.provider + ' key yok. Ayarlardan girin.' }));

        const url = ENDPOINTS[p.provider];
        if (!url) return res.end(JSON.stringify({ error: 'Bilinmeyen provider: ' + p.provider }));

        const reqBody = JSON.stringify({
          model: p.model,
          messages: p.messages,
          max_tokens: 1024
        });

        proxy(url, { 'Authorization': 'Bearer ' + k }, reqBody, (err, data) => {
          if (err) return res.end(JSON.stringify({ error: err.message }));
          try {
            const j = JSON.parse(data);
            if (j.choices?.[0]?.message?.content) {
              res.end(JSON.stringify({ reply: j.choices[0].message.content }));
            } else {
              res.end(JSON.stringify({ error: j.error?.message || 'Yanıt alınamadı' }));
            }
          } catch(e) { res.end(JSON.stringify({ error: 'Parse hatası' })); }
        });
      } catch(e) { res.end(JSON.stringify({ error: 'Geçersiz veri' })); }
    });
    return;
  }

  res.end(JSON.stringify({ error: 'Bilinmeyen yol' }));
});

server.listen(PORT, () => {
  console.log('Köprü çalışıyor: http://localhost:' + PORT);
});
