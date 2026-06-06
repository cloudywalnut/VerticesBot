// VerticesGroup3.js
const fs   = require("fs");
const path = require("path");
const axios = require("axios");
const { default: axiosRetry } = require('axios-retry');
const MODULE = path.basename(__filename, path.extname(__filename));

axiosRetry(axios, { retries: 2, retryDelay: axiosRetry.exponentialDelay });
const TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS || "120000");

// === GROUP DETECTION ===
function isBotNameMentioned(botName, msgText) {
    return msgText.toLowerCase().includes(botName.toLowerCase());
}

// === AI GROUP DECISION ===
async function getGroupReplyDecision(persona, prompt, aiApiKey, aiModel, aiURL) {
    try {
        const response = await axios.post(aiURL, {
            model: aiModel,
            messages: [
                { role: "system", content: persona },
                { role: "user",   content: prompt }
            ],
            temperature: 0.5,
            max_tokens:  800
        }, {
            headers: {
                "Authorization": `Bearer ${aiApiKey}`,
                "Content-Type":  "application/json"
            },
            timeout: TIMEOUT_MS
        });

        if (!response.data?.choices?.[0]) return "REPLY: ";
        return response.data.choices[0].message.content.trim();
    } catch (err) {
        console.error(`[${MODULE}] Group AI error:`, err.code || err.message);
        return "REPLY: ";
    }
}

function extractGroupReply(responseText) {
    const match = responseText.match(/REPLY:\s*([\s\S]*)/i);
    return match ? match[1].trim() : "";
}

function parseGroupDecisionAIResponse(responseText) {
    const result = { shouldReply: false, type: "", reason: "" };

    const replyMatch  = responseText.match(/REPLY:\s*(YES|NO)/i);
    const typeMatch   = responseText.match(/TYPE:\s*(\w+)/i);
    const reasonMatch = responseText.match(/REASON:\s*(.*)/i);

    if (replyMatch?.[1]?.toLowerCase() === "yes") result.shouldReply = true;
    if (typeMatch)   result.type   = typeMatch[1].toLowerCase();
    if (reasonMatch) result.reason = reasonMatch[1].trim();

    return result;
}

function wrapFriendlyPrompt(originalPrompt) {
    return `Reply to the original chat prompt:\n${originalPrompt}\n\nREPLY:`;
}

// === CHAT LOGGING ===
// NOTE: Keys user_phone, user_name, user_message, Vertices_response are persisted to disk — do not rename.
function logGroupChat(jsonPath, userPhone, userName, msgText, botReply = "") {
    const newLog = {
        datetime:          new Date().toISOString(),
        user_phone:        userPhone,
        user_name:         userName,
        user_message:      msgText,
        Vertices_response: botReply
    };

    let existing = [];
    if (fs.existsSync(jsonPath)) {
        try { existing = JSON.parse(fs.readFileSync(jsonPath, "utf8")); } catch {}
    }

    existing.push(newLog);
    try {
        fs.writeFileSync(jsonPath, JSON.stringify(existing, null, 2));
    } catch (err) {
        console.error(`[${MODULE}] Failed to log group chat:`, err.message);
    }
}

