const path = require("path");
const axios = require('axios');
const fs = require('fs');
//require('dotenv').config(); // Make sure this is present if used standalone
//require('dotenv').config({ path: path.join(__dirname, '..', 'userdata', '.env') });

async function VoiceGenerate(text, outputFilePath) {
    //const voiceId = global.VOICE_ID; //we can do it this way, but if we do, we can only call this from Vertices14.js
    const voiceId = process.env.VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // ElevenLabs default: Rachel
    const apiKey = process.env.VOICE_API_KEY;
    const modelId = process.env.VOICE_MODEL_ID || "eleven_turbo_v2_5";
    const speed = parseFloat(process.env.VOICE_SPEED || "1.0");
    const stability = parseFloat(process.env.VOICE_STABILITY || "0.5");
    const similarityBoost = parseFloat(process.env.VOICE_SIMILARITY || "0.5");
    const speakerBoost = process.env.VOICE_SPEAKER_BOOST === 'true';

    const response = await axios({
        method: 'POST',
        url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        data: {
            text: text,
            model_id: modelId,
            voice_settings: {
                speed: speed,
                stability: stability,
                similarity_boost: similarityBoost,
                use_speaker_boost: speakerBoost
            }
        },
        headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
    });

    fs.writeFileSync(outputFilePath, response.data);
    return outputFilePath;
}

module.exports = VoiceGenerate;

/*
model: eleven_multilingual_v2
Speed:
~1.16x = 1.16 (max: 1.20)
Stability:
~1% = 0.01 (max: 1.0)
Similarity Boost:
~92% = 0.92 (max: 1.0)
Style Exaggeration:
~89% = 0.89 (max: 1.0)
Speaker Boost:
Toggle is ON = true

Default: Rachel = 21m00Tcm4TlvDq8ikWAM
Set VOICE_ID in .env to override with any ElevenLabs voice ID
*/