// VerticesImageSend1.js
const fs   = require("fs");
const path = require("path");
const { AIQuery } = require("./VerticesAIQuery1.js");
const MODULE = path.basename(__filename, path.extname(__filename));

const IMAGE_ROOT = path.join(__dirname, '..', '..', "userdata", "img");

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// === FOLDER UTILITIES ===
function getFolders(parentDir) {
    try {
        return fs.readdirSync(parentDir, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name);
    } catch (err) {
        console.error(`[${MODULE}] Failed to read folders from ${parentDir}:`, err.message);
        return [];
    }
}

function getAllImagesFromFolder(folderPath) {
    if (!fs.existsSync(folderPath)) return [];
    try {
        return fs.readdirSync(folderPath)
            .filter(file => /\.(jpg|jpeg|png|pdf)$/i.test(file))
            .slice(0, 10)
            .map(file => path.join(folderPath, file));
    } catch (err) {
        console.error(`[${MODULE}] Failed to read images from ${folderPath}:`, err.message);
        return [];
    }
}

function findAllExistingFoldersIgnoreCase(candidatePaths) {
    const results = new Set();
    for (const candidate of candidatePaths) {
        const parentDir  = path.dirname(candidate);
        const targetName = path.basename(candidate).toLowerCase();
        if (!fs.existsSync(parentDir)) continue;
        try {
            const realMatch = fs.readdirSync(parentDir).find(f => f.toLowerCase() === targetName);
            if (realMatch) results.add(path.join(parentDir, realMatch));
        } catch {}
    }
    return [...results];
}

// === AI TOPIC EXTRACTION ===
async function extractImageTopic(userQuery, chosenURL, chosenModel, chosenAPI, persona, temp, maxToken) {
    const folders    = getFolders(IMAGE_ROOT);
    const folderList = folders.join(", ");

    const systemPrompt = `
    You are given a list of folder names that contain images:
    ${folderList}

    The user query will be the conversation history, including multiple messages between users.

    Your task:
    - Carefully review the entire conversation to understand the context.
    - Give more emphasis to the most recent user messages to determine the main topic.
    - Pick the folder name from the list that best matches the request based on the conversation context.
    - If none match, return "null".
    - If the request is generic and multiple folders are relevant, return the folder names separated by a pipe ("|") with no extra words.
    Example: if both "cars" and "bikes" match, return "cars|bikes".
    Only return the folder name(s) or "null" without any extra explanation or text.
    `;

    try {
        const result = await AIQuery(userQuery, chosenURL, chosenModel, chosenAPI, systemPrompt, temp, maxToken);
        console.log(`[${MODULE}] AI selected folder: ${result}`);
        if (!result || result.length < 2) return "general";
        return result.toLowerCase().trim().replace(/[^a-z0-9\s|().-]/gi, "");
    } catch (err) {
        console.warn(`[${MODULE}] Failed to extract image topic:`, err.message);
        return "general";
    }
}

// === SEND HELPER ===
async function sendMediaFile(client, chatId, imgPath) {
    const media = { url: imgPath };
    const ext   = path.extname(imgPath).toLowerCase();

    if (ext === ".pdf") {
        await client.sendMessage(chatId, {
            document: media,
            mimetype: "application/pdf",
            fileName: path.basename(imgPath)
        });
    } else {
        await client.sendMessage(chatId, { image: media });
    }
}

// === MAIN IMAGE HANDLER ===
async function handleImageRequest(userQuery, client, chatId, chosenURL, chosenModel, chosenAPI, persona, temp, maxToken) {
    const rawTopic = await extractImageTopic(userQuery, chosenURL, chosenModel, chosenAPI, persona, temp, maxToken);
    let logMessage = "[The following images were sent: ";

    const topics = rawTopic.split("|")
        .map(t => t.trim())
        .filter(t => t.length > 0);

    let topicFolders = [];
    for (const topic of topics) {
        const candidates = [
            path.join(IMAGE_ROOT, topic),
            path.join(IMAGE_ROOT, topic.replace(/\s+/g, "_")),
            path.join(IMAGE_ROOT, topic.replace(/\s+/g, "")),
            path.join(IMAGE_ROOT, topic.endsWith("s") ? topic.slice(0, -1) : topic + "s")
        ];
        topicFolders = topicFolders.concat(findAllExistingFoldersIgnoreCase(candidates));
    }

    if (topicFolders.length === 0) {
        topicFolders.push(path.join(IMAGE_ROOT, "general"));
    }

    if (topicFolders.length === 1) {
        const selectedImages = getAllImagesFromFolder(topicFolders[0]);
        if (selectedImages.length === 0) {
            return { success: false, logMessage: "[No similar images found - failed to send]" };
        }

        for (const imgPath of selectedImages) {
            try {
                await sendMediaFile(client, chatId, imgPath);
                logMessage += path.basename(imgPath) + ", ";
                await delay(1500);
            } catch (err) {
                console.warn(`[${MODULE}] Failed to send image ${imgPath}:`, err.message);
            }
        }
        logMessage += `from '${path.basename(topicFolders[0])}' folder]`;
        console.log(`[${MODULE}] Sent ${selectedImages.length} image(s) for topic "${topics.join(", ")}" to ${chatId}`);

    } else {
        for (const folder of topicFolders) {
            const selectedImages = getAllImagesFromFolder(folder);
            if (selectedImages.length === 0) continue;
            try {
                await sendMediaFile(client, chatId, selectedImages[0]);
                logMessage += `${path.basename(selectedImages[0])} from '${path.basename(folder)}' folder, `;
                await delay(1500);
            } catch (err) {
                console.warn(`[${MODULE}] Failed to send image from ${folder}:`, err.message);
            }
        }
        logMessage += "]";
        console.log(`[${MODULE}] Sent 1 image from each of ${topicFolders.length} folders for topic "${topics.join(", ")}" to ${chatId}`);
    }

    return { success: true, logMessage };
}

module.exports = { handleImageRequest };
