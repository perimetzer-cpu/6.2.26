const express = require('express');
const router = express.Router();
const whatsapp = require('../services/whatsapp');

function authenticate(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

router.use(authenticate);

router.post('/send', async (req, res) => {
    try {
        const { to, message } = req.body;

        if (!to || !message) {
            return res.status(400).json({ error: 'Missing required fields: to, message' });
        }

        const cleanPhone = to.replace(/[^0-9+]/g, '');
        const phone = cleanPhone.startsWith('+') ? cleanPhone.substring(1) : cleanPhone;

        const messageId = await whatsapp.sendTextMessage(phone, message);
        console.log(`Message sent to ${phone}: ${messageId}`);

        res.json({ success: true, messageId });
    } catch (error) {
        console.error('Send message error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to send message',
            details: error.response?.data?.error?.message || error.message
        });
    }
});

router.post('/send-template', async (req, res) => {
    try {
        const { to, templateName, languageCode, parameters } = req.body;

        if (!to || !templateName) {
            return res.status(400).json({ error: 'Missing required fields: to, templateName' });
        }

        const cleanPhone = to.replace(/[^0-9+]/g, '');
        const phone = cleanPhone.startsWith('+') ? cleanPhone.substring(1) : cleanPhone;

        const messageId = await whatsapp.sendTemplateMessage(phone, templateName, languageCode, parameters);
        console.log(`Template sent to ${phone}: ${messageId}`);

        res.json({ success: true, messageId });
    } catch (error) {
        console.error('Send template error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to send template',
            details: error.response?.data?.error?.message || error.message
        });
    }
});

module.exports = router;
