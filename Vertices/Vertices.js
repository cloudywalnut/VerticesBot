// Vertices16 - Enterprise WhatsApp AI Bot (Baileys)
const path = require('path');
require('dotenv').config({
    path: path.join(__dirname, '..', 'userdata', '.env'),
    override: true,
    silent: true
});

require('./Vertices_Sock/Vertices_Sock.js');
