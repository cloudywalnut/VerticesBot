// VerticesImage1.js
const axios = require("axios");
const path  = require("path");
const MODULE = path.basename(__filename, path.extname(__filename));

// === MEDIA TYPE DETECTION ===
function detectMediaType(mimetype = "") {
    mimetype = mimetype.toLowerCase?.() || "";
    if (mimetype.includes("image/"))                        return "image";
    if (mimetype.includes("video/"))                        return "video";
    if (mimetype.includes("pdf"))                           return "pdf";
    if (mimetype.includes("word"))                          return "word";
    if (mimetype.includes("excel"))                         return "excel";
    if (mimetype.includes("zip") || mimetype.includes("rar")) return "compressed";
    if (mimetype.includes("text/plain"))                    return "text";
    if (mimetype.includes("audio/"))                        return "audio";
    return "unknown";
}

function detectMediaTypeForAi(media) {
    if (!media) return 'unknown';

    const messageType = media.messageType || '';
    const mimetype    = media.mimetype?.toLowerCase() || '';
    const filename    = media.filename?.toLowerCase() || '';

    // Prefer Baileys messageType
    if (messageType === 'image') return 'image';
    if (messageType === 'video') return 'video';
    if (messageType === 'audio') return 'audio';
    if (messageType === 'document') {
        if (mimetype === 'application/pdf')      return 'pdf';
        if (mimetype.includes('msword'))         return 'word';
        if (mimetype.includes('excel'))          return 'excel';
        if (mimetype.includes('powerpoint'))     return 'powerpoint';
        if (mimetype.includes('zip'))            return 'zip';
        if (mimetype.includes('rar'))            return 'rar';
        if (mimetype === 'text/plain')           return 'text';
        return 'document';
    }

    // MIME fallback
    if (mimetype.startsWith('image/'))           return 'image';
    if (mimetype.startsWith('video/'))           return 'video';
    if (mimetype.startsWith('audio/'))           return 'audio';
    if (mimetype === 'application/pdf')          return 'pdf';
    if (mimetype.includes('msword'))             return 'word';
    if (mimetype.includes('excel'))              return 'excel';
    if (mimetype.includes('powerpoint'))         return 'powerpoint';
    if (mimetype.includes('zip'))                return 'zip';
    if (mimetype.includes('rar'))                return 'rar';
    if (mimetype === 'text/plain')               return 'text';

    // Filename fallback
    if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/))  return 'image';
    if (filename.match(/\.(mp4|mov|avi|mkv|webm)$/))   return 'video';
    if (filename.match(/\.(mp3|wav|ogg|aac)$/))        return 'audio';
    if (filename.endsWith('.pdf'))                      return 'pdf';
    if (filename.endsWith('.doc') || filename.endsWith('.docx')) return 'word';
    if (filename.endsWith('.xls') || filename.endsWith('.xlsx')) return 'excel';
    if (filename.endsWith('.ppt') || filename.endsWith('.pptx')) return 'powerpoint';
    if (filename.endsWith('.zip'))  return 'zip';
    if (filename.endsWith('.rar'))  return 'rar';
    if (filename.endsWith('.apk'))  return 'apk';
    if (filename.endsWith('.txt'))  return 'text';

    return 'unknown';
}

// === IMAGE SUMMARIZATION ===
async function summarizeImage(media, userMessage = "", openaiKey = "", persona = "") {
    if (!media?.data) {
        console.warn(`[${MODULE}] summarizeImage called with empty media.`);
        return "Image not available or corrupted.";
    }

    const mimetype = media.mimetype || "image/jpeg";
    if (!mimetype.startsWith('image/')) {
        console.warn(`[${MODULE}] summarizeImage called with non-image media: ${mimetype}`);
        return `Received ${media.messageType || 'media'} file (${mimetype})`;
    }

    try {
        const response = await axios.post("https://api.openai.com/v1/chat/completions", {
            model: "gpt-4o",
            messages: [
                { role: "system", content: persona || "You are a powerful AI model that understands image content." },
                {
                    role: "user",
                    content: [
                        { type: "image_url", image_url: { url: `data:${mimetype};base64,${media.data}` } },
                        { type: "text",      text: "Describe in detail what you see in the image in less than 70 words, based strictly on your persona." }
                    ]
                }
            ],
            max_tokens: 200
        }, {
            headers: {
                "Content-Type":  "application/json",
                "Authorization": `Bearer ${openaiKey}`
            },
            timeout: 7000
        });

        return response.data?.choices?.[0]?.message?.content || "Image understood but no description returned.";
    } catch (err) {
        console.error(`[${MODULE}] Image summarization failed:`, err.response?.data || err.message);
        return "Can't open the image";
    }
}

module.exports = { summarizeImage, detectMediaType, detectMediaTypeForAi };
