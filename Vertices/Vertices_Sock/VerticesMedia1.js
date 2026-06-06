// VerticesMedia1.js
const fs   = require("fs");
const path = require('path');
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { runHelperCommand } = require('./VerticesHelper.js');
const MODULE = path.basename(__filename, path.extname(__filename));

// In-memory store for media waiting for a caption reply: { [jid]: { media, mediaType, timestamp, userName } }
const pendingMedia = {};

const CHAT_HISTORY_DIR = path.join(__dirname, '..', '..', 'userdata', 'chathistory');

// === UTILITIES ===
async function getBossName() {
    return "Boss";
}

function prepareBossForwardMessage(userName, userPhone, chatHistoryShort, mediaType, userMessage = "") {
    return `📤 *Media Alert to Boss*\n\nPerson: *${userName}*\nPhone: *+${userPhone}*\nMedia Type: ${mediaType}\n\n` +
           `📄 *Recent Chat History:*\n${chatHistoryShort}\n\n` +
           (userMessage ? `*User Message with Media:*\n"${userMessage}"` : "*No message text included with media.*");
}

function getMediaType(mime) {
    if (mime.startsWith("image/"))                    return "Image";
    if (mime.startsWith("video/"))                    return "Video";
    if (mime.startsWith("audio/"))                    return "Audio";
    if (mime.includes("pdf"))                         return "PDF Document";
    if (mime.includes("word"))                        return "Word Document";
    if (mime.includes("excel"))                       return "Excel Spreadsheet";
    if (mime.includes("zip") || mime.includes("rar")) return "Compressed File";
    return "File";
}

// === MEDIA DOWNLOAD ===
async function downloadBaileysMedia(msg) {
    try {
        let messageType    = null;
        let messageContent = null;

        if (msg.message?.imageMessage)    { messageType = 'image';    messageContent = msg.message.imageMessage; }
        else if (msg.message?.videoMessage)    { messageType = 'video';    messageContent = msg.message.videoMessage; }
        else if (msg.message?.audioMessage)    { messageType = 'audio';    messageContent = msg.message.audioMessage; }
        else if (msg.message?.documentMessage) { messageType = 'document'; messageContent = msg.message.documentMessage; }

        if (!messageContent) {
            console.log(`[${MODULE}] No media content found in message.`);
            return null;
        }

        const stream = await downloadContentFromMessage(messageContent, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        return {
            data:        buffer.toString('base64'),
            mimetype:    messageContent.mimetype || 'application/octet-stream',
            filename:    messageContent.fileName || `media.${messageType}`,
            messageType
        };

    } catch (err) {
        console.error(`[${MODULE}] Error downloading media:`, err.message);
        return null;
    }
}

// === FORWARD HELPER ===
async function forwardMediaToBoss(sock, media, mediaType, userName) {
    const buf = Buffer.from(media.data, 'base64');
    const caption = `Forwarded ${mediaType.toLowerCase()} from ${userName}`;

    if (mediaType === "Image") {
        await sock.sendMessage(global.BOSS_PHONE, { image: buf, caption });
    } else if (mediaType === "Video") {
        await sock.sendMessage(global.BOSS_PHONE, { video: buf, caption });
    } else if (mediaType === "Audio") {
        await sock.sendMessage(global.BOSS_PHONE, { audio: buf, caption });
    } else {
        await sock.sendMessage(global.BOSS_PHONE, {
            document: buf,
            mimetype: media.mimetype,
            fileName: media.filename || "file.pdf",
            caption
        });
    }
}

// === INCOMING MEDIA HANDLER ===
async function handleIncomingMedia(msg, sock, chatHistoryShort, userName) {
    const userPhone = msg.key.remoteJid;
    const cleanPhone = userPhone.replace(/[@.a-zA-Z]+/g, ""); // plain digit string for logging

    const media = await downloadBaileysMedia(msg);
    if (!media) return false;

    const bossName  = await getBossName();
    const mediaType = getMediaType(media.mimetype);

    const userMessage =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        ((msg.message?.documentMessage?.caption || "") +
         (msg.message?.documentMessage?.fileName ? " " + msg.message.documentMessage.fileName : "")) ||
        "";

    const hasText = !!userMessage.trim();

    if (hasText || mediaType === "Image") {
        const forwardMsg = prepareBossForwardMessage(userName, cleanPhone, chatHistoryShort, mediaType, userMessage || "(no caption)");
        try {
            await sock.sendMessage(global.BOSS_PHONE, { text: forwardMsg });
            await forwardMediaToBoss(sock, media, mediaType, userName);
            await new Promise(resolve => setTimeout(resolve, 1200));
            console.log(`[${MODULE}] Forwarded ${mediaType} from ${userName} to Boss.`);
            runHelperCommand("logChat", global.BOSS_PHONE.split('@')[0], bossName, "", forwardMsg, CHAT_HISTORY_DIR);
        } catch (err) {
            console.warn(`[${MODULE}] Failed to forward media from ${userName}:`, err.message);
        }
        return true;
    }

    // Store for later if no text caption yet
    pendingMedia[userPhone] = { media, mediaType, timestamp: Date.now(), userName };
    return true;
}

// === PENDING MEDIA REPLY HANDLER ===
async function handleReplyForPendingMedia(msg, sock, chatHistoryShort) {
    const userPhone = msg.key.remoteJid;

    if (!pendingMedia[userPhone]) return false;

    const userMessage = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
    const bossName    = await getBossName();
    const { media, mediaType, timestamp, userName } = pendingMedia[userPhone];

    const ageMinutes = (Date.now() - timestamp) / 60000;
    if (ageMinutes > global.MEDIA_EXPIRY_MINUTES) {
        console.log(`[${MODULE}] Pending media for ${userPhone} expired (${Math.floor(ageMinutes)} mins). Cleaning up.`);
        delete pendingMedia[userPhone];
        try {
            await sock.sendMessage(userPhone, {
                text: `Sorry, the file you sent me expired after ${global.MEDIA_EXPIRY_MINUTES} mins.\nPlease resend it, so that I can forward it to my Boss.`
            });
        } catch (err) {
            console.warn(`[${MODULE}] Failed to send expiry notice to ${userPhone}:`, err.message);
        }
        return false;
    }

    const cleanPhone = userPhone.replace(/[@.a-zA-Z]+/g, "");
    const forwardMsg = prepareBossForwardMessage(userName, cleanPhone, chatHistoryShort, mediaType, userMessage);

    try {
        await sock.sendMessage(global.BOSS_PHONE, { text: forwardMsg });
        await forwardMediaToBoss(sock, media, mediaType, userName);
        console.log(`[${MODULE}] Forwarded cached ${mediaType} + reply from ${userName} to Boss.`);
    } catch (err) {
        console.warn(`[${MODULE}] Failed to forward cached media from ${userName}:`, err.message);
        return false;
    }

    runHelperCommand("logChat", global.BOSS_PHONE.split('@')[0], bossName, "", forwardMsg, CHAT_HISTORY_DIR);
    delete pendingMedia[userPhone];
    return true;
}

// === CLEANUP ===
function cleanupExpiredMedia() {
    const cutoff = global.MEDIA_EXPIRY_MINUTES * 60000;
    for (const phone in pendingMedia) {
        if (Date.now() - pendingMedia[phone].timestamp > cutoff) {
            console.log(`[${MODULE}] Auto-cleaned expired media for ${phone}`);
            delete pendingMedia[phone];
        }
    }
}

module.exports = {
    downloadBaileysMedia,
    handleIncomingMedia,
    handleReplyForPendingMedia,
    cleanupExpiredMedia
};
