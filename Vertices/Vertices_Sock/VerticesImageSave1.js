// VerticesImageSave1.js
const fs   = require("fs");
const path = require("path");
const mime = require("mime-types");
const { downloadBaileysMedia } = require('./VerticesMedia1.js');
const MODULE = path.basename(__filename, path.extname(__filename));

const ROOT_IMG_FOLDER = path.join(__dirname, '..', '..', "userdata", "img");

const MAX_IMAGES     = 8;
const SESSION_TIMEOUT = 80000;

// In-memory image save sessions: { [jid]: { folder, fullPath, imageCount, timeout } }
const imageSessions = {};

// === SESSION MANAGEMENT ===
function startImageSaveSession(sender, folderNameRaw, client) {
    const folderName    = folderNameRaw.replace(/[\\/:*?"<>|]/g, "_");
    const fullFolderPath = path.join(ROOT_IMG_FOLDER, folderName);

    try {
        fs.mkdirSync(fullFolderPath, { recursive: true });
    } catch (err) {
        console.error(`[${MODULE}] Failed to create folder ${fullFolderPath}:`, err.message);
        return;
    }

    if (imageSessions[sender]) {
        clearTimeout(imageSessions[sender].timeout);
        delete imageSessions[sender];
    }

    imageSessions[sender] = {
        folder:     folderName,
        fullPath:   fullFolderPath,
        imageCount: 0,
        timeout: setTimeout(async () => {
            const session = imageSessions[sender];
            let totalFiles = 0;
            try {
                if (fs.existsSync(session.fullPath)) {
                    totalFiles = fs.readdirSync(session.fullPath)
                        .filter(f => fs.statSync(path.join(session.fullPath, f)).isFile()).length;
                }
            } catch {}

            try {
                if (totalFiles === 0) {
                    fs.rmSync(session.fullPath, { recursive: true, force: true });
                    await client.sendMessage(sender, { text: `Session for '${session.folder}' expired. No images saved. Folder deleted.` });
                } else {
                    await client.sendMessage(sender, { text: `Session for '${session.folder}' expired. ${totalFiles} image(s) kept.` });
                }
            } catch (err) {
                console.error(`[${MODULE}] Failed to send session timeout message:`, err.message);
            }

            delete imageSessions[sender];
        }, SESSION_TIMEOUT)
    };

    try {
        return client.sendMessage(sender, { text: `Folder '${folderName}' is ready. Send up to ${MAX_IMAGES} images.` });
    } catch (err) {
        console.error(`[${MODULE}] Failed to send folder-ready message:`, err.message);
    }
}

// === INCOMING IMAGE HANDLER ===
async function handleIncomingImageMedia(msg, client) {
    const sender  = msg.key.remoteJid;
    const session = imageSessions[sender];

    if (!session) {
        try {
            await client.sendMessage(sender, { text: "Please send:\nSave images in <FolderName>\n...before uploading." });
        } catch (err) {
            console.error(`[${MODULE}] Failed to reply no-session message:`, err.message);
        }
        return;
    }

    let media;
    try {
        media = await downloadBaileysMedia(msg);
    } catch (err) {
        console.error(`[${MODULE}] Failed to download media:`, err.message);
        try { await client.sendMessage(sender, { text: "Failed to download media." }); } catch {}
        return;
    }

    if (!media?.data) {
        try { await client.sendMessage(sender, { text: "Media download was empty." }); } catch {}
        return;
    }

    const mimeType  = media.mimetype || 'image/jpeg';
    const extension = mime.extension(mimeType) || "jpg";
    const savePath  = path.join(session.fullPath, `img_${Date.now()}.${extension}`);

    try {
        fs.writeFileSync(savePath, Buffer.from(media.data, 'base64'));
        session.imageCount += 1;
        const remaining = MAX_IMAGES - session.imageCount;

        if (remaining <= 0) {
            clearTimeout(session.timeout);
            delete imageSessions[sender];
            await client.sendMessage(sender, { text: `Saved image. Limit of ${MAX_IMAGES} reached. Session closed.` });
        } else {
            await client.sendMessage(sender, { text: `Saved to '${session.folder}'. You can send ${remaining} more.` });
        }
    } catch (err) {
        console.error(`[${MODULE}] Failed to save image or reply:`, err.message);
    }
}

// === ENTRY POINT ===
async function handleImageSaveCommand(msg, client, userMessage) {
    const sender = msg.key.remoteJid;
    const body   = userMessage.trim() || "";

    const match = body.match(/^save images in (.+)$/i);
    if (match) {
        return startImageSaveSession(sender, match[1], client);
    }

    if (msg.message?.imageMessage || msg.message?.videoMessage || msg.message?.documentMessage) {
        return handleIncomingImageMedia(msg, client);
    }

    if (body.length > 0) {
        try {
            return client.sendMessage(sender, { text: "Invalid command.\nSend: Save images in <FolderName>\nThen send up to 8 images." });
        } catch (err) {
            console.error(`[${MODULE}] Failed to reply invalid command:`, err.message);
        }
    }
}

module.exports = { handleImageSaveCommand };
