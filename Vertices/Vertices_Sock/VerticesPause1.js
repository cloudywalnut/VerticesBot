// VerticesPause1.js
const fs = require('fs');

// === DEFAULT DATA STRUCTURE ===
const DEFAULT_PAUSE_DATA = { paused: [], global: false };

function getPauseData(file) {
    try {
        const raw = fs.readFileSync(file, 'utf-8');
        const data = JSON.parse(raw);
        if (!Array.isArray(data.paused)) data.paused = [];
        if (typeof data.global !== 'boolean') data.global = false;
        return data;
    } catch {
        return { ...DEFAULT_PAUSE_DATA };
    }
}

function savePauseData(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('[VerticesPause1] Failed to save pause data:', err.message);
    }
}

function setGlobalPause(file, value) {
    const data = getPauseData(file);
    data.global = value;
    savePauseData(file, data);
    return value;
}

function pauseUser(file, phone) {
    const data = getPauseData(file);
    if (!data.paused.includes(phone)) {
        data.paused.push(phone);
        savePauseData(file, data);
        return true;
    }
    return false;
}

function unpauseUser(file, phone) {
    const data = getPauseData(file);
    const idx = data.paused.indexOf(phone);
    if (idx !== -1) {
        data.paused.splice(idx, 1);
        savePauseData(file, data);
        return true;
    }
    return false;
}

function isUserPaused(file, phone) {
    const data = getPauseData(file);
    return !!(data.global || data.paused.includes(phone));
}

module.exports = {
    getPauseData,
    savePauseData,
    setGlobalPause,
    pauseUser,
    unpauseUser,
    isUserPaused
};
