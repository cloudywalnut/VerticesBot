// VerticesAITA2.js
const fs = require('fs');
const path = require('path');
const { AIQuery } = require("./VerticesAIQuery1.js");

const HelperVersion = path.basename(__filename).replace(/\.[^/.]+$/, '');

if (!process.env.TA_FOLDER) {
    console.error(`${HelperVersion}: TA_FOLDER missing in .env file`);
    process.exit(1);
}

// === Load the TA database once ===
const TA_JSON_PATH = path.join(process.env.TA_FOLDER, 'ta_combined.json');

// The image Path
const CHARTS_PATH = process.env.CHARTS_FOLDER;

// 🔑 Manual alias mapping
const aliases = {
    "GOLD": "XAUUSD",
    "SILVER": "XAGUSD",
    "DOW": "DJ30",
    "DOWJONES": "DJ30",
    "NASDAQ": "NAS100",
    "NAS": "NAS100",
    "SP500": "SP500",
    "SP": "SP500",
    "SPC": "SP500",
    "OIL": "USOIL",
    "WTI": "USOIL",
    "CRUDE": "USOIL",
    "BRENT": "UKOIL",
    "ETH": "ETHUSD",
    "ETHEREUM": "ETHUSD",
    "BTC": "BTCUSD",
    "BITCOIN": "BTCUSD",
};

let taData = null;

function loadTAData() {
    if (!taData) {
        if (!fs.existsSync(TA_JSON_PATH)) {
            console.error(`${HelperVersion}: TA JSON file not found at ${TA_JSON_PATH}`);
            process.exit(1);
        }
        try {
            taData = JSON.parse(fs.readFileSync(TA_JSON_PATH, 'utf8'));
        } catch (err) {
            console.error(`${HelperVersion}: Error loading TA JSON:`, err.message);
            taData = {};
        }
    }
    return taData;
}

// === GPT Symbol+Duration Prompt ===
const GPTSymbolIntentPrompt = `
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

// === Call GPT to extract symbol & duration intent ===
async function extractSymbolAndDuration(userMessage, chosenURL, chosenModel, chosenAPI, systemPrompt) {
    const prompt = GPTSymbolIntentPrompt.replace("__MSG__", userMessage);

    const result = await AIQuery(
        prompt,
        chosenURL,
        chosenModel,
        chosenAPI,
        systemPrompt,
        0.3,
        100
    );

    try {
        const parsed = JSON.parse(result);
        return {
            symbol: parsed.symbol?.toUpperCase() || null,
            duration: parsed.duration?.toUpperCase() || null
        };
    } catch (err) {
        console.error(`${HelperVersion}: Failed to parse GPT result:`, result);
        return { symbol: null, duration: null };
    }
}

function formatToNearestQuarterHour(date) {
    // Round to nearest 15 minutes
    const roundedDate = new Date(date);
    const minutes = roundedDate.getMinutes();
    roundedDate.setMinutes(Math.round(minutes / 15) * 15);
    roundedDate.setSeconds(0);
    roundedDate.setMilliseconds(0);
    
    // Format as "Jul 17 at 5:30 PM"
    return roundedDate.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).replace(',', ' at');
}

// === Format a single TA block ===
function formatTAResponse(block) {
    const symbol = block.Symbol;
    const duration = block['Trade Duration']; // SCALP, INTRADAY, SWING

    // Map duration to relevant timeframes
    const durationTimeframes = {
        'SCALP': ['M15', 'H1'],
        'INTRADAY': ['H4', 'D1'],
        'SWING': ['D1', 'W1']
    };

    const timeframes = durationTimeframes[duration] || [];

    // ✅ Construct full image paths
    console.log(CHARTS_PATH);
    const images = timeframes.map(tf => 
        path.join(CHARTS_PATH, `${symbol}_${tf}.jpg`)
    );

    // Convert ISO timestamp to human-readable format
    const analyzedAt = new Date(block['Analyzed At']);
    const humanReadableTime = formatToNearestQuarterHour(analyzedAt);

    const message = [
        `📈 *${symbol}* — *${duration}* (${block.Timeframe})`,
        `📌 Suggestion: ${block.Suggestion}`,
        `Support: ${block['Nearest Support Zone']}`,
        `Resistance: ${block['Nearest Resistance Zone']}`,
        `Reason: ${block.Reason}`
    ].join('\n');

    return { message, images };
}

// === Main function to handle full user request ===
// with FALLBACK answers if SWING->INTRADAY->SCALP
async function getTAReplyFromMessage(userMessage, chosenURL, chosenModel, chosenAPI, systemPrompt) {
    const ta = loadTAData();
    let { symbol, duration } = await extractSymbolAndDuration(userMessage, chosenURL, chosenModel, chosenAPI, systemPrompt);

    if (!symbol && !duration) return null;

    // 🔑 Normalize: strip .s if present
    let normalizedSymbol = symbol ? symbol.replace(/\.s$/i, "").toUpperCase() : null;

    if (normalizedSymbol && aliases[normalizedSymbol]) {
        normalizedSymbol = aliases[normalizedSymbol];
    }

    // 🔑 Try lookups: plain, with .s, with .S
    let symbolKey = null;
    if (normalizedSymbol && ta[normalizedSymbol]) {
        symbolKey = normalizedSymbol;
    } else if (normalizedSymbol && ta[normalizedSymbol + ".s"]) {
        symbolKey = normalizedSymbol + ".s";
    } else if (normalizedSymbol && ta[normalizedSymbol + ".S"]) {
        symbolKey = normalizedSymbol + ".S";
    }

    if (!symbolKey) {
        return { message: `Sorry, can't find any TA for that symbol...`, images: [] };
    }

    // 🔑 Duration handling unchanged
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

    // If no specific duration: return all
    return {
        message: Object.entries(ta[symbolKey])
            .map(([label, block]) => `*${label}*\n${formatTAResponse(block).message}`)
            .join('\n\n'),
        images: []
    };
}

// The image file paths are already being constructed here in the code on return
module.exports = {
    getTAReplyFromMessage
};