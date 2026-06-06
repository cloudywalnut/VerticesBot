const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const FormData = require('form-data');

async function VoiceInterpret(oggFilePath) {
    // ALWAYS fetch fresh from process.env!
    const openaiApi = process.env.openaiApi;
    const VOICELANGUAGE = process.env.VOICELANGUAGE || 'en';
    const mp3Path = oggFilePath.replace('.ogg', '.mp3');

    return new Promise((resolve, reject) => {
        exec(`ffmpeg -i "${oggFilePath}" -ar 44100 -ac 2 "${mp3Path}"`, async (error) => {
            if (error) return reject(error);

            try {
                const form = new FormData();
                form.append('file', fs.createReadStream(mp3Path));
                form.append('model', 'whisper-1');
                form.append('language', VOICELANGUAGE);

                console.log('Whisper API KEY:', openaiApi ? openaiApi.slice(0,8)+'...' : '(undefined)');

                if (!openaiApi) return reject(new Error('OPENAI_API_KEY missing!'));

                const response = await axios.post(
                    'https://api.openai.com/v1/audio/transcriptions',
                    form,
                    {
                        headers: {
                            ...form.getHeaders(),
                            'Authorization': `Bearer ${openaiApi}`
                        }
                    }
                );

                fs.unlink(mp3Path, () => {}); // clean up mp3 temp
                resolve(response.data.text);
            } catch (err) {
                reject(err);
            }
        });
    });
}

module.exports = VoiceInterpret;


