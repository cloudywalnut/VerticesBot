// Vertices_Sock.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'userdata', '.env'), override: true, silent: true });

require('bytenode');
const fs = require('fs');
const readline = require('readline');
const { runHelperCommand } = require('./VerticesHelper.js');

// ==============================
// MODULE IMPORTS
// ==============================
const { AIQuery } = require("./VerticesAIQuery1.js"); // Done
const VerticesBoss = require('./VerticesBoss2.js'); // Done
const { handleGroupMessage, sendImagesToGroup } = require('./VerticesGroup3.js'); // Done
const { downloadBaileysMedia, handleIncomingMedia, handleReplyForPendingMedia, cleanupExpiredMedia } = require('./VerticesMedia1.js'); // Done
const { summarizeImage, detectMediaTypeForAi } = require('./VerticesImage1.js'); // Done
const { handleImageSaveCommand } = require("./VerticesImageSave1.js"); // Done
const { handleImageRequest } = require("./VerticesImageSend1.js"); // Done
const VoiceInterpret = require('./VerticesVoiceInterpret1.js'); // Done
const VoiceGenerate = require('./VerticesVoiceGen2.js'); // Done
const { runFollowUpWorkflow, confirmFollowUpApproved } = require('./VerticesFollowUp4.js'); // Done
const { getEmbedding, getTopChunks } = require('./VerticesRAGTools3.js'); // Done
const { handleInitiateCommand } = require("./VerticesInitiate3.js"); // Done
const {summarizePdf} = require("./VerticesPdf01.js")
const { translateBossCommand } = require('./VerticesBossCmd.js');

// Baileys imports
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const qrcodeImage = require('qrcode');
const axios = require('axios');
const P = require("pino");
const e = require('cors');

// ==============================
// BOT CONFIGURATION & CONSTANTS
// ==============================
const MODULE = path.basename(__filename, path.extname(__filename));

// WhatsApp directories setup
const WA_DATA_DIR = process.env.WA_DATA_DIR || path.resolve(__dirname, '../../userdata/whatsapp/session-Vertices');
fs.mkdirSync(WA_DATA_DIR, { recursive: true });
const QR_DIR = process.env.QR_DIR || path.resolve(__dirname, '../../userdata/qr');
const QR_FILE = path.join(QR_DIR, 'qr.png');
const WA_STATUS_FILE = path.join(QR_DIR, '..', 'json', 'wa-status.json');

// ==============================
// AI ENGINE CONFIGURATION
// ==============================
// AI Provider URLs and Models
const deepseekURL = "https://api.deepseek.com/chat/completions";
const deepseekModel = "deepseek-chat";

const openaiURL = "https://api.openai.com/v1/chat/completions";
const openaiModel = "gpt-4.1"; // or gpt-4o

const qwenURL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
const qwenModel = "qwen-turbo";

const localURL = "https://your_ai_url/v1/chat/completions";
const localModel = "Qwen2.5-7B-Instruct-1M-Q4_K_M";

// DO NOT USE ANTHROPIC FOR GROUP CHAT BOT - Individual chats only
const antURL = "https://api.anthropic.com/v1/messages";
const antModel = "claude-sonnet-4-6";

// Selected AI Engine (set during initialization)
let chosenEngine = "";
let chosenAPI = "";
let chosenURL = "";
let chosenModel = "";

// ==============================
// PERSONA & MEMORY MANAGEMENT
// ==============================
let VerticesPersonaLong = "";
let VerticesPersonaShort = "";
let VerticesPersonaGroup = "";
let VerticesPersonaCoder = "";
let VerticesPersonaBoss = "";

// ==============================
// MARKET SCANNER & RAG
// ==============================
let allTA = ""; // for ta_suggestion concatenation

// Market scanner - lazy loaded only if MARKETSCANNER is On
let getTAReplyFromMessage = null;
const MARKETSCANNER = process.env.MARKETSCANNER || "Off";
if (MARKETSCANNER === "On") {
  ({ getTAReplyFromMessage } = require('./VerticesAITA2.js'));
  console.log("Market scanner module loaded.");
}

// ==============================
// ENVIRONMENT CONFIGURATION
// ==============================
function parseDotenv(content) {
    const result = {};
    content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            value = value.replace(/^['"]|['"]$/g, '');
            result[key] = value;
        }
    });
    return result;
}

async function reloadEnv(sock) {
    try {
        const envText = fs.readFileSync(path.join(__dirname, '..', '..', 'userdata/.env'), 'utf-8');
        const parsed = parseDotenv(envText);

        // Core bot configuration
        global.BOT_NAME = parsed.BOT_NAME || "Vertices";
        global.PERSON = parsed.PERSON || "Person";
        global.JOB = parsed.JOB || "Sales";
        global.GROUP_ALLOWED = parsed.GROUP_ALLOWED || "No";
        global.INDIVIDUAL_CHATS = parsed.INDIVIDUAL_CHATS || "Yes";
        global.SERIAL_ID = parsed.SERIAL_ID;

        // Voice configuration
        global.USEVOICE = parsed.USEVOICE || "No";
        global.VOICELANGUAGE = parsed.VOICELANGUAGE || "en";
        global.VOICE_API_KEY = parsed.VOICE_API_KEY;
        global.VOICE_MODEL_ID = parsed.VOICE_MODEL_ID;
        global.VOICE_ID = parsed.VOICE_ID;
        global.VOICE_SPEED = parsed.VOICE_SPEED;
        global.VOICE_STABILITY = parsed.VOICE_STABILITY;
        global.VOICE_SIMILARITY = parsed.VOICE_SIMILARITY;
        global.VOICE_SPEAKER_BOOST = parsed.VOICE_SPEAKER_BOOST;

        // Group and persona settings
        global.GROUP_NAMES = (parsed.GROUP_NAMES || "")
            .split(",")
            .map(name => name.trim().toLowerCase());
        global.PERSONA_RELOAD_SECS = parseFloat(parsed.PERSONA_RELOAD_SECS || "10");
        global.IMPLEMENTERS_MODE = parsed.IMPLEMENTERS_MODE || "Off";
        global.MARKETSCANNER = parsed.MARKETSCANNER || "Off";
        global.RAG = parsed.RAG || "Off";
        global.VECTOR_DB_PATH = parsed.VECTOR_DB_PATH;

        // Timing and history settings
        global.HISTORY_SHORT = parseInt(parsed.HISTORY_SHORT || "5");
        global.HISTORY_LONG = parseInt(parsed.HISTORY_LONG || "25");
        global.LOCAL_FORMAT = parsed.localFormat || "en-US";
        global.TIME_ZONE = parsed.TimeZone || "Asia/Kuala_Lumpur";

        // Phone numbers
        global.BOT_PHONE = parsed.BOT_PHONE;
        global.ASST_BOSS_PHONE = (parsed.ASST_BOSS_PHONE || "")
                .split(",")
                .map(phone => phone.trim())
                .filter(phone => /^\d+$/.test(phone));
        const rawBossPhone = parsed.BOSS_PHONE?.trim();

        // API Keys
        global.deepseekApi = parsed.deepseekApi;
        global.openaiApi = parsed.openaiApi;
        global.qwenApi = parsed.qwenApi;
        global.antApi = parsed.antApi;
        global.localApi = parsed.localApi;

        // Bot behavior settings
        global.autoClearCache = parsed.AUTO_CLEAR_CACHE || "N";
        global.autoEngineChoice = parsed.AUTO_ENGINE_CHOICE || "1"; // default to OpenAI

        // Delays and timing
        global.RESPONSE_DELAY_MIN_SEC = parseInt(parsed.RESPONSE_DELAY_MIN_SEC) || 2;
        global.RESPONSE_DELAY_MAX_SEC = parseInt(parsed.RESPONSE_DELAY_MAX_SEC) || 3;
        global.TYPING_DURATION_MIN_SEC = parseInt(parsed.TYPING_DURATION_MIN_SEC) || 2;
        global.TYPING_DURATION_MAX_SEC = parseInt(parsed.TYPING_DURATION_MAX_SEC) || 3;
        global.BOSS_NOTIFICATION_EXPIRY = parseInt(parsed.BOSS_NOTIFICATION_EXPIRY) || 60;
        global.MEDIA_EXPIRY_MINUTES = parseInt(parsed.MEDIA_EXPIRY_MINUTES) || 2;
        global.ENV_RELOAD_SECS = parseInt(parsed.ENV_RELOAD_SECS) || 5;

        // Sleep mode settings
        global.VerticesSleepMode = parsed.VerticesSleepMode || "Off";
        global.WAKE_UP_HOUR = parseInt(parsed.WAKE_UP_HOUR) || 6;
        global.WAKE_UP_MINS = parseInt(parsed.WAKE_UP_MINS) || 30;
        global.SLEEP_HOUR = parseInt(parsed.SLEEP_HOUR) || 3;
        global.SLEEP_MINS = parseInt(parsed.SLEEP_MINS) || 59;

        // File paths
        global.PERSONA_FILE_LONG = path.join(__dirname, '..', '..', 'userdata/persona/verticespersona-long.txt');
        global.PERSONA_FILE_SHORT = path.join(__dirname, '..', '..', 'userdata/persona/verticespersona-short.txt');
        global.PERSONA_FILE_GROUP = path.join(__dirname, '..', '..', 'userdata/persona/verticespersona-group.txt');
        global.PERSONA_FILE_BOSS = path.join(__dirname, '..', '..', 'userdata/persona/verticespersona-boss.txt');
        global.PERSONA_FILE_CODER = path.join(__dirname, '..', '..', 'userdata/persona/verticespersona-coder-c.txt');

        global.SALES_NOTIFICATION_FILE = path.join(__dirname, '..', '..', 'userdata/json/notifyboss-sales.json');
        global.ABUSE_NOTIFICATION_FILE = path.join(__dirname, '..', '..', 'userdata/json/notifyboss-abuse.json');
        global.PAUSED_FILE = path.join(__dirname, '..', '..', 'userdata/json/pausedUsers.json');
        global.CHAT_HISTORY_DIR = path.join(__dirname, '..', '..', 'userdata/chathistory'); 

        // Resolve BOSS_PHONE to include WhatsApp ID
        if (rawBossPhone) {
            global.BOSS_PHONE = rawBossPhone.includes('@') ? rawBossPhone : rawBossPhone + (rawBossPhone.length <= 12 ? '@s.whatsapp.net' : '@lid');
            console.log('[Env Reloaded] BOSS_PHONE:', global.BOSS_PHONE);
        }

    } catch (err) {
        console.error('Failed to reload .env manually:', err.message);
    }
}

