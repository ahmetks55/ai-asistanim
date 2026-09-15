// ===== AI ASİSTANIM =====
const API = 'http://localhost:8788';
const messagesEl = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const connStatus = document.getElementById('connStatus');

let chatHistory = [];
let selectedModel = 'nara:agnes-2.5-flash';

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
document.getElementById('settingsBtn').onclick = () => document.getElementById('settingsModal').style.display = 'flex';
document.getElementById('closeSettings').onclick = () => document.getElementById('settingsModal').style.display = 'none';
document.getElementById('settingsModal').onclick = (e) => { if (e.target.id === 'settingsModal') e.target.style.display = 'none'; };

// Provider toggle
function toggleProvider(who) {
  const card = document.querySelector('[onclick="toggleProvider(\'' + who + '\')"]');
  card.classList.toggle('open');
}
window.toggleProvider = toggleProvider;

function updateBadge(who, saved) {
  const badge = document.getElementById(who + 'Badge');
  if (badge) {
    badge.textContent = saved ? '✓ Kayıtlı' : '✗ Kayıtlı Değil';
    badge.className = 'provider-badge' + (saved ? ' active' : '');
  }
}

// Key yükle
fetch(API + '/keys').then(r => r.json()).then(d => {
  document.getElementById('naraKey').value = d.nara ? '••••••••' : '';
  document.getElementById('nvidiaKey').value = d.nvidia ? '••••••••' : '';
  document.getElementById('airforceKey').value = d.airforce ? '••••••••' : '';
  document.getElementById('pollinationsKey').value = d.pollinations ? '••••••••' : '';
  document.getElementById('hfKey').value = d.hf ? '••••••••' : '';
  document.getElementById('groqKey').value = d.groq ? '••••••••' : '';
  document.getElementById('cerebrasKey').value = d.cerebras ? '••••••••' : '';
  document.getElementById('zaiKey').value = d.zai ? '••••••••' : '';
  document.getElementById('siliconflowKey').value = d.siliconflow ? '••••••••' : '';
  document.getElementById('googleKey').value = d.google ? '••••••••' : '';
  document.getElementById('mistralKey').value = d.mistral ? '••••••••' : '';
  document.getElementById('cohereKey').value = d.cohere ? '••••••••' : '';
  document.getElementById('deepseekKey').value = d.deepseek ? '••••••••' : '';
  document.getElementById('openrouterKey').value = d.openrouter ? '••••••••' : '';
  document.getElementById('cloudflareKey').value = d.cloudflare ? '••••••••' : '';
  document.getElementById('scalewayKey').value = d.scaleway ? '••••••••' : '';
  document.getElementById('togetherKey').value = d.together ? '••••••••' : '';
  document.getElementById('fireworksKey').value = d.fireworks ? '••••••••' : '';
  document.getElementById('deepinfraKey').value = d.deepinfra ? '••••••••' : '';
  document.getElementById('novitaKey').value = d.novita ? '••••••••' : '';
  document.getElementById('ai21Key').value = d.ai21 ? '••••••••' : '';
  document.getElementById('upstageKey').value = d.upstage ? '••••••••' : '';
  document.getElementById('rekaKey').value = d.reka ? '••••••••' : '';
  document.getElementById('nebiusKey').value = d.nebius ? '••••••••' : '';
  document.getElementById('basetenKey').value = d.baseten ? '••••••••' : '';
  document.getElementById('sambanovaKey').value = d.sambanova ? '••••••••' : '';
  document.getElementById('xaiKey').value = d.xai ? '••••••••' : '';
  document.getElementById('perplexityKey').value = d.perplexity ? '••••••••' : '';
  document.getElementById('openaiKey').value = d.openai ? '••••••••' : '';
  document.getElementById('anthropicKey').value = d.anthropic ? '••••••••' : '';
  document.getElementById('veniceKey').value = d.venice ? '••••••••' : '';
  document.getElementById('minimaxKey').value = d.minimax ? '••••••••' : '';
  document.getElementById('moonshotKey').value = d.moonshot ? '••••••••' : '';
  document.getElementById('stepfunKey').value = d.stepfun ? '••••••••' : '';
  document.getElementById('zhipuKey').value = d.zhipu ? '••••••••' : '';
  document.getElementById('volcengineKey').value = d.volcengine ? '••••••••' : '';
  document.getElementById('alibabaKey').value = d.alibaba ? '••••••••' : '';
  document.getElementById('baiduKey').value = d.baidu ? '••••••••' : '';
  document.getElementById('sensenovaKey').value = d.sensenova ? '••••••••' : '';
  document.getElementById('xiaomiKey').value = d.xiaomi ? '••••••••' : '';
  document.getElementById('tencentKey').value = d.tencent ? '••••••••' : '';
  document.getElementById('bytedanceKey').value = d.bytedance ? '••••••••' : '';
  document.getElementById('githubKey').value = d.github ? '••••••••' : '';
  document.getElementById('llm7Key').value = d.llm7 ? '••••••••' : '';
  document.getElementById('ovhcloudKey').value = d.ovhcloud ? '••••••••' : '';
  document.getElementById('ollamaKey').value = d.ollama ? '••••••••' : '';
  document.getElementById('kiloKey').value = d.kilo ? '••••••••' : '';
  document.getElementById('opencodezenKey').value = d.opencodezen ? '••••••••' : '';
  document.getElementById('aionlabsKey').value = d.aionlabs ? '••••••••' : '';
  document.getElementById('agnesKey').value = d.agnes ? '••••••••' : '';
  document.getElementById('chutesKey').value = d.chutes ? '••••••••' : '';
  document.getElementById('glhfKey').value = d.glhf ? '••••••••' : '';
  document.getElementById('nscaleKey').value = d.nscale ? '••••••••' : '';
  document.getElementById('hyperbolicKey').value = d.hyperbolic ? '••••••••' : '';
  document.getElementById('iflowKey').value = d.iflow ? '••••••••' : '';
  document.getElementById('klusterKey').value = d.kluster ? '••••••••' : '';
  document.getElementById('friendliKey').value = d.friendli ? '••••••••' : '';
  document.getElementById('leptonKey').value = d.lepton ? '••••••••' : '';
  document.getElementById('anyscaleKey').value = d.anyscale ? '••••••••' : '';
  document.getElementById('puterKey').value = d.puter ? '••••••••' : '';
  document.getElementById('aimlKey').value = d.aiml ? '••••••••' : '';
  document.getElementById('nagaaiKey').value = d.nagaai ? '••••••••' : '';
  document.getElementById('paxsenixKey').value = d.paxsenix ? '••••••••' : '';
  document.getElementById('aihubmixKey').value = d.aihubmix ? '••••••••' : '';
  document.getElementById('fastrouterKey').value = d.fastrouter ? '••••••••' : '';
  document.getElementById('literouterKey').value = d.literouter ? '••••••••' : '';
  document.getElementById('swiftrouterKey').value = d.swiftrouter ? '••••••••' : '';
  document.getElementById('unorouterKey').value = d.unorouter ? '••••••••' : '';
  document.getElementById('voidaiKey').value = d.voidai ? '••••••••' : '';
  document.getElementById('valorgptKey').value = d.valorgpt ? '••••••••' : '';
  document.getElementById('zenllmKey').value = d.zenllm ? '••••••••' : '';
  document.getElementById('resurgeKey').value = d.resurge ? '••••••••' : '';
  document.getElementById('subaxisKey').value = d.subaxis ? '••••••••' : '';
  document.getElementById('routewayKey').value = d.routeway ? '••••••••' : '';
  document.getElementById('requestyKey').value = d.requesty ? '••••••••' : '';
  document.getElementById('aipooledKey').value = d.aipooled ? '••••••••' : '';
  document.getElementById('llmgatewayKey').value = d.llmgateway ? '••••••••' : '';
  document.getElementById('studiolmKey').value = d.studiolm ? '••••••••' : '';
  document.getElementById('pixazoKey').value = d.pixazo ? '••••••••' : '';
  document.getElementById('yingsuanKey').value = d.yingsuan ? '••••••••' : '';
  document.getElementById('xevenKey').value = d.xeven ? '••••••••' : '';
  document.getElementById('ofoxKey').value = d.ofox ? '••••••••' : '';
  document.getElementById('mnnaiKey').value = d.mnnai ? '••••••••' : '';
  document.getElementById('wandbKey').value = d.wandb ? '••••••••' : '';
  document.getElementById('replicateKey').value = d.replicate ? '••••••••' : '';
  document.getElementById('arceeKey').value = d.arcee ? '••••••••' : '';
  document.getElementById('subnpKey').value = d.subnp ? '••••••••' : '';
  document.getElementById('aichixiaKey').value = d.aichixia ? '••••••••' : '';
  document.getElementById('pydanticKey').value = d.pydantic ? '••••••••' : '';
  const newProviders = ['opencodego','302ai','abacus','above','agentrouter','airouter','aixy','akio','alibabachina','ambient','amd','anyapi','atomicchat','auriko','azure','bailing','berget','blueclaw','bothub','charmhyper','clarifai','claudinio','clinepass','cloudferro','coralbricks','cortecs','crofai','crossmodel','crusoe','daoxe','databricks','devpass','dinference','digitalocean','ebcloud','echo','edenai','empiriolabs','evroc','freemodel','frogbot','gitlabduo','gmicloud','greenpt','helicone','hetzner','hpc','impossibl','inception','inceptron','inferflow7','inference','inferx','infomaniak','ionet','iteracompute','jalapeno','jiekou','kenari','kimifor','klok','kosmik','kuae','lilac','llama','llmtech','llmtr','lmstudio','longcat','lucidquery','lynkr','meganova','melious','mergegateway','meta','mixlayer','moark','modal','modeloracle','modelis','modelscope','morph','nrouter','nan','nanogpt','nearai','neosmith','neuralwatt','nova','openreason','opper','orcarouter','pendra','pioneer','poe','poolside','privatemode','qihang','qiniu','qvac','regolo','routingrun','runinfra','sakana','saladcloud','sapai','sarvam','scxai','snowflake','stackit','standardcompute','subconscious','submodel','synthetic','tencenttoken','tencenttokenhub','tensorx','thegrid','thinkingmachines','tinfoil','tokengo','tokenrouter','trustedrouter','umansai','v0','vancine','vertex','vivgrid','vultr','wafer','wallaby','watsonx','xpersona','zeldoc','zenifra','zenmux'];
  newProviders.forEach(p => { const el = document.getElementById(p+'Key'); if(el) el.value = d[p] ? '••••••••' : ''; });
  updateBadge('nara', d.nara);
  updateBadge('nvidia', d.nvidia);
  updateBadge('airforce', d.airforce);
  updateBadge('pollinations', d.pollinations);
  updateBadge('hf', d.hf);
  updateBadge('groq', d.groq);
  updateBadge('cerebras', d.cerebras);
  updateBadge('zai', d.zai);
  updateBadge('siliconflow', d.siliconflow);
  updateBadge('google', d.google);
  updateBadge('mistral', d.mistral);
  updateBadge('cohere', d.cohere);
  updateBadge('deepseek', d.deepseek);
  updateBadge('openrouter', d.openrouter);
  updateBadge('cloudflare', d.cloudflare);
  updateBadge('scaleway', d.scaleway);
  updateBadge('together', d.together);
  updateBadge('fireworks', d.fireworks);
  updateBadge('deepinfra', d.deepinfra);
  updateBadge('novita', d.novita);
  updateBadge('ai21', d.ai21);
  updateBadge('upstage', d.upstage);
  updateBadge('reka', d.reka);
  updateBadge('nebius', d.nebius);
  updateBadge('baseten', d.baseten);
  updateBadge('sambanova', d.sambanova);
  updateBadge('xai', d.xai);
  updateBadge('perplexity', d.perplexity);
  updateBadge('openai', d.openai);
  updateBadge('anthropic', d.anthropic);
  updateBadge('venice', d.venice);
  updateBadge('minimax', d.minimax);
  updateBadge('moonshot', d.moonshot);
  updateBadge('stepfun', d.stepfun);
  updateBadge('zhipu', d.zhipu);
  updateBadge('volcengine', d.volcengine);
  updateBadge('alibaba', d.alibaba);
  updateBadge('baidu', d.baidu);
  updateBadge('sensenova', d.sensenova);
  updateBadge('xiaomi', d.xiaomi);
  updateBadge('tencent', d.tencent);
  updateBadge('bytedance', d.bytedance);
  updateBadge('github', d.github);
  updateBadge('llm7', d.llm7);
  updateBadge('ovhcloud', d.ovhcloud);
  updateBadge('ollama', d.ollama);
  updateBadge('kilo', d.kilo);
  updateBadge('opencodezen', d.opencodezen);
  updateBadge('aionlabs', d.aionlabs);
  updateBadge('agnes', d.agnes);
  updateBadge('chutes', d.chutes);
  updateBadge('glhf', d.glhf);
  updateBadge('nscale', d.nscale);
  updateBadge('hyperbolic', d.hyperbolic);
  updateBadge('iflow', d.iflow);
  updateBadge('kluster', d.kluster);
  updateBadge('friendli', d.friendli);
  updateBadge('lepton', d.lepton);
  updateBadge('anyscale', d.anyscale);
  updateBadge('puter', d.puter);
  updateBadge('aiml', d.aiml);
  updateBadge('nagaai', d.nagaai);
  updateBadge('paxsenix', d.paxsenix);
  updateBadge('aihubmix', d.aihubmix);
  updateBadge('fastrouter', d.fastrouter);
  updateBadge('literouter', d.literouter);
  updateBadge('swiftrouter', d.swiftrouter);
  updateBadge('unorouter', d.unorouter);
  updateBadge('voidai', d.voidai);
  updateBadge('valorgpt', d.valorgpt);
  updateBadge('zenllm', d.zenllm);
  updateBadge('resurge', d.resurge);
  updateBadge('subaxis', d.subaxis);
  updateBadge('routeway', d.routeway);
  updateBadge('requesty', d.requesty);
  updateBadge('aipooled', d.aipooled);
  updateBadge('llmgateway', d.llmgateway);
  updateBadge('studiolm', d.studiolm);
  updateBadge('pixazo', d.pixazo);
  updateBadge('yingsuan', d.yingsuan);
  updateBadge('xeven', d.xeven);
  updateBadge('ofox', d.ofox);
  updateBadge('mnnai', d.mnnai);
  updateBadge('wandb', d.wandb);
  updateBadge('replicate', d.replicate);
  updateBadge('arcee', d.arcee);
  updateBadge('subnp', d.subnp);
  updateBadge('aichixia', d.aichixia);
  updateBadge('pydantic', d.pydantic);
  const newBadges = ['opencodego','302ai','abacus','above','agentrouter','airouter','aixy','akio','alibabachina','ambient','amd','anyapi','atomicchat','auriko','azure','bailing','berget','blueclaw','bothub','charmhyper','clarifai','claudinio','clinepass','cloudferro','coralbricks','cortecs','crofai','crossmodel','crusoe','daoxe','databricks','devpass','dinference','digitalocean','ebcloud','echo','edenai','empiriolabs','evroc','freemodel','frogbot','gitlabduo','gmicloud','greenpt','helicone','hetzner','hpc','impossibl','inception','inceptron','inferflow7','inference','inferx','infomaniak','ionet','iteracompute','jalapeno','jiekou','kenari','kimifor','klok','kosmik','kuae','lilac','llama','llmtech','llmtr','lmstudio','longcat','lucidquery','lynkr','meganova','melious','mergegateway','meta','mixlayer','moark','modal','modeloracle','modelis','modelscope','morph','nrouter','nan','nanogpt','nearai','neosmith','neuralwatt','nova','openreason','opper','orcarouter','pendra','pioneer','poe','poolside','privatemode','qihang','qiniu','qvac','regolo','routingrun','runinfra','sakana','saladcloud','sapai','sarvam','scxai','snowflake','stackit','standardcompute','subconscious','submodel','synthetic','tencenttoken','tencenttokenhub','tensorx','thegrid','thinkingmachines','tinfoil','tokengo','tokenrouter','trustedrouter','umansai','v0','vancine','vertex','vivgrid','vultr','wafer','wallaby','watsonx','xpersona','zeldoc','zenifra','zenmux'];
  newBadges.forEach(b => { updateBadge(b, d[b]); });
}).catch(() => {});

