// VerticesFollowUp4.js
const fs   = require('fs');
const path = require('path');
const axios = require('axios');
const { runHelperCommand } = require('./VerticesHelper.js');
const MODULE = path.basename(__filename, path.extname(__filename));

const CHAT_HISTORY_DIR = path.join(__dirname, '..', '..', 'userdata', 'chathistory');

// In-memory state for pending boss approval
let bossFollowUpList       = [];
let bossFollowUpExpiryTimer = null;
let followUpClient          = null;

// === CHAT HISTORY UTILITIES ===
function getAllChatFiles(days = 3) {
    const cutoff = Date.now() - days * 86400000;
    const result = [];
    let files = [];
    try {
        files = fs.readdirSync(CHAT_HISTORY_DIR).filter(f => f.length <= 21);
    } catch (err) {
        console.error(`[${MODULE}] Failed to read chat directory:`, err.message);
        return result;
    }

    for (const file of files) {
        const filepath = path.join(CHAT_HISTORY_DIR, file);
        try {
            const json = JSON.parse(fs.readFileSync(filepath, 'utf8'));
            const last = json[json.length - 1];
            if (!last || new Date(last.datetime).getTime() < cutoff) continue;
            result.push({ file, chats: json });
        } catch {}
    }
    return result;
}

// NOTE: Reads user_phone, user_name, user_message, Vertices_response — persisted keys, do not rename.
function extractLast5Pairs(chatArray) {
    const pairs = [];
    let i = chatArray.length - 1;
    while (i >= 0 && pairs.length < 5) {
        const u = chatArray[i];
        if (u?.user_message && u?.Vertices_response) {
            pairs.unshift(`${u.user_name}: ${u.user_message}\nYou: ${u.Vertices_response}`);
        }
        i--;
    }
    return pairs.join("\n");
}

// === AI HELPER ===
async function askAI(engine, key, url, model, persona, prompt) {
    try {
        const res = await axios.post(url, {
            model,
            messages: [
                { role: 'system', content: persona },
                { role: 'user',   content: prompt }
            ],
            temperature: 0.4,
            max_tokens:  4000
        }, {
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type':  'application/json'
            }
        });
        return res.data?.choices?.[0]?.message?.content?.trim() || null;
    } catch (err) {
        console.warn(`[${MODULE}] AI error:`, err?.response?.data || err.message);
        return null;
    }
}

// === PROSPECT DETECTION ===
async function getProspectList(chatFiles, engine, key, url, model, persona) {
    const prospects = [];
    for (const { file, chats } of chatFiles) {
        const convo = extractLast5Pairs(chats);
        const prompt = `Here are the latest chats:\n${convo}\n\nBased on your persona & job descriptions, do you think this ${global.PERSON} ` +
            `is worth following up to conclude the ${global.JOB} process?\nReply strictly YES or NO only.`;
        const decision = await askAI(engine, key, url, model, persona, prompt);
        if (decision?.toUpperCase().startsWith("YES")) {
            const phone = file.replace('.json', '');
            const name  = chats[chats.length - 1]?.user_name || "User";
            prospects.push({ name, phone, convo });
        }
    }
    return prospects;
}

// === BOSS APPROVAL ===
function startBossApprovalExpiryTimer(bossPhone) {
    if (bossFollowUpExpiryTimer) clearTimeout(bossFollowUpExpiryTimer);
    bossFollowUpExpiryTimer = setTimeout(async () => {
        console.warn(`[${MODULE}] Boss took too long to approve. Clearing prospect list.`);
        bossFollowUpList       = [];
        bossFollowUpExpiryTimer = null;

        if (followUpClient && typeof followUpClient.sendMessage === 'function') {
            try {
                await followUpClient.sendMessage(bossPhone, { text: "Follow-up list expired. Type 'follow up' again to restart." });
            } catch (err) {
                console.warn(`[${MODULE}] Failed to notify Boss about expiry:`, err.message);
            }
        } else {
            console.warn(`[${MODULE}] No client available to notify Boss of expiry.`);
        }
    }, 2 * 60 * 1000);
}

async function confirmWithBoss(client, bossPhone, prospects, persona, engine, key, url, model) {
    const listText = prospects.map(p => `- ${p.name} +${p.phone.replace(/[^\d]/g, '')}`).join("\n");
    const prompt   = `These are the names & numbers you must follow up:\n${listText}\n\n` +
        `Reply strictly only by saying "Follow up" followed by listing all the name and numbers (no other words) in BULLET format.`;
    const reply = await askAI(engine, key, url, model, persona, prompt);

    bossFollowUpList = prospects;
    followUpClient   = client;
    startBossApprovalExpiryTimer(bossPhone);

    if (client && typeof client.sendMessage === 'function') {
        try {
            await client.sendMessage(bossPhone, { text: reply });
        } catch (err) {
            console.warn(`[${MODULE}] Failed to send follow-up list to Boss:`, err.message);
        }
    } else {
        console.warn(`[${MODULE}] No client available — skipping message to Boss.`);
        console.log(`Message to Boss:\n${reply}`);
    }
}