// ==============================
// INITIALIZATIONS
// ==============================
// Load initial environment and persona
reloadEnv();  
setInterval(() => reloadEnv(sock), global.ENV_RELOAD_SECS * 1000);
loadPersona();

// Persona Reload Interval
setInterval(() => {
    reloadIfNeeded(); // this will throttle by PERSONA_RELOAD_SECS
}, global.PERSONA_RELOAD_SECS * 2000);

// Media cleanup every 5 minutes
setInterval(() => {
    cleanupExpiredMedia();
}, 5 * 60 * 1000);

// ==============================
// VALIDATION FUNCTIONS
// ==============================
function isValidPhoneNumber(num) {
    const cleaned = num.trim();
    return /^\d{10,15}$/.test(cleaned);
}

if (!isValidPhoneNumber(global.BOT_PHONE)) {
    console.error(`Invalid BOT_PHONE: "${global.BOT_PHONE}". Digits only, 10–15 characters.`);
    process.exit(1);
}

let expiryBossReport = global.BOSS_NOTIFICATION_EXPIRY * 60 * 1000; // convert to milliseconds

// ==============================
// HELPER FUNCTIONS
// ==============================

// ==============================
// PERSONA MANAGEMENT
// ==============================
function loadPersona() {
    const persona = runHelperCommand("loadPersona", global.PERSONA_FILE_LONG, global.PERSONA_FILE_SHORT, global.PERSONA_FILE_GROUP, global.PERSONA_FILE_CODER, global.PERSONA_FILE_BOSS);

    if (!persona || persona.trim().startsWith("Access denied")) {
        console.error(`[${MODULE}] Failed loading persona files.`);
        return;
    }

    try {
        const json = JSON.parse(persona);
        const replaceVars = (text) =>
        text.replace(/{{BOT_NAME}}/g, global.BOT_NAME || "Vertices");

        VerticesPersonaLong     = replaceVars(json.VerticesPersonaLong);
        VerticesPersonaShort    = replaceVars(json.VerticesPersonaShort);
        VerticesPersonaGroup    = replaceVars(json.VerticesPersonaGroup);
        VerticesPersonaCoder    = replaceVars(json.VerticesPersonaCoder);
        VerticesPersonaBoss = replaceVars(json.VerticesPersonaBoss);
    } catch (err) {
        console.error(`[${MODULE}] Failed parsing persona JSON:`, err.message);
    }
}

function getMemoryPersona() {
    const permFile = path.join(__dirname, '..', '..', 'userdata/mem/verticesmemory-perm.txt');
    const tempFile = path.join(__dirname, '..', '..', 'userdata/mem/verticesmemory-temp.txt');

    if (!fs.existsSync(permFile)) fs.writeFileSync(permFile, '', 'utf-8');
    if (!fs.existsSync(tempFile)) fs.writeFileSync(tempFile, '', 'utf-8');

    const perm = fs.readFileSync(permFile, 'utf-8').trim();
    const temp = fs.readFileSync(tempFile, 'utf-8').trim();

    let memoryBlock = "";

    // PERMANENT MEMORY
    if (perm) {
        memoryBlock += `\n\nImportant Knowledge & Info YOU Must ALWAYS REMEMBER:\n${perm}`;
    }
    // TEMP MEMORY
    if (temp) {
        memoryBlock += `\n\nComing Days' & Weeks' Updates plus Important Info:\n${temp}`;
    }

    // Market Trend Scanner integration
    if (global.MARKETSCANNER === "On"){
        const marketInfo = `\n\nBelow are the latest market analysis you have calculated using AI charts detection. ` +
        `You will use to answer when asked about the market or trade situations or opportunities now:\n${allTA}\n`;
        memoryBlock += marketInfo;
    }

    return memoryBlock;
}

function refreshMemoryIntoPersona() {
    const memoryAddOn = getMemoryPersona();
    VerticesPersonaGroup += `\n${memoryAddOn}`;
    VerticesPersonaLong += `\n${memoryAddOn}`;
}

let lastReloadTime = 0;
function reloadIfNeeded() {
    const now = Date.now();
    const intervalMs = Math.max(1000, global.PERSONA_RELOAD_SECS * 1000); // at least 1 sec
    if (now - lastReloadTime > intervalMs) {
        loadPersona();
        refreshMemoryIntoPersona();
        lastReloadTime = now;
    }
}

// ==============================
// FILE SYSTEM SETUP
// ==============================
const USERDATA_DIR = path.resolve(__dirname, '..', '..', 'userdata');
['json', 'qr', 'mem', 'persona', 'chathistory', 'voice', 'img'].forEach(d =>
    fs.mkdirSync(path.join(USERDATA_DIR, d), { recursive: true })
);

if (!fs.existsSync(global.SALES_NOTIFICATION_FILE)) fs.writeFileSync(global.SALES_NOTIFICATION_FILE, JSON.stringify({ users: {} }, null, 2));
if (!fs.existsSync(global.ABUSE_NOTIFICATION_FILE)) fs.writeFileSync(global.ABUSE_NOTIFICATION_FILE, JSON.stringify({ users: {} }, null, 2));
const defaultData = { paused: [], global: false };
if (!fs.existsSync(global.PAUSED_FILE)) fs.writeFileSync(global.PAUSED_FILE, JSON.stringify(defaultData, null, 2));

// ==============================
// BAILEYS CLIENT SETUP
// ==============================
let sock;

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState(WA_DATA_DIR)
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: "silent" }),
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\nScan this QR code with WhatsApp:');
            qrcode.generate(qr, { small: true });
            fs.writeFileSync(WA_STATUS_FILE, JSON.stringify({ state: 'qr' }));

            try {
                qrcodeImage.toFile(QR_FILE, qr, { width: 300, margin: 2 })
                    .then(() => console.log('QR saved to:', QR_FILE))
                    .catch(err => {
                        console.error('Failed to save QR image:', err?.message || err);
                        console.log('Showing ASCII QR instead:');
                        qrcode.generate(qr, { small: true });
                    });
            } catch (err) {
                console.error('Failed to save QR image:', err?.message || err);
            }
        }

        if (connection === 'close') {
            fs.writeFileSync(WA_STATUS_FILE, JSON.stringify({ state: 'close' }));
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
            console.log('Connection closed. Reconnecting...', shouldReconnect);
            if (shouldReconnect) {
                start();
            }
        } else if (connection === 'open') {
            fs.writeFileSync(WA_STATUS_FILE, JSON.stringify({ state: 'open' }));
            if (fs.existsSync(QR_FILE)) fs.unlinkSync(QR_FILE);
            console.log('WhatsApp connected successfully!');
            
            // Get bot phone number
            const user = sock.user;
            if (user && user.id) {
                const phone = user.id.split(':')[0];
                // Guardrail to prevent inconsistency in BOT PHONE
                if (phone.split('@')[0] !== global.BOT_PHONE) {
                    console.log("Inconsistency in BOT PHONE Number make sure to change the BOT PHONE number in BOT Settings");
                    process.exit(1);
                }else{
                    console.log('Vertices AI Bot number is:', phone);
                }
            }
            
            // Reload environment with socket
            reloadEnv(sock);
            console.log("Boss phone's WhatsApp ID:", global.BOSS_PHONE);
        }
    });

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("messages.upsert", async (msgUpdate) => {
        await handleMessageUpsert(msgUpdate);
    });
}

// ==============================
// UTILITY FUNCTIONS
// ==============================
function customDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendPicturesToUser(folderPath, sock, userChatId) {
    try {
        const files = fs.readdirSync(folderPath)
                        .filter(file => /\.(jpe?g|png)$/i.test(file))
                        .slice(0, 10); // Limit to 10 images

        for (const fileName of files) {
            const filePath = path.join(folderPath, fileName);
            const media = {
                url: filePath
            };
            await sock.sendMessage(userChatId, { image: media });
            await customDelay(1500); // delay 1.5 sec between sends
        }

        console.log(`Sent ${files.length} images to ${userChatId}`);
    } catch (err) {
        console.error("Error sending images:", err);
    }
}