function saveKey(who) {
  const val = document.getElementById(who + 'Key').value.trim();
  const statusEl = document.getElementById(who + 'Status');
  if (!val || val === '••••••••') { statusEl.textContent = 'Boş bırakılamaz'; statusEl.className = 'status-text error'; return; }
  fetch(API + '/save-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: who, key: val })
  }).then(r => r.json()).then(d => {
    if (d.ok) {
      statusEl.textContent = '✓ Kaydedildi';
      statusEl.className = 'status-text success';
      document.getElementById(who + 'Key').value = '••••••••';
      updateBadge(who, true);
    }
  }).catch(() => {
    statusEl.textContent = '✗ Köprü bağlı değil';
    statusEl.className = 'status-text error';
  });
}
window.saveKey = saveKey;

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
  // Gruplara ayır
  const groups = {};
  const groupOrder = [];
  Object.entries(MODEL_DB).forEach(([key, m]) => {
    if (!groups[m.provider]) { groups[m.provider] = []; groupOrder.push(m.provider); }
    groups[m.provider].push({ key, ...m });
  });

  // Her grup için HTML oluştur
  let html = '';
  groupOrder.forEach(provider => {
    const models = groups[provider];
    html += '<div class="dropdown-group-label">' + provider + '</div>';
    models.forEach(m => {
      const priceClass = m.price === 'ucretsiz' ? 'price-free' : m.price === 'deneme' ? 'price-trial' : 'price-paid';
      const priceText = m.price === 'ucretsiz' ? 'Ücretsiz' : m.price === 'deneme' ? 'Deneme' : 'Ücretli';
      const ratingClass = m.rating >= 8 ? 'rating-high' : m.rating >= 6 ? 'rating-mid' : 'rating-low';
      const isActive = m.key === selectedModel ? ' active' : '';
      html += '<div class="dropdown-option' + isActive + '" data-key="' + m.key + '">'
        + '<span class="option-name">' + m.name + '</span>'
        + '<span class="option-rating ' + ratingClass + '">' + m.rating + '/10</span>'
        + '<span class="option-price ' + priceClass + '">' + priceText + '</span>'
        + '</div>';
    });
  });
  dropdownList.innerHTML = html;

  // Seçili modeli göster
  updateSelectedDisplay();

  // Tıklama olayları
  dropdownList.querySelectorAll('.dropdown-option').forEach(opt => {
    opt.addEventListener('click', () => {
      selectedModel = opt.dataset.key;
      updateSelectedDisplay();
      dropdownEl.classList.remove('open');
      hideTooltip();
      // Aktif sınıfını güncelle
      dropdownList.querySelectorAll('.dropdown-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
    });

    // Hover tooltip
    opt.addEventListener('mouseenter', (e) => {
      const key = opt.dataset.key;
      const m = MODEL_DB[key];
      if (!m) return;
      showTooltip(m, e);
    });
    opt.addEventListener('mousemove', (e) => {
      moveTooltip(e);
    });
    opt.addEventListener('mouseleave', () => {
      hideTooltip();
    });
  });
}

function updateSelectedDisplay() {
  const m = MODEL_DB[selectedModel];
  if (m) {
    selectedText.textContent = m.name;
    selectedProvider.textContent = m.provider;
  }
}

// Dropdown aç/kapa
dropdownSelected.addEventListener('click', (e) => {
  e.stopPropagation();
  dropdownEl.classList.toggle('open');
  hideTooltip();
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
