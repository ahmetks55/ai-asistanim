const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 8788;
const MAX_BODY = 512 * 1024;
const CONFIG = path.join(__dirname, 'keys.json');

const ALLOWED_ORIGINS = new Set([
  'http://localhost:8788',
  'http://127.0.0.1:8788',
  'tauri://localhost',
  'http://tauri.localhost',
  'http://localhost:1420',
  'http://127.0.0.1:1420',
  'https://ahmetks55.github.io'
]);

function loadKeys() {
  try { return JSON.parse(fs.readFileSync(CONFIG, 'utf8')); } catch(e) { return {}; }
}
function saveKeys(k) { fs.writeFileSync(CONFIG, JSON.stringify(k, null, 2)); }

function cors(res, origin) {
  if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function readBody(req, cb) {
  let size = 0;
  const chunks = [];
  req.on('data', (c) => {
    size += c.length;
    if (size > MAX_BODY) {
      req.destroy();
      cb(new Error('body too large'));
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => cb(null, Buffer.concat(chunks).toString('utf8')));
  req.on('error', (e) => cb(e));
}

function extractReply(provider, j) {
  if (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) {
    return j.choices[0].message.content;
  }
  if (provider === 'anthropic' && Array.isArray(j && j.content)) {
    const t = j.content.map(c => c && c.text ? c.text : '').join('');
    if (t) return t;
  }
  if (provider === 'cohere' && j && j.message) {
    if (typeof j.message.content === 'string' && j.message.content) return j.message.content;
    if (Array.isArray(j.message.content)) {
      const t = j.message.content.map(c => c && c.text ? c.text : '').join('');
      if (t) return t;
    }
    if (typeof j.text === 'string' && j.text) return j.text;
  }
  if (j && Array.isArray(j.candidates) && j.candidates[0] && j.candidates[0].content && Array.isArray(j.candidates[0].content.parts)) {
    const t = j.candidates[0].content.parts.map(p => p && p.text ? p.text : '').join('');
    if (t) return t;
  }
  return null;
}

function buildReqBody(provider, model, messages, stream) {
  if (provider === 'anthropic') {
    const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
    const rest = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));
    const body = { model, max_tokens: 1024, messages: rest };
    if (system) body.system = system;
    if (stream) body.stream = true;
    return body;
  }
  const body = { model, messages, max_tokens: 1024 };
  if (stream) body.stream = true;
  return body;
}

function authHeaders(provider, key) {
  if (provider === 'anthropic') {
    return {
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    };
  }
  return { 'Authorization': 'Bearer ' + key };
}

function isAllowedProvider(name) {
  return typeof name === 'string' && /^[a-z0-9_-]{1,64}$/i.test(name);
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
    res.on('end', () => cb(null, data, res.statusCode));
  });
  req.on('error', e => cb(e));
  req.on('timeout', () => { req.destroy(); cb(new Error('timeout')); });
  req.write(body);
  req.end();
}

// SSE chunk içinden token metnini çıkar (OpenAI-uyumlu + Anthropic + Cohere v2)
function extractStreamDelta(j) {
  if (!j || typeof j !== 'object') return null;
  const c0 = j.choices && j.choices[0];
  if (c0) {
    if (c0.delta && c0.delta.content != null) {
      const d = c0.delta.content;
      if (typeof d === 'string') return d;
      if (Array.isArray(d)) return d.map(x => (x && (x.text || x.content)) || '').join('');
    }
    if (typeof c0.text === 'string' && c0.text) return c0.text;
    return null;
  }
  if (j.type === 'content_block_delta' && j.delta && typeof j.delta.text === 'string') return j.delta.text;
  const dm = j.delta && j.delta.message;
  if (dm && dm.content) {
    if (typeof dm.content === 'string') return dm.content;
    if (Array.isArray(dm.content)) return dm.content.map(x => (x && x.text) || '').join('');
  }
  if (typeof j.content === 'string' && j.content && !j.type) return j.content;
  return null;
}

