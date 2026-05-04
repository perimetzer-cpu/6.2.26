const axios = require('axios');

const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

async function sendTextMessage(to, message) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_TOKEN;

    const response = await axios.post(
        `${GRAPH_API_URL}/${phoneNumberId}/messages`,
        {
            messaging_product: 'whatsapp',
            to: to,
            type: 'text',
            text: { body: message }
        },
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }
    );

    return response.data.messages[0].id;
}

async function sendTemplateMessage(to, templateName, languageCode, parameters) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_TOKEN;

    const components = [];
    if (parameters && parameters.length > 0) {
        components.push({
            type: 'body',
            parameters: parameters.map(p => ({ type: 'text', text: p }))
        });
    }

    const response = await axios.post(
        `${GRAPH_API_URL}/${phoneNumberId}/messages`,
        {
            messaging_product: 'whatsapp',
            to: to,
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode || 'he' },
                components
            }
        },
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }
    );

    return response.data.messages[0].id;
}

module.exports = { sendTextMessage, sendTemplateMessage };