async function waitForUserInputOrDefault(defaultValue, timeoutMs) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

        let answered = false;

        rl.question('', (answer) => {
            if (!answered) {
                answered = true;
                rl.close();
                resolve(answer.trim() || defaultValue);
            }
        });

        setTimeout(() => {
            if (!answered) {
                answered = true;
                rl.close();
                console.log(`(Auto-selecting "${defaultValue}" after ${timeoutMs / 1000} secs)`);
                resolve(defaultValue);
            }
        }, timeoutMs);
    });
}

// ==============================
// BOT INITIALIZATION
// ==============================
async function initializeBot() {
    console.log("Starting Vertices AI Business Bot...");

    // Handle Clear Cache Question
    console.log("Clear WhatsApp-Web Auth & Cache folder? (Y/N): ");
    let clearData = await waitForUserInputOrDefault(global.autoClearCache || "N", 2000);
    console.log(`Selected: ${clearData}`);

    if (clearData.toUpperCase() === 'Y') {
        let result = runHelperCommand("clearSessionAndCache");
        console.log("Result from VerticesHelper:", result);
    }

    // Handle AI Engine Selection
    console.log("Choose AI engine: 1.OpenAI (Recommended)  2.DeepSeek  3.Qwen  4.Anthropic  5.Local: ");
    let engineChoice = await waitForUserInputOrDefault(global.autoEngineChoice || "1", 2000);
    console.log(`Selected AI Engine: ${engineChoice}`);

    switch (engineChoice.trim()) {
        case "2":
            chosenEngine = "deepseek"; chosenAPI = global.deepseekApi; chosenURL = deepseekURL; chosenModel = deepseekModel;
            break;
        case "3":
            chosenEngine = "qwen"; chosenAPI = global.qwenApi; chosenURL = qwenURL; chosenModel = qwenModel;
            break;
        case "4":
            chosenEngine = "anthropic"; chosenAPI = global.antApi; chosenURL = antURL; chosenModel = antModel;
            break;
        case "5":
            chosenEngine = "local"; chosenAPI = global.localApi; chosenURL = localURL; chosenModel = localModel;
            break;
        default:
            chosenEngine = "openai"; chosenAPI = global.openaiApi; chosenURL = openaiURL; chosenModel = openaiModel;
    }

    start();
}

// ==============================
// AI PROVIDER FUNCTIONS
// ==============================
async function getAIResponse(engine, persona, message, maxTokens, temperature) {
    switch (engine.toLowerCase()) {
        case "deepseek":
            return await callDeepSeek(persona, message, maxTokens, temperature);
        case "qwen":
            return await callQwen(persona, message, maxTokens, temperature);
        case "anthropic":
            return await callAnt(persona, message, maxTokens, temperature);
        case "local":
            return await callLocal(persona, message, maxTokens, temperature);
        case "openai":
        default:
            return await callOpenAI(persona, message, maxTokens, temperature);
    }
}

async function callOpenAI(persona, message, maxTokens, temperature) {
    try {
        const response = await axios.post(openaiURL, {
            model: openaiModel,
            messages: [{ role: "system", content: persona }, { role: "user", content: message }],
            temperature: temperature,
            max_tokens: maxTokens,
            top_p: 1,
            frequency_penalty: 0.0,
            presence_penalty: 0.0
        }, {
            headers: { "Authorization": `Bearer ${global.openaiApi}`, "Content-Type": "application/json" }
        });
        return response.data.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI Error:", error?.response?.data || error.message);
        return "This is an automated reply. The user is not available now. o";
    }
}

async function callDeepSeek(persona, message, maxTokens, temperature) {
    try {
        const response = await axios.post(deepseekURL, {
            model: deepseekModel,
            messages: [{ role: "system", content: persona }, { role: "user", content: message }],
            temperature: temperature,
            max_tokens: maxTokens,
            top_p: 1,
            frequency_penalty: 0.0,
            presence_penalty: 0.0
        }, {
            headers: { "Authorization": `Bearer ${global.deepseekApi}`, "Content-Type": "application/json" }
        });
        return response.data.choices[0].message.content;
  } catch (error) {
    console.error("DeepSeek Error:", error?.response?.data || error.message);
        return "This is an automated Whatsapp reply. The user is not available now. d";
    }
}

async function callQwen(persona, message, maxTokens, temperature) {
    try {
        const response = await axios.post(qwenURL, {
            model: qwenModel,
            messages: [{ role: "system", content: persona }, { role: "user", content: message }],
            temperature: temperature,
            max_tokens: maxTokens,
            top_p: 1,
            frequency_penalty: 0.0,
            presence_penalty: 0.0
        }, {
            headers: { "Authorization": `Bearer ${global.qwenApi}`, "Content-Type": "application/json" }
        });
        return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Qwen Error:", error?.response?.data || error.message);
        return "This is an automated Whatsapp reply. The user is not available now. q";
    }
}

async function callLocal(persona, message, maxTokens, temperature) {
    try {
        const response = await axios.post(localURL, {
            model: localModel,
            messages: [{ role: "system", content: persona }, { role: "user", content: message }],
            temperature: temperature,
            max_tokens: maxTokens,
            top_p: 1,
            frequency_penalty: 0.0,
            presence_penalty: 0.0
        }, {
            headers: { "Authorization": `Bearer ${global.localApi}`, "Content-Type": "application/json" }
        });
        return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Local LLM Error:", error?.response?.data || error.message);
        return "This is an automated Whatsapp reply. The user is not available now. l";
    }
}

async function callAnt(persona, message, maxTokens = 1024, temperature = 0.5) {
  try {
    const response = await axios.post(antURL, {
      model: antModel,
      system: persona, // Anthropic's correct way for persona, different from other providers
      max_tokens: maxTokens,
      temperature: temperature,
      messages: [
        { role: "user", content: message } // only "user" and "assistant" are allowed here
      ]
    }, {
      headers: {
        "x-api-key": `${global.antApi}`,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01"
      }
    });
    return response.data.content?.[0]?.text;
  } catch (error) {
    console.error("Anthropic Error:", error?.response?.data || error.message);
    return "This is an automated Whatsapp reply. The user is not available now. a";
  }
}

// ==============================
// RAG (RETRIEVAL-AUGMENTED GENERATION)
// ==============================
async function genRAGprompt(userMessage, senderName, VerticesPersonaShort, chosenURL, chosenModel, chosenAPI) {
    if (global.RAG !== "On") return ""; // RAG is off

    const systemPersona = `You are a message classifer for an AI Retrieval-Augmented Generation system.
    You help classify messages given to you and you reply strictly either RAG or CASUAL.
    Always reply using only 1 word and NEVER explain your reply.`;

    const ragClassifierPrompt = `You are an AI chatbot with this role: ${VerticesPersonaShort}.
    You must now determine if the message below is:
    1. CASUAL, if the chat topic is casual and NOT related to your role, your company's info, product or services.
    2. RAG, if the chat topic is related to your role, your Company's info, team-mates, product or services.
    You must now Reply strictly as: RAG or CASUAL only. This is the message: "${userMessage}"`;

    const ragDecisionRaw = await AIQuery(
        ragClassifierPrompt,
        chosenURL,
        chosenModel,
        chosenAPI,
        systemPersona,
        0.2,
        10
    );
    
    const ragDecision = ragDecisionRaw.trim().toUpperCase();
    if (ragDecision !== "RAG") return ""; // if Not a RAG query

    const queryVec = await getEmbedding(userMessage);
    if (!queryVec) return ""; // embedding failed (missing or invalid OpenAI API key)
    const chunks = getTopChunks(queryVec, 3); // take only 3 chunks
    const context = chunks.map((c, i) => `(${i + 1}) ${c.title ? `[${c.title}] ` : ''}${c.text}`).join('\n\n');

    if (!chunks || chunks.length === 0) {
        console.warn(`genRAGprompt: No relevant RAG chunks found for: "${userMessage}"`);
        return ""; // skip injecting irrelevant context
    } else {
        return `\nBased on the chat by ${senderName}, this info is found in your official Retrieval-Augmented Generation system which you must ` +
        `incorporate in your reply:\n${context}\n`;
    }
}

// =======================================
// IMAGE INTENT DETECTION AND IMAGE SEND
// =======================================
async function detectPhotoIntent(history, userName, userMessage) {
    let mergedChat = history += `\n${userName}: ${userMessage}`;
    
    const prompt = `
    Based on this conversation history given below, decide whether it is appropriate to send photos, images, pictures, documents or pdfs in reply.
    - Give more weight to the most recent messages when making your decision.    
    - Reply "YES" if sending an image is clearly relevant, appropriate, or specifically requested saying it has been lost, deleted or misplaced.  
    - Reply "REPEAT" if the user is asking again for images or repeating a previous image request.  
    - Reply "NO" if the context does not suggest an image request, or if asking about some other info.  
    Reply only with "YES", "REPEAT", or "NO".  
    Message: "${mergedChat}"
    `;

    const result = await AIQuery(prompt, chosenURL, chosenModel, chosenAPI, VerticesPersonaLong, 0.3, 10);
    const imageRequestMatch = result.trim().toUpperCase();
    return {imageRequestMatch, mergedChat};
}

