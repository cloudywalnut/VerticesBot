// VerticesRAGTools3.js
const path  = require('path');
const fs    = require('fs');
const axios = require('axios');
const MODULE = path.basename(__filename, path.extname(__filename));

let vectorDB = null;

// === CONFIGURATION ===
const EMBED_MODEL     = 'text-embedding-3-small';
const OPENAI_EMBED_URL = 'https://api.openai.com/v1/embeddings';
const METADATA_PATH   = process.env.VECTOR_DB_PATH;

console.log(`[${MODULE}] RAG=${process.env.RAG}`);

if (!METADATA_PATH) {
    console.error(`[${MODULE}] VECTOR_DB_PATH not set in .env`);
    process.exit(1);
}

// === VECTOR DB ===
function ensureVectorDBLoaded() {
    if (vectorDB || process.env.RAG !== "On") return;

    const fullPath = path.resolve(__dirname, '..', '..', 'userdata', process.env.VECTOR_DB_PATH);

    if (!fs.existsSync(fullPath)) {
        console.warn(`[${MODULE}] Vector DB not found at: ${fullPath}`);
        return;
    }

    try {
        const raw = fs.readFileSync(fullPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || !Array.isArray(parsed[0]?.vector)) {
            console.warn(`[${MODULE}] Invalid vector DB format.`);
            return;
        }
        vectorDB = parsed;
    } catch (err) {
        console.warn(`[${MODULE}] Error reading vector DB:`, err.message);
        vectorDB = null;
    }
}

// === MATH UTILITIES ===
function normalize(vec) {
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    return vec.map(v => v / norm);
}

function cosineSim(vecA, vecB) {
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) dot += vecA[i] * vecB[i];
    return dot;
}

// === EMBEDDING ===
async function getEmbedding(text) {
    try {
        const res = await axios.post(OPENAI_EMBED_URL, {
            model: EMBED_MODEL,
            input: text
        }, {
            headers: {
                "Authorization": `Bearer ${process.env.openaiApi}`,
                "Content-Type":  "application/json"
            }
        });

        const embedding = res.data?.data?.[0]?.embedding;
        if (!embedding) throw new Error("No embedding returned");
        return normalize(embedding);

    } catch (err) {
        console.error(`[${MODULE}] Embedding error:`, err?.response?.data || err.message);
        return null;
    }
}

// === RETRIEVAL ===
function getTopChunks(queryVec, topK = 3) {
    ensureVectorDBLoaded();

    if (!Array.isArray(vectorDB)) {
        console.warn(`[${MODULE}] vectorDB unavailable. Skipping.`);
        return [];
    }

    const results = vectorDB
        .filter(entry => Array.isArray(entry?.vector))
        .map(entry => ({
            title: entry.title || "",
            text:  entry.text,
            score: cosineSim(queryVec, normalize(entry.vector))
        }))
        .sort((a, b) => b.score - a.score);

    if (results.length === 0) return [];

    const best = results[0];
    console.log(`[${MODULE}] Best match score: ${best.score.toFixed(4)} — "${best.text.replace(/\s+/g, " ").slice(0, 80)}..."`);

    if (best.score < 0.30) {
        console.warn(`[${MODULE}] Score too low (${best.score.toFixed(4)}). Returning no results.`);
        return [];
    }

    return results.slice(0, topK);
}

module.exports = { getEmbedding, getTopChunks };
