const express = require('express');
const router = express.Router();
const salesforce = require('../services/salesforce');

router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        console.log('Webhook verified');
        return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
});

router.post('/', async (req, res) => {
    try {
        const body = req.body;

        if (body.object !== 'whatsapp_business_account') {
            return res.sendStatus(404);
        }

        const entries = body.entry || [];
        for (const entry of entries) {
            const changes = entry.changes || [];
            for (const change of changes) {
                const value = change.value;

                if (value.messages) {
                    for (const message of value.messages) {
                        await handleIncomingMessage(message, value.contacts);
                    }
                }

                if (value.statuses) {
                    for (const status of value.statuses) {
                        await handleStatusUpdate(status);
                    }
                }
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Webhook error:', error);
        res.sendStatus(200);
    }
});

async function handleIncomingMessage(message, contacts) {
    const from = message.from;
    let messageBody = '';

    switch (message.type) {
        case 'text':
            messageBody = message.text.body;
            break;
        case 'image':
            messageBody = '[Image]' + (message.image.caption ? ': ' + message.image.caption : '');
            break;
        case 'document':
            messageBody = '[Document]' + (message.document.filename ? ': ' + message.document.filename : '');
            break;
        case 'audio':
            messageBody = '[Audio message]';
            break;
        case 'video':
            messageBody = '[Video]' + (message.video.caption ? ': ' + message.video.caption : '');
            break;
        case 'location':
            messageBody = `[Location: ${message.location.latitude}, ${message.location.longitude}]`;
            break;
        default:
            messageBody = `[${message.type}]`;
    }

    const contactName = contacts && contacts[0] ? contacts[0].profile.name : from;
    console.log(`Incoming from ${contactName} (${from}): ${messageBody}`);

    try {
        await salesforce.notifyIncomingMessage(from, messageBody, message.id);
    } catch (error) {
        console.error('Failed to notify Salesforce:', error.message);
    }
}

async function handleStatusUpdate(status) {
    const statusMap = {
        'sent': 'sent',
        'delivered': 'delivered',
        'read': 'read',
        'failed': 'failed'
    };

    const mappedStatus = statusMap[status.status];
    if (!mappedStatus) return;

    console.log(`Status update: ${status.id} -> ${status.status}`);

    try {
        await salesforce.notifyStatusUpdate(status.id, mappedStatus);
    } catch (error) {
        console.error('Failed to update status in Salesforce:', error.message);
    }
}

module.exports = router;