// === MAIN GROUP MESSAGE HANDLER ===
async function handleGroupMessage(options) {
    const {
        msg,
        chat,
        groupName,
        botName,
        botNumber,
        client,
        CHAT_HISTORY_DIR,
        personaLong,
        personaShort,
        chosenURL,
        chosenAPI,
        chosenModel,
        prompt,
        HISTORY_SHORT,
        runHelperCommand
    } = options;

    const senderPhone  = msg.key.remoteJid;
    const cleanedPhone = senderPhone.split('@')[0];
    const senderName   = msg.pushName || "GroupMember";

    const msgText =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        ((msg.message?.documentMessage?.caption || "") +
         (msg.message?.documentMessage?.fileName ? " " + msg.message.documentMessage.fileName : "")) ||
        "";

    const isBotMentioned = isBotNameMentioned(botName, msgText);
    const chatFile = path.join(CHAT_HISTORY_DIR, `${cleanedPhone}.json`);

    const hasMedia = msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.documentMessage;
    if (!msgText && !hasMedia) {
        console.log(`[${MODULE}] Empty group message from ${senderName}, skipping.`);
        return "skipped";
    }

    const history = runHelperCommand("getLastChatHistory", cleanedPhone, HISTORY_SHORT.toString(), CHAT_HISTORY_DIR);
    const cleanedHistory = history
        .split('\n')
        .filter(line => line.trim().toLowerCase() !== 'you:')
        .join('\n');

    const aiDecisionPrompt = `
        You are an intelligent WhatsApp bot named "${botName}" deciding whether to reply in a group chat.
        ROLE: as described in your system persona.
        Recent chat history (latest last):
        ${cleanedHistory}
        New message from ${senderName}: "${msgText}"
        Evaluate the chat history, context and put more emphasis on the latest chat and then decide:
        1. Should the bot reply?
        2. What type of message is this? (casual, job_related, repeat, off_topic)
        3. Why?
        Format your response strictly like this:
        REPLY: YES or NO
        TYPE: one-word-type
        REASON: your short explanation
        `;

    const aiRawDecision = await getGroupReplyDecision(personaShort, aiDecisionPrompt, chosenAPI, chosenModel, chosenURL);
    const decision = parseGroupDecisionAIResponse(aiRawDecision);

    console.log(`[${MODULE}] REPLY: ${decision.shouldReply} | TYPE: ${decision.type} | REASON: ${decision.reason}`);

    const forceReply = !decision.shouldReply && isBotMentioned;

    if (!decision.shouldReply && !forceReply) {
        console.log(`[${MODULE}] Skipped reply (AI: NO, no bot mention). Reason: ${decision.reason}`);
        logGroupChat(chatFile, cleanedPhone, senderName, msgText, "");
        return "logged_only";
    } else if (forceReply) {
        console.log(`[${MODULE}] Overriding AI decision — bot name was mentioned.`);
    }

    const finalPrompt = forceReply ? wrapFriendlyPrompt(prompt) : prompt;
    const aiRaw  = await getGroupReplyDecision(personaLong, finalPrompt, chosenAPI, chosenModel, chosenURL);
    let reply = extractGroupReply(aiRaw);
    if (!reply) reply = aiRaw.trim();

    const loweredReply = reply.toLowerCase();
    if (!loweredReply || loweredReply === "(empty)") {
        console.log(`[${MODULE}] AI chose not to reply in group ${groupName} for ${senderName}.`);
        logGroupChat(chatFile, cleanedPhone, senderName, msgText, "");
        return "logged_only";
    }

    const cleanedReply = reply.trim().toUpperCase();
    if (["YES", "NO", "REPLY:"].includes(cleanedReply) || cleanedReply.startsWith("TYPE:") || cleanedReply.startsWith("REASON:")) {
        console.log(`[${MODULE}] AI response looks like a decision block — skipping reply.`);
        logGroupChat(chatFile, cleanedPhone, senderName, msgText, "");
        return "logged_only";
    }

    try {
        await client.sendMessage(senderPhone, { text: reply });
    } catch (err) {
        console.error(`[${MODULE}] Failed to reply to group message from ${senderName}:`, err.message);
        logGroupChat(chatFile, cleanedPhone, senderName, msgText, "[Reply failed]");
        return "error";
    }

    logGroupChat(chatFile, cleanedPhone, senderName, msgText, reply);
    console.log(`[${MODULE}] Replied to group:`, reply);
    return "replied";
}

// === IMAGE SENDING ===
async function sendImagesToGroup(client, chatId, imagePaths) {
    if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
        console.log(`[${MODULE}] No images to send.`);
        return;
    }

    for (const imgPath of imagePaths) {
        try {
            await client.sendMessage(chatId, { image: { url: imgPath } });
            console.log(`[${MODULE}] Sent image: ${imgPath}`);
        } catch (err) {
            console.error(`[${MODULE}] Failed to send image ${imgPath}:`, err.message);
        }
    }
}

module.exports = { handleGroupMessage, sendImagesToGroup, isBotNameMentioned };
