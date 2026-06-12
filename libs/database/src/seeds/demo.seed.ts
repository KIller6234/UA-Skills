import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { createId } from '@paralleldrive/cuid2';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@nih.local';
const DEMO_PASSWORD = 'Demo1234!';
const TENANT_ID = 'demo-tenant';

const FEED_URLS = [
  { url: 'https://feeds.bbci.co.uk/news/rss.xml', title: 'BBC News', domain: 'bbc.co.uk' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', title: 'NYT Technology', domain: 'nytimes.com' },
  { url: 'https://techcrunch.com/feed/', title: 'TechCrunch', domain: 'techcrunch.com' },
];

const ENTITY_SEEDS = [
  { kind: 'PERSON', canonicalName: 'Elon Musk', aliases: ['musk'] },
  { kind: 'PERSON', canonicalName: 'Sam Altman', aliases: ['altman'] },
  { kind: 'PERSON', canonicalName: 'Satya Nadella', aliases: [] },
  { kind: 'PERSON', canonicalName: 'Jensen Huang', aliases: [] },
  { kind: 'PERSON', canonicalName: 'Tim Cook', aliases: [] },
  { kind: 'COMPANY', canonicalName: 'OpenAI', aliases: ['open ai'] },
  { kind: 'COMPANY', canonicalName: 'Microsoft', aliases: ['msft'] },
  { kind: 'COMPANY', canonicalName: 'Google', aliases: ['alphabet', 'googl'] },
  { kind: 'COMPANY', canonicalName: 'Apple', aliases: ['aapl'] },
  { kind: 'COMPANY', canonicalName: 'Tesla', aliases: ['tsla'] },
  { kind: 'COMPANY', canonicalName: 'NVIDIA', aliases: ['nvda'] },
  { kind: 'COMPANY', canonicalName: 'Meta', aliases: ['facebook', 'fb'] },
  { kind: 'TECHNOLOGY', canonicalName: 'GPT-4', aliases: ['gpt4'] },
  { kind: 'TECHNOLOGY', canonicalName: 'Large Language Model', aliases: ['llm', 'llms'] },
  { kind: 'TECHNOLOGY', canonicalName: 'Artificial Intelligence', aliases: ['ai', 'machine learning', 'ml'] },
  { kind: 'TECHNOLOGY', canonicalName: 'Kubernetes', aliases: ['k8s'] },
  { kind: 'TECHNOLOGY', canonicalName: 'Rust', aliases: [] },
  { kind: 'TECHNOLOGY', canonicalName: 'TypeScript', aliases: ['ts'] },
  { kind: 'LOCATION', canonicalName: 'Silicon Valley', aliases: ['sv'] },
  { kind: 'LOCATION', canonicalName: 'San Francisco', aliases: ['sf', 'bay area'] },
  { kind: 'LOCATION', canonicalName: 'Washington DC', aliases: ['dc', 'washington'] },
  { kind: 'LOCATION', canonicalName: 'European Union', aliases: ['eu', 'europe'] },
  { kind: 'LOCATION', canonicalName: 'China', aliases: ['prc', 'beijing'] },
  { kind: 'PRODUCT', canonicalName: 'ChatGPT', aliases: ['chatgpt'] },
  { kind: 'OTHER', canonicalName: 'Venture Capital', aliases: ['vc', 'venture'] },
] as const;

const ARTICLE_TEMPLATES = [
  { title: 'OpenAI Announces GPT-5 with Advanced Reasoning Capabilities', domain: 'techcrunch.com', importance: 90, entities: ['OpenAI', 'Sam Altman', 'GPT-4', 'Large Language Model', 'Artificial Intelligence'], keywords: ['gpt-5', 'openai', 'reasoning', 'llm'], summary: 'OpenAI unveiled GPT-5, claiming significant improvements in multi-step reasoning and code generation tasks over its predecessor.' },
  { title: 'Microsoft and Google Race to Deploy AI in Enterprise Products', domain: 'nytimes.com', importance: 75, entities: ['Microsoft', 'Google', 'Satya Nadella', 'Artificial Intelligence'], keywords: ['enterprise', 'ai', 'microsoft', 'google', 'copilot'], summary: 'Both tech giants are aggressively integrating AI into their office productivity suites, with Copilot and Gemini leading their respective strategies.' },
  { title: 'Tesla Full Self-Driving Beta Expands to Europe', domain: 'bbc.co.uk', importance: 70, entities: ['Tesla', 'Elon Musk', 'European Union'], keywords: ['fsd', 'tesla', 'autonomous', 'europe', 'regulation'], summary: 'Tesla begins rolling out its Full Self-Driving beta to select European markets, navigating complex EU regulatory requirements.' },
  { title: 'NVIDIA Reports Record Revenue Driven by AI Chip Demand', domain: 'techcrunch.com', importance: 85, entities: ['NVIDIA', 'Jensen Huang', 'Artificial Intelligence'], keywords: ['nvidia', 'h100', 'gpu', 'revenue', 'ai chips'], summary: 'NVIDIA posted record quarterly revenue as demand for its H100 and H200 AI accelerator chips continues to surge across cloud providers.' },
  { title: 'Apple Vision Pro Sales Disappoint in First Quarter', domain: 'nytimes.com', importance: 65, entities: ['Apple', 'Tim Cook'], keywords: ['vision pro', 'apple', 'spatial computing', 'vr', 'ar'], summary: 'Apple Vision Pro sales came in below analyst expectations as the high price point and limited app ecosystem deterred mainstream adoption.' },
  { title: 'EU AI Act Enforcement Begins: What It Means for Tech Companies', domain: 'bbc.co.uk', importance: 80, entities: ['European Union', 'OpenAI', 'Microsoft', 'Google', 'Meta'], keywords: ['eu ai act', 'regulation', 'compliance', 'artificial intelligence'], summary: 'The EU AI Act enters enforcement phase, requiring tech companies to classify and comply with risk-based requirements for AI systems.' },
  { title: 'Meta Releases Llama 3 Open-Source Model Family', domain: 'techcrunch.com', importance: 78, entities: ['Meta', 'Large Language Model', 'Artificial Intelligence'], keywords: ['llama', 'meta', 'open source', 'llm', 'weights'], summary: 'Meta open-sources Llama 3 in multiple sizes, providing researchers and developers with competitive alternatives to proprietary models.' },
  { title: 'Rust Surpasses C++ in Linux Kernel Contributions', domain: 'nytimes.com', importance: 55, entities: ['Rust', 'Kubernetes'], keywords: ['rust', 'linux', 'kernel', 'systems programming', 'memory safety'], summary: 'Rust language contributions to the Linux kernel now exceed C++ for the first time, marking a milestone in the language adoption curve.' },
  { title: 'Google DeepMind AlphaFold 3 Predicts Molecular Interactions', domain: 'bbc.co.uk', importance: 88, entities: ['Google', 'Artificial Intelligence'], keywords: ['alphafold', 'protein', 'drug discovery', 'deepmind', 'biology'], summary: 'AlphaFold 3 extends protein structure prediction to molecular interactions, potentially accelerating drug discovery by years.' },
  { title: 'Sam Altman Testifies Before Senate on AI Safety', domain: 'nytimes.com', importance: 72, entities: ['Sam Altman', 'OpenAI', 'Washington DC', 'Artificial Intelligence'], keywords: ['senate', 'ai safety', 'regulation', 'testimony', 'openai'], summary: 'OpenAI CEO Sam Altman appeared before the Senate Commerce Committee to discuss AI safety measures and potential regulation frameworks.' },
  { title: 'TypeScript 5.5 Brings Inferred Type Predicates', domain: 'techcrunch.com', importance: 45, entities: ['TypeScript', 'Microsoft'], keywords: ['typescript', 'type predicates', 'narrowing', 'release'], summary: 'TypeScript 5.5 introduces inferred type predicates, allowing the compiler to automatically narrow types in more scenarios.' },
  { title: 'Kubernetes 1.31 Released with Enhanced Node Management', domain: 'techcrunch.com', importance: 50, entities: ['Kubernetes'], keywords: ['kubernetes', 'k8s', 'release', 'nodes', 'cncf'], summary: 'Kubernetes 1.31 ships with improved node lifecycle management and deprecated the in-tree cloud provider integrations.' },
  { title: 'OpenAI Valuation Reaches $100B in Secondary Market', domain: 'bbc.co.uk', importance: 76, entities: ['OpenAI', 'Sam Altman', 'Venture Capital', 'Silicon Valley'], keywords: ['valuation', 'openai', 'funding', 'secondary market'], summary: 'OpenAI shares on secondary markets imply a $100 billion valuation, making it one of the most valuable private companies.' },
  { title: 'Elon Musk Sues OpenAI Over Alleged Mission Abandonment', domain: 'nytimes.com', importance: 82, entities: ['Elon Musk', 'OpenAI', 'Sam Altman'], keywords: ['lawsuit', 'musk', 'openai', 'nonprofit', 'legal'], summary: 'Elon Musk files suit against OpenAI, alleging the company abandoned its founding mission of developing AI for the benefit of humanity.' },
  { title: 'Anthropic Raises $2B From Google and Spark Capital', domain: 'techcrunch.com', importance: 79, entities: ['Google', 'Artificial Intelligence', 'Venture Capital', 'Silicon Valley'], keywords: ['anthropic', 'funding', 'claude', 'google', 'series c'], summary: 'Anthropic secures a $2 billion investment round co-led by Google and Spark Capital to accelerate Claude model development.' },
  { title: 'China Restricts AI Chip Exports in Retaliation to US Sanctions', domain: 'bbc.co.uk', importance: 83, entities: ['China', 'NVIDIA', 'Artificial Intelligence'], keywords: ['china', 'export controls', 'chips', 'geopolitics', 'ai'], summary: 'Beijing announces export controls on rare earth materials used in semiconductor manufacturing in response to US chip export restrictions.' },
  { title: 'Microsoft Azure OpenAI Service Hits 100K Enterprise Customers', domain: 'nytimes.com', importance: 68, entities: ['Microsoft', 'OpenAI', 'Artificial Intelligence'], keywords: ['azure', 'enterprise', 'openai', 'api', 'customers'], summary: 'Microsoft reports Azure OpenAI Service has surpassed 100,000 enterprise customers, validating its strategy of distributing OpenAI models at scale.' },
  { title: 'San Francisco Tech Job Market Rebounds After 2023 Layoffs', domain: 'techcrunch.com', importance: 58, entities: ['San Francisco', 'Silicon Valley'], keywords: ['jobs', 'layoffs', 'hiring', 'san francisco', 'tech'], summary: 'Bay Area tech hiring picks up momentum in 2024 as AI companies offset headcount reductions from traditional software firms.' },
  { title: 'Meta Threads Surpasses 200 Million Monthly Active Users', domain: 'bbc.co.uk', importance: 60, entities: ['Meta'], keywords: ['threads', 'meta', 'social media', 'twitter', 'mau'], summary: 'Meta Threads reaches 200 million monthly active users eighteen months after launch, establishing itself as a viable Twitter alternative.' },
  { title: 'Google Gemini Ultra Scores Highest on Math Benchmarks', domain: 'nytimes.com', importance: 73, entities: ['Google', 'Artificial Intelligence', 'Large Language Model'], keywords: ['gemini', 'math', 'benchmark', 'reasoning', 'google'], summary: 'Google Gemini Ultra achieves state-of-the-art results on MATH and GSM8K benchmarks, narrowing the gap with GPT-4 on quantitative reasoning.' },
  { title: 'NVIDIA H200 GPU Ships to Major Cloud Providers', domain: 'techcrunch.com', importance: 81, entities: ['NVIDIA', 'Jensen Huang'], keywords: ['h200', 'nvidia', 'cloud', 'training', 'gpu'], summary: 'NVIDIA begins shipping H200 GPUs to AWS, Google Cloud, and Microsoft Azure, promising 60% faster LLM inference over H100.' },
  { title: 'OpenAI Launches GPT-4o with Real-Time Voice Interaction', domain: 'bbc.co.uk', importance: 87, entities: ['OpenAI', 'Sam Altman', 'ChatGPT', 'Artificial Intelligence'], keywords: ['gpt-4o', 'voice', 'multimodal', 'real-time', 'openai'], summary: 'OpenAI unveils GPT-4o, an omni model capable of real-time voice interaction with sub-300ms latency and improved vision capabilities.' },
  { title: 'EU Fines Meta €1.2B for Illegal Data Transfers to US', domain: 'nytimes.com', importance: 77, entities: ['Meta', 'European Union'], keywords: ['gdpr', 'fine', 'meta', 'data transfer', 'privacy'], summary: 'EU regulators impose the largest GDPR fine in history on Meta for transferring European user data to US servers without adequate protections.' },
  { title: 'Washington DC Advances Bipartisan AI Governance Bill', domain: 'techcrunch.com', importance: 74, entities: ['Washington DC', 'OpenAI', 'Microsoft', 'Artificial Intelligence'], keywords: ['legislation', 'ai governance', 'bipartisan', 'congress', 'regulation'], summary: 'A bipartisan Senate bill proposes a federal AI regulatory framework with mandatory transparency requirements for high-impact AI systems.' },
  { title: 'Tesla Optimus Robot Begins Assembly Line Trials at Gigafactory', domain: 'bbc.co.uk', importance: 69, entities: ['Tesla', 'Elon Musk'], keywords: ['optimus', 'humanoid', 'robot', 'manufacturing', 'tesla'], summary: 'Tesla begins real-world assembly trials for its Optimus humanoid robot at the Fremont Gigafactory, targeting automotive parts handling.' },
  { title: 'Apple Intelligence Features Roll Out in iOS 18.1', domain: 'nytimes.com', importance: 71, entities: ['Apple', 'Tim Cook', 'Artificial Intelligence', 'ChatGPT'], keywords: ['apple intelligence', 'ios 18', 'on-device ai', 'siri', 'gpt'], summary: 'iOS 18.1 brings the first Apple Intelligence features including enhanced Siri, Writing Tools, and an optional ChatGPT integration.' },
  { title: 'Venture Capital Investment in AI Startups Exceeds $50B in H1 2024', domain: 'techcrunch.com', importance: 66, entities: ['Venture Capital', 'Silicon Valley', 'Artificial Intelligence'], keywords: ['funding', 'vc', 'ai startups', 'investment', '2024'], summary: 'H1 2024 venture capital investment in AI reached $50 billion globally, with infrastructure and foundation model companies attracting the bulk.' },
  { title: 'Rust Wins Most Loved Language Survey for Ninth Consecutive Year', domain: 'bbc.co.uk', importance: 42, entities: ['Rust'], keywords: ['rust', 'stackoverflow', 'survey', 'developer', 'loved'], summary: 'Stack Overflow Developer Survey 2024 crowns Rust the most loved programming language for the ninth year in a row.' },
  { title: 'Google I/O 2024: Gemini Nano Comes to Android', domain: 'techcrunch.com', importance: 67, entities: ['Google', 'Artificial Intelligence', 'Large Language Model'], keywords: ['google io', 'gemini nano', 'android', 'on-device', 'mobile'], summary: 'Google I/O 2024 showcases Gemini Nano integration directly into Android, enabling on-device AI for text summarization and reply suggestions.' },
  { title: 'Microsoft Recall Feature Delayed Amid Privacy Concerns', domain: 'nytimes.com', importance: 63, entities: ['Microsoft', 'Satya Nadella'], keywords: ['recall', 'microsoft', 'privacy', 'copilot plus', 'screenshot'], summary: 'Microsoft delays the Recall AI feature for Copilot+ PCs after researchers demonstrated it stored sensitive data in an unencrypted local database.' },
  { title: 'OpenAI Acquires Rockset for Real-Time Analytics Integration', domain: 'bbc.co.uk', importance: 61, entities: ['OpenAI', 'Sam Altman'], keywords: ['rockset', 'openai', 'acquisition', 'analytics', 'real-time'], summary: 'OpenAI acquires Rockset to enhance its enterprise ChatGPT products with real-time data retrieval and analytics capabilities.' },
  { title: 'Meta AI Assistant Rolls Out Across WhatsApp, Messenger, Instagram', domain: 'techcrunch.com', importance: 64, entities: ['Meta', 'Artificial Intelligence', 'Large Language Model'], keywords: ['meta ai', 'whatsapp', 'messenger', 'chatbot', 'llama'], summary: 'Meta integrates its Llama-powered AI assistant into all major platforms, reaching billions of potential users in a single rollout.' },
  { title: 'Tesla Cybertruck Demand Softens in Second Quarter', domain: 'nytimes.com', importance: 57, entities: ['Tesla', 'Elon Musk'], keywords: ['cybertruck', 'tesla', 'demand', 'ev', 'sales'], summary: 'Tesla Cybertruck reservation conversions slow in Q2 2024 amid complaints about service availability and range in cold weather.' },
  { title: 'NVIDIA Announces Blackwell GPU Architecture at GTC 2024', domain: 'bbc.co.uk', importance: 86, entities: ['NVIDIA', 'Jensen Huang', 'Artificial Intelligence'], keywords: ['blackwell', 'nvidia', 'gtc', 'gpu', 'architecture'], summary: 'Jensen Huang unveils the Blackwell GPU architecture at GTC 2024, promising up to 5x better performance per watt for AI training workloads.' },
  { title: 'China AI Startup Zhipu AI Valued at $3B After Latest Round', domain: 'techcrunch.com', importance: 59, entities: ['China', 'Artificial Intelligence', 'Venture Capital'], keywords: ['zhipu', 'china', 'ai', 'funding', 'llm'], summary: 'Chinese AI startup Zhipu AI raises Series D at a $3 billion valuation, becoming one of the most valuable AI companies outside the US.' },
  { title: 'Apple Rejects Beeper App Again for iMessage Protocol Reverse Engineering', domain: 'nytimes.com', importance: 43, entities: ['Apple', 'Tim Cook'], keywords: ['beeper', 'imessage', 'apple', 'app store', 'green bubbles'], summary: 'Apple removes Beeper Mini from the App Store citing security concerns over its reverse-engineered iMessage protocol access.' },
  { title: 'Google Cloud and Hugging Face Partner to Host Open Models', domain: 'bbc.co.uk', importance: 62, entities: ['Google', 'Artificial Intelligence', 'Large Language Model'], keywords: ['hugging face', 'google cloud', 'open models', 'hosting', 'inference'], summary: 'Google Cloud and Hugging Face announce a partnership to offer one-click deployment of open-source AI models on Google infrastructure.' },
  { title: 'Meta AI Research Achieves New SOTA on Code Generation', domain: 'techcrunch.com', importance: 68, entities: ['Meta', 'Artificial Intelligence', 'Large Language Model'], keywords: ['code generation', 'meta', 'codellama', 'benchmark', 'swe-bench'], summary: 'Meta AI research reports new state-of-the-art results on SWE-bench, a benchmark testing autonomous software engineering capabilities.' },
  { title: 'Washington DC Subpoenas Sam Altman Over AI Safety Disclosures', domain: 'nytimes.com', importance: 78, entities: ['Washington DC', 'Sam Altman', 'OpenAI', 'Artificial Intelligence'], keywords: ['subpoena', 'congress', 'openai', 'safety', 'disclosure'], summary: 'Congressional investigators subpoena Sam Altman and OpenAI board members for internal communications related to the November 2023 leadership crisis.' },
  { title: 'Rust Foundation Reports 3x Growth in Crate Downloads', domain: 'bbc.co.uk', importance: 40, entities: ['Rust'], keywords: ['rust', 'crates.io', 'downloads', 'ecosystem', 'growth'], summary: 'The Rust Foundation annual report shows crate downloads tripled year-over-year, driven by adoption in embedded systems and WebAssembly.' },
  { title: 'Elon Musk xAI Grok 2 Released with Real-Time X Data Access', domain: 'techcrunch.com', importance: 76, entities: ['Elon Musk', 'Artificial Intelligence', 'Large Language Model'], keywords: ['grok', 'xai', 'musk', 'twitter', 'real-time'], summary: 'Elon Musk launches Grok 2 with direct access to real-time data from X, differentiating it from competitors with a live information advantage.' },
  { title: 'European Parliament Votes to Strengthen AI Liability Rules', domain: 'nytimes.com', importance: 71, entities: ['European Union', 'Artificial Intelligence'], keywords: ['ai liability', 'eu parliament', 'regulation', 'copyright', 'deepfake'], summary: 'The European Parliament passes amendments to the AI Liability Directive, enabling citizens to sue AI providers for damages from automated decisions.' },
  { title: 'Kubernetes Passes 10 Billion Container Deployments', domain: 'techcrunch.com', importance: 48, entities: ['Kubernetes'], keywords: ['kubernetes', 'containers', 'cncf', 'milestone', 'cloud native'], summary: 'The CNCF announces Kubernetes has facilitated over 10 billion container deployments since launch, cementing its dominance in cloud orchestration.' },
  { title: 'Apple WWDC 2024: New Mac Pro with M4 Ultra Chip', domain: 'bbc.co.uk', importance: 65, entities: ['Apple', 'Tim Cook'], keywords: ['wwdc', 'mac pro', 'm4 ultra', 'apple silicon', 'pro'], summary: 'Apple WWDC 2024 features the Mac Pro refreshed with the M4 Ultra chip, targeting professional video and 3D rendering workloads.' },
  { title: 'Sam Altman Returns as OpenAI CEO After Board Reversal', domain: 'nytimes.com', importance: 90, entities: ['Sam Altman', 'OpenAI', 'Artificial Intelligence'], keywords: ['openai', 'board', 'ceo', 'sam altman', 'governance'], summary: 'Sam Altman is reinstated as OpenAI CEO five days after his surprise dismissal, following backlash from employees and major investors.' },
  { title: 'TypeScript Now Used by 90% of Fortune 500 Frontends', domain: 'techcrunch.com', importance: 52, entities: ['TypeScript', 'Microsoft'], keywords: ['typescript', 'adoption', 'enterprise', 'javascript', 'frontend'], summary: 'A State of JS survey reveals TypeScript adoption among Fortune 500 companies reached 90%, driven by tooling improvements and AI code assistance.' },
  { title: 'San Francisco Passes AI Ordinance Requiring Disclosure to Residents', domain: 'bbc.co.uk', importance: 56, entities: ['San Francisco', 'Artificial Intelligence'], keywords: ['san francisco', 'ordinance', 'ai disclosure', 'local government', 'policy'], summary: 'San Francisco becomes the first US city to require businesses to disclose when residents interact with AI systems in lieu of humans.' },
  { title: 'Google Gemini 1.5 Pro Achieves Million Token Context Window', domain: 'nytimes.com', importance: 84, entities: ['Google', 'Artificial Intelligence', 'Large Language Model'], keywords: ['gemini 1.5', 'context window', 'long context', 'google', 'pro'], summary: 'Google announces Gemini 1.5 Pro with a one million token context window, enabling analysis of entire codebases or feature films in a single prompt.' },
  { title: 'Meta Open-Sources Segment Anything Model 2', domain: 'techcrunch.com', importance: 69, entities: ['Meta', 'Artificial Intelligence'], keywords: ['sam2', 'meta', 'open source', 'vision', 'segmentation'], summary: 'Meta releases SAM 2, extending the original Segment Anything Model to video, enabling real-time object tracking across frames.' },
  { title: 'Microsoft Copilot+ PCs Ship with ARM64 and AI Acceleration', domain: 'bbc.co.uk', importance: 62, entities: ['Microsoft', 'Satya Nadella', 'Artificial Intelligence'], keywords: ['copilot plus', 'arm64', 'npu', 'windows', 'snapdragon'], summary: 'Microsoft launches Copilot+ PC certification for Snapdragon X Elite and X Plus laptops, requiring dedicated NPU hardware for AI workloads.' },
  { title: 'China Tech Giants Baidu and Alibaba Join AI Alliance', domain: 'nytimes.com', importance: 61, entities: ['China', 'Artificial Intelligence'], keywords: ['baidu', 'alibaba', 'china', 'ai alliance', 'cooperation'], summary: 'Baidu and Alibaba announce joint participation in a state-sponsored AI alliance aimed at coordinating Chinese AI standards and safety protocols.' },
  { title: 'Elon Musk Announces Tesla Robotaxi Reveal for August 2024', domain: 'techcrunch.com', importance: 75, entities: ['Elon Musk', 'Tesla', 'Artificial Intelligence'], keywords: ['robotaxi', 'tesla', 'autonomous', 'rideshare', '2024'], summary: 'Elon Musk tweets a robotaxi reveal event for August 8, 2024, promising to show the dedicated autonomous vehicle Tesla has been developing.' },
  { title: 'OpenAI Launches o1 Model with Chain-of-Thought Reasoning', domain: 'techcrunch.com', importance: 92, entities: ['OpenAI', 'Sam Altman', 'Large Language Model', 'Artificial Intelligence'], keywords: ['o1', 'chain-of-thought', 'reasoning', 'openai', 'frontier'], summary: 'OpenAI releases the o1 model series, demonstrating state-of-the-art performance on competition math and PhD-level science questions through extended reasoning.' },
  { title: 'Microsoft Integrates GitHub Copilot Into Visual Studio Code Natively', domain: 'nytimes.com', importance: 60, entities: ['Microsoft', 'TypeScript'], keywords: ['copilot', 'vscode', 'github', 'developer tools', 'ide'], summary: 'GitHub Copilot is now natively embedded into VS Code, offering in-editor chat, code suggestions, and multi-file edit capabilities without a separate extension.' },
  { title: 'Google DeepMind Launches Gemma 2 Open Weights Model', domain: 'bbc.co.uk', importance: 70, entities: ['Google', 'Large Language Model', 'Artificial Intelligence'], keywords: ['gemma', 'google', 'open weights', 'llm', 'deepmind'], summary: 'Google DeepMind releases Gemma 2 in 9B and 27B parameter sizes, outperforming similarly-sized open models on reasoning and coding benchmarks.' },
  { title: 'Anthropic Introduces Constitutional AI 2.0 Safety Framework', domain: 'techcrunch.com', importance: 77, entities: ['Artificial Intelligence', 'Washington DC'], keywords: ['constitutional ai', 'safety', 'alignment', 'claude', 'anthropic'], summary: 'Anthropic publishes Constitutional AI 2.0, describing improvements to its value alignment methodology that reduce harmful outputs while preserving helpfulness.' },
  { title: 'NVIDIA Blackwell GPUs Power New AWS Instances', domain: 'nytimes.com', importance: 80, entities: ['NVIDIA', 'Jensen Huang', 'Artificial Intelligence'], keywords: ['blackwell', 'aws', 'p5en', 'cloud', 'gpu'], summary: 'Amazon Web Services announces p5en instances powered by NVIDIA GB200 Blackwell GPUs, offering 2x the training throughput of previous H100-based instances.' },
  { title: 'Meta FAIR Releases New Open-Source Multimodal Model', domain: 'bbc.co.uk', importance: 67, entities: ['Meta', 'Large Language Model', 'Artificial Intelligence'], keywords: ['meta fair', 'multimodal', 'open source', 'vision', 'llama'], summary: 'Meta Fundamental AI Research releases a new open multimodal model capable of image, audio, and text understanding with a fully permissive open license.' },
  { title: 'EU Digital Markets Act Forces Apple to Open iOS to Third-Party Stores', domain: 'techcrunch.com', importance: 82, entities: ['Apple', 'Tim Cook', 'European Union'], keywords: ['dma', 'apple', 'sideloading', 'app store', 'eu'], summary: 'Apple complies with EU Digital Markets Act requirements, allowing alternative app stores and sideloading on iOS in European markets for the first time.' },
  { title: 'Cloudflare Launches AI Gateway for LLM Cost Management', domain: 'bbc.co.uk', importance: 55, entities: ['Artificial Intelligence', 'Large Language Model'], keywords: ['cloudflare', 'ai gateway', 'proxy', 'caching', 'llm cost'], summary: 'Cloudflare introduces AI Gateway, a proxy layer that caches LLM responses, tracks costs, and provides analytics for teams building AI-powered applications.' },
  { title: 'Stack Overflow Survey: 60% of Developers Use AI Tools Weekly', domain: 'techcrunch.com', importance: 50, entities: ['Artificial Intelligence', 'TypeScript'], keywords: ['stack overflow', 'survey', 'ai tools', 'developer productivity', 'coding'], summary: 'The Stack Overflow Developer Survey reveals that 60% of developers use AI coding assistants at least weekly, up from 27% the year before.' },
  { title: 'Tesla FSD 12.4 Reaches 1 Billion Miles on US Roads', domain: 'nytimes.com', importance: 68, entities: ['Tesla', 'Elon Musk', 'Artificial Intelligence'], keywords: ['fsd', 'miles', 'autonomous', 'safety', 'data'], summary: 'Tesla Full Self-Driving has accumulated over 1 billion real-world miles across the US fleet, providing a massive training data advantage over rivals.' },
  { title: 'Microsoft Azure Revenue Surpasses $35B Quarterly for First Time', domain: 'bbc.co.uk', importance: 73, entities: ['Microsoft', 'Satya Nadella', 'Artificial Intelligence'], keywords: ['azure', 'revenue', 'cloud', 'earnings', 'microsoft'], summary: 'Microsoft reports Azure quarterly revenue exceeding $35 billion, driven by AI workload demand and enterprise migration from on-premises infrastructure.' },
  { title: 'OpenAI and Reddit Strike $60M Data Licensing Deal', domain: 'techcrunch.com', importance: 64, entities: ['OpenAI', 'Sam Altman', 'Large Language Model'], keywords: ['reddit', 'data licensing', 'training data', 'openai', 'ipo'], summary: 'OpenAI signs a $60 million annual agreement with Reddit to use forum content for model training, coinciding with Reddit approaching its public offering.' },
  { title: 'Rust Enters the Linux Kernel Networking Subsystem', domain: 'nytimes.com', importance: 53, entities: ['Rust', 'Kubernetes'], keywords: ['rust', 'linux', 'networking', 'kernel', 'memory safety'], summary: 'The Linux kernel merges the first Rust-written networking driver, marking a significant expansion of Rust usage beyond the initial filesystem and GPU modules.' },
  { title: 'Sam Altman Joins Apple Board as AI Advisor', domain: 'techcrunch.com', importance: 79, entities: ['Sam Altman', 'OpenAI', 'Apple', 'Tim Cook'], keywords: ['board', 'apple', 'openai', 'ai strategy', 'partnership'], summary: 'Sam Altman joins Apple\'s board in an advisory capacity to guide the company\'s generative AI integration strategy across its product lines.' },
  { title: 'NVIDIA Releases Open-Source Inference Microservices for LLMs', domain: 'nytimes.com', importance: 66, entities: ['NVIDIA', 'Jensen Huang', 'Large Language Model', 'Artificial Intelligence'], keywords: ['nim', 'nvidia', 'inference', 'microservices', 'deployment'], summary: 'NVIDIA launches NIM containerized packages that make deploying optimized LLMs on NVIDIA hardware dramatically simpler for enterprise teams.' },
  { title: 'European AI Office Opens in Brussels to Enforce AI Act', domain: 'bbc.co.uk', importance: 74, entities: ['European Union', 'OpenAI', 'Microsoft', 'Google'], keywords: ['eu ai office', 'brussels', 'enforcement', 'ai act', 'regulator'], summary: 'The European AI Office officially opens, tasked with monitoring compliance with the EU AI Act and investigating potential violations by frontier model providers.' },
  { title: 'Google Sunsets Bard — Rebrand to Gemini Completed Globally', domain: 'nytimes.com', importance: 58, entities: ['Google', 'Large Language Model', 'Artificial Intelligence'], keywords: ['bard', 'gemini', 'rebrand', 'google ai', 'chatbot'], summary: 'Google completes the global rebranding of Bard to Gemini across all platforms and regions, consolidating its AI assistant offerings under a single identity.' },
  { title: 'Microsoft GitHub Copilot Adds Support for GPT-4o and Claude 3', domain: 'bbc.co.uk', importance: 63, entities: ['Microsoft', 'OpenAI', 'Artificial Intelligence', 'TypeScript'], keywords: ['github copilot', 'gpt-4o', 'claude', 'model choice', 'coding'], summary: 'GitHub Copilot now allows users to choose between GPT-4o, Claude 3 Sonnet, and Gemini 1.5 Pro as the underlying model for code assistance tasks.' },
  { title: 'OpenAI Introduces Structured Outputs for Reliable JSON Generation', domain: 'techcrunch.com', importance: 61, entities: ['OpenAI', 'Large Language Model', 'Artificial Intelligence'], keywords: ['structured outputs', 'json', 'api', 'reliability', 'openai'], summary: 'OpenAI releases Structured Outputs, guaranteeing that API responses conform to a provided JSON schema with 100% reliability, eliminating parsing errors.' },
  { title: 'Apple Intelligence Writing Tools Land in macOS Sequoia', domain: 'nytimes.com', importance: 60, entities: ['Apple', 'Tim Cook', 'Artificial Intelligence'], keywords: ['apple intelligence', 'writing tools', 'macos', 'sequoia', 'on-device'], summary: 'macOS Sequoia ships with Apple Intelligence writing tools that rewrite, proofread, and summarize text natively without sending data to external servers.' },
  { title: 'Perplexity AI Raises $500M at $9B Valuation', domain: 'bbc.co.uk', importance: 71, entities: ['Artificial Intelligence', 'Venture Capital', 'Silicon Valley', 'Large Language Model'], keywords: ['perplexity', 'funding', 'valuation', 'search', 'ai'], summary: 'Perplexity AI secures $500 million in funding at a $9 billion valuation, with investors betting on AI-native search displacing traditional keyword engines.' },
  { title: 'China Unveils Homegrown 7nm AI Chip Competing with H100', domain: 'techcrunch.com', importance: 83, entities: ['China', 'NVIDIA', 'Artificial Intelligence'], keywords: ['china', 'ai chip', '7nm', 'huawei', 'ascend'], summary: 'A Chinese technology firm releases a domestically developed 7nm AI accelerator, claiming comparable inference performance to NVIDIA H100 for certain workloads.' },
  { title: 'Microsoft Bing Gains 100M Daily Active Users With AI Chat', domain: 'nytimes.com', importance: 62, entities: ['Microsoft', 'Satya Nadella', 'Artificial Intelligence', 'OpenAI'], keywords: ['bing', 'dau', 'search', 'ai chat', 'market share'], summary: 'Microsoft reports Bing has reached 100 million daily active users for the first time, driven by the AI chat integration powered by GPT-4.' },
  { title: 'OpenAI Realtime API Enables Sub-Second Voice AI Applications', domain: 'techcrunch.com', importance: 76, entities: ['OpenAI', 'ChatGPT', 'Artificial Intelligence'], keywords: ['realtime api', 'voice', 'latency', 'streaming', 'openai'], summary: 'OpenAI launches the Realtime API with WebSocket streaming, enabling developers to build voice applications with under 300ms latency in their own products.' },
  { title: 'Tesla Optimus Robot Learns Folding Laundry Through Imitation', domain: 'nytimes.com', importance: 65, entities: ['Tesla', 'Elon Musk', 'Artificial Intelligence'], keywords: ['optimus', 'robot', 'learning', 'imitation', 'dexterous'], summary: 'Tesla demonstrates Optimus performing household tasks including laundry folding learned through human demonstration data, marking a milestone in general robotics.' },
  { title: 'Mistral Releases Mixtral 8x22B Mixture-of-Experts Model', domain: 'techcrunch.com', importance: 69, entities: ['Artificial Intelligence', 'Large Language Model', 'European Union'], keywords: ['mistral', 'mixtral', 'moe', 'open weights', 'european ai'], summary: 'Paris-based Mistral AI releases Mixtral 8x22B, a mixture-of-experts model that matches GPT-4 on many benchmarks while remaining fully open-weights.' },
  { title: 'Meta AI Releases Llama 3.1 with 405B Parameter Model', domain: 'bbc.co.uk', importance: 85, entities: ['Meta', 'Large Language Model', 'Artificial Intelligence'], keywords: ['llama 3.1', '405b', 'meta', 'flagship', 'open source'], summary: 'Meta releases Llama 3.1 405B, the largest open-source model released by a major company, claiming competitive performance with GPT-4 and Claude 3.5.' },
  { title: 'Anthropic Claude 3.5 Sonnet Sets New Coding Benchmark Record', domain: 'nytimes.com', importance: 81, entities: ['Artificial Intelligence', 'Large Language Model', 'OpenAI'], keywords: ['claude 3.5', 'sonnet', 'swe-bench', 'coding', 'benchmark'], summary: 'Anthropic\'s Claude 3.5 Sonnet achieves 49% on the SWE-bench coding benchmark, surpassing all publicly available models on autonomous software engineering tasks.' },
  { title: 'NVIDIA Announces Partnership with SoftBank for Japan AI Data Centers', domain: 'techcrunch.com', importance: 70, entities: ['NVIDIA', 'Jensen Huang', 'Artificial Intelligence', 'Venture Capital'], keywords: ['nvidia', 'softbank', 'japan', 'data center', 'ai infrastructure'], summary: 'NVIDIA and SoftBank announce a joint initiative to build AI data centers across Japan, targeting a $10 billion investment over five years.' },
  { title: 'Rust 2024 Edition Released with Improved Async Ergonomics', domain: 'nytimes.com', importance: 49, entities: ['Rust'], keywords: ['rust 2024', 'edition', 'async', 'ergonomics', 'release'], summary: 'The Rust 2024 Edition ships with streamlined async trait syntax, improved lifetime capture rules, and quality-of-life changes for systems developers.' },
  { title: 'Google Gemini Becomes Default Assistant on Android 15', domain: 'bbc.co.uk', importance: 72, entities: ['Google', 'Artificial Intelligence', 'Large Language Model'], keywords: ['gemini', 'android 15', 'assistant', 'default', 'google'], summary: 'Android 15 replaces Google Assistant with Gemini as the default AI assistant across eligible devices, signaling a shift in Google\'s assistant strategy.' },
  { title: 'EU Issues First AI Act Compliance Deadline for General-Purpose Models', domain: 'nytimes.com', importance: 78, entities: ['European Union', 'OpenAI', 'Google', 'Meta', 'Microsoft'], keywords: ['eu ai act', 'gpai', 'compliance', 'deadline', 'transparency'], summary: 'The first EU AI Act compliance deadline arrives for general-purpose AI model providers, requiring documentation of training data, capabilities, and safety evaluations.' },
  { title: 'Elon Musk Launches xAI Colossus Supercomputer With 100K GPUs', domain: 'techcrunch.com', importance: 80, entities: ['Elon Musk', 'NVIDIA', 'Artificial Intelligence'], keywords: ['colossus', 'xai', 'supercomputer', 'h100', 'training'], summary: 'Elon Musk\'s xAI brings online the Colossus supercomputer in Memphis, consisting of 100,000 NVIDIA H100 GPUs to train its next-generation Grok models.' },
  { title: 'Microsoft Acquires Inflection AI Talent in $650M Deal', domain: 'bbc.co.uk', importance: 67, entities: ['Microsoft', 'Satya Nadella', 'Artificial Intelligence', 'Large Language Model'], keywords: ['inflection', 'microsoft', 'acquisition', 'talent', 'pi'], summary: 'Microsoft acquires key talent and IP from Inflection AI in a $650 million licensing deal, strengthening its Azure AI research capabilities.' },
  { title: 'Google Project Astra Demonstrates Real-Time World Reasoning', domain: 'techcrunch.com', importance: 82, entities: ['Google', 'Artificial Intelligence', 'Large Language Model'], keywords: ['project astra', 'google', 'real-time', 'vision', 'agent'], summary: 'Google\'s Project Astra prototype demonstrates persistent memory and real-time spatial reasoning across camera frames, pointing toward an always-on AI assistant.' },
  { title: 'Washington DC Passes Algorithmic Accountability Act', domain: 'nytimes.com', importance: 73, entities: ['Washington DC', 'Artificial Intelligence', 'Microsoft', 'Meta'], keywords: ['algorithmic accountability', 'act', 'congress', 'bias', 'audit'], summary: 'US Congress passes the Algorithmic Accountability Act requiring impact assessments for automated decision systems affecting hiring, credit, and housing.' },
  { title: 'Japan Invests $7B in Domestic Semiconductor Fabrication', domain: 'bbc.co.uk', importance: 72, entities: ['Artificial Intelligence', 'China'], keywords: ['japan', 'semiconductor', 'tsmc', 'subsidies', 'fabrication'], summary: 'Japan announces a $7 billion government investment in domestic semiconductor production, attracting TSMC and Samsung to build advanced fabrication facilities.' },
  { title: 'OpenAI GPT-4 Vision API Hits 1M Monthly Active Developers', domain: 'techcrunch.com', importance: 64, entities: ['OpenAI', 'Sam Altman', 'Artificial Intelligence'], keywords: ['gpt-4v', 'vision', 'developers', 'api', 'multimodal'], summary: 'OpenAI\'s GPT-4 Vision API surpasses one million monthly active developers as companies build medical imaging, visual QA, and accessibility applications.' },
  { title: 'Silicon Valley VCs Deploy Record $25B in Q3 AI Investments', domain: 'bbc.co.uk', importance: 66, entities: ['Venture Capital', 'Silicon Valley', 'Artificial Intelligence', 'OpenAI'], keywords: ['vc', 'q3', 'investment', 'silicon valley', 'ai startups'], summary: 'Venture capital investment in AI startups hit a record $25 billion in Q3 2024, with infrastructure, developer tools, and applied AI attracting the largest rounds.' },
  { title: 'Google Cloud TPU v5e Now Available for Production Workloads', domain: 'nytimes.com', importance: 59, entities: ['Google', 'Artificial Intelligence', 'Large Language Model'], keywords: ['tpu', 'v5e', 'google cloud', 'training', 'cost'], summary: 'Google makes TPU v5e generally available, offering a cost-effective training and inference option for medium-scale ML workloads on Google Cloud.' },
  { title: 'Kubernetes vCluster 1.0 Enables Full Cluster Virtualization', domain: 'techcrunch.com', importance: 46, entities: ['Kubernetes'], keywords: ['vcluster', 'kubernetes', 'virtualization', 'multi-tenancy', 'platform'], summary: 'Loft Labs releases vCluster 1.0, enabling teams to run fully isolated virtual Kubernetes clusters inside a single physical cluster for cost-efficient multi-tenancy.' },
  { title: 'Apple Vision Pro Apps Catalog Reaches 2,500 Titles', domain: 'bbc.co.uk', importance: 48, entities: ['Apple', 'Tim Cook'], keywords: ['vision pro', 'visionos', 'apps', 'spatial', 'developer'], summary: 'The visionOS App Store surpasses 2,500 native spatial computing applications six months after launch, though quality varies widely across categories.' },
  { title: 'TypeScript 5.6 Introduces Iterator Helper Methods', domain: 'nytimes.com', importance: 43, entities: ['TypeScript', 'Microsoft'], keywords: ['typescript', 'iterator', 'generators', 'ecmascript', 'release'], summary: 'TypeScript 5.6 adds support for the ES2025 Iterator Helpers proposal, enabling lazy operations like map, filter, and take directly on iterator objects.' },
  { title: 'San Francisco Recovers: Downtown Office Vacancy Falls Below 20%', domain: 'techcrunch.com', importance: 47, entities: ['San Francisco', 'Silicon Valley', 'Artificial Intelligence'], keywords: ['san francisco', 'office', 'vacancy', 'recovery', 'ai companies'], summary: 'San Francisco downtown office vacancy drops below 20% for the first time since 2020 as AI companies and startups expand their physical footprints.' },
  { title: 'Meta AI Releases Llama 3.2 with Multimodal Vision Capabilities', domain: 'bbc.co.uk', importance: 79, entities: ['Meta', 'Large Language Model', 'Artificial Intelligence'], keywords: ['llama 3.2', 'vision', 'multimodal', 'open source', 'meta'], summary: 'Meta releases Llama 3.2 with native image understanding capabilities, extending the open-source model family into multimodal territory for the first time.' },
  { title: 'OpenAI o3 Achieves Human-Level Performance on ARC-AGI Benchmark', domain: 'techcrunch.com', importance: 94, entities: ['OpenAI', 'Sam Altman', 'Artificial Intelligence', 'Large Language Model'], keywords: ['o3', 'arc-agi', 'agi', 'benchmark', 'reasoning'], summary: 'OpenAI\'s o3 model achieves 88% on the ARC-AGI benchmark — near human-level performance — raising renewed discussions about progress toward general AI.' },
  { title: 'Google Willow Quantum Chip Solves Problem in 5 Minutes vs 10 Septillion Years', domain: 'nytimes.com', importance: 91, entities: ['Google', 'Artificial Intelligence'], keywords: ['willow', 'quantum', 'chip', 'supremacy', 'error correction'], summary: 'Google announces the Willow quantum chip, which solved a benchmark computation in under 5 minutes that would take classical supercomputers 10 septillion years.' },
  { title: 'OpenAI Sora Video Generation Model Opens to ChatGPT Plus Users', domain: 'bbc.co.uk', importance: 86, entities: ['OpenAI', 'Sam Altman', 'ChatGPT', 'Artificial Intelligence'], keywords: ['sora', 'video generation', 'text-to-video', 'openai', 'creative'], summary: 'OpenAI launches Sora to ChatGPT Plus subscribers, enabling photorealistic video generation from text prompts up to 20 seconds at 1080p resolution.' },
] as const;

async function main() {
  console.log('Seeding demo data...');

  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      id: 'demo-user-001',
      tenantId: TENANT_ID,
      email: DEMO_EMAIL,
      passwordHash,
      displayName: 'Demo User',
      emailConfirmedAt: new Date(),
    },
  });

  console.log(`User: ${user.email}`);

  const feeds = await Promise.all(
    FEED_URLS.map((f) =>
      prisma.feed.upsert({
        where: { userId_canonicalUrl: { userId: user.id, canonicalUrl: f.url } },
        update: { status: 'ACTIVE', lastPolledAt: new Date() },
        create: {
          userId: user.id,
          url: f.url,
          canonicalUrl: f.url,
          title: f.title,
          siteUrl: `https://${f.domain}`,
          status: 'ACTIVE',
          lastPolledAt: new Date(Date.now() - 1_800_000),
        },
      }),
    ),
  );

  console.log(`Feeds: ${feeds.length}`);

  const entityMap = new Map<string, string>();
  for (const e of ENTITY_SEEDS) {
    const normalizedName = e.canonicalName.toLowerCase();
    const entity = await prisma.entity.upsert({
      where: { kind_normalizedName: { kind: e.kind as any, normalizedName } },
      update: {},
      create: {
        kind: e.kind as any,
        canonicalName: e.canonicalName,
        normalizedName,
        aliases: [...e.aliases],
        mentionCount: Math.floor(Math.random() * 80) + 5,
      },
    });
    entityMap.set(e.canonicalName, entity.id);
  }

  console.log(`Entities: ${entityMap.size}`);

  const categories = await Promise.all([
    prisma.userCategory.upsert({
      where: { userId_slug: { userId: user.id, slug: 'ai-ml' } },
      update: {},
      create: { userId: user.id, name: 'AI & ML', slug: 'ai-ml', color: '#3b82f6', sortOrder: 1 },
    }),
    prisma.userCategory.upsert({
      where: { userId_slug: { userId: user.id, slug: 'business' } },
      update: {},
      create: { userId: user.id, name: 'Business', slug: 'business', color: '#10b981', sortOrder: 2 },
    }),
    prisma.userCategory.upsert({
      where: { userId_slug: { userId: user.id, slug: 'policy' } },
      update: {},
      create: { userId: user.id, name: 'Policy & Regulation', slug: 'policy', color: '#f59e0b', sortOrder: 3 },
    }),
    prisma.userCategory.upsert({
      where: { userId_slug: { userId: user.id, slug: 'developer' } },
      update: {},
      create: { userId: user.id, name: 'Developer Tools', slug: 'developer', color: '#8b5cf6', sortOrder: 4 },
    }),
  ]);

  const DEFAULT_AXES = [
    { key: 'content_type', label: 'Тип контенту', values: ['Новина', 'Аналіз', 'Туторіал', 'Реліз', 'Думка'] },
    { key: 'reader_level', label: 'Рівень читача', values: ['Junior', 'Middle', 'Senior'] },
    { key: 'region',       label: 'Регіон',        values: ['UA', 'EU', 'US', 'Global'] },
    { key: 'tone',         label: 'Тональність',   values: ['Нейтральна', 'Промоційна', 'Критична'] },
  ];

  await Promise.all(
    DEFAULT_AXES.map((axis, i) =>
      prisma.categorizationAxis.upsert({
        where: { userId_key: { userId: user.id, key: axis.key } },
        update: {},
        create: {
          userId: user.id,
          key: axis.key,
          label: axis.label,
          isSystemDefault: true,
          sortOrder: i,
          values: {
            create: axis.values.map((v, j) => ({
              value: v.toLowerCase().replace(/\s/g, '_'),
              label: v,
              sortOrder: j,
            })),
          },
        },
      }),
    ),
  );

  console.log(`Axes: ${DEFAULT_AXES.length}`);

  const categoryIds = categories.map((c) => c.id);

  const articles: string[] = [];
  let articleIdx = 0;

  for (const tpl of ARTICLE_TEMPLATES) {
    const articleId = createId();
    const daysAgo = Math.floor(articleIdx * 0.5);
    const pubAt = new Date(Date.now() - daysAgo * 86_400_000 - Math.random() * 86_400_000);
    const feed = feeds[articleIdx % feeds.length]!;

    try {
      const article = await prisma.article.upsert({
        where: { canonicalUrl: `https://${tpl.domain}/article-${articleIdx + 1}` },
        update: {},
        create: {
          id: articleId,
          canonicalUrl: `https://${tpl.domain}/article-${articleIdx + 1}`,
          contentHash: createId(),
          title: tpl.title,
          publishedAt: pubAt,
          sourceDomain: tpl.domain,
          bodyText: tpl.summary + ' ' + tpl.summary,
          excerpt: tpl.summary.slice(0, 200),
          wordCount: tpl.summary.split(' ').length * 3,
          status: 'CLASSIFIED',
          language: 'en',
        },
      });

      await prisma.feedArticle.upsert({
        where: { feedId_articleId: { feedId: feed.id, articleId: article.id } },
        update: {},
        create: { feedId: feed.id, articleId: article.id, userId: user.id },
      });

      const cats = categoryIds.slice(0, tpl.importance >= 70 ? 2 : 1);

      await prisma.articleClassification.upsert({
        where: { userId_articleId_promptVersion: { userId: user.id, articleId: article.id, promptVersion: 'v1' } },
        update: {},
        create: {
          userId: user.id,
          articleId: article.id,
          importance: tpl.importance,
          summary: tpl.summary,
          summaryTldr: tpl.summary.slice(0, 120),
          keywords: [...tpl.keywords],
          categoryIds: cats,
          model: 'claude-haiku-4-5',
          promptVersion: 'v1',
          axisValues: {
            content_type: tpl.importance >= 70 ? 'новина' : 'аналіз',
            reader_level: tpl.importance >= 80 ? 'senior' : tpl.importance >= 60 ? 'middle' : 'junior',
            region: 'global',
            tone: 'нейтральна',
          },
        },
      });

      const articleEntityIds: string[] = [];
      for (const entityName of tpl.entities) {
        const entityId = entityMap.get(entityName);
        if (!entityId) continue;
        await prisma.articleEntity.upsert({
          where: { articleId_entityId: { articleId: article.id, entityId } },
          update: {},
          create: { articleId: article.id, entityId, mentionCount: Math.floor(Math.random() * 4) + 1 },
        });
        articleEntityIds.push(entityId);
      }

      // Upsert co-mention pairs for all entities in this article
      for (let i = 0; i < articleEntityIds.length; i++) {
        for (let j = i + 1; j < articleEntityIds.length; j++) {
          const sorted = [articleEntityIds[i]!, articleEntityIds[j]!].sort();
          const a = sorted[0] as string;
          const b = sorted[1] as string;
          await prisma.entityCoMention.upsert({
            where: { entityAId_entityBId: { entityAId: a, entityBId: b } },
            update: { weight: { increment: 1 } },
            create: { entityAId: a, entityBId: b, weight: 1 },
          });
        }
      }

      articles.push(article.id);
    } catch {
      // skip if article already exists with different data
    }

    articleIdx++;
  }

  console.log(`Articles: ${articles.length}`);

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 7);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date();
  periodEnd.setHours(23, 59, 59, 999);

  const existingDigest = await prisma.digest.findFirst({ where: { userId: user.id, period: 'WEEK' } });
  if (!existingDigest && articles.length >= 5) {
    const digest = await prisma.digest.create({
      data: {
        userId: user.id,
        period: 'WEEK',
        periodStart,
        periodEnd,
        title: 'Weekly Intelligence Digest: AI Dominates Tech News',
        summary: 'This week saw major AI announcements from OpenAI, Google, and Meta, while regulatory pressure from the EU and US Congress intensifies. NVIDIA continues its hardware dominance as AI chip demand shows no signs of slowing.',
        bodyMarkdown: `# Weekly Intelligence Digest\n\n## Key Themes\n\n- **AI Model Race**: OpenAI, Google, and Meta all shipped major updates to their foundation models\n- **Regulatory Pressure**: EU AI Act enforcement began; US Congress advances bipartisan AI governance bill\n- **Hardware Demand**: NVIDIA reports record revenue; Blackwell architecture unveiled\n\n## Top Stories\n\nSee ranked article list below.`,
        articleCount: Math.min(articles.length, 10),
        items: {
          create: articles.slice(0, 10).map((id, i) => ({
            articleId: id,
            rank: i + 1,
            reason: i === 0 ? 'Highest impact AI announcement this week' : null,
          })),
        },
      },
    });
    console.log(`Weekly digest: ${digest.id}`);
  }

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);

  const existingDayDigest = await prisma.digest.findFirst({ where: { userId: user.id, period: 'DAY' } });
  if (!existingDayDigest && articles.length >= 5) {
    const digest = await prisma.digest.create({
      data: {
        userId: user.id,
        period: 'DAY',
        periodStart: dayStart,
        periodEnd: dayEnd,
        title: "Today's Intelligence Brief: NVIDIA and OpenAI Lead the Headlines",
        summary: 'NVIDIA announces Blackwell architecture while OpenAI continues its rapid product cadence with new model releases. Regulatory storylines in both the US and EU heat up.',
        articleCount: 5,
        items: {
          create: articles.slice(0, 5).map((id, i) => ({
            articleId: id,
            rank: i + 1,
          })),
        },
      },
    });
    console.log(`Daily digest: ${digest.id}`);
  }

  console.log('\nDemo seed complete!');
  console.log(`  Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
