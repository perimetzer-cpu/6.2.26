const jsforce = require('jsforce');

let connection = null;

async function getConnection() {
    if (connection && connection.accessToken) {
        try {
            await connection.identity();
            return connection;
        } catch (e) {
            connection = null;
        }
    }

    connection = new jsforce.Connection({
        loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com'
    });

    await connection.login(
        process.env.SF_USERNAME,
        process.env.SF_PASSWORD + (process.env.SF_SECURITY_TOKEN || '')
    );

    return connection;
}

async function notifyIncomingMessage(from, message, messageId) {
    const conn = await getConnection();

    const apiKey = process.env.API_KEY;
    const siteUrl = conn.instanceUrl;

    const response = await conn.apex.post('/whatsapp/webhook/', {
        type: 'message',
        from: from,
        message: message,
        messageId: messageId
    });

    return response;
}

async function notifyStatusUpdate(messageId, status) {
    const conn = await getConnection();

    const response = await conn.apex.post('/whatsapp/webhook/', {
        type: 'status',
        messageId: messageId,
        status: status
    });

    return response;
}

module.exports = { getConnection, notifyIncomingMessage, notifyStatusUpdate };
