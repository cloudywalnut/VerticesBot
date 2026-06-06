// VerticesVoiceNotes1.js
const fs   = require('fs');
const path = require('path');
const { runHelperCommand } = require('./VerticesHelper.js');
const VoiceInterpret = require('./VerticesVoiceInterpret1.js');
const VoiceGenerate  = require('./VerticesVoiceGen2.js');
const { AIQuery }    = require('./VerticesAIQuery1.js');
const MODULE = path.basename(__filename, path.extname(__filename));

const VOICE_DIR = path.join(__dirname, '..', '..', 'userdata', 'voice');

// === GROUP VOICE NOTE HANDLER ===
async function handleGroupVoiceNote({
    msg,
    media,
    history,
    groupName,
    currentDateTime,
    senderName,
    chosenURL,
    chosenModel,
    chosenAPI,
    personaGroup,
    client
}) {
    if (global.USEVOICE !== "Yes") return null;

    const userId    = msg.key.remoteJid.replace(/[@.]/g, '_');
    const ts        = Date.now();
    const oggPath   = path.join(VOICE_DIR, `user_audio_${userId}_${ts}.ogg`);
    const mp3Path   = oggPath.replace('.ogg', '.mp3');
    const replyPath = path.join(VOICE_DIR, `bot_reply_${userId}_${ts}.mp3`);

    let interpretedText = null;
    let replyMode       = null;

    try {
        console.log(`[${MODULE}] Received media type: ${media?.mimetype}`);

        if (media.mimetype === 'audio/ogg; codecs=opus') {
            fs.writeFileSync(oggPath, media.data, 'base64');

            if (!fs.existsSync(oggPath)) {
                console.error(`[${MODULE}] Audio file was not saved correctly.`);
                return null;
            }

            await new Promise(resolve => setTimeout(resolve, 200));
            interpretedText = await VoiceInterpret(oggPath);

            if (!interpretedText) {
                console.warn(`[${MODULE}] Voice message was empty or failed to transcribe.`);
                return null;
            }

            console.log(`[${MODULE}] User voice message: ${interpretedText}`);
            replyMode = 'audio';
        }

        const cleanHistory = history
            .split('\n')
            .filter(line => line.trim().toLowerCase() !== 'you:')
            .join('\n');

        const prompt = `Group name: ${groupName},\nThe local date & time now is: ${currentDateTime}.\nBelow is the group chat history between YOU and other group members (latest at the bottom):\n${cleanHistory}\n\n${senderName} now sends a voice chat: "${interpretedText}"\nGenerate a natural reply based on the chat histories, emphasizing your reply more towards replying the latest chat from ${senderName}.`;

        const aiReply = await AIQuery(prompt, chosenURL, chosenModel, chosenAPI, personaGroup, 0.6, 150);
        console.log(`[${MODULE}] AI group voice reply: ${aiReply}`);

        if (replyMode === 'audio') {
            await VoiceGenerate(aiReply, replyPath);

            if (!fs.existsSync(replyPath) || fs.statSync(replyPath).size < 1024) {
                console.error(`[${MODULE}] Reply audio file missing or too small. Skipping send.`);
                return null;
            }

            try {
                await client.sendMessage(msg.key.remoteJid, {
                    audio:    { url: replyPath },
                    mimetype: 'audio/mpeg',
                    ptt:      false
                });
            } catch (err) {
                console.error(`[${MODULE}] sendMessage failed:`, err.message);
            }

            runHelperCommand("logChat", msg.key.remoteJid.split('@')[0], senderName,
                `[User sent a voice message]: ${interpretedText}`, aiReply, global.CHAT_HISTORY_DIR);
            return aiReply;
        }

    } catch (err) {
        console.error(`[${MODULE}] Error handling group voice note:`, err.message);
        throw err;
    } finally {
        [oggPath, mp3Path, replyPath].forEach(file => {
            try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
        });
    }

    return null;
}

// === INDIVIDUAL VOICE NOTE HANDLER ===
async function handleIndiVoiceNote({
    msg,
    media,
    chatHistoryShort,
    currentDateTime,
    senderName,
    userPhone,
    chosenURL,
    chosenModel,
    chosenAPI,
    personaLong,
    client
}) {
    if (global.USEVOICE !== "Yes") return null;

    const userId    = msg.key.remoteJid.replace(/[@.]/g, '_');
    const ts        = Date.now();
    const oggPath   = path.join(VOICE_DIR, `user_audio_${userId}_${ts}.ogg`);
    const mp3Path   = oggPath.replace('.ogg', '.mp3');
    const replyPath = path.join(VOICE_DIR, `bot_reply_${userId}_${ts}.mp3`);

    let interpretedText = null;
    let replyMode       = null;

    try {
        console.log(`[${MODULE}] Received media type: ${media?.mimetype}`);

        if (media.mimetype === 'audio/ogg; codecs=opus') {
            fs.writeFileSync(oggPath, media.data, 'base64');

            if (!fs.existsSync(oggPath)) {
                console.error(`[${MODULE}] Audio file was not saved correctly.`);
                return null;
            }

            await new Promise(resolve => setTimeout(resolve, 200));
            interpretedText = await VoiceInterpret(oggPath);

            if (!interpretedText) {
                console.warn(`[${MODULE}] Voice message was empty or failed to transcribe.`);
                return null;
            }

            console.log(`[${MODULE}] User voice message: ${interpretedText}`);
            replyMode = 'audio';
        }

        const cleanHistory = chatHistoryShort
            .split('\n')
            .filter(line => line.trim().toLowerCase() !== 'you:')
            .join('\n');

        const prompt = `The local date & time now is: ${currentDateTime}.\nBelow is the chat history between YOU and ${senderName} (latest at the bottom):\n${cleanHistory}\n\n${senderName} now sends a voice chat: "${interpretedText}"\nGenerate a natural reply based on the chat histories, emphasizing your reply more towards replying the latest chat from ${senderName}.`;

        const aiReply = await AIQuery(prompt, chosenURL, chosenModel, chosenAPI, personaLong, 0.5, 200);
        console.log(`[${MODULE}] AI replies ${senderName} via voice: ${aiReply}`);

        if (replyMode === 'audio') {
            await VoiceGenerate(aiReply, replyPath);

            if (!fs.existsSync(replyPath) || fs.statSync(replyPath).size < 1024) {
                console.error(`[${MODULE}] Reply audio file missing or too small. Skipping send.`);
                return null;
            }

            try {
                await client.sendMessage(msg.key.remoteJid, {
                    audio:    { url: replyPath },
                    mimetype: 'audio/mpeg',
                    ptt:      false
                });
                runHelperCommand("logChat", userPhone, senderName, interpretedText, aiReply, global.CHAT_HISTORY_DIR);
            } catch (err) {
                console.error(`[${MODULE}] sendMessage failed:`, err.message);
            }

            return aiReply;
        }

    } catch (err) {
        console.error(`[${MODULE}] Error handling individual voice note:`, err.message);
        throw err;
    } finally {
        [oggPath, mp3Path, replyPath].forEach(file => {
            try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch {}
        });
    }

    return null;
}

module.exports = { handleGroupVoiceNote, handleIndiVoiceNote };
