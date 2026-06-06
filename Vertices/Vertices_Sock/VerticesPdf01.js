// VerticesPdf01.js
const path     = require('path');
const axios    = require('axios');
const FormData = require('form-data');
const MODULE   = path.basename(__filename, path.extname(__filename));

// === PDF SUMMARIZATION (OpenAI Responses API) ===
async function summarizePdf(media, chosenAPI) {
    console.log(`[${MODULE}] Starting PDF summarization...`);

    if (!media?.data || !media?.filename) {
        console.warn(`[${MODULE}] Invalid media object received.`);
        return;
    }

    try {
        const buffer   = Buffer.from(media.data, "base64");
        const formData = new FormData();
        formData.append("purpose", "assistants");
        formData.append("file", buffer, media.filename);

        console.log(`[${MODULE}] Uploading file to OpenAI...`);
        const uploadRes = await axios.post("https://api.openai.com/v1/files", formData, {
            headers: {
                "Authorization": `Bearer ${chosenAPI}`,
                ...formData.getHeaders()
            }
        });

        const fileId = uploadRes.data.id;
        console.log(`[${MODULE}] File uploaded — ID: ${fileId}`);

        console.log(`[${MODULE}] Requesting summary from OpenAI...`);
        const response = await axios.post(
            "https://api.openai.com/v1/responses",
            {
                model: "gpt-4.1-mini",
                input: [
                    {
                        role: "user",
                        content: [
                            { type: "input_text", text: "Summarize this document in under 100 words." },
                            { type: "input_file", file_id: fileId }
                        ]
                    }
                ]
            },
            { headers: { Authorization: `Bearer ${chosenAPI}` } }
        );

        const summary = response.data.output?.[0]?.content?.[0]?.text || "No summary generated.";
        console.log(`[${MODULE}] Summary generated.`);

        // Delete the uploaded file to avoid ongoing storage costs
        try {
            await axios.delete(`https://api.openai.com/v1/files/${fileId}`, {
                headers: { Authorization: `Bearer ${chosenAPI}` }
            });
            console.log(`[${MODULE}] File ${fileId} deleted from OpenAI.`);
        } catch (delErr) {
            console.warn(`[${MODULE}] Failed to delete file ${fileId}:`, delErr.message);
        }

        return summary;

    } catch (err) {
        console.error(`[${MODULE}] summarizePdf error:`, err.message);
        if (err.response) console.error(`[${MODULE}] Response:`, err.response.data);
        return;
    }
}

module.exports = { summarizePdf };
