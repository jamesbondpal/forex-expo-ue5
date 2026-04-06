const KNOWLEDGE_BASE = {
  pepperstone: {
    agentName: 'Aria',
    topics: {
      spreads: {
        keywords: ['spread', 'pip', 'cost', 'commission', 'fee', 'pricing', 'raw'],
        response: 'Pepperstone offers two account types: **Razor Account** with raw spreads from 0.0 pips on EUR/USD plus $3.50 commission per side per lot, and the **Standard Account** from 1.0 pip with zero commission. Our average EUR/USD spread on Razor is just 0.09 pips during London/NY sessions. For high-volume traders (50+ lots/month), we offer custom pricing — I can arrange a call to discuss.',
        suggestedActions: ['Compare Razor vs Standard', 'See live spreads', 'Book a demo']
      },
      leverage: {
        keywords: ['leverage', 'margin', 'ratio', '1:500', '1:200', '1:30'],
        response: 'Leverage with Pepperstone depends on your regulatory jurisdiction. **DFSA (Dubai):** up to 1:200 for major FX pairs. **Professional clients (ASIC/FCA):** up to 1:500. **Retail (ASIC/FCA):** up to 1:30 as per regulation. Margin requirements adjust dynamically based on position size — larger positions may have reduced leverage.',
        suggestedActions: ['Check my eligibility', 'Pro account application', 'Book a call']
      },
      accounts: {
        keywords: ['account', 'open', 'register', 'sign up', 'minimum', 'deposit requirement', 'type'],
        response: 'Opening a Pepperstone account is quick — typically under 5 minutes. **Minimum deposit: $200.** We offer Standard and Razor account types, plus swap-free Islamic accounts. You\'ll need a valid ID and proof of address. For DFSA-regulated accounts in Dubai, we offer local bank transfers in AED.',
        suggestedActions: ['Open account now', 'Compare account types', 'Book a demo']
      },
      platforms: {
        keywords: ['platform', 'mt4', 'mt5', 'metatrader', 'ctrader', 'tradingview', 'software', 'app'],
        response: 'Pepperstone offers **5 trading platforms:** MetaTrader 4, MetaTrader 5, cTrader, TradingView, and Capitalise.ai. MT5 is our most popular — it supports 21 timeframes, built-in economic calendar, and depth of market. cTrader excels for algorithmic traders with cAlgo. TradingView integration gives you charting + execution in one place.',
        suggestedActions: ['Try MT5 demo', 'See cTrader features', 'TradingView setup']
      },
      regulation: {
        keywords: ['regulat', 'license', 'safe', 'trust', 'asic', 'fca', 'dfsa', 'legal', 'protect'],
        response: 'Pepperstone is regulated by **6 top-tier authorities:** ASIC (Australia), FCA (UK), DFSA (Dubai/DIFC), CySEC (Cyprus), SCB (Bahamas), and CMA (Kenya). Client funds are held in segregated accounts at top-tier banks. We\'ve been operating since 2010 with zero fund safety incidents.',
        suggestedActions: ['View all licenses', 'DFSA account details', 'Book a meeting']
      },
      'copy-trading': {
        keywords: ['copy', 'social', 'follow', 'mirror', 'signal', 'dupli', 'myfxbook'],
        response: 'Pepperstone supports **3 copy trading platforms:** cTrader Copy (built into cTrader), Myfxbook AutoTrade (integrates with MT4/MT5), and DupliTrade (premium signal providers). cTrader Copy has zero additional fees — you just pay normal spreads. Over 50,000 strategy providers to choose from across all platforms.',
        suggestedActions: ['Setup cTrader Copy', 'Browse strategies', 'Book a demo']
      },
      affiliates: {
        keywords: ['affiliate', 'ib', 'partner', 'referral', 'introducing', 'rebate'],
        response: 'Our **IB/Affiliate programme** offers competitive CPA and revenue-share models. You get a dedicated partner manager, real-time reporting dashboard, marketing materials, and multi-tier sub-IB support. Payouts are monthly with no cap. We also offer custom landing pages for high-volume partners.',
        suggestedActions: ['IB programme details', 'Partner portal demo', 'Book a call']
      },
      withdrawal: {
        keywords: ['withdraw', 'payout', 'transfer out', 'cash out'],
        response: 'Pepperstone processes withdrawals within **1 business day** for most methods. Options: bank wire (1-3 days), card refund (3-5 days), PayPal/Skrill/Neteller (same day). No withdrawal fees from Pepperstone — your bank may charge receiving fees for wires. Minimum withdrawal: $100.',
        suggestedActions: ['Withdrawal methods', 'Open account', 'Book a meeting']
      },
      deposit: {
        keywords: ['deposit', 'fund', 'payment', 'card', 'bank', 'skrill', 'neteller', 'paypal'],
        response: 'Minimum deposit is **$200**. Methods: Visa/Mastercard (instant), bank wire (1-2 days), POLi, PayPal, Skrill, Neteller (all instant). For Dubai clients, we accept local bank transfers in AED. No deposit fees from Pepperstone.',
        suggestedActions: ['Deposit methods', 'Open account', 'Book a demo']
      },
      crypto: {
        keywords: ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'cryptocurrency', 'digital'],
        response: 'Trade **crypto CFDs** with Pepperstone — Bitcoin, Ethereum, Litecoin, Ripple, and more. Available 24/7 with leverage up to 1:2 (retail) or 1:5 (pro). No crypto wallet needed — it\'s all CFD-based. Spreads from $30 on BTC/USD.',
        suggestedActions: ['View crypto pairs', 'See crypto spreads', 'Open account']
      },
      indices: {
        keywords: ['index', 'indices', 's&p', 'nasdaq', 'dow', 'dax', 'ftse', 'stock market'],
        response: 'Pepperstone offers **14 major indices** as CFDs: US500 (S&P), US30 (Dow), NAS100, UK100, GER40, JPN225, AUS200, and more. Trade with spreads from 0.4 points on US500. Available virtually 24/5 with no commissions on Standard accounts.',
        suggestedActions: ['View index spreads', 'MT5 demo', 'Book a meeting']
      },
      'islamic-account': {
        keywords: ['islamic', 'swap-free', 'shariah', 'halal', 'interest-free', 'no swap'],
        response: 'Yes, Pepperstone offers **swap-free Islamic accounts** compliant with Shariah principles. No overnight interest charges — instead, a flat admin fee applies after a holding period. Available on both Standard and Razor account types, across MT4, MT5, and cTrader.',
        suggestedActions: ['Open Islamic account', 'Fee structure', 'Book a call']
      },
      vps: {
        keywords: ['vps', 'virtual server', 'hosting', 'always on', 'uptime'],
        response: 'Pepperstone provides a **free VPS** for active traders who execute 10+ standard lots per month. Located in New York data center for ultra-low latency. Runs 24/7 — perfect for EAs and algorithmic strategies. If you don\'t qualify for free, discounted plans start from $25/month.',
        suggestedActions: ['VPS requirements', 'Setup guide', 'Book a demo']
      },
      'api-trading': {
        keywords: ['api', 'algo', 'algorithmic', 'automat', 'fix protocol', 'program', 'bot', 'ea', 'expert advisor'],
        response: 'Pepperstone fully supports algorithmic trading. **MT4/MT5:** use MQL4/MQL5 for Expert Advisors. **cTrader:** use cAlgo with C#. **TradingView:** Pine Script alerts trigger orders. **Capitalise.ai:** code-free automation with natural language. We also support FIX API for institutional-grade connectivity.',
        suggestedActions: ['EA setup guide', 'cAlgo tutorial', 'FIX API docs']
      }
    }
  },
  capital: {
    agentName: 'Max',
    topics: {
      spreads: {
        keywords: ['spread', 'pip', 'cost', 'commission', 'fee', 'pricing'],
        response: 'Capital.com offers spreads from **0.6 pips on EUR/USD** with zero commission on all instruments. No hidden fees — what you see is what you get. Our pricing is competitive across all 3,000+ markets, and we never requote.',
        suggestedActions: ['View live spreads', 'Compare instruments', 'Open account']
      },
      leverage: {
        keywords: ['leverage', 'margin', 'ratio'],
        response: 'Leverage at Capital.com: **Professional clients:** up to 1:500. **Retail clients:** up to 1:30 (FCA/CySEC/ASIC regulation). We also waive overnight fees on select instruments — check the platform for current eligible markets.',
        suggestedActions: ['Pro account info', 'Margin calculator', 'Book a call']
      },
      accounts: {
        keywords: ['account', 'open', 'register', 'sign up', 'minimum', 'type'],
        response: 'Open a Capital.com account in under 3 minutes — **minimum deposit just $20.** We offer Standard, Plus, and Premier account tiers with escalating benefits. All accounts get access to our AI-powered platform with bias detection. No account maintenance fees ever.',
        suggestedActions: ['Open account', 'Compare tiers', 'Book a demo']
      },
      platforms: {
        keywords: ['platform', 'mt4', 'app', 'web', 'tradingview', 'software'],
        response: 'Capital.com offers our **proprietary web and mobile platform** with AI-powered insights, plus MetaTrader 4 integration. Our platform features an AI bias detector that warns you when emotional patterns might affect your trading decisions. We also integrate directly with TradingView for charting and execution.',
        suggestedActions: ['Try web platform', 'Download mobile app', 'MT4 setup']
      },
      regulation: {
        keywords: ['regulat', 'license', 'safe', 'trust', 'fca', 'cysec', 'asic', 'legal'],
        response: 'Capital.com is regulated by **FCA (UK), CySEC (Cyprus), ASIC (Australia), NBRB (Belarus), and FSA (Seychelles).** Client funds are segregated and held in top-tier banks. Negative balance protection on all retail accounts — you\'ll never owe more than your deposit.',
        suggestedActions: ['View licenses', 'Fund safety info', 'Book a meeting']
      },
      'copy-trading': {
        keywords: ['copy', 'social', 'follow', 'mirror'],
        response: 'While Capital.com doesn\'t have a built-in copy trading feature, you can integrate with TradingView signals and use third-party copy solutions via our MT4 platform. Our AI-powered platform helps you learn to trade independently with real-time educational insights.',
        suggestedActions: ['AI features tour', 'TradingView integration', 'Book a demo']
      },
      affiliates: {
        keywords: ['affiliate', 'ib', 'partner', 'referral'],
        response: 'Capital.com runs a competitive **partner programme** with CPA and revenue-share models. Dedicated account managers, comprehensive marketing toolkit, real-time analytics, and fast monthly payouts. We\'re one of the fastest-growing platforms — more traffic means more conversions for you.',
        suggestedActions: ['Partner programme', 'Apply now', 'Book a call']
      },
      withdrawal: {
        keywords: ['withdraw', 'payout', 'cash out'],
        response: 'Capital.com withdrawals are processed within **1 business day.** Supported methods: bank wire, Visa/Mastercard refund, Apple Pay, and e-wallets. Zero withdrawal fees from our side. Minimum withdrawal depends on your payment method.',
        suggestedActions: ['Withdrawal info', 'Open account', 'Book a meeting']
      },
      deposit: {
        keywords: ['deposit', 'fund', 'payment', 'card'],
        response: 'Minimum deposit is just **$20** — one of the lowest in the industry. Methods: Visa/Mastercard (instant), bank wire (1-3 days), Apple Pay (instant), and various e-wallets. All deposits are fee-free from Capital.com.',
        suggestedActions: ['Deposit now', 'Payment methods', 'Open account']
      },
      crypto: {
        keywords: ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'cryptocurrency'],
        response: 'Trade **200+ crypto CFDs** on Capital.com — Bitcoin, Ethereum, Solana, Cardano, Dogecoin, and many more. Available 24/7 with leverage up to 1:2. Our AI platform provides unique crypto market insights and trend analysis. Spreads from $34 on BTC/USD.',
        suggestedActions: ['View crypto markets', 'AI crypto analysis', 'Open account']
      },
      indices: {
        keywords: ['index', 'indices', 's&p', 'nasdaq', 'dow', 'stock'],
        response: 'Capital.com offers **major global indices** as CFDs plus **real stocks** with zero commission for UK/EU clients. Over 3,000 instruments total across forex, stocks, indices, commodities, and crypto. Our proprietary platform gives AI-powered insights on every market.',
        suggestedActions: ['View stocks', 'Real stocks info', 'Download app']
      },
      'islamic-account': {
        keywords: ['islamic', 'swap-free', 'shariah', 'halal'],
        response: 'Yes, Capital.com offers **swap-free Islamic accounts.** Trade without interest charges on overnight positions. Available on all instruments including forex, stocks, indices, commodities, and crypto CFDs. Apply through your account settings after registration.',
        suggestedActions: ['Islamic account setup', 'Open account', 'Book a call']
      },
      vps: {
        keywords: ['vps', 'virtual server', 'hosting'],
        response: 'Capital.com focuses on our proprietary cloud-based platform which requires no VPS — everything runs in your browser or mobile app with institutional-grade infrastructure. For MT4 EA users, we can recommend trusted VPS partners at discounted rates.',
        suggestedActions: ['Platform tour', 'MT4 info', 'Book a demo']
      },
      'api-trading': {
        keywords: ['api', 'algo', 'algorithmic', 'automat', 'bot'],
        response: 'Capital.com offers **API access** for algorithmic trading through our platform, and full EA support via MetaTrader 4. Our proprietary platform also integrates with TradingView for Pine Script-based automation. Contact our team for institutional API access.',
        suggestedActions: ['API documentation', 'MT4 EA setup', 'Book a call']
      },
      ai: {
        keywords: ['ai', 'artificial intelligence', 'bias', 'emotion', 'smart', 'intelligent'],
        response: 'Capital.com\'s **proprietary AI technology** is our unique edge. The system analyses your trading patterns in real-time and warns you when emotional biases — like loss aversion, overconfidence, or anchoring — might be affecting your decisions. It\'s like having a personal trading psychologist built into the platform. Over 80% of users report improved discipline.',
        suggestedActions: ['AI features demo', 'Try the platform', 'Book a meeting']
      }
    }
  },
  basemarkets: {
    agentName: 'Nova',
    topics: {
      spreads: {
        keywords: ['spread', 'pip', 'cost', 'commission', 'fee', 'pricing', 'raw', 'ecn'],
        response: 'Base Markets offers **raw institutional spreads from 0.0 pips** via true ECN/STP execution. No dealing desk intervention — your orders go directly to our liquidity providers. Commission varies by account tier, starting from $3 per side per lot. High-volume traders receive custom pricing.',
        suggestedActions: ['View spread comparison', 'Account tiers', 'Book a call']
      },
      leverage: {
        keywords: ['leverage', 'margin', 'ratio'],
        response: 'Base Markets offers leverage up to **1:500** with flexible settings per instrument. Major FX pairs up to 1:500, minors 1:200, metals 1:200, crypto 1:5. You can adjust leverage per-account through our portal or request custom leverage for institutional volumes.',
        suggestedActions: ['Leverage calculator', 'Open account', 'Book a meeting']
      },
      accounts: {
        keywords: ['account', 'open', 'register', 'sign up', 'minimum', 'type'],
        response: 'Base Markets offers **ECN Standard** (from $100 deposit) and **ECN Pro** (from $1,000 deposit) accounts. Pro accounts get tighter spreads and reduced commissions. Account opening takes under 10 minutes with electronic verification. Both account types feature true ECN/STP execution with no dealing desk.',
        suggestedActions: ['Open ECN account', 'Compare accounts', 'Book a demo']
      },
      platforms: {
        keywords: ['platform', 'mt4', 'mt5', 'metatrader', 'software', 'app'],
        response: 'Base Markets supports **MetaTrader 4 and MetaTrader 5** on desktop, web, and mobile. For institutional and algorithmic traders, we offer **FIX protocol connectivity** and a **REST API** for custom integrations. Our MT5 servers are hosted in Equinix data centers for ultra-low latency.',
        suggestedActions: ['Download MT5', 'API documentation', 'Book a demo']
      },
      regulation: {
        keywords: ['regulat', 'license', 'safe', 'trust', 'legal', 'protect'],
        response: 'Base Markets operates under strict regulatory oversight with client fund segregation at top-tier banks. We maintain the highest standards of transparency — no conflicts of interest due to our pure ECN/STP model. Contact us for specific regulatory details for your jurisdiction.',
        suggestedActions: ['Regulatory info', 'Fund safety', 'Book a meeting']
      },
      'copy-trading': {
        keywords: ['copy', 'social', 'follow', 'mirror', 'signal'],
        response: 'Base Markets supports copy trading through **MT4/MT5 signal subscription** and third-party providers like Myfxbook AutoTrade. Our ECN/STP execution ensures that copied trades get the same institutional-grade fills as the master account. No additional markup on copy trades.',
        suggestedActions: ['Signal setup guide', 'Copy trading info', 'Book a demo']
      },
      affiliates: {
        keywords: ['affiliate', 'ib', 'partner', 'referral', 'introducing', 'rebate'],
        response: 'Base Markets\' **IB programme** features a tiered rebate structure with industry-leading payouts. Benefits include: dedicated IB portal with real-time reporting, custom tracking links, multi-level sub-IB management, marketing support, and monthly payouts with no caps. We also offer white-label solutions for established IBs.',
        suggestedActions: ['IB programme details', 'Apply as IB', 'Book a call']
      },
      withdrawal: {
        keywords: ['withdraw', 'payout', 'cash out'],
        response: 'Base Markets processes withdrawals within **24 hours** on business days. Methods include bank wire, Visa/Mastercard, Skrill, Neteller, and cryptocurrency (USDT). No withdrawal fees from Base Markets — third-party fees may apply for bank wires.',
        suggestedActions: ['Withdrawal methods', 'Open account', 'Book a meeting']
      },
      deposit: {
        keywords: ['deposit', 'fund', 'payment', 'card'],
        response: 'Minimum deposit: **$100** for ECN Standard, $1,000 for ECN Pro. Deposit methods: Visa/Mastercard (instant), bank wire (1-2 days), Skrill/Neteller (instant), and cryptocurrency USDT (within 30 minutes). All deposits are processed fee-free.',
        suggestedActions: ['Deposit methods', 'Open account', 'Book a demo']
      },
      crypto: {
        keywords: ['crypto', 'bitcoin', 'btc', 'ethereum', 'eth', 'cryptocurrency'],
        response: 'Trade **major crypto CFDs** with Base Markets — Bitcoin, Ethereum, Litecoin, Ripple, and more. Available 24/7 with ECN/STP execution. We also accept cryptocurrency deposits (USDT) for funding your trading account. Leverage up to 1:5 on crypto pairs.',
        suggestedActions: ['Crypto pairs list', 'Crypto deposit info', 'Open account']
      },
      indices: {
        keywords: ['index', 'indices', 's&p', 'nasdaq', 'stock'],
        response: 'Base Markets offers CFDs on **major global indices** including S&P 500, NASDAQ 100, Dow Jones, DAX, FTSE 100, Nikkei 225, and more. All executed via our ECN/STP model with competitive spreads and no dealing desk intervention.',
        suggestedActions: ['Index spreads', 'Open account', 'Book a meeting']
      },
      'islamic-account': {
        keywords: ['islamic', 'swap-free', 'shariah', 'halal'],
        response: 'Base Markets offers **swap-free Islamic accounts** compliant with Shariah principles. Available on both ECN Standard and ECN Pro account types. No interest charges on overnight positions — a flat admin fee may apply after an extended holding period. Request via your client portal.',
        suggestedActions: ['Islamic account setup', 'Open account', 'Book a call']
      },
      vps: {
        keywords: ['vps', 'virtual server', 'hosting'],
        response: 'Base Markets offers discounted VPS hosting through our technology partners. Servers located in the same Equinix data centers as our trading infrastructure — achieving sub-1ms execution latency. Free VPS available for clients trading 20+ lots per month.',
        suggestedActions: ['VPS pricing', 'Data center info', 'Book a demo']
      },
      'api-trading': {
        keywords: ['api', 'algo', 'algorithmic', 'automat', 'fix', 'program', 'bot', 'ea'],
        response: 'Base Markets is built for algorithmic traders. We offer **FIX protocol 4.4** for institutional-grade connectivity, a **REST API** for account management and execution, and full MT4/MT5 EA support. Our Equinix-hosted servers provide sub-millisecond execution. Co-location available for HFT clients.',
        suggestedActions: ['FIX API docs', 'REST API guide', 'Book a technical call']
      }
    }
  }
};