function parseBossApproval(bossReply) {
    const approved = [];
    if (!bossReply || !bossReply.toLowerCase().startsWith('follow up')) return approved;

    const lines = bossReply
        .replace(/•/g, '-')
        .replace(/,\s*/g, '\n')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

    for (const line of lines) {
        if (line.toLowerCase().startsWith('follow up')) continue;
        const match = line.match(/-\s*(.+?)\s*\+(\d{10,15})/);
        if (match) {
            approved.push({ name: match[1].trim(), phone: match[2].trim() });
        }
    }
    return approved;
}

// === SEND FOLLOW-UPS ===
async function sendFollowUps(client, bossPhone, bossName, approvedList, engine, key, url, model, persona) {
    for (const approved of approvedList) {
        const matched = bossFollowUpList.find(p =>
            p.name.trim().toLowerCase() === approved.name.trim().toLowerCase() &&
            p.phone.replace(/[^\d]/g, '') === approved.phone
        );

        if (!matched) {
            console.warn(`[${MODULE}] Approved contact not found in list: ${approved.name} ${approved.phone}`);
            continue;
        }

        const prompt  = `Summarize and write a friendly follow-up message:\n\n${matched.convo}\n\nUse casual Whatsapp style, maximum 30 words. DO NOT use emoticons.`;
        const message = await askAI(engine, key, url, model, persona, prompt);

        console.log(`[${MODULE}] Follow-up to ${matched.name} (+${matched.phone}): ${message}`);

        if (client && typeof client.sendMessage === 'function') {
            try {
                // Add JID suffix only at send time; digit length determines format
                const targetJid = matched.phone.includes('@')
                    ? matched.phone
                    : matched.phone + (matched.phone.length <= 12 ? '@s.whatsapp.net' : '@lid');

                await client.sendMessage(targetJid, { text: message });
                runHelperCommand("logChat", targetJid.split('@')[0], matched.name, "", message, CHAT_HISTORY_DIR);
            } catch (err) {
                console.warn(`[${MODULE}] Failed to send to ${matched.name} (+${matched.phone}):`, err.message);
            }
        } else {
            console.warn(`[${MODULE}] No client — would send to ${matched.phone}: ${message}`);
        }

        await new Promise(r => setTimeout(r, 1000));
    }

    const allNumbers = approvedList.map(a => a.phone).join(', ');
    const summaryMsg = `[Follow Up Successfully sent to following contact(s): ${allNumbers}]`;
    try {
        runHelperCommand("logChat", bossPhone.split('@')[0], bossName, "", summaryMsg, CHAT_HISTORY_DIR);
    } catch (err) {
        console.warn(`[${MODULE}] Failed to log summary to boss:`, err.message);
    }

    bossFollowUpList = [];
    if (bossFollowUpExpiryTimer) {
        clearTimeout(bossFollowUpExpiryTimer);
        bossFollowUpExpiryTimer = null;
    }
}

process.on('exit', () => {
    if (bossFollowUpExpiryTimer) clearTimeout(bossFollowUpExpiryTimer);
});

// === EXPORTED WORKFLOW ===
module.exports = {
    runFollowUpWorkflow: async (client, bossPhone, engine, url, key, model, persona, days = 3) => {
        const files     = getAllChatFiles(days);
        const prospects = await getProspectList(files, engine, key, url, model, persona);
        if (prospects.length === 0) {
            console.log(`[${MODULE}] No prospects found.`);
            return;
        }
        console.log(`[${MODULE}] Prospects detected:`);
        prospects.forEach(p => console.log(`  - ${p.name} (+${p.phone.replace(/[^\d]/g, '')})`));
        await confirmWithBoss(client, bossPhone, prospects, persona, engine, key, url, model);
    },

    confirmFollowUpApproved: async (client, bossPhone, bossName, bossReplyText, engine, url, key, model, persona) => {
        if (bossFollowUpList.length === 0) {
            console.log(`[${MODULE}] No approved list to follow up.`);
            return;
        }

        if (bossFollowUpExpiryTimer) {
            clearTimeout(bossFollowUpExpiryTimer);
            bossFollowUpExpiryTimer = null;
        }

        if (!bossReplyText || bossReplyText.toLowerCase().includes('follow up all')) {
            console.log(`[${MODULE}] Boss approved ALL contacts.`);
            await sendFollowUps(client, bossPhone, bossName, bossFollowUpList.map(p => ({
                name:  p.name,
                phone: p.phone.replace(/[^\d]/g, '')
            })), engine, key, url, model, persona);
            return;
        }

        const approvedList = parseBossApproval(bossReplyText);
        if (approvedList.length === 0) {
            console.log(`[${MODULE}] No valid approvals found in Boss reply.`);
            return;
        }

        console.log(`[${MODULE}] Boss approved ${approvedList.length} contact(s).`);
        await sendFollowUps(client, bossPhone, bossName, approvedList, engine, key, url, model, persona);
    }
};
