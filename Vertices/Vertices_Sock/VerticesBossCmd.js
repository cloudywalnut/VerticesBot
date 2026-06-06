// VerticesBossCmd.js
const path = require("path");
const { AIQuery } = require("./VerticesAIQuery1");

// === SYSTEM PROMPT FOR BOSS COMMAND TRANSLATION ===
const bossCmdTranslatorPrompt = `You are a command interpreter for a WhatsApp bot. Your job is to read the user's message, understand
the exact intent behind that message, and convert it into the exact bot command format that the system can understand.
Follow these rules strictly:

If the command is something similar or related to Pause/Unpause:
- "pause all" → respond exactly: pause all
- "unpause all" → respond exactly: unpause all
- "pause <user>" → extract only numbers from the user and respond: pause 60123456789
- "unpause <user>" → extract only numbers and respond: unpause 60123456789

If the command is something similar or related to Delete:
- "delete <user>" → extract only numbers and respond: delete 60123456789

If the command is something similar or related to Memory Commands:
- "add perm <text>" → respond exactly: add perm <text>
- "add temp <text>" → respond: add temp <text>
- "replace perm <text>" → respond: replace perm <text>
- "replace temp <text>" → respond: replace temp <text>
- "show perm" → respond: show perm
- "show temp" → respond: show temp
- "wipe perm" → respond: wipe perm
- "wipe temp" → respond: wipe temp

If the command is something similar or related to Follow-up:
- "follow up" → respond: follow up <days> (default 3 days)

If the command is something similar or related to Initiate/Contact:
- "initiate <text>" → respond exactly: initiate <phoneNum1> <phoneNum2> ... <text>
- "contact <text>" → respond exactly: contact <phoneNum1> <phoneNum2> ... <text>

If the command is something similar or related to Image Save:
- "save images in <folder>" → respond exactly: save images in <folder>

If the command is something similar or related to some sort of Data Analysis:
- Just refine the command a bit to make the intent clearer and return the new command message

If the command is related to none of the above defined stuff, just simply answer "false".

Always output only the properly formatted command. Do not add explanations, greetings, or extra text.`;

async function translateBossCommand(bossInterpretedCmd, chosenURL, chosenModel, chosenAPI, temp, maxToken) {
    return AIQuery(bossInterpretedCmd, chosenURL, chosenModel, chosenAPI, bossCmdTranslatorPrompt, temp, maxToken);
}

module.exports = { translateBossCommand };
