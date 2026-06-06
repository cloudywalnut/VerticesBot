// VerticesVoiceInterpret1.js
const fs       = require('fs');
const path     = require('path');
const axios    = require('axios');
const { exec } = require('child_process');
const FormData = require('form-data');
const MODULE   = path.basename(__filename, path.extname(__filename));

// === VOICE TRANSCRIPTION ===
async function VoiceInterpret(oggFilePath) {
    const openaiApi      = process.env.openaiApi;
    const VOICELANGUAGE  = process.env.VOICELANGUAGE || 'en';
    const mp3Path        = oggFilePath.replace('.ogg', '.mp3');

    return new Promise((resolve, reject) => {
        exec(`ffmpeg -i "${oggFilePath}" -ar 44100 -ac 2 "${mp3Path}"`, async (error) => {
            if (error) return reject(error);

            try {
                if (!openaiApi) return reject(new Error('openaiApi key missing in .env'));

                const form = new FormData();
                form.append('file',     fs.createReadStream(mp3Path));
                form.append('model',    'whisper-1');
                form.append('language', VOICELANGUAGE);

                console.log(`[${MODULE}] Whisper API key: ${openaiApi.slice(0, 8)}...`);

                const response = await axios.post(
                    'https://api.openai.com/v1/audio/transcriptions',
                    form,
                    { headers: { ...form.getHeaders(), 'Authorization': `Bearer ${openaiApi}` } }
                );

                fs.unlink(mp3Path, () => {});
                resolve(response.data.text);
            } catch (err) {
                reject(err);
            }
        });
    });
}

module.exports = VoiceInterpret;
