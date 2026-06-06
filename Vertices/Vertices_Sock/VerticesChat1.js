// VerticesChat1.js
const fs   = require('fs');
const path = require('path');

// === UTILITIES ===
function formatTimestamp(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}` +
           `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
}

// === PERSONA ===
function loadPersona(longFile, shortFile, groupFile, coderFile, bossFile) {
    if (![longFile, shortFile, groupFile, coderFile, bossFile].every(f => fs.existsSync(f))) {
        return null;
    }
    try {
        return {
            VerticesPersonaLong:  fs.readFileSync(longFile,  'utf-8'),
            VerticesPersonaShort: fs.readFileSync(shortFile, 'utf-8'),
            VerticesPersonaGroup: fs.readFileSync(groupFile, 'utf-8'),
            VerticesPersonaCoder: fs.readFileSync(coderFile, 'utf-8'),
            VerticesPersonaBoss:  fs.readFileSync(bossFile,  'utf-8')
        };
    } catch (err) {
        console.error('[VerticesChat1] Failed to load persona:', err.message);
        return null;
    }
}

// === SESSION ===
function clearSessionAndCache() {
    const sessionPath = process.env.WA_DATA_DIR ||
        path.join(__dirname, '..', '..', 'userdata', 'whatsapp', 'session-Vertices');
    const cachePath = path.join(__dirname, '..', '.wwebjs_cache');
    try {
        if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
        if (fs.existsSync(cachePath))   fs.rmSync(cachePath,   { recursive: true, force: true });
    } catch (err) {
        console.error('[VerticesChat1] Failed to clear session/cache:', err.message);
    }
    return 'Session and cache cleared.';
}

// === BOSS NOTIFICATION TRACKING ===
function wasBossNotified(phone, file, expiryMs) {
    if (!fs.existsSync(file)) return false;
    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        const last = data.users?.[phone]?.lastNotifiedEpoch || 0;
        return Date.now() - last < Number(expiryMs);
    } catch {
        return false;
    }
}

function updateNotificationTimestamp(phone, name, file) {
    const now = Date.now();
    let data = { users: {} };
    if (fs.existsSync(file)) {
        try { data = JSON.parse(fs.readFileSync(file, 'utf-8')); } catch {}
    }
    data.users[phone] = {
        whatsappName:         name,
        phone,
        lastNotifiedEpoch:    now,
        lastNotifiedDateTime: formatTimestamp(now)
    };
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('[VerticesChat1] Failed to update notification timestamp:', err.message);
    }
    return true;
}

// === CHAT HISTORY ===
// NOTE: Keys user_phone, user_name, user_message, Vertices_response are persisted to disk — do not rename.
function logChat(phone, name, msg, reply, dir) {
    const file    = path.join(dir, `${phone}.json`);
    const tmpFile = file + '.tmp';

    let history = [];
    if (fs.existsSync(file)) {
        try { history = JSON.parse(fs.readFileSync(file, 'utf-8')); } catch {}
    }

    history.push({
        datetime:          new Date().toISOString(),
        user_phone:        phone,
        user_name:         name,
        user_message:      msg,
        Vertices_response: reply
    });

    try {
        fs.mkdirSync(path.dirname(tmpFile), { recursive: true });
        fs.writeFileSync(tmpFile, JSON.stringify(history, null, 2));
        fs.renameSync(tmpFile, file);
    } catch (err) {
        console.error('[VerticesChat1] Failed to log chat:', err.message);
    }
    return true;
}

function getLastChatHistory(phone, lines, dir) {
    const file = path.join(dir, `${phone}.json`);
    if (!fs.existsSync(file)) return '';
    try {
        const history = JSON.parse(fs.readFileSync(file, 'utf-8'));
        return history
            .slice(-Number(lines))
            .map(e => `${e.user_name}: ${e.user_message}\nYou: ${e.Vertices_response}`)
            .join('\n');
    } catch (err) {
        console.error('[VerticesChat1] Failed to read chat history:', err.message);
        return '';
    }
}

// === TEXT UTILITIES ===
function countWordsAndTokens(input) {
    const words  = input.trim().split(/\s+/).filter(Boolean).length;
    const tokens = (input.match(/\b\w+\b|[^\s\w]/g) || []).length;
    return { words, tokens };
}

function getCurrentDateTime(locale = 'en-US', tz = 'UTC') {
    const now  = new Date().toLocaleString(locale, { timeZone: tz });
    const d    = new Date(now);
    const hr   = d.getHours();
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const h12  = hr % 12 || 12;
    return `${d.getDate()} ${d.toLocaleString(locale, { month: 'short' })} ${d.getFullYear()}, ${h12}.${String(d.getMinutes()).padStart(2, '0')}${ampm}`;
}

module.exports = {
    formatTimestamp,
    loadPersona,
    clearSessionAndCache,
    wasBossNotified,
    updateNotificationTimestamp,
    logChat,
    getLastChatHistory,
    countWordsAndTokens,
    getCurrentDateTime
};
