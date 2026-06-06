// VerticesImage1.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const HelperVersion = path.basename(__filename).replace(/\.[^/.]+$/, "");

function detectMediaType(mimetype = "") {
    mimetype = mimetype.toLowerCase?.() || "";
    if (mimetype.includes("image/")) return "image";
    if (mimetype.includes("video/")) return "video";
    if (mimetype.includes("pdf")) return "pdf";
    if (mimetype.includes("word")) return "word";
    if (mimetype.includes("excel")) return "excel";
    if (mimetype.includes("zip") || mimetype.includes("rar")) return "compressed";
    if (mimetype.includes("text/plain")) return "text";
    if (mimetype.includes("audio/")) return "audio";

    return "unknown";
}

function detectMediaTypeForAi(media) {
    if (!media) return 'unknown';

    // Baileys compatibility: media now has messageType property
    const messageType = media.messageType || '';
    const mimetype = media.mimetype?.toLowerCase() || '';
    const filename = media.filename?.toLowerCase() || '';

    // Use messageType first (Baileys provides this)
    if (messageType === 'image') return 'image';
    if (messageType === 'video') return 'video';
    if (messageType === 'audio') return 'audio';
    if (messageType === 'document') {
        // For documents, check the MIME type to determine specific type
        if (mimetype === 'application/pdf') return 'pdf';
        if (mimetype.includes('msword')) return 'word';
        if (mimetype.includes('excel')) return 'excel';
        if (mimetype.includes('powerpoint')) return 'powerpoint';
        if (mimetype.includes('zip')) return 'zip';
        if (mimetype.includes('rar')) return 'rar';
        if (mimetype === 'text/plain') return 'text';
        return 'document'; // generic document
    }

    // Fallback to MIME type detection
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype === 'application/pdf') return 'pdf';
    if (mimetype.includes('msword')) return 'word';
    if (mimetype.includes('excel')) return 'excel';
    if (mimetype.includes('powerpoint')) return 'powerpoint';
    if (mimetype.includes('zip')) return 'zip';
    if (mimetype.includes('rar')) return 'rar';
    if (mimetype === 'text/plain') return 'text';

    // Final fallback by filename
    if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/)) return 'image';
    if (filename.match(/\.(mp4|mov|avi|mkv|webm)$/)) return 'video';
    if (filename.match(/\.(mp3|wav|ogg|aac)$/)) return 'audio';
    if (filename.endsWith('.pdf')) return 'pdf';
    if (filename.endsWith('.doc') || filename.endsWith('.docx')) return 'word';
    if (filename.endsWith('.xls') || filename.endsWith('.xlsx')) return 'excel';
    if (filename.endsWith('.ppt') || filename.endsWith('.pptx')) return 'powerpoint';
    if (filename.endsWith('.zip')) return 'zip';
    if (filename.endsWith('.rar')) return 'rar';
    if (filename.endsWith('.apk')) return 'apk';
    if (filename.endsWith('.txt')) return 'text';

    return 'unknown';
}

async function summarizeImage(media, userMessage = "", openaiKey = "", VerticesPersona = "") {
    if (!media || !media.data) {
        console.warn("summarizeImage called with empty media");
        return "Image not available or corrupted.";
    }

    // Baileys compatibility: media.data is already base64 string
    const base64 = media.data;
    
    // Use the actual MIME type from Baileys media object
    const mimetype = media.mimetype || "image/jpeg";

    // Validate that it's actually an image before processing
    if (!mimetype.startsWith('image/')) {
        console.warn(`summarizeImage called with non-image media: ${mimetype}`);
        return `Received ${media.messageType || 'media'} file (${mimetype})`;
    }

    const payload = {
        model: "gpt-4o",
        messages: [
            { role: "system", content: VerticesPersona || "You are a powerful AI model that understands image content." },
            {
                role: "user",
                content: [
                    { type: "image_url", image_url: { url: `data:${mimetype};base64,${base64}` } },
                    { type: "text", text: `Describe in detail what you see in the image in less than 70 words, based strictly on your persona.` }
                ]
            }
        ],
        max_tokens: 200,
    };

    try {
        const response = await axios.post("https://api.openai.com/v1/chat/completions", payload, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openaiKey}`,
            },
            timeout: 7000 // 7 sec timeout
        });

        return response.data.choices[0].message.content;
    } catch (err) {
        console.error("Image summarization failed:", err.response?.data || err.message);
        return "Can't open the image";
    }
}

module.exports = { summarizeImage, detectMediaType, detectMediaTypeForAi };