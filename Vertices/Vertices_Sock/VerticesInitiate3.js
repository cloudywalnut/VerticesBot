// VerticesInitiate3.js
const fs   = require("fs");
const path = require("path");
const { AIQuery } = require("./VerticesAIQuery1.js");
const { runHelperCommand } = require('./VerticesHelper.js');
const MODULE = path.basename(__filename, path.extname(__filename));

const CHAT_HISTORY_DIR = path.join(__dirname, '..', '..', 'userdata', 'chathistory');
const MAX_NUMBERS = 10;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// === INITIATE / CONTACT COMMAND HANDLER ===
async function handleInitiateCommand(msg, sock, userMessage, chosenURL, chosenModel, chosenAPI, persona, temp, maxToken) {
    const userPhone = msg.key.remoteJid;
    const userName  = msg.pushName || "User";

    console.log(`[${MODULE}] Initiate command from ${userPhone}: ${userMessage}`);

    if (!userMessage.toLowerCase().startsWith("initiate") && !userMessage.toLowerCase().startsWith("contact")) return;

    const numberPattern = `(?:\\+?\\d{10,15}\\s*){1,${MAX_NUMBERS}}`;
    const regex = new RegExp(`^\\s*(Initiate|Contact)\\s+(${numberPattern})([\\s\\S]+)$`, 'i');
    const match = userMessage.match(regex);

    if (match) {
        const numberBlock = match[2];
        const promptText  = match[3].trim();
        const numberMatches = numberBlock.match(/\+?\d{10,15}/g);

        if (!numberMatches || numberMatches.length === 0) {
            try {
                await sock.sendMessage(userPhone, { text: "No valid numbers found. Format: Contact +60123456789 message" });
            } catch (err) {
                console.error(`[${MODULE}] Failed to send error message:`, err.message);
            }
            return;
        }

        const aiPrompt = `Your Boss sent you this message with the following instructions:\nBoss' message: "${promptText}"\nYour Output (just the message body that is chunked up like a real whatsapp message and every chunk is separated by '|'. You should not use more than 3 chunks):`.trim();

        let finalMessage = "";
        let finalMessageChunked = [];

        try {
            finalMessage = await AIQuery(aiPrompt, chosenURL, chosenModel, chosenAPI, persona, temp, maxToken);
            finalMessageChunked = finalMessage.split('|').map(chunk => chunk.trim());
            finalMessage = finalMessageChunked.join(' ').trim();

            if (!finalMessage || finalMessage.length < 3) {
                throw new Error("AIQuery returned an invalid or empty message.");
            }
            console.log(`[${MODULE}] Final message to send: ${finalMessage}`);
        } catch (aiErr) {
            console.error(`[${MODULE}] Error calling AIQuery:`, aiErr.message);
            try {
                await sock.sendMessage(userPhone, { text: "Failed to generate message from AI. Please try again later." });
            } catch (err) {
                console.error(`[${MODULE}] Failed to send error message:`, err.message);
            }
            return;
        }

        const resultLines = [];
        for (const numRaw of numberMatches) {
            let cleaned = numRaw.trim().replace(/\D/g, '');

            // Look up contact name from chat history if available
            let contactPersonName = global.PERSON;
            try {
                const historyFile = path.join(CHAT_HISTORY_DIR, `${cleaned}.json`);
                const contactHistory = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
                contactPersonName = contactHistory[contactHistory.length - 1]?.user_name || global.PERSON;
            } catch {}

            // Convert local (0-prefixed) Malaysian number to international format
            if (cleaned.startsWith('0')) cleaned = '6' + cleaned.slice(1);

            // Add WhatsApp JID suffix only at send time
            const jid = cleaned.length <= 12 ? cleaned + "@s.whatsapp.net" : cleaned + "@lid";

            try {
                for (const chunk of finalMessageChunked) {
                    if (chunk) await sock.sendMessage(jid, { text: chunk });
                }
                runHelperCommand("logChat", cleaned, contactPersonName, "", finalMessage, CHAT_HISTORY_DIR);
                console.log(`[${MODULE}] Message sent to ${jid}`);
                resultLines.push(`✅ ${numRaw}`);
            } catch (err) {
                console.error(`[${MODULE}] Error sending to ${jid}:`, err.message);
                resultLines.push(`❌ ${numRaw}`);
            }
            await delay(1000);
        }

        const replyText =
            `📤 *Message Generated:*\n\`\`\`\n${finalMessage}\n\`\`\`\n\n` +
            `📬 *Delivery Status:*\n` +
            resultLines.join("\n");

        try {
            await sock.sendMessage(userPhone, { text: replyText });
        } catch (err) {
            console.error(`[${MODULE}] Error sending confirmation to boss:`, err.message);
        }

        const allNumbers = numberMatches.map(n => n.trim()).join(', ');
        const bossLogMsg = `[Initiated BOSS CONTACT with this message: ${finalMessage} To: ${allNumbers}]`;
        try {
            runHelperCommand("logChat", userPhone.split('@')[0], userName, "", bossLogMsg, CHAT_HISTORY_DIR);
        } catch (err) {
            console.warn(`[${MODULE}] Failed to log boss contact:`, err.message);
        }

        return;
    }

    // Unmatched format
    if (userMessage.length > 0) {
        console.log(`[${MODULE}] Unrecognized initiate command from ${userPhone}: ${userMessage}`);
        try {
            await sock.sendMessage(userPhone, {
                text: "Invalid command.\nUse: Contact +60123456789 [message]\nSupports up to 10 numbers."
            });
        } catch (err) {
            console.error(`[${MODULE}] Failed to reply invalid command message:`, err.message);
        }
    }
}

module.exports = { handleInitiateCommand };
