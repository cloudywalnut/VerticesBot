const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const HelperVersion = path.basename(__filename).replace(/\.[^/.]+$/, "");

async function summarizePdf(media, chosenAPI) {

    console.log(`[${HelperVersion}] Starting PDF summarization...`);

    if (!media?.data || !media?.filename) {
        console.warn(`[${HelperVersion}] Invalid media object received.`);
        return;
    }

    try {

        // creates a data buffer
        const buffer = Buffer.from(media.data, "base64");

        // Upload file
        const formData = new FormData();
        formData.append("purpose", "assistants");
        formData.append("file", buffer, media.filename);

        console.log(`[${HelperVersion}] Uploading file to OpenAI...`);

        const uploadRes = await axios.post("https://api.openai.com/v1/files", formData, {
            headers: {
                "Authorization": `Bearer ${chosenAPI}`,
                ...formData.getHeaders(),
            },
        });

        const fileId = uploadRes.data.id;
        console.log(`[${HelperVersion}] File uploaded successfully with ID: ${fileId}`);

        // Generate summary
        console.log(`[${HelperVersion}] Requesting summary from OpenAI...`);

        const response = await axios.post(
            "https://api.openai.com/v1/responses",
            {
                //Cost:
                //$0.40 per million input
                //$1.60 per million output
                model: "gpt-4.1-mini",
                input: [
                    {
                        role: "user",
                        content: [
                            { type: "input_text", text: "Summarize this document in under 100 words." },
                            { type: "input_file", file_id: fileId },
                        ],
                    },
                ],
            },
            {
                headers: { Authorization: `Bearer ${chosenAPI}` },
            }
        );

        const summary = response.data.output?.[0]?.content?.[0]?.text || "No summary generated.";
        console.log(`[${HelperVersion}] Summary generated successfully!`);

        // Delete file from OpenAI to avoid addiional storage cost as we just need it for summary nothing else
        try {
            await axios.delete(`https://api.openai.com/v1/files/${fileId}`, {
                headers: { Authorization: `Bearer ${chosenAPI}` },
            });
            console.log(`[${HelperVersion}] File ${fileId} deleted from OpenAI.`);
        } catch (delErr) {
            console.warn(`[${HelperVersion}] Warning: Failed to delete file ${fileId} -> ${delErr.message}`);
        }

        return summary;

    } catch (err) {
        console.error(`[${HelperVersion}] Error in summarizePdf(): ${err.message}`);
        if (err.response) {
            console.error(`[${HelperVersion}] Response Error:`, err.response.data);
        }
        return;
    }
}

module.exports = {
    summarizePdf
};
