const { messageType, type2Message } = require('./messages');
const { startNtlmServer } = require('./server');

module.exports = { startNtlmServer, messageType, type2Message };
