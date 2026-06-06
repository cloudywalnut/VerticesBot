// VerticesMemMgmt1.js
const fs   = require('fs');
const path = require('path');

const PERM_FILE = path.join(__dirname, '..', '..', 'userdata', 'mem', 'Verticesmemory-perm.txt');
const TEMP_FILE = path.join(__dirname, '..', '..', 'userdata', 'mem', 'Verticesmemory-temp.txt');

// === FILE UTILITIES ===
function readFile(file) {
    try {
        return fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '';
    } catch (err) {
        console.error('[VerticesMemMgmt1] Failed to read file:', err.message);
        return '';
    }
}

function writeFile(file, content) {
    try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content, 'utf-8');
    } catch (err) {
        console.error('[VerticesMemMgmt1] Failed to write file:', err.message);
    }
}

function appendToFile(file, content) {
    const existing = readFile(file);
    const joined   = existing && !existing.endsWith('\n')
        ? existing + '\n' + content
        : existing + content;
    writeFile(file, joined);
}

// === MEMORY COMMAND HANDLER ===
// fullMessage is the entire boss command string, e.g. "add perm Buy gold today"
function handleMemCommand(fullMessage) {
    const parts   = (fullMessage || '').trim().split(/\s+/);
    const command = parts.slice(0, 2).join(' ').toLowerCase();
    const content = parts.slice(2).join(' ');

    switch (command) {
        case 'show perm':
            return readFile(PERM_FILE) || '(Permanent memory is empty)';

        case 'show temp':
            return readFile(TEMP_FILE) || '(Temporary memory is empty)';

        case 'wipe perm':
            writeFile(PERM_FILE, '');
            return 'Permanent memory wiped.';

        case 'wipe temp':
            writeFile(TEMP_FILE, '');
            return 'Temporary memory wiped.';

        case 'add perm':
            if (!content) return 'No content provided to add.';
            appendToFile(PERM_FILE, content);
            return 'Added to permanent memory.';

        case 'add temp':
            if (!content) return 'No content provided to add.';
            appendToFile(TEMP_FILE, content);
            return 'Added to temporary memory.';

        case 'replace perm':
            if (!content) return 'No content provided to replace with.';
            writeFile(PERM_FILE, content);
            return 'Permanent memory replaced.';

        case 'replace temp':
            if (!content) return 'No content provided to replace with.';
            writeFile(TEMP_FILE, content);
            return 'Temporary memory replaced.';

        default:
            return 'Unrecognized memory command.';
    }
}

module.exports = { handleMemCommand };