// function to send image for better code reusability
async function imageSend(userPhone, cleanPhoneNo, userName, userMessage, imageRequestMatch, mergedChat){
    try {
        if (imageRequestMatch === "YES") {
            const { success, logMessage } = await handleImageRequest(
                mergedChat,
                sock,
                userPhone,
                chosenURL,
                chosenModel,
                chosenAPI,
                VerticesPersonaShort,
                0.5,
                250
            );

            if (success) {
                const success_prompt = `Tell ${global.PERSON} that what he asked for in his message: ${userMessage} has
                been shared ${logMessage}. Answer in a natural and casual manner in under 20 words. Never use greetings or
                mention non meaningful file or folder name in your answer`;
                const success_msg = await AIQuery(success_prompt, chosenURL, chosenModel, chosenAPI, VerticesPersonaShort, 0.3, 100);
                await sock.sendMessage(userPhone, { text: success_msg });
                runHelperCommand("logChat", cleanPhoneNo, userName, userMessage, logMessage, global.CHAT_HISTORY_DIR);
                return true;
            }
        }else if (imageRequestMatch === "REPEAT"){
            const repeat_prompt = `Using strictly between 5 to 20 words, reply ${global.PERSON} that the images have
            already been sent earlier. Avoid greetings. Avoid using the same sentence structure as your previous replies.
            Always vary your reply contextually based on this chat history: ${mergedChat}`;
            const repeat_msg = await AIQuery(repeat_prompt, chosenURL, chosenModel, chosenAPI, VerticesPersonaShort, 0.3, 100);
            await sock.sendMessage(userPhone, { text: repeat_msg });
            runHelperCommand("logChat", cleanPhoneNo, userName, userMessage, repeat_msg, global.CHAT_HISTORY_DIR);
            return true;
        }
        return false;
    } catch (err) {
        console.warn("Image request handling error:", err.message);
        return false;
    }
}

// ==============================
// SLEEP/WAKE MANAGEMENT
// ==============================
function isVerticesAwake() {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const wakeMinutes = global.WAKE_UP_HOUR * 60 + global.WAKE_UP_MINS;
    const sleepMinutes = global.SLEEP_HOUR * 60 + global.SLEEP_MINS;
    
    // Case 1: Normal same-day range (e.g., 8AM to 11PM)
    if (wakeMinutes < sleepMinutes) {
        return nowMinutes >= wakeMinutes && nowMinutes < sleepMinutes;
    }
    // Case 2: Overnight range (e.g., 1AM to 11PM next day)
    return nowMinutes >= wakeMinutes || nowMinutes < sleepMinutes;
}

// ==============================
// WHATSAPP INTERACTION HELPERS
// ==============================
async function simulateSeen(msg) {
    try {
        await sock.readMessages([msg.key]);
        console.log(`${MODULE} marked the chat as SEEN for ${msg.key.remoteJid}`);
    } catch (err) {
        console.warn("Failed to mark as seen:", err.message);
    }
}

async function simulateDelays(msg) {
    // Convert min/max from sec to ms
    const responseDelayMs = Math.floor(
        Math.random() * (global.RESPONSE_DELAY_MAX_SEC - global.RESPONSE_DELAY_MIN_SEC) * 1000
    ) + (global.RESPONSE_DELAY_MIN_SEC * 1000);

    const typingDurationMs = Math.floor(
        Math.random() * (global.TYPING_DURATION_MAX_SEC - global.TYPING_DURATION_MIN_SEC) * 1000
    ) + (global.TYPING_DURATION_MIN_SEC * 1000);

    console.log(`${MODULE} delaying response by ${(responseDelayMs / 1000).toFixed(2)} seconds...`);
    await customDelay(responseDelayMs);

    console.log(`${MODULE} is typing. Delay by ${(typingDurationMs / 1000).toFixed(2)} seconds...`);
    
    // Send typing indicator
    await sock.sendPresenceUpdate('composing', msg.key.remoteJid);
    await customDelay(typingDurationMs);
    await sock.sendPresenceUpdate('paused', msg.key.remoteJid);
}

// ==============================
// MESSAGE BLOCKS MANAGEMENT
// ==============================
let MsgBlocks = {};

// Block message handling
// Handled duplicate message sending due to race condition using a processing flag
setInterval(async () => {
    for (const [key, value] of Object.entries(MsgBlocks)) {

        const diff = Date.now() - value.time;
        const cleanPhoneNoBlock = key.split('@')[0];

        if (value.processing) continue;
        value.processing = true;

        if (diff >= 10 * 1000) { // 10 seconds
            try {
                // This prevents stale error
                const { imagePrompt, msg, userName, chatHistoryShort, chatHistoryLong, currentDateTime } = value;
                const blockMessages = value.messages.join(", ");

                // delete the record after processing
                delete MsgBlocks[key];

                // === IMAGE REQUEST DETECTION FOR INDIVIDUAL CHATS ===
                const { imageRequestMatch, mergedChat } = await detectPhotoIntent(chatHistoryShort, userName, blockMessages);
                const img_send_result = await imageSend(key, cleanPhoneNoBlock, userName, blockMessages, imageRequestMatch, mergedChat);
                if (img_send_result) continue;

                // === RAG FOR INDIVIDUAL CHATS ===
                let RAGprompt = "";
                if (global.RAG === "On") {
                    RAGprompt = await genRAGprompt(blockMessages, userName, VerticesPersonaShort, chosenURL, chosenModel, chosenAPI);
                }

                // === INDIVIDUAL CHAT RESPONSE GENERATION ===
                const isFirstTime = !fs.existsSync(path.join(global.CHAT_HISTORY_DIR, `${cleanPhoneNoBlock}.json`));
                let prompt = "";

                if (isFirstTime) {
                    // FIRST TIME CONTACT
                    prompt = `A new ${global.PERSON} has messaged YOU for the first time. The local date & time now is ${currentDateTime}. 
                    Please greet this ${global.PERSON}, introduce yourself, and ask for this ${global.PERSON}'s name & MUST REPLY to this chat 
                    below by the new ${global.PERSON}:\n\n${global.PERSON}: "${blockMessages}". \n${imagePrompt}. \n${RAGprompt}`;
                } else {
                    // RETURNING CONTACT
                    prompt = `This is your most recent chat history with ${userName}:\n${chatHistoryLong}\n${userName}: ${blockMessages}. \n${imagePrompt}. \n${RAGprompt}\n
                    The local date & time now is ${currentDateTime}.\nBased on the above chats, your given persona & your role in the company, 
                    generate a reply, without any greeting (unless the ${global.PERSON} is greeting you), to the latest message from ${userName}. 
                    Vary your replies if the topic has already been replied or answered.`;
                }

                console.log("Token check:", runHelperCommand("countWordsAndTokens", prompt));

                // Simulate human-like delays
                await simulateDelays(msg);

                // Send AI reply
                const reply = await getAIResponse(chosenEngine, VerticesPersonaLong, prompt, 150, 0.5);
                try {
                    await sock.sendMessage(key, { text: reply });
                    console.log("Replied:", reply);
                    runHelperCommand("logChat", cleanPhoneNoBlock, userName, blockMessages, reply, global.CHAT_HISTORY_DIR);
                } catch (err) {
                    console.error(`[${MODULE}] Failed to reply to user ${key}: ${err.message}`);
                    runHelperCommand("logChat", cleanPhoneNoBlock, userName, blockMessages, "[Reply failed]", global.CHAT_HISTORY_DIR);
                }

            } catch (err) {
                console.error("Error in message processing:", err);
            } finally {
                // Always release processing lock
                value.processing = false;
            }

        } else {
            // If not yet due, allow next iteration to check again
            value.processing = false;
        }
    }
}, 1000); // Triggers every second

// ==============================
// MAIN MESSAGE HANDLER
// ==============================
async function handleMessageUpsert(msgUpdate) {
    // Process ALL messages, not just the first one
    for (const msg of msgUpdate.messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const jid = msg.key.remoteJid || '';
        // Ignore status updates (status@broadcast), broadcast lists (*@broadcast),
        // and WhatsApp Channels (*@newsletter) — these are not real chats and should
        // never be processed or logged. Private (@s.whatsapp.net, @lid) and group
        // (@g.us) JIDs are allowed through.
        if (jid === 'status@broadcast' || jid.endsWith('@broadcast') || jid.endsWith('@newsletter')) continue;
        await simulateSeen(msg);
        await processSingleMessage(msg);
    }
}