const FALLBACK_RESPONSES = [
  "That's a great question! I'd love to give you a detailed answer. Could I connect you with our specialist? You can book a meeting right now and we'll have all the details ready for you.",
  "I want to make sure I give you the most accurate information on that. Let me suggest booking a quick meeting with our team — they can walk you through everything in detail.",
  "Great question! For the most up-to-date details on that, I'd recommend a quick chat with our account team. Would you like to book a meeting?"
];

export function generateAiResponse({ brokerId, message }) {
  const broker = KNOWLEDGE_BASE[brokerId];
  if (!broker) {
    return {
      reply: "I'm sorry, I couldn't find information for that broker. Please try visiting one of our exhibitor booths.",
      agentName: 'Expo Assistant',
      suggestedActions: ['View all brokers', 'Visit main hall'],
      delay: 300
    };
  }

  const lowerMessage = message.toLowerCase();
  const tokens = lowerMessage.split(/\s+/);

  // Score each topic by keyword matches
  let bestMatch = null;
  let bestScore = 0;

  for (const [, topicData] of Object.entries(broker.topics)) {
    let score = 0;
    for (const keyword of topicData.keywords) {
      // Check for partial match in full message
      if (lowerMessage.includes(keyword)) {
        score += 2;
      }
      // Check for token match
      if (tokens.some(t => t.includes(keyword))) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = topicData;
    }
  }

  // Greeting detection
  const greetingWords = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'salaam', 'marhaba'];
  const isGreeting = greetingWords.some(g => lowerMessage.includes(g));

  if (isGreeting && bestScore < 2) {
    return {
      reply: `Hello! Welcome to the Forex Expo Dubai! I'm ${broker.agentName}, your AI assistant. I can help you with information about spreads, leverage, platforms, accounts, regulation, copy trading, and much more. What would you like to know?`,
      agentName: broker.agentName,
      suggestedActions: ['Tell me about spreads', 'What platforms do you offer?', 'How do I open an account?'],
      delay: Math.floor(Math.random() * 500) + 300
    };
  }

  if (bestMatch && bestScore >= 2) {
    return {
      reply: bestMatch.response,
      agentName: broker.agentName,
      suggestedActions: bestMatch.suggestedActions,
      delay: Math.floor(Math.random() * 700) + 200
    };
  }

  // Fallback
  const fallback = FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
  return {
    reply: fallback,
    agentName: broker.agentName,
    suggestedActions: ['Book a meeting', 'Ask about spreads', 'See platforms'],
    delay: Math.floor(Math.random() * 500) + 400
  };
}