// Sağlayıcıya stream:true ile istek atar, SSE satırlarını chunk chunk iletir
function proxyStream(targetUrl, headers, body, cb) {
  const u = new URL(targetUrl);
  const req = https.request({
    hostname: u.hostname, port: 443, path: u.pathname, method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    timeout: 60000
  }, (res) => {
    if (res.statusCode >= 400) {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => cb.onHttpError(data, res.statusCode));
      res.on('error', () => cb.onHttpError(data, res.statusCode));
      return;
    }
    let buf = '';
    let raw = '';
    res.on('data', (c) => {
      const s = c.toString('utf8');
      raw += s;
      buf += s;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).replace(/\r$/, '');
        buf = buf.slice(i + 1);
        if (line.slice(0, 5) !== 'data:') continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const t = extractStreamDelta(JSON.parse(payload));
          if (t) cb.onDelta(t);
        } catch (e) {}
      }
    });
    res.on('end', () => cb.onEnd(raw));
    res.on('error', (e) => cb.onConnError(e));
  });
  req.on('error', e => cb.onConnError(e));
  req.on('timeout', () => { req.destroy(); cb.onConnError(new Error('timeout')); });
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
  google: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
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
  pydantic: 'https://ai.pydantic.dev/v1/chat/completions',
  opencodego: 'https://go.opencode.ai/v1/chat/completions',
  '302ai': 'https://api.302.ai/v1/chat/completions',
  abacus: 'https://api.abacus.ai/v1/chat/completions',
  above: 'https://api.above.dev/v1/chat/completions',
  agentrouter: 'https://api.agentrouter.ai/v1/chat/completions',
  airouter: 'https://api.ai-router.com/v1/chat/completions',
  aixy: 'https://api.aixy.ai/v1/chat/completions',
  akio: 'https://api.akio.io/v1/chat/completions',
  alibabachina: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  ambient: 'https://api.ambient.ai/v1/chat/completions',
  amd: 'https://api.amd.com/v1/chat/completions',
  anyapi: 'https://api.anyapi.io/v1/chat/completions',
  atomicchat: 'https://api.atomicchat.ai/v1/chat/completions',
  auriko: 'https://api.auriko.com/v1/chat/completions',
  azure: 'https://api.openai.azure.com/v1/chat/completions',
  bailing: 'https://api.bailing.ai/v1/chat/completions',
  berget: 'https://api.berget.ai/v1/chat/completions',
  blueclaw: 'https://api.blueclaw.ai/v1/chat/completions',
  bothub: 'https://api.bothub.chat/v1/chat/completions',
  charmhyper: 'https://api.charmhyper.com/v1/chat/completions',
  clarifai: 'https://api.clarifai.com/v1/chat/completions',
  claudinio: 'https://api.claudinio.com/v1/chat/completions',
  clinepass: 'https://api.clinepass.com/v1/chat/completions',
  cloudferro: 'https://api.cloudferro.com/v1/chat/completions',
  coralbricks: 'https://api.coralbricks.com/v1/chat/completions',
  cortecs: 'https://api.cortecs.ai/v1/chat/completions',
  crofai: 'https://api.crofai.com/v1/chat/completions',
  crossmodel: 'https://api.crossmodel.io/v1/chat/completions',
  crusoe: 'https://api.crusoecloud.com/v1/chat/completions',
  daoxe: 'https://api.daoxe.com/v1/chat/completions',
  databricks: 'https://adb-*.azuredatabricks.net/serving-endpoints/chat/completions',
  devpass: 'https://api.devpass.io/v1/chat/completions',
  dinference: 'https://api.dinference.com/v1/chat/completions',
  digitalocean: 'https://api.digitalocean.com/v1/chat/completions',
  ebcloud: 'https://api.ebcloud.com/v1/chat/completions',
  echo: 'https://api.echo.ai/v1/chat/completions',
  edenai: 'https://api.edenai.co/v2/chat/completions',
  empiriolabs: 'https://api.empiriolabs.ai/v1/chat/completions',
  evroc: 'https://api.evroc.ai/v1/chat/completions',
  freemodel: 'https://api.freemodel.ai/v1/chat/completions',
  frogbot: 'https://api.frogbot.ai/v1/chat/completions',
  gitlabduo: 'https://gitlab.com/api/v4/chat/completions',
  gmicloud: 'https://api.gmicloud.com/v1/chat/completions',
  greenpt: 'https://api.greenpt.ai/v1/chat/completions',
  helicone: 'https://api.helicone.ai/v1/chat/completions',
  hetzner: 'https://api.hetzner.com/v1/chat/completions',
  hpc: 'https://api.hpc-ai.com/v1/chat/completions',
  impossibl: 'https://api.impossibl.ai/v1/chat/completions',
  inception: 'https://api.inception.ai/v1/chat/completions',
  inceptron: 'https://api.inceptron.ai/v1/chat/completions',
  inferflow7: 'https://api.flow7.ai/v1/chat/completions',
  inference: 'https://api.inference.ai/v1/chat/completions',
  inferx: 'https://api.inferx.com/v1/chat/completions',
  infomaniak: 'https://api.infomaniak.com/v1/chat/completions',
  ionet: 'https://api.io.net/v1/chat/completions',
  iteracompute: 'https://api.iteracompute.com/v1/chat/completions',
  jalapeno: 'https://api.jalapeno.cloud/v1/chat/completions',
  jiekou: 'https://api.jiekou.ai/v1/chat/completions',
  kenari: 'https://api.kenari.ai/v1/chat/completions',
  kimifor: 'https://api.moonshot.cn/v1/chat/completions',
  klok: 'https://api.klokintegration.se/v1/chat/completions',
  kosmik: 'https://api.kosmikcompute.com/v1/chat/completions',
  kuae: 'https://api.kuae.cloud/v1/chat/completions',
  lilac: 'https://api.lilac.ai/v1/chat/completions',
  llama: 'https://api.llama.com/v1/chat/completions',
  llmtech: 'https://api.llmtech.ai/v1/chat/completions',
  llmtr: 'https://api.llmtr.com/v1/chat/completions',
  lmstudio: 'https://api.lmstudio.ai/v1/chat/completions',
  longcat: 'https://api.longcat.ai/v1/chat/completions',
  lucidquery: 'https://api.lucidquery.com/v1/chat/completions',
  lynkr: 'https://api.lynkr.ai/v1/chat/completions',
  meganova: 'https://api.meganova.ai/v1/chat/completions',
  melious: 'https://api.melious.com/v1/chat/completions',
  mergegateway: 'https://api.mergegateway.com/v1/chat/completions',
  meta: 'https://api.meta.com/v1/chat/completions',
  mixlayer: 'https://api.mixlayer.ai/v1/chat/completions',
  moark: 'https://api.moark.ai/v1/chat/completions',
  modal: 'https://api.modal.com/v1/chat/completions',
  modeloracle: 'https://api.modeloracle.ai/v1/chat/completions',
  modelis: 'https://api.modelis.ai/v1/chat/completions',
  modelscope: 'https://api-inference.modelscope.cn/v1/chat/completions',
  morph: 'https://api.morph.ai/v1/chat/completions',
  nrouter: 'https://api.nrouter.ai/v1/chat/completions',
  nan: 'https://api.nan.ai/v1/chat/completions',
  nanogpt: 'https://nanogpt.com/api/v1/chat/completions',
  nearai: 'https://api.near.ai/v1/chat/completions',
  neosmith: 'https://api.neosmith.com/v1/chat/completions',
  neuralwatt: 'https://api.neuralwatt.com/v1/chat/completions',
  nova: 'https://api.nova.ai/v1/chat/completions',
  openreason: 'https://api.openreason.ai/v1/chat/completions',
  opper: 'https://api.opper.ai/v1/chat/completions',
  orcarouter: 'https://api.orcarouter.com/v1/chat/completions',
  pendra: 'https://api.pendra.ai/v1/chat/completions',
  pioneer: 'https://api.pioneer.ai/v1/chat/completions',
  poe: 'https://api.poe.com/v1/chat/completions',
  poolside: 'https://api.poolside.ai/v1/chat/completions',
  privatemode: 'https://api.privatemode.ai/v1/chat/completions',
  qihang: 'https://api.qihang.com/v1/chat/completions',
  qiniu: 'https://api.qiniu.com/v1/chat/completions',
  qvac: 'https://api.qvac.com/v1/chat/completions',
  regolo: 'https://api.regolo.ai/v1/chat/completions',
  routingrun: 'https://routing.run/v1/chat/completions',
  runinfra: 'https://api.runinfra.com/v1/chat/completions',
  sakana: 'https://api.sakana.ai/v1/chat/completions',
  saladcloud: 'https://api.saladcloud.com/v1/chat/completions',
  sapai: 'https://api.sap.com/ai/v1/chat/completions',
  sarvam: 'https://api.sarvam.ai/v1/chat/completions',
  scxai: 'https://api.scx.ai/v1/chat/completions',
  siliconflowchina: 'https://api.siliconflow.cn/v1/chat/completions',
  snowflake: 'https://api.snowflake.com/v1/chat/completions',
  stackit: 'https://api.stackit.cloud/v1/chat/completions',
  standardcompute: 'https://api.standardcompute.com/v1/chat/completions',
  subconscious: 'https://api.subconscious.ai/v1/chat/completions',
  submodel: 'https://api.submodel.ai/v1/chat/completions',
  synthetic: 'https://api.synthetic.com/v1/chat/completions',
  tencenttoken: 'https://api.tencentcloud.com/v1/chat/completions',
  tencenttokenhub: 'https://api.tokenhub.tencent.com/v1/chat/completions',
  tensorx: 'https://api.tensorx.ai/v1/chat/completions',
  thegrid: 'https://api.thegrid.ai/v1/chat/completions',
  thinkingmachines: 'https://api.thinkingmachines.co/v1/chat/completions',
  tinfoil: 'https://api.tinfoil.sh/v1/chat/completions',
  tokengo: 'https://api.tokengo.ai/v1/chat/completions',
  tokenrouter: 'https://api.tokenrouter.com/v1/chat/completions',
  trustedrouter: 'https://api.trustedrouter.com/v1/chat/completions',
  umansai: 'https://api.umansai.com/v1/chat/completions',
  v0: 'https://api.v0.dev/v1/chat/completions',
  vancine: 'https://api.vancine.com/v1/chat/completions',
  vertex: 'https://us-central1-aiplatform.googleapis.com/v1/chat/completions',
  vivgrid: 'https://api.vivgrid.com/v1/chat/completions',
  vultr: 'https://api.vultr.com/v1/chat/completions',
  wafer: 'https://api.wafer.ai/v1/chat/completions',
  wallaby: 'https://api.wallaby.ai/v1/chat/completions',
  watsonx: 'https://api.watsonx.ai/v1/chat/completions',
  xpersona: 'https://api.xpersona.ai/v1/chat/completions',
  zeldoc: 'https://api.zeldoc.com/v1/chat/completions',
  zenifra: 'https://api.zenifra.com/v1/chat/completions',
  zenmux: 'https://api.zenmux.com/v1/chat/completions'
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
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: true }));
  }

  // Statik dosya sunucu (site + köprü tek origin)
  if (req.method === 'GET' && req.url !== '/keys' && !req.url.startsWith('/video-status') && req.url !== '/health') {
    let urlPath = req.url.split('?')[0].split('#')[0];
    if (!urlPath.startsWith('/')) urlPath = '/' + urlPath;
    urlPath = urlPath.replace(/\\/g, '/');
    const parts = urlPath.split('/').filter(p => p && p !== '.');
    const traversal = parts.some(p => p === '..');
    let file = (!traversal && parts.length === 0) ? 'index.html' : parts.join('/');
    if (traversal) file = '';
    const ext = path.extname(file).toLowerCase();
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.gif': 'image/gif' };
    if (file) {
      const full = path.resolve(__dirname, file);
      if (full.startsWith(__dirname) && fs.existsSync(full) && fs.statSync(full).isFile()) {
        res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
        res.statusCode = 200;
        return fs.createReadStream(full).pipe(res);
      }
    }
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = 200;

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
    readBody(req, (err, body) => {
      if (err) {
        res.statusCode = 413;
        return res.end(JSON.stringify({ error: 'Gövde çok büyük' }));
      }
      try {
        const p = JSON.parse(body);
        if (!isAllowedProvider(p.provider)) {
          return res.end(JSON.stringify({ error: 'Geçersiz sağlayıcı' }));
        }
        if (typeof p.key !== 'string' || !p.key || p.key.length > 512) {
          return res.end(JSON.stringify({ error: 'Geçersiz anahtar' }));
        }
        const k = loadKeys();
        k[p.provider] = p.key;
        saveKeys(k);
        res.end(JSON.stringify({ ok: true }));
      } catch(e) { res.end(JSON.stringify({ error: 'Geçersiz veri' })); }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/chat') {
    readBody(req, (err, body) => {
      if (err) {
        res.statusCode = 413;
        return res.end(JSON.stringify({ error: 'Gövde çok büyük' }));
      }
      try {
        const p = JSON.parse(body);
        if (!p || !Array.isArray(p.messages) || p.messages.length === 0) {
          return res.end(JSON.stringify({ error: 'messages gerekli' }));
        }
        if (!isAllowedProvider(p.provider)) {
          return res.end(JSON.stringify({ error: 'Geçersiz sağlayıcı' }));
        }
        if (typeof p.model !== 'string' || !p.model || p.model.length > 256) {
          return res.end(JSON.stringify({ error: 'Geçersiz model' }));
        }
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

        const wantStream = p.stream === true;
        const reqBody = JSON.stringify(buildReqBody(p.provider, p.model, p.messages, wantStream));
        const providerLabel = p.provider.toUpperCase();

        if (wantStream) {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          });
          const send = (o) => { try { res.write('data: ' + JSON.stringify(o) + '\n\n'); } catch (e) {} };
          let started = false;
          let finished = false;
          let gen = 0;
          const finishOk = () => { if (finished) return; finished = true; send({ done: true }); res.end(); };
          const fail = (msg) => { if (finished) return; finished = true; send({ error: msg }); res.end(); };

          const attempt = (retriesLeft) => {
            const myGen = ++gen;
            let ended = false;
            const alive = () => !finished && myGen === gen && !ended;
            proxyStream(url, authHeaders(p.provider, k), reqBody, {
              onDelta: (txt) => { if (!alive()) return; started = true; send({ delta: txt }); },
              onHttpError: (data, status) => {
                if (!alive()) return;
                ended = true;
                let apiMsg = null;
                try {
                  const j = JSON.parse(data);
                  const e = j && j.error;
                  apiMsg = (typeof e === 'string' ? e : (e && e.message)) || (j && j.message) || null;
                } catch (e2) {}
                if ((status === 429 || status === 503) && retriesLeft > 0) {
                  return setTimeout(() => attempt(retriesLeft - 1), 2000);
                }
                const label = status >= 400 ? providerLabel + ' API ' + status + ': ' : '';
                fail(label + (apiMsg || 'Model şu an yanıt vermiyor (soğuk başlangıç olabilir, tekrar deneyin)'));
              },
              onConnError: (err) => {
                if (!alive()) return;
                ended = true;
                if (!started && retriesLeft > 0 && (err.message === 'timeout' || err.code === 'ECONNRESET')) {
                  return setTimeout(() => attempt(retriesLeft - 1), 1500);
                }
                if (!started) {
                  fail('Bağlantı hatası: ' + err.message);
                } else {
                  finished = true;
                  res.end();
                }
              },
              onEnd: (raw) => {
                if (!alive()) return;
                ended = true;
                if (started) return finishOk();
                try {
                  const j = JSON.parse(raw);
                  const reply = extractReply(p.provider, j);
                  if (reply) { send({ delta: reply }); return finishOk(); }
                  const e = j && j.error;
                  const apiMsg = (typeof e === 'string' ? e : (e && e.message)) || (j && j.message) || null;
                  if (apiMsg) return fail(providerLabel + ': ' + apiMsg);
                } catch (e2) {}
                fail('Yanıt çözümlenemedi');
              }
            });
          };
          attempt(2);
          return;
        }

        const attempt = (retriesLeft) => {
          proxy(url, authHeaders(p.provider, k), reqBody, (err, data, status) => {
            if (err) {
              if (retriesLeft > 0 && (err.message === 'timeout' || err.code === 'ECONNRESET')) {
                return setTimeout(() => attempt(retriesLeft - 1), 1500);
              }
              return res.end(JSON.stringify({ error: 'Bağlantı hatası: ' + err.message }));
            }
            try {
              const j = JSON.parse(data);
              const reply = extractReply(p.provider, j);
              if (reply) {
                return res.end(JSON.stringify({ reply }));
              }
              const apiMsg = (j.error && j.error.message) || j.message || null;
              if ((status === 503 || status === 429 || !apiMsg) && retriesLeft > 0) {
                return setTimeout(() => attempt(retriesLeft - 1), 2000);
              }
              const label = status && status >= 400 ? providerLabel + ' API ' + status + ': ' : '';
              res.end(JSON.stringify({ error: label + (apiMsg || 'Model şu an yanıt vermiyor (soğuk başlangıç olabilir, tekrar deneyin)') }));
            } catch(e) {
              if (retriesLeft > 0) return setTimeout(() => attempt(retriesLeft - 1), 1500);
              res.end(JSON.stringify({ error: 'Yanıt çözümlenemedi (HTTP ' + status + ')' }));
            }
          });
        };
        attempt(2);
      } catch(e) { res.end(JSON.stringify({ error: 'Geçersiz veri' })); }
    });
    return;
  }

  res.end(JSON.stringify({ error: 'Bilinmeyen yol' }));
});

server.listen(PORT, () => {
  console.log('Köprü çalışıyor: http://localhost:' + PORT);
});