async function processSingleMessage(msg){
    
    // ==============================
    // VARIABLE RESET - ON EVERY MESSAGE
    // ==============================
    let VerticesReply = "";
    let imageSummary = "";
    let imagePrompt = "";
    let pdfSummary = "";
    let pdfPrompt = "";
    let media = null;
    let mediaType = "";
    let mediaTypeAI = "";
    let RAGprompt = "";
    let historyContext = "";
    let TAReply = null;
    let TAImages = null;
    
    // ==============================
    // CONSTANT VARIABLES (don't reset these)
    // ==============================
    const userPhone = msg.key.remoteJid;
    const cleanPhoneNo = userPhone.replace(/[@.a-zA-Z]+/g, "");
    const currentDateTime = runHelperCommand("getCurrentDateTime",global.LOCAL_FORMAT ,global.TIME_ZONE);
    
    // Extract user name - Baileys doesn't have notifyName, using pushName instead
    const userName = msg.pushName || "User";

    let userMessage =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    msg.message.imageMessage?.caption ||
    msg.message.videoMessage?.caption ||
    (
        (msg.message.documentMessage?.caption || "") + 
        (msg.message.documentMessage?.fileName ? " " + msg.message.documentMessage.fileName : "")
    ) ||
    "";

    const isAssistBoss = global.ASST_BOSS_PHONE.includes(cleanPhoneNo);
    const isBoss = VerticesBoss.isBossMode(msg, global.BOSS_PHONE) || isAssistBoss;

    // === PAUSE CHECKING (Global or Individual) ===
    if (!isBoss) {
        const isUserOrGlobalPaused = runHelperCommand("isUserPaused", global.PAUSED_FILE, cleanPhoneNo);
        if (isUserOrGlobalPaused === "true" && cleanPhoneNo !== "215435576348678" && cleanPhoneNo !== "175346703962295") {
            // Log the message even though the bot is paused
            runHelperCommand("logChat", cleanPhoneNo, userName, userMessage, "[Pause feature activated]", global.CHAT_HISTORY_DIR);
            console.log(`${MODULE} ignoring message — Paused globally / individually for ${cleanPhoneNo}.`);
            return;
        }
    }

    // === SLEEP MODE CHECK ===
    if (global.VerticesSleepMode==="On" && !isVerticesAwake() ) {
        console.log (`${MODULE} ignoring message. Vertices is currently sleeping Zzzzzzzz.`);
        return;
    }

    // ==============================
    // BOSS COMMANDS HANDLING
    // ==============================
    if (isBoss) {

        let translatedBossCommand;

        // New features, allow Boss commands on voice as well:
        if (msg.message.audioMessage) {
            const bossMedia = await downloadBaileysMedia(msg);
            if (bossMedia) {
                const voiceDir = path.join(__dirname, '../../userdata/voice');
                const userId   = userPhone.replace(/[@.]/g, '_');
                const ts       = Date.now();

                const audioBuffer = Buffer.from(bossMedia.data, 'base64');
                let audioPath = path.join(voiceDir, `user_audio_${userId}_${ts}.${bossMedia.mimetype.includes('ogg') ? 'ogg' : 'mp3'}`);

                try {
                    fs.writeFileSync(audioPath, audioBuffer);
                    console.log(`[${MODULE}] Boss audio saved: ${audioPath}`);

                    const bossInterpretedCmd = await VoiceInterpret(audioPath);

                    if (bossInterpretedCmd) {
                        console.log(`[${MODULE}] Boss voice command: ${bossInterpretedCmd}`);
                        translatedBossCommand = await translateBossCommand(bossInterpretedCmd, chosenURL, chosenModel, chosenAPI, 0.2, 100);
                        if (translatedBossCommand) {
                            console.log(`[${MODULE}] Translated Boss Command: ${translatedBossCommand}`);
                            if (translatedBossCommand === "false") return;
                        } else {
                            console.log(`[${MODULE}] Error translating Boss command.`);
                        }
                    }
                } catch (err) {
                    console.error(`[${MODULE}] Boss voice command error:`, err.message);
                } finally {
                    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
                }
            }
        }

        try {

        if (translatedBossCommand) {
            userMessage = translatedBossCommand;
        }
        const bossCmd = userMessage.toLowerCase();
        const parts   = userMessage.split(" ");


        // === PAUSE/UNPAUSE COMMANDS ===
        if (bossCmd.startsWith("pause all")) {
            runHelperCommand("pauseall",global.PAUSED_FILE);
            VerticesReply = `${MODULE} Global pause activated.`;
            await sock.sendMessage(userPhone, { text: VerticesReply });
            runHelperCommand("logChat", cleanPhoneNo, userName, userMessage, VerticesReply, global.CHAT_HISTORY_DIR);
            return;
        }

        if (bossCmd.startsWith("unpause all")) {
            runHelperCommand("unpauseall",global.PAUSED_FILE);
            VerticesReply = `${MODULE} Global pause lifted.`;
            await sock.sendMessage(userPhone, { text: VerticesReply });
            runHelperCommand("logChat", cleanPhoneNo, userName, userMessage, VerticesReply, global.CHAT_HISTORY_DIR);
            return;
        }

        if (parts.length === 2 && bossCmd.startsWith("pause ")) {
            const target = parts[1].replace(/[^0-9]/g, "");        
            runHelperCommand("pause",global.PAUSED_FILE,target);        
            VerticesReply = `${MODULE} Paused user: ${target}`;
            await sock.sendMessage(userPhone, { text: VerticesReply });
            runHelperCommand("logChat", cleanPhoneNo, userName, userMessage, VerticesReply, global.CHAT_HISTORY_DIR);
            return;
        }

        if (parts.length === 2 && bossCmd.startsWith("unpause ")) {
            const target = parts[1].replace(/[^0-9]/g, "");        
            runHelperCommand("unpause",global.PAUSED_FILE,target);        
            VerticesReply = `${MODULE} Unpaused user: ${target}`;
            await sock.sendMessage(userPhone, { text: VerticesReply });
            runHelperCommand("logChat", cleanPhoneNo, userName, userMessage, VerticesReply, global.CHAT_HISTORY_DIR);
            return;
        }

        if (parts.length === 2 && bossCmd.startsWith("delete ")) {
            const target = parts[1].replace(/[^0-9]/g, "");
            const filePath = path.join(global.CHAT_HISTORY_DIR, `${target}.json`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                VerticesReply = `${MODULE} Deleted chat for user: ${target}`;
                await sock.sendMessage(userPhone, { text: VerticesReply });
            }else{
                VerticesReply = `${MODULE} Chat for user: ${target} doesn't exist`;
                await sock.sendMessage(userPhone, { text: VerticesReply });
            }
            runHelperCommand("logChat", cleanPhoneNo, userName, userMessage, VerticesReply, global.CHAT_HISTORY_DIR);
            return;
        }

        // === MEMORY MANAGEMENT COMMANDS ===
        const firstTwoWords = bossCmd.trim().split(/\s+/).slice(0, 2).join(" ");
        const validMemCommands = [
            "add perm", "add temp", "replace perm", "replace temp",
            "show perm", "show temp", "wipe perm", "wipe temp"
        ];

        if (validMemCommands.includes(firstTwoWords)) {
            const memoryReply = runHelperCommand("memCommand", userMessage);
            if (memoryReply && memoryReply !== "Unrecognized memory command.") {
                await sock.sendMessage(userPhone, { text: memoryReply });
                runHelperCommand("logChat", cleanPhoneNo, userName, userMessage, memoryReply, global.CHAT_HISTORY_DIR);
                return;
            } else {
                console.warn(`[MEMORY WARNING] Unknown memory command from Boss: "${userMessage}"`);
                return;
            }
        }

        // Warn if boss tried to send some invalid memory-related command
        if (isBoss && !validMemCommands.includes(firstTwoWords) && (bossCmd.includes("perm") || bossCmd.includes("temp"))) {
            console.warn(`[WARNING] Boss sent a memory-style command, but "${firstTwoWords}" was not recognized.`);
        }

        // === IMAGE SAVE COMMANDS ===
        try {
            const isImageSaveCommand = /^save images in /i.test(userMessage);
            const isImageMedia = msg.message.imageMessage;

            if (isImageSaveCommand || isImageMedia) {
                await handleImageSaveCommand(msg, sock, userMessage);
                return;
            }
        } catch (err) {
            console.error(`${MODULE} image save command failed:`, err.message);
        }

        // === FOLLOW-UP MODULE TRIGGER ===
        const lowerMsg = userMessage.trim().toLowerCase();
        const followMatch = lowerMsg.match(/^follow up(?:\s+(\d+))?$/);
        if (followMatch) {
            let daysToScan = followMatch[1] ? Number(followMatch[1]) : 3;
            if (isNaN(daysToScan) || daysToScan < 1 || daysToScan > 30) {
                await sock.sendMessage(userPhone, { text: `${MODULE}: Invalid day range. Please use: follow up 1 ~ 30 only.` });
                return;
            }
            await runFollowUpWorkflow(
                sock,
                userPhone,
                chosenEngine,
                chosenURL,
                chosenAPI,
                chosenModel,
                VerticesPersonaShort,
                daysToScan
            );

            await sock.sendMessage(userPhone, { text: `${MODULE}: Scanned past ${daysToScan} day(s). Reply with your approved list within 2 mins.` });
            return;
        }

        // Boss replies with approval for follow-ups
        if (userMessage.toLowerCase().startsWith("follow up")) {
            await confirmFollowUpApproved(
                sock,
                userPhone,
                userName,
                userMessage,
                chosenEngine,
                chosenURL,
                chosenAPI,
                chosenModel,
                VerticesPersonaShort
            );
            await sock.sendMessage(userPhone, { text: `${MODULE}: Follow-ups completed (if valid).` });
            return;
        }

        // === INITIATE/CONTACT COMMANDS ===
        const bossCmdInit = userMessage.toLowerCase().trim();
        if (/^(initiate|contact)\s+/.test(bossCmdInit)) {
            await handleInitiateCommand(
                msg,
                sock,
                userMessage,
                chosenURL,
                chosenModel,
                chosenAPI,
                VerticesPersonaShort,
                0.5,
                200
            );
            return;
        }

        // === BOSS DATA ANALYSIS & REPORTING ===
        if (userMessage){

            const BossChatPrompt = `Below is the chat history between YOU & your Boss:\n${String(runHelperCommand("getLastChatHistory", cleanPhoneNo, global.HISTORY_SHORT, global.CHAT_HISTORY_DIR))}\nAnd Boss latest chat is: "${userMessage}". ${imagePrompt}.\n
            The local date & time now is: ${currentDateTime}.\nDetermine if Boss is requesting a data analysis on the ${global.PERSON}s' chats, enquiries, sales, 
            or messages related to the company's products or services.
            Reply YES in the format below, if Boss is asking for data analysis of ${global.PERSON}'s chats and data on what or when they chat.
            Reply in this format STRICTLY:\nIS_REPORT: YES or NO\nREPLY: <your reply to Boss based on persona, if IS_REPORT is NO.>\n`;

            const bossResponse = await getAIResponse(chosenEngine, VerticesPersonaBoss, BossChatPrompt, 100, 0.4);
            console.log (`Is Boss asking for data analysis? ${bossResponse}\n\n`);

            const match = bossResponse.match(/IS_REPORT:\s*(YES|NO)(?:\s*REPLY:\s*([\s\S]*))?/i);

            if (!match) {
                console.error(`[${MODULE}] Unexpected bossResponse format: "${bossResponse}"`);
                try {
                    await sock.sendMessage(userPhone, { text: "Sorry, unable to process your request. Can rephrase?" });
                    runHelperCommand("logChat", cleanPhoneNo, userName, userMessage, "[Boss Mode parse error]", global.CHAT_HISTORY_DIR);
                } catch (err) {
                    console.error(`[${MODULE}] Failed to reply to Boss: ${err.message}`);
                    runHelperCommand("logChat", cleanPhoneNo, userName, userMessage, "[Reply to Boss failed]", global.CHAT_HISTORY_DIR);
                }
                return;
            }

            const isReport = match[1].trim().toUpperCase();
            const aiReply = match[2] ? match[2].trim() : "";

            if (isReport === "NO") {
                try {
                    await sock.sendMessage(userPhone, { text: aiReply });
                    console.log(`${MODULE} replied: ${aiReply}`);
                    runHelperCommand("logChat", cleanPhoneNo, userName, userMessage, aiReply, global.CHAT_HISTORY_DIR);
                } catch (err) {
                    console.error(`[${MODULE}] Failed to reply to Boss: ${err.message}`);
                    runHelperCommand("logChat", cleanPhoneNo, userName, userMessage, "[Reply to Boss failed]", global.CHAT_HISTORY_DIR);
                }
                return;
            }

            // === DATA ANALYSIS CODE GENERATION AND EXECUTION ===
            const codePrompt = `Below is the chat history between YOU & your Boss:\n${String(runHelperCommand("getLastChatHistory", cleanPhoneNo, global.HISTORY_SHORT, global.CHAT_HISTORY_DIR))}\nAnd his latest chat is: "${userMessage}". ${imagePrompt}.\n
            The local date & time now is: ${currentDateTime}. Generate the necessary codes to get these data for Boss.`;
            
            const gptCode = await VerticesBoss.askAIforCodes(codePrompt, chosenURL, chosenModel, chosenAPI, VerticesPersonaCoder);

            console.log("Code Gen:\n", gptCode);
            if (/console\.log/.test(gptCode)) {
                console.warn(`${MODULE} blocks code: Console.log was used.`);
                VerticesReply = "Blocked execution. Please rephrase your request.";
                await sock.sendMessage(userPhone, { text: VerticesReply });
                console.log(`${MODULE} replied: ${VerticesReply}`);
                runHelperCommand("logChat", cleanPhoneNo, userName, userMessage, VerticesReply, global.CHAT_HISTORY_DIR);
                return;
            }

            if (VerticesBoss.extractCodeFromGPTReply(gptCode) !== null) {
                // Force cleanup and get all chats
                VerticesBoss.getAllChatsFromFolder(global.CHAT_HISTORY_DIR || './chathistory');
                const result = VerticesBoss.runDynamicCode(gptCode);
                console.log("Execution Result:\n", result);

                const smartReplyPrompt = `Below is the chat history between your Boss & YOU:\n${String(runHelperCommand("getLastChatHistory", cleanPhoneNo, global.HISTORY_SHORT, global.CHAT_HISTORY_DIR))}\nYour Boss' latest chat is:\n"${userMessage}". ${imagePrompt}, and 
                you executed a code and got this result:\n"${result}".\nThe date & time now is: ${currentDateTime}. Provide the answer to your Boss without showing any code. 
                Do not use quotation marks and do not include the word Javascript. Keep all answers straight-forward, short and summarized. NO greetings and NO question.`;

                const explainedReply = await getAIResponse(chosenEngine, VerticesPersonaBoss, smartReplyPrompt, 150, 0.4);
                await sock.sendMessage(userPhone, { text: explainedReply });
                console.log(`${MODULE} replied: ${explainedReply}`);
                runHelperCommand("logChat", cleanPhoneNo, userName, userMessage, explainedReply, global.CHAT_HISTORY_DIR);
                return;
            }

        }

        return;

        } catch (err) {
            console.error(`[${MODULE}] Boss command handler error: ${err.message}`);
        }
        return;
    }

    // ==============================
    // GROUP CHAT HANDLING
    // ==============================
    const isGroup = userPhone.endsWith('@g.us');
    if (isGroup) {
        let groupMetadata;
        try {
            groupMetadata = await sock.groupMetadata(userPhone);
        } catch (err) {
            console.error(`[${MODULE}] Failed to fetch group metadata for ${userPhone}: ${err.message}`);
            return;
        }
        const chatName = groupMetadata.subject.toLowerCase().trim();
        const groupName = groupMetadata.subject;
        const allowedGroups = global.GROUP_NAMES.map(name => name.toLowerCase().trim());

        if (global.GROUP_ALLOWED === "Yes" && allowedGroups.includes(chatName)) {
            const senderName = userName;

            const history = String(runHelperCommand("getLastChatHistory", cleanPhoneNo, global.HISTORY_SHORT.toString(), global.CHAT_HISTORY_DIR) );

            // === MEDIA & IMAGE DETECTION FOR GROUPS ===
            if (msg.message.imageMessage || msg.message.videoMessage || msg.message.audioMessage || msg.message.documentMessage) {
                try {
                    // Download media using Baileys
                    media = await downloadBaileysMedia(msg);
                    
                    if (media) {
                        mediaType = media.messageType;
                        mediaTypeAI = detectMediaTypeForAi(media);

                        console.log(`Media type detected for AI: ${mediaTypeAI}`);
                        console.log(`Media type detected for Boss forwarding: ${mediaType}`);
                        console.log(`Media MIME type: ${media.mimetype}`);

                        // Image summary with actual Baileys media
                        if (mediaTypeAI === "image") {
                            imageSummary = await summarizeImage(media, userMessage, global.openaiApi, VerticesPersonaLong);
                            if (imageSummary) {
                                console.log(`Image summary generated: ${imageSummary}`);
                            }
                        } else if (mediaTypeAI === "pdf") {
                            pdfSummary = await summarizePdf(media, chosenAPI);
                            if (pdfSummary) {
                                console.log(`PDF summary generated: ${pdfSummary}`);
                            }
                        } else {
                            console.warn(`Skipping AI image analysis on non-image media type: ${mediaTypeAI}.`);
                        }
                    } else {
                        console.warn('Failed to download media from Baileys message');
                    }
                } catch (err) {
                    console.warn("Failed to process media for summary:", err.message);
                }

                // === VOICE NOTE HANDLING FOR GROUPS ===
                if (global.USEVOICE === "Yes" && mediaType === "audio") {
                    let audioPath = "";
                    let replyPath = "";
                    try {
                        const voiceDir = path.join(__dirname, '../../userdata/voice');
                        const userId = userPhone.replace(/[@.]/g, '_');
                        const ts = Date.now();
                        
                        // Save the audio file
                        const audioBuffer = Buffer.from(media.data, 'base64');
                        audioPath = path.join(voiceDir, `user_audio_${userId}_${ts}.${media.mimetype.includes('ogg') ? 'ogg' : 'mp3'}`);
                        
                        // Save file
                        fs.writeFileSync(audioPath, audioBuffer);
                        console.log(`Audio file saved: ${audioPath}`);

                        // Process voice note
                        const interpretedText = await VoiceInterpret(audioPath);
                        
                        if (interpretedText) {
                            console.log(`User's voice message: ${interpretedText}`);
                            
                            // Image request detection for voice notes
                            const { imageRequestMatch, mergedChat } = await detectPhotoIntent(history, userName, interpretedText);
                            const img_send_result = await imageSend(userPhone, cleanPhoneNo, userName, interpretedText, imageRequestMatch, mergedChat);
                            if (img_send_result) return;

                            const cleanHistory = history
                                .split('\n')
                                .filter(line => line.trim().toLowerCase() !== 'you:')
                                .join('\n');

                            // RAG for voice notes
                            if (global.RAG === "On") {
                                RAGprompt = await genRAGprompt(interpretedText, senderName, VerticesPersonaShort, chosenURL, chosenModel, chosenAPI);
                            }
                            
                            const wholeMessage = `Group name: ${groupName}, 
                            The local date & time now is: ${currentDateTime}.
                            Below is the group chat history between YOU and other group members (latest at the bottom):\n${cleanHistory}\n
                            ${senderName} sends a voice message: "${interpretedText}. ${RAGprompt}"
                            Generate a natural reply based on the chat histories, emphasizing your reply more towards replying the latest chat from ${senderName}.`;

                            const aiReply = await getAIResponse(chosenEngine, VerticesPersonaGroup, wholeMessage, 150, 0.3);
                            console.log(`AI to reply using voice: ${aiReply}`);

                            // Generate and send voice reply
                            replyPath = path.join(voiceDir, `bot_reply_${userId}_${ts}.mp3`);
                            await VoiceGenerate(aiReply, replyPath);

                            await sock.sendMessage(userPhone, {
                                audio: { url: replyPath },
                                mimetype: 'audio/mpeg',
                            });

                            runHelperCommand("logChat", cleanPhoneNo, senderName, `[User sent a voice message]: ${interpretedText}`,`${aiReply}`,global.CHAT_HISTORY_DIR);
                            return;
                        }

                    } catch (err) {
                        console.error("Error while handling voice message:", err.message);
                    } finally {
                        const convertedMp3 = audioPath.replace(/\.ogg$/i, '.mp3');
                        [replyPath, audioPath, convertedMp3].forEach(f => {
                            try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch {}
                        });
                    }
                }
            }

            // === IMAGE REQUEST DETECTION FOR GROUPS ===
            if (!imageSummary && !msg.message.documentMessage){
                const { imageRequestMatch, mergedChat } = await detectPhotoIntent(history, userName, userMessage);
                const img_send_result = await imageSend(userPhone, cleanPhoneNo, userName, userMessage, imageRequestMatch, mergedChat);
                if (img_send_result) return;
            }

            const cleanedHistory = history
                .split('\n')
                .filter(line => line.trim().toLowerCase() !== 'you:')
                .join('\n');

            // === MARKET SCANNER FOR GROUPS ===
            let result = null;
            if (MARKETSCANNER === "On") {
                result = await getTAReplyFromMessage(
                userMessage,
                chosenURL,
                chosenModel,
                chosenAPI,
                VerticesPersonaGroup
              );

              if (result) {
                TAReply = result.message;
                TAImages = result.images || [];
              }
            }
            console.log (`TAReply =============> ${TAReply}`);

            // === RAG FOR GROUP CHATS ===
            if (global.RAG === "On") {
                RAGprompt = await genRAGprompt(userMessage, senderName, VerticesPersonaShort, chosenURL, chosenModel, chosenAPI);
            }

            // Build dynamic group prompt with optional image summary
            const groupPromptParts = [
                `Group name: ${groupName}`,
                `The local date & time now is: ${currentDateTime}.`,
                `Below is the group chat history between YOU and other group members (latest at the bottom):\n${cleanedHistory}\n`,
                `${senderName}: "${userMessage}"\n${RAGprompt}`,
            ];

            if (imageSummary) {
                groupPromptParts.push(`${senderName} also sent an image. Here is what you see:\n${imageSummary}. MUST consider this image too, when you reply. `);
            }

            if (pdfSummary) {
                groupPromptParts.push(`${senderName} also sent a document pdf. Here is what you see:\n${pdfSummary}. MUST consider this document pdf too, when you reply. `);
            }

            if (TAReply) {
                groupPromptParts.push(`You MUST include this technical analysis in your reply too in bullet-point form:\n${TAReply}.`);
            }

            groupPromptParts.push(`Generate a natural reply based on the chat histories, emphasizing your reply more towards replying the latest chat from ${senderName}. ` +
            `Do not include "You:" in your replies.`);

            // Final prompt and group message handling
            const groupPrompt = groupPromptParts.join("\n");
            let groupResult = "skipped";
            try {
                groupResult = await handleGroupMessage({
                    msg,
                    chat: { isGroup: true },
                    groupName,
                    botName: global.BOT_NAME,
                    botNumber: global.BOT_PHONE,
                    client: sock,
                    CHAT_HISTORY_DIR: global.CHAT_HISTORY_DIR,
                    personaLong: VerticesPersonaGroup,
                    personaShort: VerticesPersonaShort,
                    chosenURL,
                    chosenAPI,
                    chosenModel,
                    prompt: groupPrompt,
                    HISTORY_SHORT: global.HISTORY_SHORT,
                    runHelperCommand
                });
                // Send market scanner images if available
                if (TAReply && TAImages && TAImages.length > 0){
                    await sendImagesToGroup(sock, userPhone, TAImages);
                }
            } catch (err) {
                console.error(`${global.BOT_NAME} on ${MODULE}: Group reply failed: ${err.message}`);
                groupResult = "error";
            }

            if (groupResult === "replied") {
                console.log(`${global.BOT_NAME} on ${MODULE}: replied Group message from ${groupName}`);
            } else {
                console.log(`${global.BOT_NAME} on ${MODULE}: didn't reply for Group ${groupName}, logged only.`);
            }
            return;

        } else {
            console.log(`${global.BOT_NAME} on ${MODULE}: ignoring message — Not in allowed groups (${groupName})`);
            return;
        }
    }


    // ==============================
    // INDIVIDUAL CHAT HANDLING
    // ==============================
    if (global.INDIVIDUAL_CHATS === "Yes") {
        // === BLOCK EMPTY MESSAGES ===
        if (!userMessage && !msg.message.imageMessage && !msg.message.videoMessage && !msg.message.audioMessage) {
            console.log(`Empty message received from ${userPhone}, ignoring.`);
            return;
        }

        let chatHistoryShort = String(runHelperCommand("getLastChatHistory", cleanPhoneNo, global.HISTORY_SHORT, global.CHAT_HISTORY_DIR) );
        let chatHistoryLong = String(runHelperCommand("getLastChatHistory", cleanPhoneNo, global.HISTORY_LONG, global.CHAT_HISTORY_DIR) );

        // === MEDIA HANDLING FOR INDIVIDUAL CHATS ===
        if (msg.message.imageMessage || msg.message.videoMessage || msg.message.audioMessage || msg.message.documentMessage) {
            try {
                media = await downloadBaileysMedia(msg);
                if (media) {
                    mediaType = media.messageType;
                    mediaTypeAI = detectMediaTypeForAi(media);

                    console.log(`Media type detected for AI: ${mediaTypeAI}`);
                    console.log(`Media type detected for Boss forwarding: ${mediaType}`);

                    if (mediaTypeAI === "image") {
                        imageSummary = await summarizeImage(media, userMessage, global.openaiApi, VerticesPersonaLong);
                        if (imageSummary) {
                            imagePrompt = `This latest chat also has an image of this description: ${imageSummary}`;
                        }
                    } else if (mediaTypeAI === "pdf") {
                        pdfSummary = await summarizePdf(media, chosenAPI);
                        if (pdfSummary) {
                            pdfPrompt = `This latest chat also has a document pdf of this description: ${pdfSummary}`;
                        }
                    } else {
                        console.warn(`Skipping AI analysis on non-image and non-pdf media type: ${mediaTypeAI}`);
                    }
                }
            } catch (err) {
                console.warn("Failed to process image for summary:", err.message);
            }
        }

        // Handle non-image media forwarding to boss
        if (msg.message.imageMessage || msg.message.videoMessage || msg.message.audioMessage || msg.message.documentMessage) {
            const handled = await handleIncomingMedia(msg, sock, chatHistoryShort, userName);
            if (handled) {
                runHelperCommand("logChat", cleanPhoneNo, userName, `[User sent a media file with this description: ${imageSummary || ""} ${pdfSummary || ""}], along with this chat: "${userMessage}"`, "[Media forwarded to Boss]", global.CHAT_HISTORY_DIR);
            }

            const handledReply = await handleReplyForPendingMedia(msg, sock, chatHistoryShort);
            if (handledReply) {
                runHelperCommand("logChat", cleanPhoneNo, userName, `[User sent a media file with this description: ${imageSummary || ""} ${pdfSummary || ""}] with no chat message.`, "[Forwarded + Media clarified]", global.CHAT_HISTORY_DIR);
            }
        }

        if (pdfPrompt) {
            const prompt = `This is your most recent chat history with ${userName}:\n${chatHistoryLong}\n${userName}: ${userMessage}. ${pdfPrompt || ""}. \n
            The local date & time now is ${currentDateTime}.\nBased on the above chats, your given persona & your role in the company, 
            generate a reply, without any greeting (unless the ${global.PERSON} is greeting you), to the latest message from ${userName}. 
            Vary your replies if the topic has already been replied or answered.`;
            const reply = await getAIResponse(chosenEngine, VerticesPersonaLong, prompt, 150, 0.5);
            try {
                await sock.sendMessage(userPhone, { text: reply });
                console.log("Replied:", reply);
                runHelperCommand("logChat", cleanPhoneNo, userName, userMessage, reply, global.CHAT_HISTORY_DIR);
            } catch (err) {
                console.error(`[${MODULE}] Failed to reply to user ${userPhone}: ${err.message}`);
                runHelperCommand("logChat", cleanPhoneNo, userName, userMessage, "[Reply failed]", global.CHAT_HISTORY_DIR);
            }finally{
                return;
            }
        }


        // === VOICE NOTES FOR INDIVIDUAL CHATS ===
        if (mediaTypeAI.startsWith("audio")) {
            if (global.USEVOICE === "Yes") {
                let audioPath = "";
                let replyPath = "";
                try {
                    const voiceDir = path.join(__dirname, '../../userdata/voice');
                    const userId = userPhone.replace(/[@.]/g, '_');
                    const ts = Date.now();
                    
                    // Save the audio file
                    const audioBuffer = Buffer.from(media.data, 'base64');
                    audioPath = path.join(voiceDir, `user_audio_${userId}_${ts}.${media.mimetype.includes('ogg') ? 'ogg' : 'mp3'}`);
                    
                    // Save file
                    fs.writeFileSync(audioPath, audioBuffer);
                    console.log(`Audio file saved: ${audioPath}`);

                    // Process voice note
                    const interpretedText = await VoiceInterpret(audioPath);
                    
                    if (interpretedText) {
                        console.log(`User's voice message: ${interpretedText}`);
                        
                        // Image request detection for voice notes
                        const { imageRequestMatch, mergedChat } = await detectPhotoIntent(chatHistoryShort, userName, interpretedText);
                        const img_send_result = await imageSend(userPhone, cleanPhoneNo, userName, interpretedText, imageRequestMatch, mergedChat);
                        if (img_send_result) return;

                        const cleanHistory = chatHistoryLong
                            .split('\n')
                            .filter(line => line.trim().toLowerCase() !== 'you:')
                            .join('\n');

                        // RAG for individual voice notes
                        if (global.RAG === "On") {
                            RAGprompt = await genRAGprompt(interpretedText, userName, VerticesPersonaShort, chosenURL, chosenModel, chosenAPI);
                        }
                        
                        const wholeMessage = `The local date & time now is: ${currentDateTime}.
                        Below is the chat history between YOU and ${userName} (latest at the bottom):\n${cleanHistory}\n${RAGprompt}\n
                        ${userName} sends a voice message: "${interpretedText}"
                        Generate a natural reply based on the chat histories, emphasizing your reply more towards replying the latest chat from ${userName}.`;

                        const aiReply = await getAIResponse(chosenEngine, VerticesPersonaLong, wholeMessage, 200, 0.3);
                        console.log(`AI to reply using voice: ${aiReply}`);

                        // Generate and send voice reply
                        replyPath = path.join(voiceDir, `bot_reply_${userId}_${ts}.mp3`);
                        await VoiceGenerate(aiReply, replyPath);

                        await sock.sendMessage(userPhone, {
                            audio: { url: replyPath },
                            mimetype: 'audio/mpeg',
                        });

                        runHelperCommand("logChat", cleanPhoneNo, userName, `[User sent a voice message]: ${interpretedText}`,`${aiReply}`,global.CHAT_HISTORY_DIR);
                        return;
                    }

                } catch (err) {
                    console.error("Error while handling voice message:", err.message);
                } finally {
                    const convertedMp3 = audioPath.replace(/\.ogg$/i, '.mp3');
                    [replyPath, audioPath, convertedMp3].forEach(f => {
                        try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch {}
                    });
                }
            }
        }

        // === ABUSE & MISUSE DETECTION ===
        historyContext = String(runHelperCommand("getLastChatHistory", cleanPhoneNo, global.HISTORY_SHORT.toString(), global.CHAT_HISTORY_DIR) );
        const lineCount = (historyContext.match(/\n/g) || []).length;
        console.log (`Number of lines of chats: ${lineCount}`);

        // Trigger every HISTORY_SHORT worth of lines for abuse detection
        if (lineCount >= global.HISTORY_SHORT) {
            const abusePrompt = `Based on these OVERALL chats below:\n\n${historyContext}\n${userName}: ${userMessage}. ${imagePrompt}.\n\nDo YOU think ${userName} 
            is wasting your time and has no intention of enquiring or buying your company's products & services? Reply strictly with only one word: YES or NO. Do NOT explain.`;

            let aiDecision = await getAIResponse(chosenEngine, VerticesPersonaShort, abusePrompt, 15, 0.4);
            console.log(`Is this person's chats IRRELEVANT & WASTING TIME ? =========================> ${aiDecision}`);

            let abuseResponse = aiDecision.trim().toUpperCase();
            if (abuseResponse.startsWith("YES")) {
                let cleanUserPhone = userPhone.replace(/[@.a-zA-Z]+/g, "");

                const wasNotified = runHelperCommand("wasBossNotified", cleanUserPhone, global.ABUSE_NOTIFICATION_FILE, expiryBossReport.toString());

                if (wasNotified === "true") {
                    console.log(`Reported to Boss of ${cleanUserPhone} Irrelevant Chats within the last X minutes. Skipping notification.`);
                } else {
                    let notificationMsg = `🔔 *IRRELEVANT CHATS ALERT!!!*\n\n${global.PERSON}: *${userName}*\n\nWhatsApp ID: *${userPhone}*\n\n*Conversation:*\n${historyContext}\n\nLast chat: ${userMessage}`;

                    console.log(`BOSS PHONE: ${global.BOSS_PHONE}`);
                    try {
                        await sock.sendMessage(global.BOSS_PHONE, { text: notificationMsg });

                        // Sends notifications to all assistant boss as well
                        for (let phone of global.ASST_BOSS_PHONE){
                            await sock.sendMessage(phone + (phone.length <= 12 ? '@s.whatsapp.net' : '@lid'), { text: notificationMsg });
                        }

                        runHelperCommand("updateNotificationTimestamp", cleanUserPhone, userName, global.ABUSE_NOTIFICATION_FILE);
                        console.log(`Reported to Boss of IRRELEVANT CHATS from ${cleanUserPhone}: ${notificationMsg}`);
                    } catch (err) {
                        console.error(`Failed to notify Boss of irrelevant chats: ${err.message}`);
                    }
                }

                runHelperCommand("logChat", cleanPhoneNo, userName, userMessage, "Your conversations are out of topic.", global.CHAT_HISTORY_DIR);
                return;
            }
        } else {
            console.log(`Skipping abuse detection: Chat history too short (${lineCount} lines) for ${userPhone}`);
        }

        // Message Blocks Management
        if (!isBoss) {
            const phoneKeys = Object.keys(MsgBlocks);
            if (!phoneKeys.includes(userPhone)) {
                MsgBlocks[userPhone] = {
                    time: Date.now(),
                    messages: [userMessage],
                    imagePrompt,
                    msg,
                    userName,
                    chatHistoryShort, // Remains same for the block
                    chatHistoryLong, // Remains same for the block
                    currentDateTime,
                    processing: false
                };
            } else {
                MsgBlocks[userPhone].time = Date.now();
                MsgBlocks[userPhone].messages.push(userMessage);
                MsgBlocks[userPhone].imagePrompt = `${MsgBlocks[userPhone].imagePrompt} plus an image of this description: ${imageSummary}`
            }
        }

        // === SALES POTENTIAL DETECTION ===
        historyContext = runHelperCommand("getLastChatHistory", cleanPhoneNo, global.HISTORY_SHORT.toString(), global.CHAT_HISTORY_DIR);
        const intentCheckPrompt = `Based on these OVERALL chats below:\n\n${historyContext}\n${userName}: ${userMessage}. ${imagePrompt}.\n\n
        Do YOU think this ${global.PERSON} has the potential in ${global.JOB} opportunity? Reply strictly with only one word: YES or NO. DO NOT explain.`;

        let intentDecision = await getAIResponse(chosenEngine, VerticesPersonaShort, intentCheckPrompt, 15, 0.5);
        console.log(`AI DETECTION OF POSITIVE POTENTIAL =========================> ${intentDecision}`);

        let salesResponse = intentDecision.trim().toUpperCase();
        if (salesResponse.startsWith("YES")) {
            let cleanUserPhone = userPhone.replace(/[@.a-zA-Z]+/g, "");

            const wasNotified = runHelperCommand("wasBossNotified", cleanUserPhone, global.SALES_NOTIFICATION_FILE, expiryBossReport.toString());

            if (wasNotified === "true") {
                console.log(`Boss was notified of ${cleanUserPhone} within the last X minutes. Skipping notification.`);
            } else {
                let notificationMsg = `🔔 *Potential Notification!*\n\n${global.PERSON}: *${userName}*\n\nWhatsApp ID: *${userPhone}*\n\n*Conversation:*\n${historyContext}\n\nLast chat: ${userMessage}`;

                try {
                    await sock.sendMessage(global.BOSS_PHONE, { text: notificationMsg });

                    // Sends notifications to all assistant boss as well
                    for (let phone of global.ASST_BOSS_PHONE){
                        await sock.sendMessage(phone + (phone.length <= 12 ? '@s.whatsapp.net' : '@lid'), { text: notificationMsg });
                    }

                    runHelperCommand("updateNotificationTimestamp", cleanUserPhone, userName, global.SALES_NOTIFICATION_FILE);
                    console.log(`Notified Boss of potential from ${cleanUserPhone}: ${notificationMsg}`);
                } catch (err) {
                    console.warn(`Failed to send potential notification to Boss: ${err.message}`);
                }
            }
        }

    }
    
}

// ==============================
// START THE BOT
// ==============================
console.log("Hello World");
initializeBot();