// VerticesAIQuery1.js
const path = require("path");
const axios = require("axios");
const MODULE = path.basename(__filename, path.extname(__filename));

// === AI QUERY ===
async function AIQuery(prompt, chosenURL, chosenModel, chosenAPI, persona, temp, maxToken) {
    try {
        const response = await axios.post(chosenURL, {
            model: chosenModel,
            messages: [
                { role: "system", content: persona },
                { role: "user",   content: prompt }
            ],
            temperature: temp,
            max_tokens:  maxToken
        }, {
            headers: {
                "Authorization": `Bearer ${chosenAPI}`,
                "Content-Type":  "application/json"
            }
        });

        if (!response.data?.choices?.[0]) {
            console.error(`[${MODULE}] Invalid AI response format`);
            return "";
        }

        return response.data.choices[0].message.content;

    } catch (err) {
        console.error(`[${MODULE}] AIQuery error:`, err.response?.data || err.message);
        return "";
    }
}

module.exports = { AIQuery };