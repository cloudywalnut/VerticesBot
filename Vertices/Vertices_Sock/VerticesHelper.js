// VerticesHelper.js
const Chat    = require('./VerticesChat1.js');
const Pause   = require('./VerticesPause1.js');
const MemMgmt = require('./VerticesMemMgmt1.js');

// === COMMAND DISPATCHER ===
function runHelperCommand(command, ...args) {
    switch (command) {

        case 'loadPersona': {
            const persona = Chat.loadPersona(...args);
            return persona ? JSON.stringify(persona) : '';
        }

        case 'clearSessionAndCache':
            return Chat.clearSessionAndCache();

        case 'logChat':
            Chat.logChat(...args);
            return '';

        case 'getLastChatHistory':
            return Chat.getLastChatHistory(...args) || '';

        case 'countWordsAndTokens': {
            const result = Chat.countWordsAndTokens(...args);
            return `words: ${result.words}, tokens: ${result.tokens}`;
        }

        case 'getCurrentDateTime':
            return Chat.getCurrentDateTime(...args) || '';

        case 'wasBossNotified':
            return Chat.wasBossNotified(...args) ? 'true' : 'false';

        case 'updateNotificationTimestamp':
            Chat.updateNotificationTimestamp(...args);
            return '';

        case 'isUserPaused':
            return Pause.isUserPaused(...args) ? 'true' : 'false';

        case 'pause':
            Pause.pauseUser(...args);
            return '';

        case 'unpause':
            Pause.unpauseUser(...args);
            return '';

        case 'pauseall':
            Pause.setGlobalPause(args[0], true);
            return '';

        case 'unpauseall':
            Pause.setGlobalPause(args[0], false);
            return '';

        case 'memCommand':
            return MemMgmt.handleMemCommand(...args) || '';

        default:
            console.error(`[VerticesHelper] Unknown command: "${command}"`);
            return '';
    }
}

module.exports = { runHelperCommand };
