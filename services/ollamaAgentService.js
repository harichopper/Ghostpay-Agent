// GhostPay Agent — Ollama AI Agent for Transaction Management
// Uses Ollama LLM for intent parsing and agent reasoning.
// Now parses STT token amounts (Status Test Token, ERC20 on Status Sepolia).

import { AGENT_RULES_DEFAULTS } from '../config/constants';
import { OLLAMA } from '../config/ollama';

const FALLBACK_ETH_USD = 2500;
const DEFAULT_STT_AMOUNT = '10'; // default STT when not found

function formatSttAmount(value) {
  const n = parseFloat(value);
  if (!isFinite(n) || n <= 0) return DEFAULT_STT_AMOUNT;
  return n % 1 === 0 ? String(Math.round(n)) : n.toFixed(2);
}

function parseAmountFromCommand(commandText, ethUsdPrice) {
  const text = String(commandText || '').toLowerCase();

  // Prefer explicit ETH amounts when present.
  const ethMatch = text.match(/(\d+(?:\.\d+)?)\s*eth\b/i);
  if (ethMatch) {
    const ethAmount = Number.parseFloat(ethMatch[1]);
    return Number.isFinite(ethAmount) ? ethAmount : NaN;
  }

  // Support "$2", "2 usd", "2 dollars", and common misspellings like "2 dollor".
  const dollarMatch = text.match(/\$\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:usd|dollars?|dollors?|dollers?|bucks?)\b/i);
  const dollarValue = dollarMatch ? (dollarMatch[1] || dollarMatch[2]) : null;
  if (dollarValue) {
    const usd = Number.parseFloat(dollarValue);
    if (Number.isFinite(usd) && usd > 0) {
      return usd / ethUsdPrice;
    }
  }

  return NaN;
}

async function getEthUsdPrice() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);
    if (!res.ok) return FALLBACK_ETH_USD;

    const data = await res.json();
    const price = Number.parseFloat(data?.ethereum?.usd);
    return Number.isFinite(price) && price > 0 ? price : FALLBACK_ETH_USD;
  } catch {
    clearTimeout(timeout);
    return FALLBACK_ETH_USD;
  }
}

/**
 * Call Ollama chat API
 * @param {string} prompt - User/system prompt
 * @param {object} options - { systemPrompt, model }
 * @returns {Promise<string|null>} Assistant content or null on error
 */
export async function ollamaChat(prompt, options = {}) {
  const { systemPrompt, model = OLLAMA.model } = options;
  const url = `${OLLAMA.baseUrl.replace(/\/$/, '')}/api/chat`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA.timeout);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.message?.content ?? null;
  } catch (e) {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * Parse payment intent from natural language using Ollama
 * Returns { intent, to, amount, rule } or null if Ollama fails
 */
export async function parseIntentWithOllama(userCommand) {
  if (!OLLAMA.enabled) return null;

  const ethUsdPrice = await getEthUsdPrice();

  const systemPrompt = `You are a payment intent parser. Extract payment details from the user's message. Reply ONLY with valid JSON in this exact format:
{"intent": "brief description", "to": "0x... address or placeholder", "amount": "0.01", "rule": "Rule name"}
- intent: short label (e.g. "Direct Transfer", "Subscription Payment")
- to: Ethereum address (0x + 40 hex chars) if mentioned, else "0xPLACEHOLDER"
- amount: ETH amount as decimal string (e.g. "0.01", "0.005")
- amount: ETH amount as decimal string (e.g. "0.01", "0.005"). If user says dollars/USD, convert to ETH using rate $${ethUsdPrice.toFixed(2)} per ETH.
- rule: applied rule name
Extract amounts from phrases like "send 0.5 ETH", "pay 10 dollars", "$2", "2 usd", "1 dollar".`;

  const content = await ollamaChat(userCommand, { systemPrompt });
  if (!content) return null;

  try {
    const text = content.trim().replace(/```json\n?|\n?```/g, '');
    const parsed = JSON.parse(text);

    // Always prioritize explicit amount/address from the user's command text.
    const explicitAddrMatch = userCommand.match(/0x[a-fA-F0-9]{40}/);
    const explicitAmount = parseAmountFromCommand(userCommand, ethUsdPrice);

    const rawTo = String(parsed.to || '').trim();
    const isValidAddr = /^0x[a-fA-F0-9]{40}$/.test(rawTo);
    const to = explicitAddrMatch?.[0] || (isValidAddr ? rawTo : '');

    const amount = Number.parseFloat(parsed.amount);
    const finalAmount = Number.isFinite(explicitAmount) ? explicitAmount : amount;

    return {
      intent: String(parsed.intent || 'Payment'),
      to,
      amount: formatEthAmount(finalAmount),
      rule: String(parsed.rule || 'AI Parsed'),
    };
  } catch {
    return null;
  }
}

/**
 * Get agent verification reasoning from Ollama (for display in checks)
 */
export async function getAgentReasoning(userCommand, parsed, rules = {}) {
  if (!OLLAMA.enabled) return null;

  const merged = { ...AGENT_RULES_DEFAULTS, ...rules };
  const prompt = `As a payment security agent, briefly validate this STT token transfer request in 1-2 sentences.
Request: "${userCommand}"
Extracted: intent=${parsed?.intent}, amount=${parsed?.amount} STT, recipient=${parsed?.to?.slice(0, 10)}...
Rules: daily limit ${merged.dailyLimit} STT, max single ${merged.maxSingle} STT.
Reply with a short security check summary (e.g. "Amount within limits, address format valid.").`;

  return await ollamaChat(prompt);
}

/**
 * Parse STT token transfer intent from natural language using Ollama.
 * Returns { intent, to, amount } or null if Ollama is unavailable.
 */
export async function parseSTTIntent(userCommand) {
  if (!OLLAMA.enabled) return null;

  const systemPrompt = `You are an STT token payment parser. Extract payment details.
STT (Status Test Token) is an ERC-20 token on Status Network Sepolia.
Reply ONLY with valid JSON:
{"intent": "brief description", "to": "0x... address or placeholder", "amount": "10"}
- intent: short label (e.g. "STT Transfer", "Token Payment")
- to: Ethereum address (0x + 40 hex chars) if mentioned, else "0xPLACEHOLDER"
- amount: STT token amount as decimal string (e.g. "10", "50.5")
Extract amounts from phrases like "send 10 STT", "transfer 50 tokens", "pay 100 STT".`;

  const content = await ollamaChat(userCommand, { systemPrompt });
  if (!content) return null;

  try {
    const text = content.trim().replace(/```json\n?|\n?```/g, '');
    const parsed = JSON.parse(text);

    const explicitAddrMatch = userCommand.match(/0x[a-fA-F0-9]{40}/);
    const sttMatch = userCommand.match(/(\d+(?:\.\d+)?)\s*stt\b/i);
    const numericMatch = userCommand.match(/^\s*(\d+(?:\.\d+)?)\s*$/);

    const rawTo = String(parsed.to || '').trim();
    const isValidAddr = /^0x[a-fA-F0-9]{40}$/.test(rawTo);
    const to = explicitAddrMatch?.[0] || (isValidAddr ? rawTo : '');

    const explicitSTT = sttMatch ? sttMatch[1] : (numericMatch ? numericMatch[1] : null);
    const amount = explicitSTT || parsed.amount || DEFAULT_STT_AMOUNT;

    return {
      intent: String(parsed.intent || 'STT Transfer'),
      to,
      amount: formatSttAmount(amount),
    };
  } catch {
    return null;
  }
}
