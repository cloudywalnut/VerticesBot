// VerticesBoss2.js
const fs   = require('fs');
const path = require('path');
const axios = require('axios');
const { NodeVM } = require('vm2');
const MODULE = path.basename(__filename, path.extname(__filename));

// === CHAT DATA ===
function getAllChatsFromFolder(folderPath = path.join(__dirname, '..', '..', 'userdata', 'chathistory')) {
    if (!fs.existsSync(folderPath)) {
        console.warn(`[${MODULE}] Folder not found: ${folderPath}`);
        return [];
    }

    const files = fs.readdirSync(folderPath);
    let allChats = [];

    for (const file of files) {
        const fullPath = path.join(folderPath, file);
        if (fs.statSync(fullPath).isDirectory() || !file.endsWith('.json')) continue;
        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            allChats = allChats.concat(JSON.parse(content));
        } catch (err) {
            console.warn(`[${MODULE}] Failed to read/parse ${file}:`, err.message);
        }
    }

    return allChats;
}

// === AI CODE GENERATION ===
function extractCodeFromGPTReply(reply) {
    if (!reply || typeof reply !== 'string') return null;
    const match = reply.match(/```(?:js|javascript)?\s*([\s\S]+?)\s*```/);
    return match ? match[1].trim() : null;
}

async function askAIforCodes(prompt, chosenURL, chosenModel, chosenAPI, personaCoder) {
    try {
        const response = await axios.post(chosenURL, {
            model: chosenModel,
            messages: [
                { role: "system", content: personaCoder },
                { role: "user",   content: prompt }
            ],
            temperature: 0.4,
            max_tokens:  2000
        }, {
            headers: {
                "Authorization": `Bearer ${chosenAPI}`,
                "Content-Type":  "application/json"
            }
        });

        if (!response.data?.choices?.[0]) {
            console.error(`[${MODULE}] Invalid AI response format`);
            return "module.exports = 'Invalid AI response';";
        }

        return response.data.choices[0].message.content;
    } catch (err) {
        console.error(`[${MODULE}] askAIforCodes error:`, err.response?.data || err.message);
        return "module.exports = 'AI generate codes errors for report';";
    }
}

// === SANDBOXED CODE EXECUTION ===
function runDynamicCode(rawCode) {
    rawCode = rawCode.replace(/^\s*```(?:js|javascript)?\s*|```$/g, '').trim();
    const wrapped = `module.exports = (function() {\n${rawCode}\n})();`;

    const vm = new NodeVM({
        console: 'inherit',
        timeout: 10000,
        sandbox: {},
        require: {
            external: true,
            builtin: ['fs', 'path'],
            root: "./"
        }
    });

    try {
        const histDir = path.join(__dirname, '..', '..', 'userdata', 'chathistory');
        if (!fs.existsSync(histDir)) {
            fs.mkdirSync(histDir);
            console.log(`[${MODULE}] Created missing 'chathistory' directory.`);
        }

        try {
            const result = vm.run(wrapped, 'reportcoder.js');
            if (result === undefined)              return "No result returned from code.";
            if (typeof result === "string")        return result;
            if (typeof result === "number" || typeof result === "boolean") return result.toString();
            return JSON.stringify(result, null, 2);
        } catch (err) {
            console.error(`[${MODULE}] Sandboxed code error:`, err.message);
            return "Error executing code in sandbox.";
        }
    } catch (err) {
        console.error(`[${MODULE}] runDynamicCode error:`, err.message);
        return "Error executing the report codes.";
    }
}

// === BOSS DETECTION ===
function isBossMode(msg, bossPhone) {
    const messageFrom = msg.key?.remoteJid;
    if (messageFrom === bossPhone) {
        console.log("[VerticesBoss2] Boss detected — switching to Boss Mode.");
        return true;
    }
    return false;
}

module.exports = {
    getAllChatsFromFolder,
    extractCodeFromGPTReply,
    askAIforCodes,
    runDynamicCode,
    isBossMode
};
