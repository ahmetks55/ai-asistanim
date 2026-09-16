// ===== AI ASİSTANIM =====
const API = 'http://localhost:8788';
const messagesEl = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const connStatus = document.getElementById('connStatus');

let chatHistory = [];
let selectedModel = localStorage.getItem('selectedModel') || 'nara:agnes-2.5-flash';

// ===== SAĞLAYICI BİLGİ VERİTABANI =====
const PROVIDERS = {
  nara: {
    name: 'NaraRouter', icon: '🟢', color: '#22c55e',
    why: 'NaraRouter, ücretsiz AI modellerine yönlendirme yapan bir API gateway\'dir. Tek bir key ile birden fazla modele erişebilirsiniz.',
    url: 'https://nara.router.net',
    urlText: 'nara.router.net',
    keyFormat: 'sk-nry-...',
    models: 'Hy3 Free, Agnes 2.5 Flash',
    pricing: 'Tamamen ücretsiz',
    limit: 'Sınırsız'
  },
  groq: {
    name: 'Groq', icon: '⚡', color: '#f59e0b',
    why: 'Groq, LPU (Language Processing Unit) donanımıyla çalışan ultra hızlı AI API\'sidir. Llama, Gemma ve DeepSeek modellerini milisaniye hızında çalıştırır.',
    url: 'https://console.groq.com/keys',
    urlText: 'console.groq.com',
    keyFormat: 'gsk_...',
    models: 'Llama 3.3 70B, Llama 3.1 8B, Gemma 2 9B, DeepSeek R1 70B',
    pricing: 'Ücretsiz katman mevcut',
    limit: '30 istek/dakika, 6000 istek/gün'
  },
  cerebras: {
    name: 'Cerebras', icon: '🧠', color: '#8b5cf6',
    why: 'Cerebras, wafer-scale çipleriyle çalışan AI inference platformudur. Llama modellerini en hızlı çalıştıran servislerden biridir.',
    url: 'https://cloud.cerebras.ai/',
    urlText: 'cloud.cerebras.ai',
    keyFormat: 'csk-...',
    models: 'Llama 3.3 70B, Llama 3.1 8B',
    pricing: 'Ücretsiz katman mevcut',
    limit: '1M token/gün'
  },
  zai: {
    name: 'Z.ai (GLM)', icon: '🔵', color: '#3b82f6',
    why: 'Zhipu AI\'ın geliştirdiği GLM modelleri, Çin merkezli güçlü open-source modellerdir. Görsel anlama desteği de sunar.',
    url: 'https://open.bigmodel.cn/',
    urlText: 'open.bigmodel.cn',
    keyFormat: 'API Key...',
    models: 'GLM 4.5 Flash, GLM 4.7 Flash',
    pricing: 'Ücretsiz katman mevcut',
    limit: 'API limitleri'
  },
  siliconflow: {
    name: 'SiliconFlow', icon: '🌊', color: '#06b6d4',
    why: 'SiliconFlow, açık kaynak modelleri ücretsiz sunan bir inference platformudur. DeepSeek V3 ve Qwen modellerini ücretsiz kullanabilirsiniz.',
    url: 'https://cloud.siliconflow.cn/',
    urlText: 'cloud.siliconflow.cn',
    keyFormat: 'sk-...',
    models: 'DeepSeek V3, Qwen3 8B',
    pricing: 'Ücretsiz katman mevcut',
    limit: '1000 istek/gün'
  },
  google: {
    name: 'Google Gemini', icon: '🔴', color: '#ef4444',
    why: 'Google\'ın en güçlü AI modelleri. 1M context window ile devasa metinleri işleyebilir. Görsel, video ve ses anlama desteği var.',
    url: 'https://aistudio.google.com/apikey',
    urlText: 'aistudio.google.com',
    keyFormat: 'AIza...',
    models: 'Gemini 2.5 Flash, Gemini 2.0 Flash, Gemma 3 27B',
    pricing: 'Ücretsiz katman mevcut',
    limit: '15 istek/dakika, 1500 istek/gün'
  },
  mistral: {
    name: 'Mistral', icon: '🌀', color: '#f97316',
    why: 'Fransa merkezli Mistral AI\'ın modelleri. Kod yazma uzmanı Codestral ve genel amaçlı Mistral Small ücretsiz sunuluyor.',
    url: 'https://console.mistral.ai/api-keys/',
    urlText: 'console.mistral.ai',
    keyFormat: '...',
    models: 'Mistral Small, Codestral, Devstral Small',
    pricing: 'Ücretsiz katman mevcut',
    limit: 'Ordu Roland ücretsiz'
  },
  cohere: {
    name: 'Cohere', icon: '💎', color: '#10b981',
    why: 'Cohere\'ın Command modelleri, RAG (Retrieval-Augmented Generation) ve araştırma görevlerinde mükemmeldir. Uzun belge analizi yapabilir.',
    url: 'https://dashboard.cohere.com/api-keys',
    urlText: 'dashboard.cohere.com',
    keyFormat: '...',
    models: 'Command A, Command R+',
    pricing: 'Ücretsiz katman mevcut',
    limit: '1000 istek/dakika'
  },
  deepseek: {
    name: 'DeepSeek', icon: '🐋', color: '#6366f1',
    why: 'DeepSeek, Çin merkezli AI araştırma şirketinin en güçlü modelleri. DeepSeek V3 ve R1, kod yazma ve mantıksal çıkarımda rakipsiz.',
    url: 'https://platform.deepseek.com/api_keys',
    urlText: 'platform.deepseek.com',
    keyFormat: 'sk-...',
    models: 'DeepSeek V3 (Chat), DeepSeek R1 (Reasoner)',
    pricing: '$5 ücretsiz kredi',
    limit: 'Kredi bitene kadar'
  },
  openrouter: {
    name: 'OpenRouter', icon: '🔀', color: '#8b5cf6',
    why: 'OpenRouter, 100+ AI modelini tek bir API ile sunar. Ücretsiz modeller de mevcuttur. Tek key ile tüm modellere erişim.',
    url: 'https://openrouter.ai/settings/keys',
    urlText: 'openrouter.ai',
    keyFormat: 'sk-or-...',
    models: '100+ model (Llama, Gemma, Mistral ücretsiz)',
    pricing: 'Ücretsiz modeller + ücretli modeller',
    limit: '20 istek/dk (ücretsiz modeller)'
  },
  cloudflare: {
    name: 'Cloudflare Workers AI', icon: '☁️', color: '#f97316',
    why: 'Cloudflare\'ın edge computing ağı üzerinde çalışan AI modelleri. Düşük gecikme süresi ve ücretsiz katman.',
    url: 'https://dash.cloudflare.com/profile/api-tokens',
    urlText: 'dash.cloudflare.com',
    keyFormat: 'API Token...',
    models: 'Llama 3.3 70B, Llama 3.1 8B',
    pricing: 'Ücretsiz katman mevcut',
    limit: '10K istek/gün'
  },
  scaleway: {
    name: 'Scaleway', icon: '🏢', color: '#6366f1',
    why: 'Avrupa merkezli bulut sağlayıcının AI inference hizmeti. GDPR uyumlu ve ücretsiz katman sunuyor.',
    url: 'https://console.scaleway.com/iam/api-keys',
    urlText: 'console.scaleway.com',
    keyFormat: 'SCW...',
    models: 'Llama 3.3 70B',
    pricing: 'Ücretsiz katman mevcut',
    limit: 'API limitleri'
  },
  together: {
    name: 'Together AI', icon: '🤝', color: '#10b981',
    why: 'Together AI, açık kaynak modellerini yüksek hızda sunar. Turbo modelleri ile hızlı inference.',
    url: 'https://api.together.xyz/settings/api-keys',
    urlText: 'api.together.xyz',
    keyFormat: '...',
    models: 'Llama 3.1 8B Turbo, Llama 3.3 70B Turbo, DeepSeek V3',
    pricing: '$5 ücretsiz kredi',
    limit: 'Kredi bitene kadar'
  },
  fireworks: {
    name: 'Fireworks AI', icon: '🔥', color: '#ef4444',
    why: 'Fireworks AI, ultra hızlı inference için optimize edilmiş modeller sunar. DeepSeek V3 ve Llama modelleri mevcut.',
    url: 'https://fireworks.ai/account/api-keys',
    urlText: 'fireworks.ai',
    keyFormat: 'fw_...',
    models: 'Llama 3.3 70B, DeepSeek V3',
    pricing: 'Deneme kredisi mevcut',
    limit: 'Kredi bitene kadar'
  },
  deepinfra: {
    name: 'DeepInfra', icon: '📡', color: '#06b6d4',
    why: 'DeepInfra, yüksek performanslı AI inference hizmeti sunar. Uygun fiyatlarla güçlü modeller.',
    url: 'https://deepinfra.com/dash/api_keys',
    urlText: 'deepinfra.com',
    keyFormat: '...',
    models: 'Llama 3.1 8B, Llama 3.3 70B',
    pricing: '$5 ücretsiz kredi',
    limit: 'Kredi bitene kadar'
  },
  novita: {
    name: 'Novita AI', icon: '🚀', color: '#8b5cf6',
    why: 'Novita AI, uygun fiyatlı AI inference hizmeti sunar. DeepSeek V3 ve Llama modelleri mevcut.',
    url: 'https://novita.ai/settings/api-keys',
    urlText: 'novita.ai',
    keyFormat: '...',
    models: 'DeepSeek V3, Llama 3.3 70B',
    pricing: 'Ücretsiz deneme kredisi',
    limit: 'Kredi bitene kadar'
  },
  ai21: {
    name: 'AI21 Labs', icon: '🔬', color: '#f59e0b',
    why: 'AI21 Labs\'ın Jamba modelleri, 256K context window ile uzun metinleri işleyebilir. Hybrid Mimari ile güçlü performans.',
    url: 'https://www.ai11labs.com/pricing#api-key',
    urlText: 'ai21labs.com',
    keyFormat: '...',
    models: 'Jamba 1.5 Large, Jamba 1.5 Mini',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  upstage: {
    name: 'Upstage', icon: '☀️', color: '#f59e0b',
    why: 'Upstage\'ın Solar Pro modeli, güçlü ve uygun fiyatlı bir AI modeli. Kore merkezli şirket.',
    url: 'https://console.upstage.ai/',
    urlText: 'console.upstage.ai',
    keyFormat: '...',
    models: 'Solar Pro 2',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  reka: {
    name: 'Reka', icon: '🔮', color: '#8b5cf6',
    why: 'Reka\'nın modelleri görsel anlama ve uzun bağlam işleme güçlü. Flash ve Core modelleri mevcut.',
    url: 'https://platform.reka.ai/',
    urlText: 'platform.reka.ai',
    keyFormat: '...',
    models: 'Reka Flash, Reka Core',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  nebius: {
    name: 'Nebius', icon: '🌐', color: '#06b6d4',
    why: 'Nebius, yüksek performanslı GPU altyapısıyla AI inference sunar. Qwen ve Llama modelleri mevcut.',
    url: 'https://studio.nebius.com/api-keys',
    urlText: 'studio.nebius.com',
    keyFormat: '...',
    models: 'Llama 3.1 8B, Qwen 2.5 72B',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  baseten: {
    name: 'Baseten', icon: '⬛', color: '#333',
    why: 'Baseten, ML modellerini production\'a deploy eden platform. Llama modelleri sunuyor.',
    url: 'https://app.baseten.co/settings/api-keys',
    urlText: 'baseten.co',
    keyFormat: '...',
    models: 'Llama 3.1 8B',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  sambanova: {
    name: 'SambaNova', icon: '🟣', color: '#a855f7',
    why: 'SambaNova, özel donanımında çalışan ultra hızlı AI inference sunar. Llama 3.3 70B ücretsiz.',
    url: 'https://cloud.sambanova.ai/apis',
    urlText: 'cloud.sambanova.ai',
    keyFormat: '...',
    models: 'Llama 3.3 70B',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  xai: {
    name: 'xAI (Grok)', icon: '✖️', color: '#fff',
    why: 'Elon Musk\'ın xAI şirketinin Grok modeli. Güncel olaylar hakkında bilgisi var, Twitter verilerinden öğreniyor.',
    url: 'https://console.x.ai/',
    urlText: 'console.x.ai',
    keyFormat: 'xai-...',
    models: 'Grok 2',
    pricing: 'Ücretsiz deneme kredisi',
    limit: 'Kredi bitene kadar'
  },
  perplexity: {
    name: 'Perplexity', icon: '🔍', color: '#06b6d4',
    why: 'Perplexity\'in Sonar modeli, web araması yapabilen tek AI modeli. Gerçek zamanlı bilgiye erişebilir.',
    url: 'https://www.perplexity.ai/settings/api',
    urlText: 'perplexity.ai',
    keyFormat: 'pplx-...',
    models: 'Sonar Pro (Web Aramalı)',
    pricing: 'Ücretsiz deneme kredisi',
    limit: 'Kredi bitene kadar'
  },
  openai: {
    name: 'OpenAI', icon: '🤖', color: '#10b981',
    why: 'OpenAI\'ın GPT modelleri, dünyanın en popüler AI modelleri. GPT-4o Mini ücretsiz deneme ile mevcut.',
    url: 'https://platform.openai.com/api-keys',
    urlText: 'platform.openai.com',
    keyFormat: 'sk-...',
    models: 'GPT-4o Mini',
    pricing: 'Ücretsiz deneme kredisi',
    limit: 'Kredi bitene kadar'
  },
  anthropic: {
    name: 'Anthropic', icon: '🟤', color: '#d97706',
    why: 'Anthropic\'in Claude modelleri, güvenlik odaklı ve güçlü AI modelleri. Hızlı Haiku modeli ücretsiz deneme mevcut.',
    url: 'https://console.anthropic.com/',
    urlText: 'console.anthropic.com',
    keyFormat: 'sk-ant-...',
    models: 'Claude 3.5 Haiku',
    pricing: 'Ücretsiz deneme kredisi',
    limit: 'Kredi bitene kadar'
  },
  venice: {
    name: 'Venice AI', icon: '🎭', color: '#ef4444',
    why: 'Venice AI, gizlilik odaklı AI inference sunar. Log tutmaz ve ücretsiz Llama modelleri sunar.',
    url: 'https://venice.ai/settings',
    urlText: 'venice.ai',
    keyFormat: '...',
    models: 'Llama 3.3 70B',
    pricing: 'Ücretsiz',
    limit: 'API limitleri'
  },
  minimax: {
    name: 'MiniMax', icon: '📏', color: '#f59e0b',
    why: 'MiniMax\'ın Text 01 modeli, 4M context window ile devasa metinleri işleyebilir. Dünyanın en uzun bağlamına sahip.',
    url: 'https://www.minimaxi.com/',
    urlText: 'minimaxi.com',
    keyFormat: '...',
    models: 'MiniMax Text 01 (4M context)',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  moonshot: {
    name: 'Moonshot AI', icon: '🌙', color: '#f59e0b',
    why: 'Moonshot AI, Çin merkezli AI şirketi. Kimi modelleri uzun belge analizinde güçlü.',
    url: 'https://platform.moonshot.cn/',
    urlText: 'platform.moonshot.cn',
    keyFormat: '...',
    models: 'Moonshot V1 8K',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  stepfun: {
    name: 'StepFun', icon: '🪜', color: '#8b5cf6',
    why: 'StepFun, Çin merkezli AI şirketi. Step modelleri genel amaçlı kullanıma uygun.',
    url: 'https://platform.stepfun.com/',
    urlText: 'platform.stepfun.com',
    keyFormat: '...',
    models: 'Step 1 8K',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  zhipu: {
    name: 'Zhipu AI', icon: '🔮', color: '#6366f1',
    why: 'Zhipu AI, GLM modellerini geliştiren Çinli şirket. Görsel anlama desteği var.',
    url: 'https://open.bigmodel.cn/',
    urlText: 'open.bigmodel.cn',
    keyFormat: '...',
    models: 'GLM 4 Flash',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  volcengine: {
    name: 'Volcengine', icon: '🌋', color: '#ef4444',
    why: 'ByteDance\'ın bulut platformu Doubao modellerini sunar. 256K context.',
    url: 'https://console.volcengine.com/',
    urlText: 'console.volcengine.com',
    keyFormat: '...',
    models: 'Doubao Pro 256K',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  alibaba: {
    name: 'Alibaba Qwen', icon: '🟠', color: '#f97316',
    why: 'Alibaba\'ın Qwen modelleri, güçlü open-source modeller. Qwen Max en üst düzey model.',
    url: 'https://dashscope.console.aliyun.com/',
    urlText: 'dashscope.aliyun.com',
    keyFormat: 'sk-...',
    models: 'Qwen Max, Qwen Plus',
    pricing: 'Ücretsiz deneme kredisi',
    limit: 'Kredi bitene kadar'
  },
  baidu: {
    name: 'Baidu ERNIE', icon: '🔵', color: '#3b82f6',
    why: 'Baidu\'nun ERNIE modelleri, Çince doğal dil işlemede uzman. Çin pazarı için güçlü.',
    url: 'https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application',
    urlText: 'console.bce.baidu.com',
    keyFormat: '...',
    models: 'ERNIE 4.0 Turbo',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  sensenova: {
    name: 'SenseNova', icon: '🧬', color: '#10b981',
    why: 'SenseTime\'ın SenseNova modeli, çok modlu AI yetenekleri sunar.',
    url: 'https://platform.sensenova.cn/',
    urlText: 'platform.sensenova.cn',
    keyFormat: '...',
    models: 'SenseChat 5',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  xiaomi: {
    name: 'Xiaomi', icon: '📱', color: '#f97316',
    why: 'Xiaomi\'nin AI modeli MiLM, mobil cihazlar için optimize edilmiş.',
    url: 'https://open.ai.xiaomi.com/',
    urlText: 'open.ai.xiaomi.com',
    keyFormat: '...',
    models: 'MiLM 6B',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  tencent: {
    name: 'Tencent', icon: '🐧', color: '#06b6d4',
    why: 'Tencent\'ın Hunyuan modeli, çok modlu AI yetenekleri sunar. Görsel anlama var.',
    url: 'https://console.cloud.tencent.com/hunyuan',
    urlText: 'console.cloud.tencent.com',
    keyFormat: '...',
    models: 'Hunyuan Pro',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  bytedance: {
    name: 'ByteDance', icon: '🎵', color: '#ef4444',
    why: 'ByteDance\'ın Doubao modelleri, uzun context desteği sunar. TikTok\'un ana şirketi.',
    url: 'https://console.volcengine.com/',
    urlText: 'console.volcengine.com',
    keyFormat: '...',
    models: 'Doubao Pro 256K',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  github: {
    name: 'GitHub Models', icon: '🐙', color: '#333',
    why: 'GitHub\'ın AI model marketplace\'i. Ücretsiz Llama, Phi ve Mistral modelleri.',
    url: 'https://github.com/settings/tokens',
    urlText: 'github.com/settings/tokens',
    keyFormat: 'ghp_...',
    models: 'Llama 3.1 8B, Phi 3.5 Mini, Mistral Large',
    pricing: 'Ücretsiz',
    limit: '15 istek/dakika'
  },
  llm7: {
    name: 'LLM7.io', icon: '7️⃣', color: '#8b5cf6',
    why: 'LLM7.io, ücretsiz AI modelleri sunan basit bir API platformu.',
    url: 'https://llm7.io',
    urlText: 'llm7.io',
    keyFormat: '...',
    models: 'Llama 3.1 8B, Mistral 7B',
    pricing: 'Ücretsiz',
    limit: 'Sınırsız'
  },
  ovhcloud: {
    name: 'OVHcloud', icon: '🌍', color: '#10b981',
    why: 'Avrupa merkezli bulut sağlayıcının AI hizmeti. GDPR uyumlu ücretsiz modeller.',
    url: 'https://api.us.ovhcloud.com/',
    urlText: 'ovhcloud.com',
    keyFormat: '...',
    models: 'Llama 3.3 70B, Mistral Large',
    pricing: 'Ücretsiz',
    limit: 'API limitleri'
  },
  ollama: {
    name: 'Ollama', icon: '🦙', color: '#333',
    why: 'Ollama ile modelleri kendi bilgisayarınızda çalıştırabilirsiniz. İnternet bağlantısı gerektirmez.',
    url: 'https://ollama.com',
    urlText: 'ollama.com',
    keyFormat: 'Yerel kurulum gerekli',
    models: 'Llama 3.1, Gemma 2 (yerel)',
    pricing: 'Tamamen ücretsiz (yerel)',
    limit: 'Sınırsız (donanıma bağlı)'
  },
  nvidia: {
    name: 'NVIDIA NIM', icon: '💚', color: '#22c55e',
    why: 'NVIDIA\'nın inference platformu. DeepSeek V4 Flash modelini sunar. Güçlü GPU altyapısı.',
    url: 'https://build.nvidia.com/',
    urlText: 'build.nvidia.com',
    keyFormat: 'nvapi-...',
    models: 'DeepSeek V4 Flash',
    pricing: 'Ücretsiz deneme',
    limit: 'API limitleri'
  },
  airforce: {
    name: 'Airforce', icon: '✈️', color: '#06b6d4',
    why: 'Airforce, ücretsiz AI modelleri sunan bir API gateway\'i. MiMo v2.5 Pro mevcut.',
    url: 'https://airforce.ai',
    urlText: 'airforce.ai',
    keyFormat: '...',
    models: 'MiMo v2.5 Pro',
    pricing: 'Ücretsiz',
    limit: 'API limitleri'
  },
  agnes: {
    name: 'Agnes AI', icon: '💎', color: '#8b5cf6',
    why: 'Agnes AI, ücretsiz sohbet modelleri sunan platform. Sınırsız kullanım.',
    url: 'https://agnes.ai',
    urlText: 'agnes.ai',
    keyFormat: '...',
    models: 'Agnes 2.5 Flash',
    pricing: 'Ücretsiz',
    limit: 'Sınırsız'
  },
  puter: {
    name: 'Puter', icon: '🖥️', color: '#10b981',
    why: 'Puter, ücretsiz GPT-4o Mini erişimi sunan platform.',
    url: 'https://puter.com',
    urlText: 'puter.com',
    keyFormat: '...',
    models: 'GPT-4o Mini',
    pricing: 'Ücretsiz',
    limit: 'API limitleri'
  },
  wandb: {
    name: 'W&B Inference', icon: '📊', color: '#f59e0b',
    why: 'Weights & Biases inference hizmeti. Ücretsiz Llama 3.3 70B modeli sunar.',
    url: 'https://wandb.ai/authorize',
    urlText: 'wandb.ai',
    keyFormat: 'wandb-...',
    models: 'Llama 3.3 70B',
    pricing: 'Ücretsiz',
    limit: 'API limitleri'
  },
  replicate: {
    name: 'Replicate', icon: '🔄', color: '#333',
    why: 'Replicate, open-source modelleri bulutta çalıştıran platform. Farklı model türleri sunar.',
    url: 'https://replicate.com/account/api-tokens',
    urlText: 'replicate.com',
    keyFormat: 'r8_...',
    models: 'Llama 3.1 8B',
    pricing: 'Ücretsiz deneme kredisi',
    limit: 'Kredi bitene kadar'
  },
  hyperbolic: {
    name: 'Hyperbolic', icon: '📐', color: '#f97316',
    why: 'Hyperbolic, uygun fiyatlı AI inference sunar. DeepSeek V3 ve Llama modelleri mevcut.',
    url: 'https://hyperbolic.xyz/',
    urlText: 'hyperbolic.xyz',
    keyFormat: '...',
    models: 'Llama 3.1 8B, DeepSeek V3',
    pricing: 'Ücretsiz deneme kredisi',
    limit: 'Kredi bitene kadar'
  },
  kluster: {
    name: 'Kluster.ai', icon: '🧩', color: '#6366f1',
    why: 'Kluster.ai, hızlı AI inference sunar. Llama 3.3 70B modeli mevcut.',
    url: 'https://kluster.ai',
    urlText: 'kluster.ai',
    keyFormat: '...',
    models: 'Llama 3.3 70B',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  friendli: {
    name: 'Friendli', icon: '😊', color: '#10b981',
    why: 'Friendli, performans odaklı AI inference sunar. Llama modelleri mevcut.',
    url: 'https://friendli.ai/',
    urlText: 'friendli.ai',
    keyFormat: 'fl-...',
    models: 'Llama 3.1 8B',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  lepton: {
    name: 'Lepton AI', icon: '⚡', color: '#f59e0b',
    why: 'Lepton AI, hızlı ve uygun fiyatlı inference sunar.',
    url: 'https://www.lepton.ai/',
    urlText: 'lepton.ai',
    keyFormat: '...',
    models: 'Llama 3.1 8B',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  anyscale: {
    name: 'Anyscale', icon: '♾️', color: '#8b5cf6',
    why: 'Anyscale, Ray üzerinde çalışan AI modelleri sunar. Ölçeklenebilir inference.',
    url: 'https://www.anyscale.com/',
    urlText: 'anyscale.com',
    keyFormat: '...',
    models: 'Llama 3.1 8B',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  chutes: {
    name: 'Chutes.ai', icon: '🪂', color: '#06b6d4',
    why: 'Chutes.ai, ücretsiz Llama modelleri sunar.',
    url: 'https://chutes.ai',
    urlText: 'chutes.ai',
    keyFormat: '...',
    models: 'Llama 3.3 70B',
    pricing: 'Ücretsiz',
    limit: 'API limitleri'
  },
  glhf: {
    name: 'Glhf.chat', icon: '👋', color: '#10b981',
    why: 'Glhf.chat, ücretsiz AI modelleri sunan sohbet platformu.',
    url: 'https://glhf.chat',
    urlText: 'glhf.chat',
    keyFormat: '...',
    models: 'Llama 3.1 8B',
    pricing: 'Ücretsiz',
    limit: 'API limitleri'
  },
  nscale: {
    name: 'Nscale', icon: '📊', color: '#f59e0b',
    why: 'Nscale, ölçeklenebilir AI inference sunar.',
    url: 'https://nscale.com',
    urlText: 'nscale.com',
    keyFormat: '...',
    models: 'Llama 3.3 70B',
    pricing: 'Ücretsiz',
    limit: 'API limitleri'
  },
  iflow: {
    name: 'iFlow', icon: '💧', color: '#06b6d4',
    why: 'iFlow, ücretsiz AI modelleri sunar.',
    url: 'https://iflow.com',
    urlText: 'iflow.com',
    keyFormat: '...',
    models: 'Llama 3.1 8B',
    pricing: 'Ücretsiz',
    limit: 'API limitleri'
  },
  aiml: {
    name: 'AIML API', icon: '🤖', color: '#8b5cf6',
    why: 'AIML API, ücretsiz AI modelleri sunan platform.',
    url: 'https://aimlapi.com',
    urlText: 'aimlapi.com',
    keyFormat: '...',
    models: 'Llama 3.1 8B',
    pricing: 'Ücretsiz',
    limit: 'API limitleri'
  },
  nagaai: {
    name: 'NagaAI', icon: '🐉', color: '#22c55e',
    why: 'NagaAI, ücretsiz AI modelleri sunar.',
    url: 'https://nagaai.com',
    urlText: 'nagaai.com',
    keyFormat: '...',
    models: 'Llama 3.1 8B',
    pricing: 'Ücretsiz',
    limit: 'API limitleri'
  },
  paxsenix: {
    name: 'PaxSenix', icon: '☮️', color: '#10b981',
    why: 'PaxSenix, ücretsiz AI modelleri sunar.',
    url: 'https://paxsenix.com',
    urlText: 'paxsenix.com',
    keyFormat: '...',
    models: 'Llama 3.1 8B',
    pricing: 'Ücretsiz',
    limit: 'API limitleri'
  },
  aihubmix: {
    name: 'AIHubMix', icon: '🔀', color: '#f59e0b',
    why: 'AIHubMix, çeşitli AI modellerini bir arada sunar.',
    url: 'https://aihubmix.com',
    urlText: 'aihubmix.com',
    keyFormat: '...',
    models: 'GPT-4o Mini',
    pricing: 'Ücretsiz deneme',
    limit: 'Deneme kredisi'
  },
  arcee: {
    name: 'Arcee AI', icon: '🎨', color: '#f97316',
    why: 'Arcee AI, enterprise AI çözümleri sunar.',
    url: 'https://www.arcee.ai/',
    urlText: 'arcee.ai',
    keyFormat: '...',
    models: 'Llama 3.1 8B',
    pricing: 'Ücretsiz',
    limit: 'API limitleri'
  },
  pydantic: {
    name: 'Pydantic AI GW', icon: '🛡️', color: '#22c55e',
    why: 'Pydantic AI Gateway, güvenli API yönlendirmesi sunar.',
    url: 'https://ai.pydantic.dev/',
    urlText: 'ai.pydantic.dev',
    keyFormat: '...',
    models: 'Llama 3.1 8B',
    pricing: 'Ücretsiz',
    limit: 'API limitleri'
  },
};

// ===== MODEL VERİTABANI =====
// rating: 1-10 (10=en iyi), price: 'ucretsiz'|'ucretli'|'deneme',
// limits: dakika/gun limiti, caps: yapabildikleri isler
const MODEL_DB = {
  // --- NaraRouter ---
  'nara:tencent-hy3-free': { name:'Hy3 Free', provider:'NaraRouter', rating:6, price:'ucretsiz', limits:'Limitsiz', caps:['Sohbet','Kod Yazma','Çeviri','Matematik'], desc:'Tencent Hy3 modeli. Ücretsiz, sınırsız kullanım. Orta düzey performing.' },
  'nara:agnes-2.5-flash': { name:'Agnes 2.5 Flash', provider:'NaraRouter', rating:7, price:'ucretsiz', limits:'Limitsiz', caps:['Sohbet','Kod Yazma','Çeviri','Yaratıcı Yazarlık'], desc:'Agnes AI geliştirme modeli. Ücretsiz, sınırsız. Hızlı ve güvenilir.' },

  // --- Groq (Ucretsiz - 30 RPM, 6000 GPD) ---
  'groq:llama-3.1-8b-instant': { name:'Llama 3.1 8B', provider:'Groq', rating:5, price:'ucretsiz', limits:'30 istek/dk, 6000 istek/gün', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Meta küçük model. Groq\'ta çok hızlı. Basit görevler için ideal.' },
  'groq:llama-3.3-70b-versatile': { name:'Llama 3.3 70B', provider:'Groq', rating:8, price:'ucretsiz', limits:'30 istek/dk, 6000 istek/gün', caps:['Sohbet','Kod Yazma','Kod Analizi','Matematik','Çeviri','Yaratıcı Yazarlık'], desc:'Meta\'nın güçlü modeli. Groq\'ta çok hızlı. Ücretsiz en iyi modellerden.' },
  'groq:gemma2-9b-it': { name:'Gemma 2 9B', provider:'Groq', rating:5, price:'ucretsiz', limits:'30 istek/dk, 6000 istek/gün', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Google Gemma modeli. Ücretsiz, hızlı. Basit görevler için.' },
  'groq:deepseek-r1-distill-llama-70b': { name:'DeepSeek R1 70B', provider:'Groq', rating:8, price:'ucretsiz', limits:'30 istek/dk, 6000 istek/gün', caps:['Sohbet','Kod Yazma','Kod Analizi','Matematik','Mantıksal Çıkarım'], desc:'DeepSeek R1\'in distile edilmiş hali. Groq\'ta ücretsiz, güçlü.reasoning.' },

  // --- Cerebras (Ucretsiz - 30 RPM) ---
  'cerebras:llama-3.3-70b': { name:'Llama 3.3 70B', provider:'Cerebras', rating:8, price:'ucretsiz', limits:'30 istek/dk', caps:['Sohbet','Kod Yazma','Kod Analizi','Matematik','Çeviri'], desc:'Cerebras hızıyla çalışan güçlü model. Ücretsiz, çok hızlı.' },
  'cerebras:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'Cerebras', rating:5, price:'ucretsiz', limits:'30 istek/dk', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Cerebras\'ta küçük model. Ücretsiz, aşırı hızlı.' },

  // --- Z.ai GLM (Ucretsiz) ---
  'zai:glm-4.5-flash': { name:'GLM 4.5 Flash', provider:'Z.ai', rating:7, price:'ucretsiz', limits:'Limitsiz', caps:['Sohbet','Kod Yazma','Çeviri','Görsel Anlama'], desc:'Zhipu AI modeli. Ücretsiz, görsel anlama desteği var.' },
  'zai:glm-4.7-flash': { name:'GLM 4.7 Flash', provider:'Z.ai', rating:7, price:'ucretsiz', limits:'Limitsiz', caps:['Sohbet','Kod Yazma','Çeviri','Görsel Anlama'], desc:'Zhipu AI güncellenmiş model. Ücretsiz, görsel anlama.' },

  // --- SiliconFlow (Ucretsiz) ---
  'siliconflow:deepseek-ai/deepseek-v3': { name:'DeepSeek V3', provider:'SiliconFlow', rating:8, price:'ucretsiz', limits:'1000 istek/gün', caps:['Sohbet','Kod Yazma','Kod Analizi','Matematik','Çeviri','Yaratıcı Yazarlık'], desc:'DeepSeek V3 SiliconFlow üzerinden ücretsiz. Güçlü ve çok yönlü.' },
  'siliconflow:qwen/qwen3-8b': { name:'Qwen3 8B', provider:'SiliconFlow', rating:6, price:'ucretsiz', limits:'1000 istek/gün', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Alibaba Qwen3 küçük model. Ücretsiz, hızlı.' },

  // --- Google Gemini (Ucretsiz - 15 RPM, 1500 GPD) ---
  'google:gemini-2.5-flash': { name:'Gemini 2.5 Flash', provider:'Google', rating:9, price:'ucretsiz', limits:'15 istek/dk, 1500 istek/gün', caps:['Sohbet','Kod Yazma','Kod Analizi','Görsel Anlama','Uzun Bağlam (1M)','Matematik','Çeviri','Yaratıcı Yazarlık','Veri Analizi'], desc:'Google\'ın en yeni modeli. 1M context, görsel anlama, ücretsiz. En iyilerden.' },
  'google:gemini-2.0-flash': { name:'Gemini 2.0 Flash', provider:'Google', rating:8, price:'ucretsiz', limits:'15 istek/dk, 1500 istek/gün', caps:['Sohbet','Kod Yazma','Görsel Anlama','Matematik','Çeviri'], desc:'Google 2.0 Flash. Ücretsiz, hızlı ve güçlü.' },
  'google:gemma-3-27b-it': { name:'Gemma 3 27B', provider:'Google', rating:7, price:'ucretsiz', limits:'15 istek/dk, 1500 istek/gün', caps:['Sohbet','Kod Yazma','Çeviri','Matematik'], desc:'Google açık kaynak modeli. Ücretsiz, 27B parametre.' },

  // --- Mistral (Ucretsiz - ordu Roland) ---
  'mistral:mistral-small-latest': { name:'Mistral Small', provider:'Mistral', rating:7, price:'ucretsiz', limits:'Ordu Roland ücretsiz', caps:['Sohbet','Kod Yazma','Çeviri','Yaratıcı Yazarlık'], desc:'Mistral\'in küçük modeli. Ordu Roland\'ta ücretsiz.' },
  'mistral:codestral-latest': { name:'Codestral', provider:'Mistral', rating:8, price:'ucretsiz', limits:'Ordu Roland ücretsiz', caps:['Kod Yazma','Kod Analizi','Sohbet'], desc:'Mistral kod yazma uzmanı modeli. Ücretsiz, güçlü kod desteği.' },
  'mistral:devstral-small-latest': { name:'Devstral Small', provider:'Mistral', rating:7, price:'ucretsiz', limits:'Ordu Roland ücretsiz', caps:['Kod Yazma','Kod Analizi','Sohbet'], desc:'Mistral geliştirme modeli. Ücretsiz.' },

  // --- Cohere (Ucretsiz - 1000 RPM) ---
  'cohere:command-a-03-2025': { name:'Command A', provider:'Cohere', rating:8, price:'ucretsiz', limits:'1000 istek/dk', caps:['Sohbet','Kod Yazma','Araştırma','Çeviri','Yaratıcı Yazarlık','Veri Analizi'], desc:'Cohere\'in en yeni modeli. Ücretsiz, araştırma ve analiz güçlü.' },
  'cohere:command-r-plus-08-2024': { name:'Command R+', provider:'Cohere', rating:7, price:'ucretsiz', limits:'1000 istek/dk', caps:['Sohbet','Araştırma','Çeviri','Yaratıcı Yazarlık'], desc:'Cohere güçlü model. Ücretsiz, RAG ve araştırma için ideal.' },

  // --- DeepSeek (Deneme - $5 kredi) ---
  'deepseek:deepseek-chat': { name:'DeepSeek V3', provider:'DeepSeek', rating:9, price:'deneme', limits:'$5 ücretsiz kredi', caps:['Sohbet','Kod Yazma','Kod Analizi','Matematik','Mantıksal Çıkarım','Çeviri','Yaratıcı Yazarlık','Veri Analizi'], desc:'DeepSeek V3. Ücretsiz $5 kredi ile deneme. En güçlü ücretsiz modellerden.' },
  'deepseek:deepseek-reasoner': { name:'DeepSeek R1', provider:'DeepSeek', rating:9, price:'deneme', limits:'$5 ücretsiz kredi', caps:['Sohbet','Kod Yazma','Kod Analizi','Matematik','Mantıksal Çıkarım','Araştırma'], desc:'DeepSeek R1 reasoning modeli. Derin düşünme ve problem çözme.' },

  // --- OpenRouter (Ucretsiz modeller) ---
  'openrouter:meta-llama/llama-3.1-8b-instruct:free': { name:'Llama 3.1 8B', provider:'OpenRouter', rating:5, price:'ucretsiz', limits:'20 istek/dk', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'OpenRouter ücretsiz Llama modeli.' },
  'openrouter:google/gemma-2-9b-it:free': { name:'Gemma 2 9B', provider:'OpenRouter', rating:5, price:'ucretsiz', limits:'20 istek/dk', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'OpenRouter ücretsiz Gemma modeli.' },
  'openrouter:mistralai/mistral-7b-instruct:free': { name:'Mistral 7B', provider:'OpenRouter', rating:5, price:'ucretsiz', limits:'20 istek/dk', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'OpenRouter ücretsiz Mistral modeli.' },

  // --- Cloudflare Workers AI (Ucretsiz - 10K GIF) ---
  'cloudflare:llama-3.3-70b-instruct-fp8': { name:'Llama 3.3 70B', provider:'Cloudflare', rating:7, price:'ucretsiz', limits:'10K istek/gün', caps:['Sohbet','Kod Yazma','Matematik','Çeviri'], desc:'Cloudflare Workers AI ücretsiz model. Güçlü.' },
  'cloudflare:llama-3.1-8b-instruct-fp8': { name:'Llama 3.1 8B', provider:'Cloudflare', rating:5, price:'ucretsiz', limits:'10K istek/gün', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Cloudflare küçük model. Ücretsiz.' },

  // --- Scaleway (Ucretsiz) ---
  'scaleway:llama-3.3-70b-instruct': { name:'Llama 3.3 70B', provider:'Scaleway', rating:7, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Matematik','Çeviri'], desc:'Scaleway ücretsiz Llama modeli. Avrupa merkezli.' },

  // --- Together AI (Deneme - $5 kredi) ---
  'together:meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo': { name:'Llama 3.1 8B Turbo', provider:'Together', rating:6, price:'deneme', limits:'$5 ücretsiz kredi', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Together AI hızlı model. $5 kredi ile deneme.' },
  'together:meta-llama/Meta-Llama-3.3-70B-Instruct-Turbo': { name:'Llama 3.3 70B Turbo', provider:'Together', rating:8, price:'deneme', limits:'$5 ücretsiz kredi', caps:['Sohbet','Kod Yazma','Kod Analizi','Matematik','Çeviri'], desc:'Together AI güçlü model. $5 kredi.' },
  'together:deepseek-ai/DeepSeek-V3': { name:'DeepSeek V3', provider:'Together', rating:9, price:'deneme', limits:'$5 ücretsiz kredi', caps:['Sohbet','Kod Yazma','Kod Analizi','Matematik','Mantıksal Çıkarım'], desc:'DeepSeek V3 Together üzerinden. $5 kredi.' },

  // --- Fireworks AI (Deneme) ---
  'fireworks:accounts/fireworks/models/llama-v3p3-70b-instruct': { name:'Llama 3.3 70B', provider:'Fireworks', rating:7, price:'deneme', limits:'Deneme kredisi', caps:['Sohbet','Kod Yazma','Matematik','Çeviri'], desc:'Fireworks AI hızlı model. Deneme mevcut.' },
  'fireworks:accounts/fireworks/models/deepseek-v3': { name:'DeepSeek V3', provider:'Fireworks', rating:9, price:'deneme', limits:'Deneme kredisi', caps:['Sohbet','Kod Yazma','Kod Analizi','Matematik'], desc:'DeepSeek V3 Fireworks üzerinden. Deneme.' },

  // --- DeepInfra (Deneme - $5 kredi) ---
  'deepinfra:meta-llama/Meta-Llama-3.1-8B-Instruct': { name:'Llama 3.1 8B', provider:'DeepInfra', rating:6, price:'deneme', limits:'$5 ücretsiz kredi', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'DeepInfra ücretsiz model. $5 kredi.' },
  'deepinfra:meta-llama/Meta-Llama-3.3-70B-Instruct': { name:'Llama 3.3 70B', provider:'DeepInfra', rating:8, price:'deneme', limits:'$5 ücretsiz kredi', caps:['Sohbet','Kod Yazma','Kod Analizi','Matematik','Çeviri'], desc:'DeepInfra güçlü model. $5 kredi.' },

  // --- Novita AI (Deneme) ---
  'novita:deepseek/deepseek-v3-0324': { name:'DeepSeek V3', provider:'Novita AI', rating:9, price:'deneme', limits:'Ücretsiz deneme kredisi', caps:['Sohbet','Kod Yazma','Kod Analizi','Matematik','Mantıksal Çıkarım'], desc:'Novita AI DeepSeek V3. Ücretsiz deneme.' },
  'novita:meta-llama/llama-3.3-70b-instruct': { name:'Llama 3.3 70B', provider:'Novita AI', rating:7, price:'deneme', limits:'Ücretsiz deneme kredisi', caps:['Sohbet','Kod Yazma','Matematik','Çeviri'], desc:'Novita AI Llama modeli. Deneme.' },

  // --- AI21 Labs (Deneme) ---
  'ai21:jamba-1.5-large': { name:'Jamba 1.5 Large', provider:'AI21 Labs', rating:7, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Uzun Bağlam (256K)','Çeviri','Yaratıcı Yazarlık'], desc:'AI21\'in büyük modeli. 256K context, deneme.' },
  'ai21:jamba-1.5-mini': { name:'Jamba 1.5 Mini', provider:'AI21 Labs', rating:6, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'AI21 küçük model. Deneme.' },

  // --- Upstage (Deneme) ---
  'upstage:solar-pro-2102': { name:'Solar Pro 2', provider:'Upstage', rating:7, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Matematik','Uzun Bağlam'], desc:'Upstage Korean model. Güçlü, deneme.' },

  // --- Reka (Deneme) ---
  'reka:reka-flash-20240226': { name:'Reka Flash', provider:'Reka', rating:7, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Görsel Anlama','Çeviri'], desc:'Reka Flash. Görsel anlama desteği var.' },
  'reka:reka-core-20240904': { name:'Reka Core', provider:'Reka', rating:8, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Görsel Anlama','Uzun Bağlam','Matematik'], desc:'Reka\'nın güçlü modeli. Görsel + uzun bağlam.' },

  // --- Nebius (Deneme) ---
  'nebius:meta-llama/Meta-Llama-3.1-8B-Instruct': { name:'Llama 3.1 8B', provider:'Nebius', rating:6, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Nebius ücretsiz model. Deneme.' },
  'nebius:Qwen/Qwen2.5-72B-Instruct': { name:'Qwen 2.5 72B', provider:'Nebius', rating:8, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Kod Analizi','Matematik','Çeviri'], desc:'Qwen 2.5 72B Nebius üzerinden. Deneme.' },

  // --- Baseten (Deneme) ---
  'baseten:meta-llama/Meta-Llama-3.1-8B-Instruct': { name:'Llama 3.1 8B', provider:'Baseten', rating:6, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Baseten model. Deneme.' },

  // --- SambaNova (Deneme) ---
  'sambanova:Meta-Llama-3.3-70B-Instruct': { name:'Llama 3.3 70B', provider:'SambaNova', rating:7, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Matematik','Çeviri'], desc:'SambaNova hızlı model. Deneme.' },

  // --- xAI Grok (Deneme) ---
  'xai:grok-2-latest': { name:'Grok 2', provider:'xAI', rating:8, price:'deneme', limits:'Ücretsiz deneme kredisi', caps:['Sohbet','Kod Yazma','Güncel Olaylar','Matematik','Yaratıcı Yazarlık'], desc:'xAI Grok 2. Güncel olaylar bilgisi var. Deneme.' },

  // --- Perplexity (Deneme - Web Arama) ---
  'perplexity:sonar-pro': { name:'Sonar Pro', provider:'Perplexity', rating:8, price:'deneme', limits:'Ücretsiz deneme kredisi', caps:['Sohbet','Web Arama','Araştırma','Çeviri','Güncel Olaylar'], desc:'Perplexity Sonar Pro. Web arama desteği! Araştırma için en iyi.' },

  // --- OpenAI (Deneme) ---
  'openai:gpt-4o-mini': { name:'GPT-4o Mini', provider:'OpenAI', rating:7, price:'deneme', limits:'Deneme kredisi', caps:['Sohbet','Kod Yazma','Görsel Anlama','Çeviri','Matematik'], desc:'OpenAI\'ın küçük modeli. Güçlü ama deneme.' },

  // --- Anthropic (Deneme) ---
  'anthropic:claude-3-5-haiku-20241022': { name:'Claude 3.5 Haiku', provider:'Anthropic', rating:8, price:'deneme', limits:'Deneme kredisi', caps:['Sohbet','Kod Yazma','Kod Analizi','Uzun Bağlam','Çeviri','Yaratıcı Yazarlık'], desc:'Anthropic Claude 3.5 Haiku. Hızlı ve güçlü. Deneme.' },

  // --- Venice AI (Ucretsiz) ---
  'venice:llama-3.3-70b': { name:'Llama 3.3 70B', provider:'Venice AI', rating:7, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Matematik','Çeviri'], desc:'Venice AI ücretsiz model. Gizlilik odaklı.' },

  // --- MiniMax (Deneme) ---
  'minimax:MiniMax-Text-01': { name:'MiniMax Text 01', provider:'MiniMax', rating:7, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Uzun Bağlam (4M)','Çeviri','Yaratıcı Yazarlık'], desc:'MiniMax 4M context! Uzun metinler için ideal.' },

  // --- Moonshot AI (Deneme) ---
  'moonshot:moonshot-v1-8k': { name:'Moonshot V1 8K', provider:'Moonshot AI', rating:6, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Moonshot 8K context. Deneme.' },

  // --- StepFun (Deneme) ---
  'stepfun:step-1-8k': { name:'Step 1 8K', provider:'StepFun', rating:6, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'StepFun model. Deneme.' },

  // --- Zhipu AI (Deneme) ---
  'zhipu:glm-4-flash': { name:'GLM 4 Flash', provider:'Zhipu AI', rating:7, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Görsel Anlama','Çeviri'], desc:'Zhipu GLM 4 Flash. Görsel anlama var.' },

  // --- Volcengine (Deneme) ---
  'volcengine:doubao-pro-256k': { name:'Doubao Pro 256K', provider:'Volcengine', rating:7, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Uzun Bağlam (256K)','Çeviri'], desc:'ByteDance Doubao 256K context. Deneme.' },

  // --- Alibaba Qwen (Deneme) ---
  'alibaba:qwen-max': { name:'Qwen Max', provider:'Alibaba', rating:8, price:'deneme', limits:'Ücretsiz deneme kredisi', caps:['Sohbet','Kod Yazma','Kod Analizi','Matematik','Uzun Bağlam','Çeviri','Yaratıcı Yazarlık'], desc:'Alibaba\'nın en güçlü modeli. Deneme.' },
  'alibaba:qwen-plus': { name:'Qwen Plus', provider:'Alibaba', rating:7, price:'deneme', limits:'Ücretsiz deneme kredisi', caps:['Sohbet','Kod Yazma','Matematik','Çeviri'], desc:'Alibaba orta model. Deneme.' },

  // --- Baidu (Deneme) ---
  'baidu:ernie-4.0-turbo': { name:'ERNIE 4.0 Turbo', provider:'Baidu', rating:7, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Görsel Anlama','Çeviri'], desc:'Baidu ERNIE modeli. Çince güçlü.' },

  // --- SenseNova (Deneme) ---
  'sensenova:SenseChat-5': { name:'SenseChat 5', provider:'SenseNova', rating:6, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'SenseNova model. Deneme.' },

  // --- Xiaomi (Deneme) ---
  'xiaomi:MiLM-6B': { name:'MiLM 6B', provider:'Xiaomi', rating:5, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Çeviri'], desc:'Xiaomi küçük model. Deneme.' },

  // --- Tencent (Deneme) ---
  'tencent:hunyuan-pro': { name:'Hunyuan Pro', provider:'Tencent', rating:7, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Görsel Anlama','Çeviri'], desc:'Tencent Hunyuan Pro. Görsel anlama var.' },

  // --- ByteDance (Deneme) ---
  'bytedance:doubao-pro-256k': { name:'Doubao Pro 256K', provider:'ByteDance', rating:7, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Uzun Bağlam (256K)','Çeviri'], desc:'ByteDance Doubao. 256K context.' },

  // --- NVIDIA NIM ---
  'nvidia:deepseek-ai/deepseek-v4-flash-0731': { name:'DeepSeek V4 Flash', provider:'NVIDIA NIM', rating:8, price:'deneme', limits:'Ücretsiz deneme (API key gerekli)', caps:['Sohbet','Kod Yazma','Kod Analizi','Matematik','Mantıksal Çıkarım'], desc:'NVIDIA NIM üzerinden DeepSeek V4. Güçlü. CORS engeli var.' },

  // --- Airforce ---
  'airforce:mimo-v2.5-pro': { name:'MiMo v2.5 Pro', provider:'Airforce', rating:7, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Matematik','Mantıksal Çıkarım'], desc:'Airforce MiMo v2.5 Pro. Ücretsiz.' },

  // --- GitHub Models (Ucretsiz - 15 RPM) ---
  'github:meta-llama-3.1-8b-instruct': { name:'Llama 3.1 8B', provider:'GitHub', rating:6, price:'ucretsiz', limits:'15 istek/dk', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'GitHub Models ücretsiz Llama.' },
  'github:phi-3.5-mini-instruct': { name:'Phi 3.5 Mini', provider:'GitHub', rating:6, price:'ucretsiz', limits:'15 istek/dk', caps:['Sohbet','Kod Yazma','Çeviri','Matematik'], desc:'Microsoft Phi küçük model. Ücretsiz.' },
  'github:mistral-large-latest': { name:'Mistral Large', provider:'GitHub', rating:8, price:'ucretsiz', limits:'15 istek/dk', caps:['Sohbet','Kod Yazma','Kod Analizi','Matematik','Çeviri','Yaratıcı Yazarlık'], desc:'Mistral Large GitHub üzerinden ücretsiz. Güçlü.' },

  // --- LLM7.io (Ucretsiz) ---
  'llm7:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'LLM7.io', rating:5, price:'ucretsiz', limits:'Limitsiz', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'LLM7.io ücretsiz model.' },
  'llm7:mistral-7b': { name:'Mistral 7B', provider:'LLM7.io', rating:5, price:'ucretsiz', limits:'Limitsiz', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'LLM7.io Mistral modeli.' },

  // --- OVHcloud AI (Ucretsiz) ---
  'ovhcloud:llama-3.3-70b-instruct': { name:'Llama 3.3 70B', provider:'OVHcloud', rating:7, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Matematik','Çeviri'], desc:'OVHcloud ücretsiz model. Avrupa merkezli.' },
  'ovhcloud:mistral-large': { name:'Mistral Large', provider:'OVHcloud', rating:8, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Kod Analizi','Matematik','Çeviri'], desc:'OVHcloud Mistral Large. Ücretsiz, güçlü.' },

  // --- Ollama Cloud (Ucretsiz) ---
  'ollama:llama3.1': { name:'Llama 3.1', provider:'Ollama', rating:5, price:'ucretsiz', limits:'Limitsiz (yerel)', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Yerel Ollama modeli. Sınırsız ama yerel kurulum gerekli.' },
  'ollama:gemma2': { name:'Gemma 2', provider:'Ollama', rating:5, price:'ucretsiz', limits:'Limitsiz (yerel)', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Yerel Ollama Gemma modeli.' },

  // --- Kilo Code (Ucretsiz) ---
  'kilo:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'Kilo Code', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Kilo Code ücretsiz model.' },

  // --- OpenCode Zen (Ucretsiz) ---
  'opencodezen:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'OpenCode Zen', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'OpenCode Zen ücretsiz model.' },

  // --- Aion Labs (Ucretsiz) ---
  'aionlabs:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'Aion Labs', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Aion Labs ücretsiz model.' },

  // --- Agnes AI (Ucretsiz) ---
  'agnes:agnes-2.5-flash': { name:'Agnes 2.5 Flash', provider:'Agnes AI', rating:7, price:'ucretsiz', limits:'Limitsiz', caps:['Sohbet','Kod Yazma','Çeviri','Yaratıcı Yazarlık'], desc:'Agnes AI modeli. Ücretsiz, sınırsız.' },

  // --- Chutes.ai (Ucretsiz) ---
  'chutes:llama-3.3-70b': { name:'Llama 3.3 70B', provider:'Chutes.ai', rating:7, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Matematik','Çeviri'], desc:'Chutes.ai ücretsiz model.' },

  // --- Glhf.chat (Ucretsiz) ---
  'glhf:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'Glhf.chat', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Glhf.chat ücretsiz model.' },

  // --- Nscale (Ucretsiz) ---
  'nscale:llama-3.3-70b': { name:'Llama 3.3 70B', provider:'Nscale', rating:7, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Matematik','Çeviri'], desc:'Nscale ücretsiz model.' },

  // --- Hyperbolic (Deneme) ---
  'hyperbolic:meta-llama/Meta-Llama-3.1-8B-Instruct': { name:'Llama 3.1 8B', provider:'Hyperbolic', rating:6, price:'deneme', limits:'Ücretsiz deneme kredisi', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Hyperbolic model. Deneme.' },
  'hyperbolic:deepseek-ai/DeepSeek-V3': { name:'DeepSeek V3', provider:'Hyperbolic', rating:9, price:'deneme', limits:'Ücretsiz deneme kredisi', caps:['Sohbet','Kod Yazma','Kod Analizi','Matematik'], desc:'DeepSeek V3 Hyperbolic üzerinden. Deneme.' },

  // --- iFlow (Ucretsiz) ---
  'iflow:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'iFlow', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'iFlow ücretsiz model.' },

  // --- Kluster.ai (Deneme) ---
  'kluster:llama-3.3-70b': { name:'Llama 3.3 70B', provider:'Kluster.ai', rating:7, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Matematik','Çeviri'], desc:'Kluster.ai model. Deneme.' },

  // --- Friendli (Deneme) ---
  'friendli:meta-llama-3.1-8b-instruct': { name:'Llama 3.1 8B', provider:'Friendli', rating:6, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Friendli model. Deneme.' },

  // --- Lepton AI (Deneme) ---
  'lepton:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'Lepton AI', rating:6, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Lepton AI model. Deneme.' },

  // --- Anyscale (Deneme) ---
  'anyscale:meta-llama/Meta-Llama-3.1-8B-Instruct': { name:'Llama 3.1 8B', provider:'Anyscale', rating:6, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Anyscale model. Deneme.' },

  // --- Puter (Ucretsiz) ---
  'puter:gpt-4o-mini': { name:'GPT-4o Mini', provider:'Puter', rating:7, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Görsel Anlama','Çeviri'], desc:'Puter ücretsiz GPT-4o Mini.' },

  // --- AIML API (Ucretsiz) ---
  'aiml:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'AIML', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'AIML API ücretsiz model.' },

  // --- NagaAI (Ucretsiz) ---
  'nagaai:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'NagaAI', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'NagaAI ücretsiz model.' },

  // --- PaxSenix (Ucretsiz) ---
  'paxsenix:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'PaxSenix', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'PaxSenix ücretsiz model.' },

  // --- AIHubMix (Deneme) ---
  'aihubmix:gpt-4o-mini': { name:'GPT-4o Mini', provider:'AIHubMix', rating:7, price:'deneme', limits:'Ücretsiz deneme', caps:['Sohbet','Kod Yazma','Görsel Anlama','Çeviri'], desc:'AIHubMix model. Deneme.' },

  // --- Router'lar (Ucretsiz) ---
  'fastrouter:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'FastRouter', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'FastRouter ücretsiz model.' },
  'literouter:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'LiteRouter', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'LiteRouter ücretsiz model.' },
  'swiftrouter:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'SwiftRouter', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'SwiftRouter ücretsiz model.' },
  'unorouter:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'UnoRouter', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'UnoRouter ücretsiz model.' },
  'voidai:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'Void AI', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Void AI ücretsiz model.' },
  'valorgpt:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'ValorGPT', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'ValorGPT ücretsiz model.' },
  'zenllm:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'ZenLLM', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'ZenLLM ücretsiz model.' },
  'resurge:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'Resurge', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Resurge ücretsiz model.' },
  'subaxis:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'Subaxis', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Subaxis ücretsiz model.' },
  'routeway:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'Routeway AI', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Routeway AI ücretsiz model.' },
  'requesty:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'Requesty AI', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Requesty AI ücretsiz model.' },
  'aipooled:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'AI Pooled', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'AI Pooled ücretsiz model.' },
  'llmgateway:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'LLM Gateway', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'LLM Gateway ücretsiz model.' },
  'studiolm:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'StudioLM', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'StudioLM ücretsiz model.' },
  'pixazo:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'Pixazo AI', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Pixazo AI ücretsiz model.' },
  'yingsuan:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'Yingsuan AI', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Yingsuan AI ücretsiz model.' },
  'xeven:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'Xeven Worker', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Xeven Worker ücretsiz model.' },
  'ofox:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'OfoxAI', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'OfoxAI ücretsiz model.' },
  'mnnai:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'MNN AI', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'MNN AI ücretsiz model.' },

  // --- W&B Inference (Ucretsiz) ---
  'wandb:llama-3.3-70b': { name:'Llama 3.3 70B', provider:'W&B Inference', rating:7, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Matematik','Çeviri'], desc:'W&B Inference ücretsiz model.' },

  // --- Replicate (Deneme) ---
  'replicate:meta-llama-3.1-8b-instruct': { name:'Llama 3.1 8B', provider:'Replicate', rating:6, price:'deneme', limits:'Ücretsiz deneme kredisi', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Replicate model. Deneme.' },

  // --- Arcee AI (Ucretsiz) ---
  'arcee:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'Arcee AI', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Arcee AI ücretsiz model.' },

  // --- SubNP (Ucretsiz) ---
  'subnp:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'SubNP', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'SubNP ücretsiz model.' },

  // --- AIchixia (Ucretsiz) ---
  'aichixia:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'AIchixia', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'AIchixia ücretsiz model.' },

  // --- Pydantic AI GW (Ucretsiz) ---
  'pydantic:llama-3.1-8b': { name:'Llama 3.1 8B', provider:'Pydantic AI GW', rating:5, price:'ucretsiz', limits:'API limitleri', caps:['Sohbet','Kod Yazma','Çeviri'], desc:'Pydantic AI Gateway ücretsiz model.' },

  // --- Gorrsel & Video ---
  'image:flux': { name:'Flux Görsel', provider:'Pollinations', rating:8, price:'ucretsiz', limits:'Limitsiz', caps:['Görsel Üretimi','Yaratıcı Tasarım'], desc:'Pollinations Flux. Ücretsiz görsel üretimi. Kaliteli.' },
  'image:turbo': { name:'Turbo Görsel', provider:'Pollinations', rating:7, price:'ucretsiz', limits:'Limitsiz', caps:['Görsel Üretimi','Yaratıcı Tasarım'], desc:'Pollinations Turbo. Ücretsiz, hızlı görsel üretimi.' },
  'video:bytedance/seedance-2.0-fast': { name:'Seedance 2.0 Fast', provider:'Pollinations', rating:7, price:'ucretli', limits:'Ücretli (~$0.28/video)', caps:['Video Üretimi','Yaratıcı Tasarım'], desc:'ByteDance Seedance hızlı video. Ücretli.' },
  'video:bytedance/seedance-2.5': { name:'Seedance 2.5', provider:'Pollinations', rating:8, price:'ucretli', limits:'Ücretli (~$0.28/video)', caps:['Video Üretimi','Yaratıcı Tasarım'], desc:'ByteDance Seedance 2.5. Ücretli, en yeni.' },
  'video:bytedance/seedance-2.0': { name:'Seedance 2.0', provider:'Pollinations', rating:7, price:'ucretli', limits:'Ücretli (~$0.28/video)', caps:['Video Üretimi','Yaratıcı Tasarım'], desc:'ByteDance Seedance 2.0. Ücretli.' },
  'video:x-ai/grok-imagine-video': { name:'Grok Video', provider:'Pollinations', rating:7, price:'ucretli', limits:'Ücretli (~$0.28/video)', caps:['Video Üretimi','Yaratıcı Tasarım'], desc:'xAI Grok video. Ücretli.' },
  'video:google/veo-3.1-fast': { name:'Veo 3.1 Fast', provider:'Pollinations', rating:8, price:'ucretli', limits:'Ücretli (~$0.28/video)', caps:['Video Üretimi','Yaratıcı Tasarım'], desc:'Google Veo 3.1 hızlı video. Ücretli.' },
  'hfvideo:Wan-AI/Wan2.1-T2V-1.3B': { name:'Wan 2.1 Video', provider:'Hugging Face', rating:5, price:'ucretsiz', limits:'Çalışmıyor (400/403)', caps:['Video Üretimi'], desc:'Hugging Face Wan model. Ücretsiz ama çalışmıyor.' },
};

// Bildirim sesleri
function notifySound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
  } catch(e) {}
}
function errorSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.setValueAtTime(150, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
  } catch(e) {}
}
function connErrorSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.setValueAtTime(200, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(100, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
  } catch(e) {}
}

// Köprü durumu
fetch(API + '/health').then(r => r.json()).then(() => {
  connStatus.textContent = '🟢 Köprü aktif';
  connStatus.className = 'conn-status ok';
}).catch(() => {
  connStatus.textContent = '🔴 Köprü kapalı (node server.js)';
  connStatus.className = 'conn-status error';
});

// Settings
document.getElementById('settingsBtn').onclick = () => {
  document.getElementById('settingsModal').style.display = 'flex';
  initProviderGrid();
};
document.getElementById('closeSettings').onclick = () => document.getElementById('settingsModal').style.display = 'none';
document.getElementById('settingsModal').onclick = (e) => { if (e.target.id === 'settingsModal') e.target.style.display = 'none'; };

let savedKeys = {};
let currentProvider = '';

// Provider grid oluştur
function initProviderGrid() {
  const grid = document.getElementById('providerGrid');
  let html = '';
  Object.entries(PROVIDERS).forEach(([key, p]) => {
    html += '<div class="pg-card" onclick="openProviderModal(\'' + key + '\')">'
      + '<span class="pg-icon">' + p.icon + '</span>'
      + '<span class="pg-name">' + p.name + '</span>'
      + '<span class="pg-status" id="pg-' + key + '">✗</span>'
      + '</div>';
  });
  grid.innerHTML = html;
  updateProviderStatuses();
}

function updateProviderStatuses() {
  Object.keys(PROVIDERS).forEach(key => {
    const el = document.getElementById('pg-' + key);
    if (el) {
      el.textContent = savedKeys[key] ? '✓' : '✗';
      el.className = 'pg-status' + (savedKeys[key] ? ' active' : '');
    }
  });
}

// Provider modal aç
window.openProviderModal = function(who) {
  const p = PROVIDERS[who];
  if (!p) return;
  currentProvider = who;
  document.getElementById('pmIcon').textContent = p.icon;
  document.getElementById('pmName').textContent = p.name;
  document.getElementById('pmBadge').textContent = savedKeys[who] ? '✓ Kayıtlı' : '✗ Kayıtlı Değil';
  document.getElementById('pmBadge').className = 'pm-badge' + (savedKeys[who] ? ' active' : '');
  document.getElementById('pmWhy').textContent = p.why;
  document.getElementById('pmUrl').textContent = p.urlText;
  document.getElementById('pmUrl').href = p.url;
  document.getElementById('pmModels').textContent = p.models;
  document.getElementById('pmPricing').textContent = p.pricing;
  document.getElementById('pmLimit').textContent = p.limit;
  document.getElementById('pmKeyFormat').textContent = p.keyFormat;
  document.getElementById('pmKeyInput').value = savedKeys[who] ? '••••••••' : '';
  document.getElementById('pmStatus').textContent = '';
  document.getElementById('providerModal').style.display = 'flex';
};

document.getElementById('closeProviderModal').onclick = () => document.getElementById('providerModal').style.display = 'none';
document.getElementById('providerModal').onclick = (e) => { if (e.target.id === 'providerModal') e.target.style.display = 'none'; };

// ESC ile modal kapat
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('providerModal').style.display = 'none';
    document.getElementById('settingsModal').style.display = 'none';
  }
});

// Sağlayıcı ara
window.filterProviders = function(q) {
  const cards = document.querySelectorAll('.pg-card');
  const search = q.toLowerCase();
  cards.forEach(c => {
    const name = c.querySelector('.pg-name').textContent.toLowerCase();
    c.style.display = name.includes(search) ? '' : 'none';
  });
};

// Provider key kaydet
window.saveProviderKey = function() {
  const val = document.getElementById('pmKeyInput').value.trim();
  const statusEl = document.getElementById('pmStatus');
  if (!val || val === '••••••••') { statusEl.textContent = 'Boş bırakılamaz'; statusEl.className = 'status-text error'; return; }
  // Her iki tarafa da kaydet
  localStorage.setItem('key_' + currentProvider, '1');
  fetch(API + '/save-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: currentProvider, key: val })
  }).then(r => r.json()).then(d => {
    statusEl.textContent = '✓ Kaydedildi';
    statusEl.className = 'status-text success';
    document.getElementById('pmKeyInput').value = '••••••••';
    savedKeys[currentProvider] = true;
    updateProviderStatuses();
    document.getElementById('pmBadge').textContent = '✓ Kayıtlı';
    document.getElementById('pmBadge').className = 'pm-badge active';
  }).catch(() => {
    // Bridge yoksa bile localStorage'a kaydedildi
    statusEl.textContent = '✓ Kaydedildi (yerel)';
    statusEl.className = 'status-text success';
    document.getElementById('pmKeyInput').value = '••••••••';
    savedKeys[currentProvider] = true;
    updateProviderStatuses();
    document.getElementById('pmBadge').textContent = '✓ Kayıtlı';
    document.getElementById('pmBadge').className = 'pm-badge active';
  });
};

// Key yükle - localStorage'dan, bridge varsa sunucudan da
fetch(API + '/keys').then(r => r.json()).then(d => {
  savedKeys = d;
  // Sunucudan gelenleri localStorage'a da kaydet
  Object.keys(d).forEach(k => { if (d[k]) localStorage.setItem('key_' + k, '1'); });
  updateProviderStatuses();
}).catch(() => {
  // Bridge yoksa localStorage'dan yükle
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith('key_')) savedKeys[k.replace('key_', '')] = true;
  });
  updateProviderStatuses();
});

// Legacy updateBadge fonksiyonu (dropdown için)
function updateBadge(who, saved) {
  const badge = document.getElementById(who + 'Badge');
  if (badge) {
    badge.textContent = saved ? '✓ Kayıtlı' : '✗ Kayıtlı Değil';
    badge.className = 'provider-badge' + (saved ? ' active' : '');
  }
}

function addMessage(text, sender) {
  const div = document.createElement('div');
  div.className = 'message ' + sender;
  div.innerHTML = '<div class="msg-content">' + text.replace(/\n/g, '<br>') + '</div>';
  messagesEl.appendChild(div);
  messagesEl.parentElement.scrollTop = messagesEl.parentElement.scrollHeight;
  return div;
}

async function send() {
  const text = userInput.value.trim();
  if (!text) return;
  const val = selectedModel;
  const [provider, model] = val.split(':');

  addMessage(text, 'user');
  userInput.value = '';
  sendBtn.disabled = true;
  const typing = addMessage('Düşünüyorum...', 'bot');
  typing.classList.add('typing');

  const messages = [];
  const context = chatHistory.map(m => m.role + ': ' + m.content).join('\n');
  if (context) messages.push({ role: 'system', content: context });
  messages.push({ role: 'user', content: text });

  try {
    if (provider === 'image') {
      // Pollinations image generation
      const encoded = encodeURIComponent(text);
      const url = 'https://image.pollinations.ai/prompt/' + encoded + '?model=' + model + '&width=1024&height=1024';
      typing.remove();
      addMessage('🖼️ Görsel oluşturuluyor...', 'bot');
      const imgDiv = document.createElement('div');
      imgDiv.className = 'message bot';
      imgDiv.innerHTML = '<img src="' + url + '" style="max-width:100%;border-radius:12px;" />';
      messagesEl.appendChild(imgDiv);
      messagesEl.parentElement.scrollTop = messagesEl.parentElement.scrollHeight;
      chatHistory.push({ role: 'user', content: text });
      chatHistory.push({ role: 'assistant', content: 'Görsel üretildi: ' + text });
    } else if (provider === 'video' || provider === 'hfvideo') {
      // Video generation
      typing.remove();
      notifySound();
      addMessage('🎬 Video oluşturuluyor... Hazır olunca burada oynatılacak.', 'bot');
      const r = await fetch(API + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model, messages })
      });
      const d = await r.json();
      if (d.video) {
        notifySound();
        const vidDiv = document.createElement('div');
        vidDiv.className = 'message bot';
        vidDiv.innerHTML = '<video src="' + d.video + '" controls autoplay style="max-width:100%;border-radius:12px;"></video>';
        messagesEl.appendChild(vidDiv);
        messagesEl.parentElement.scrollTop = messagesEl.parentElement.scrollHeight;
        chatHistory.push({ role: 'user', content: text });
        chatHistory.push({ role: 'assistant', content: 'Video üretildi: ' + text });
      } else if (d.job_id) {
        const statusMsg = addMessage('Video işleniyor... Lütfen bekleyin.', 'bot');
        let attempts = 0;
        const poll = async () => {
          attempts++;
          if (attempts > 60) {
            errorSound();
            statusMsg.innerHTML = '<div class="msg-content">Video çok uzun sürdü. Kontrol edin.</div>';
            return;
          }
          try {
            const pr = await fetch(API + '/video-status?job_id=' + d.job_id);
            const pd = await pr.json();
            if (pd.status === 'completed' && pd.video_url) {
              notifySound();
              statusMsg.innerHTML = '<video src="' + pd.video_url + '" controls autoplay style="max-width:100%;border-radius:12px;"></video>';
            } else if (pd.status === 'failed') {
              errorSound();
              statusMsg.innerHTML = '<div class="msg-content">Hata: ' + (pd.error || 'Başarısız') + '</div>';
            } else {
              setTimeout(poll, 3000);
            }
          } catch(e) { setTimeout(poll, 3000); }
        };
        poll();
      } else {
        errorSound();
        addMessage('Hata: ' + (d.error || 'Video oluşturulamadı'), 'bot');
      }
    } else {
      const r = await fetch(API + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model, messages })
      });
      const d = await r.json();
      typing.remove();
      if (d.reply) {
        notifySound();
        addMessage(d.reply, 'bot');
        chatHistory.push({ role: 'user', content: text });
        chatHistory.push({ role: 'assistant', content: d.reply });
      } else {
        errorSound();
        addMessage('Hata: ' + (d.error || 'Yanıt alınamadı'), 'bot');
      }
    }
  } catch(e) {
    typing.remove();
    connErrorSound();
    addMessage('Köprüye bağlanılamadı. Köprüyü başlatın: node server.js', 'bot');
  }
  sendBtn.disabled = false;
}

sendBtn.onclick = send;
userInput.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

// ===== ÖZEL DROPDOWN =====
const dropdownEl = document.getElementById('customDropdown');
const dropdownSelected = document.getElementById('dropdownSelected');
const dropdownList = document.getElementById('dropdownList');
const modelTooltip = document.getElementById('modelTooltip');
const selectedText = dropdownSelected.querySelector('.selected-text');
const selectedProvider = dropdownSelected.querySelector('.selected-provider');

function initDropdown() {
  const optionsContainer = document.getElementById('modelOptions');
  if (!optionsContainer) {
    const searchBar = dropdownList.querySelector('.dropdown-search')?.outerHTML || '';
    dropdownList.innerHTML = searchBar + '<div id="modelOptions"></div>';
    initDropdown();
    return;
  }
  
  updateSelectedDisplay();

  if (!MODEL_DB || Object.keys(MODEL_DB).length === 0) {
    optionsContainer.innerHTML = '<div style="padding:20px;color:red;text-align:center;">❌ MODEL_DB BOŞ! Dosya yüklenemedi.</div>';
    return;
  }

  const groups = {};
  const groupOrder = [];
  Object.entries(MODEL_DB).forEach(([key, m]) => {
    if (!groups[m.provider]) { groups[m.provider] = []; groupOrder.push(m.provider); }
    groups[m.provider].push({ key, ...m });
  });

  let html = '';
  groupOrder.forEach(provider => {
    const models = groups[provider];
    html += `<div class="dropdown-group-label" data-provider="${provider}">${provider}</div>`;
    models.forEach(m => {
      const priceClass = m.price === 'ucretsiz' ? 'price-free' : m.price === 'deneme' ? 'price-trial' : 'price-paid';
      const priceText = m.price === 'ucretsiz' ? 'Ücretsiz' : m.price === 'deneme' ? 'Deneme' : 'Ücretli';
      const ratingClass = m.rating >= 8 ? 'rating-high' : m.rating >= 6 ? 'rating-mid' : 'rating-low';
      const isActive = m.key === selectedModel ? ' active' : '';
      html += `<div class="dropdown-option${isActive}" data-key="${m.key}" data-provider="${provider}" onclick="selectModel('${m.key}')">
        <span class="option-name">${m.name}</span>
        <span class="option-rating ${ratingClass}">${m.rating}/10</span>
        <span class="option-price ${priceClass}">${priceText}</span>
      </div>`;
    });
  });
  
  optionsContainer.innerHTML = html;

  document.querySelectorAll('.dropdown-option').forEach(opt => {
    opt.addEventListener('mouseenter', (e) => {
      const k = opt.dataset.key;
      const md = MODEL_DB[k];
      if (md) showTooltip(md, e);
    });
    opt.addEventListener('mousemove', moveTooltip);
    opt.addEventListener('mouseleave', hideTooltip);
  });
}

// Seçili modeli göster
function updateSelectedDisplay() {
  const m = MODEL_DB[selectedModel];
  if (m) {
    selectedText.textContent = m.name;
    selectedProvider.textContent = m.provider;
  }
}

// Model seçimi ve hafızaya kayıt
window.selectModel = function(id) {
  selectedModel = id;
  localStorage.setItem('selectedModel', id);
  updateSelectedDisplay();
  dropdownEl.classList.remove('open');
  hideTooltip();
  
  document.querySelectorAll('.dropdown-option').forEach(o => o.classList.remove('active'));
  const activeOpt = document.querySelector(`.dropdown-option[data-key="${id}"]`);
  if (activeOpt) activeOpt.classList.add('active');
};

// Model filtreleme (İsim, Puan, Yetenek, Sağlayıcı, Fiyat)
window.filterModels = function() {
  const query = document.getElementById('modelSearch')?.value.toLowerCase() || '';
  const providerFilter = document.getElementById('filterProvider')?.value || '';
  const priceFilter = document.getElementById('filterPrice')?.value || '';
  const ratingFilter = document.getElementById('filterRating')?.value || '';
  const capFilter = document.getElementById('filterCap')?.value || '';
  
  const options = document.querySelectorAll('.dropdown-option');
  
  options.forEach(opt => {
    const id = opt.dataset.key;
    const m = MODEL_DB[id];
    if (!m) return;
    const p = PROVIDERS[m.provider] || { name: '' };
    
    const matchesName = m.name.toLowerCase().includes(query);
    const matchesProvider = !providerFilter || p.name === providerFilter;
    const matchesPrice = !priceFilter || m.price === priceFilter;
    const matchesRating = !ratingFilter || (m.rating >= parseInt(ratingFilter) && m.rating < parseInt(ratingFilter) + 3);
    const matchesCap = !capFilter || (m.caps && m.caps.includes(capFilter));
    const matchesCaps = m.caps.some(c => c.toLowerCase().includes(query));
    const matchesRatingQuery = query.includes('puan') && m.rating.toString().includes(query.replace('puan', '').trim());
    const matchesRatingDirect = !isNaN(query) && query !== '' && m.rating.toString() === query;

    const matchesSearch = (matchesName || matchesProvider || matchesCaps || matchesRatingQuery || matchesRatingDirect);
    const matchesFilters = matchesProvider && matchesPrice && matchesRating && matchesCap;
    
    opt.style.display = (matchesSearch && matchesFilters) ? '' : 'none';
  });
  
  // Sağlayıcı filtresini doldur (ilk açılışta)
  if (!document.getElementById('filterProvider').dataset.populated) {
    populateProviderFilter();
  }
};

function populateProviderFilter() {
  const select = document.getElementById('filterProvider');
  if (!select) return;
  const providers = [...new Set(Object.values(MODEL_DB).map(m => m.provider))].sort();
  providers.forEach(prov => {
    const opt = document.createElement('option');
    opt.value = prov;
    opt.textContent = prov;
    select.appendChild(opt);
  });
  select.dataset.populated = 'true';
}


// Dropdown aç/kapa
dropdownSelected.addEventListener('click', (e) => {
  e.stopPropagation();
  dropdownEl.classList.toggle('open');
  hideTooltip();
  if (dropdownEl.classList.contains('open')) {
    initDropdown(); // Dropdown açıldığında listeyi tazele (arama kutusunu koruyarak)
    const rect = dropdownSelected.getBoundingClientRect();
    dropdownList.style.left = rect.left + 'px';
    dropdownList.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
    dropdownList.style.width = Math.max(rect.width, 360) + 'px';
  }
});

// Dışarı tıklayınca kapat
document.addEventListener('click', (e) => {
  if (!dropdownEl.contains(e.target)) {
    dropdownEl.classList.remove('open');
    hideTooltip();
  }
});

// Tooltip göster
function showTooltip(m, e) {
  const ratingClass = m.rating >= 9 ? 'r10' : m.rating >= 8 ? 'r8' : m.rating >= 7 ? 'r7' : m.rating >= 6 ? 'r6' : m.rating >= 5 ? 'r5' : 'r4';
  const priceClass = m.price === 'ucretsiz' ? 'free' : m.price === 'deneme' ? 'trial' : 'paid';
  const priceText = m.price === 'ucretsiz' ? 'Ücretsiz' : m.price === 'deneme' ? 'Deneme' : 'Ücretli';

  // Yıldızları oluştur
  let stars = '';
  for (let i = 1; i <= 10; i++) {
    stars += '<span class="tooltip-star' + (i <= m.rating ? ' filled' : ' empty') + '">' + (i <= m.rating ? '★' : '☆') + '</span>';
  }

  // Yetenekleri oluştur
  let caps = '';
  (m.caps || []).forEach(c => {
    caps += '<span class="tooltip-cap">' + c + '</span>';
  });

  modelTooltip.innerHTML = '<div class="tooltip-header">'
    + '<span class="tooltip-name">' + m.name + '</span>'
    + '<span class="tooltip-rating ' + ratingClass + '">' + m.rating + '/10</span>'
    + '</div>'
    + '<div class="tooltip-provider">' + m.provider + '</div>'
    + '<div class="tooltip-badges">'
    + '<span class="tooltip-badge ' + priceClass + '">' + priceText + '</span>'
    + '<span class="tooltip-badge limits">' + m.limits + '</span>'
    + '</div>'
    + '<div class="tooltip-desc">' + m.desc + '</div>'
    + '<div class="tooltip-caps">' + caps + '</div>'
    + '<div class="tooltip-stars">' + stars + '</div>';

  modelTooltip.classList.add('visible');
  moveTooltip(e);
}

function moveTooltip(e) {
  const x = e.clientX + 16;
  const y = e.clientY - 10;
  const rect = modelTooltip.getBoundingClientRect();
  const maxX = window.innerWidth - 340;
  const maxY = window.innerHeight - rect.height - 10;
  modelTooltip.style.left = Math.min(x, maxX) + 'px';
  modelTooltip.style.top = Math.min(y, maxY) + 'px';
}

function hideTooltip() {
  modelTooltip.classList.remove('visible');
}

// Dropdown'ı başlat
initDropdown();
initProviderGrid();
