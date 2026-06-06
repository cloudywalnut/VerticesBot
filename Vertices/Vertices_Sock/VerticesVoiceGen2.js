// VerticesVoiceGen2.js
const path  = require("path");
const axios = require('axios');
const fs    = require('fs');
const MODULE = path.basename(__filename, path.extname(__filename));

// === VOICE GENERATION (ElevenLabs) ===
async function VoiceGenerate(text, outputFilePath) {
    const voiceId         = process.env.VOICE_ID        || "21m00Tcm4TlvDq8ikWAM";
    const apiKey          = process.env.VOICE_API_KEY;
    const modelId         = process.env.VOICE_MODEL_ID  || "eleven_turbo_v2_5";
    const speed           = parseFloat(process.env.VOICE_SPEED       || "1.0");
    const stability       = parseFloat(process.env.VOICE_STABILITY   || "0.5");
    const similarityBoost = parseFloat(process.env.VOICE_SIMILARITY  || "0.5");
    const speakerBoost    = process.env.VOICE_SPEAKER_BOOST === 'true';

    try {
        const response = await axios({
            method: 'POST',
            url:    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            data: {
                text,
                model_id: modelId,
                voice_settings: {
                    speed,
                    stability,
                    similarity_boost: similarityBoost,
                    use_speaker_boost: speakerBoost
                }
            },
            headers: {
                'xi-api-key':   apiKey,
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer'
        });

        fs.writeFileSync(outputFilePath, response.data);
        return outputFilePath;
    } catch (err) {
        console.error(`[${MODULE}] VoiceGenerate error:`, err.response?.data || err.message);
        throw err;
    }
}

module.exports = VoiceGenerate;
