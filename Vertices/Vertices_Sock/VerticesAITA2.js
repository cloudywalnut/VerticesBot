// VerticesAITA2.js
const fs   = require('fs');
const path = require('path');
const { AIQuery } = require("./VerticesAIQuery1.js");
const MODULE = path.basename(__filename, path.extname(__filename));

if (!process.env.TA_FOLDER) {
    console.error(`[${MODULE}] TA_FOLDER missing in .env file`);
    process.exit(1);
}

const TA_JSON_PATH = path.join(process.env.TA_FOLDER, 'ta_combined.json');
const CHARTS_PATH  = process.env.CHARTS_FOLDER;

// === ALIAS MAPPING ===
const ALIASES = {
    "GOLD":      "XAUUSD",
    "SILVER":    "XAGUSD",
    "DOW":       "DJ30",
    "DOWJONES":  "DJ30",
    "NASDAQ":    "NAS100",
    "NAS":       "NAS100",
    "SP500":     "SP500",
    "SP":        "SP500",
    "SPC":       "SP500",
    "OIL":       "USOIL",
    "WTI":       "USOIL",
    "CRUDE":     "USOIL",
    "BRENT":     "UKOIL",
    "ETH":       "ETHUSD",
    "ETHEREUM":  "ETHUSD",
    "BTC":       "BTCUSD",
    "BITCOIN":   "BTCUSD"
};

let taData = null;

// === DATA LOADING ===
function loadTAData() {
    if (taData) return taData;

    if (!fs.existsSync(TA_JSON_PATH)) {
        console.error(`[${MODULE}] TA JSON file not found at ${TA_JSON_PATH}`);
        process.exit(1);
    }
    try {
        taData = JSON.parse(fs.readFileSync(TA_JSON_PATH, 'utf8'));
    } catch (err) {
        console.error(`[${MODULE}] Error loading TA JSON:`, err.message);
        taData = {};
    }
    return taData;
}

// === SYMBOL EXTRACTION ===
const GPT_SYMBOL_INTENT_PROMPT = `
You're a trading analyst. A user will ask about a market symbol, timeframe or trading opportunities.

Return JSON only like:
{
  "symbol": "BTCUSD",
  "duration": "SWING"
}

Rules:
- symbol must be a known CFD/crypto/forex index like "XAUUSD", "BTCUSD", "DOWJONES", etc.
- duration must be "SCALP", "INTRADAY", "SWING", or if not mentioned, default to "INTRADAY"
- if unknown or irrelevant, return { "symbol": null, "duration": null }

Examples:
"Gold should buy or sell ya?" → { "symbol": "XAUUSD", "duration": "SCALP" }
"EURUSD how now?" → { "symbol": "EURUSD", "duration": "SCALP" }
"Gold quick trade is buy or sell?" → { "symbol": "XAUUSD", "duration": "SCALP" }
"BTC?" → { "symbol": "BTCUSD", "duration": "SCALP" }
"EURUSD today's trend how?" → { "symbol": "EURUSD", "duration": "INTRADAY" }
"EURJPY this week how ya?" → { "symbol": "EURJPY", "duration": "SWING" }
"Today why market so slow ya?" → { "symbol": null, "duration": null }

USER: __MSG__
`.trim();

async function extractSymbolAndDuration(userMessage, chosenURL, chosenModel, chosenAPI, systemPrompt) {
    const prompt = GPT_SYMBOL_INTENT_PROMPT.replace("__MSG__", userMessage);
    const result = await AIQuery(prompt, chosenURL, chosenModel, chosenAPI, systemPrompt, 0.3, 100);

    try {
        const parsed = JSON.parse(result);
        return {
            symbol:   parsed.symbol?.toUpperCase()   || null,
            duration: parsed.duration?.toUpperCase() || null
        };
    } catch {
        console.error(`[${MODULE}] Failed to parse GPT symbol result:`, result);
        return { symbol: null, duration: null };
    }
}

// === FORMATTING ===
function formatToNearestQuarterHour(date) {
    const rounded = new Date(date);
    rounded.setMinutes(Math.round(rounded.getMinutes() / 15) * 15);
    rounded.setSeconds(0);
    rounded.setMilliseconds(0);
    return rounded.toLocaleString('en-US', {
        month:  'short',
        day:    'numeric',
        hour:   'numeric',
        minute: '2-digit',
        hour12: true
    }).replace(',', ' at');
}

function formatTAResponse(block) {
    const symbol   = block.Symbol;
    const duration = block['Trade Duration'];

    const durationTimeframes = {
        'SCALP':    ['M15', 'H1'],
        'INTRADAY': ['H4', 'D1'],
        'SWING':    ['D1', 'W1']
    };

    const timeframes = durationTimeframes[duration] || [];
    const images = timeframes.map(tf => path.join(CHARTS_PATH, `${symbol}_${tf}.jpg`));

    const humanReadableTime = formatToNearestQuarterHour(new Date(block['Analyzed At']));

    const message = [
        `📈 *${symbol}* — *${duration}* (${block.Timeframe})`,
        `📌 Suggestion: ${block.Suggestion}`,
        `Support: ${block['Nearest Support Zone']}`,
        `Resistance: ${block['Nearest Resistance Zone']}`,
        `Reason: ${block.Reason}`
    ].join('\n');

    return { message, images };
}

// === MAIN HANDLER ===
async function getTAReplyFromMessage(userMessage, chosenURL, chosenModel, chosenAPI, systemPrompt) {
    const ta = loadTAData();
    let { symbol, duration } = await extractSymbolAndDuration(userMessage, chosenURL, chosenModel, chosenAPI, systemPrompt);

    if (!symbol && !duration) return null;

    let normalizedSymbol = symbol ? symbol.replace(/\.s$/i, "").toUpperCase() : null;
    if (normalizedSymbol && ALIASES[normalizedSymbol]) {
        normalizedSymbol = ALIASES[normalizedSymbol];
    }

    // Try lookup with and without .s suffix variants
    let symbolKey = null;
    if (normalizedSymbol && ta[normalizedSymbol])         symbolKey = normalizedSymbol;
    else if (normalizedSymbol && ta[normalizedSymbol + ".s"]) symbolKey = normalizedSymbol + ".s";
    else if (normalizedSymbol && ta[normalizedSymbol + ".S"]) symbolKey = normalizedSymbol + ".S";

    if (!symbolKey) {
        return { message: `Sorry, can't find any TA for that symbol...`, images: [] };
    }

    if (duration) {
        const block = ta[symbolKey][duration];
        if (block) return formatTAResponse(block);

        if (ta[symbolKey]['INTRADAY']) {
            const fallback = formatTAResponse(ta[symbolKey]['INTRADAY']);
            fallback.message = `No ${duration.toLowerCase()} data found. Showing INTRADAY instead.\n\n` + fallback.message;
            return fallback;
        }

        if (ta[symbolKey]['SCALP']) {
            const fallback = formatTAResponse(ta[symbolKey]['SCALP']);
            fallback.message = `No ${duration.toLowerCase()} or INTRADAY data found. Showing SCALP instead.\n\n` + fallback.message;
            return fallback;
        }

        return { message: `I can't find any analysis data for ${duration.toLowerCase()} of ${normalizedSymbol}.`, images: [] };
    }

    // No specific duration requested — return all timeframes
    return {
        message: Object.entries(ta[symbolKey])
            .map(([label, block]) => `*${label}*\n${formatTAResponse(block).message}`)
            .join('\n\n'),
        images: []
    };
}

module.exports = { getTAReplyFromMessage };
