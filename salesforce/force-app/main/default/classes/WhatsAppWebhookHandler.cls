@RestResource(urlMapping='/whatsapp/webhook/*')
global with sharing class WhatsAppWebhookHandler {

    @HttpPost
    global static void handleIncoming() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;

        try {
            String apiKey = req.headers.get('X-API-Key');
            String expectedKey = WhatsApp_Settings__c.getOrgDefaults().API_Key__c;

            if (String.isBlank(apiKey) || apiKey != expectedKey) {
                res.statusCode = 401;
                res.responseBody = Blob.valueOf('{"error":"Unauthorized"}');
                return;
            }

            Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(req.requestBody.toString());
            String eventType = (String) body.get('type');

            if (eventType == 'message') {
                handleIncomingMessage(body);
            } else if (eventType == 'status') {
                handleStatusUpdate(body);
            }

            res.statusCode = 200;
            res.responseBody = Blob.valueOf('{"status":"ok"}');
        } catch (Exception e) {
            res.statusCode = 500;
            res.responseBody = Blob.valueOf('{"error":"' + e.getMessage() + '"}');
        }
    }

    private static void handleIncomingMessage(Map<String, Object> body) {
        String fromNumber = (String) body.get('from');
        String messageBody = (String) body.get('message');
        String waMessageId = (String) body.get('messageId');

        Id accountId = findAccountByPhone(fromNumber);
        Id contactId = findContactByPhone(fromNumber);

        WhatsAppService.createMessageRecord(
            fromNumber, messageBody, 'Inbound', 'Delivered',
            waMessageId, accountId, contactId
        );
    }

    private static void handleStatusUpdate(Map<String, Object> body) {
        String waMessageId = (String) body.get('messageId');
        String status = (String) body.get('status');

        Map<String, String> statusMap = new Map<String, String>{
            'sent' => 'Sent',
            'delivered' => 'Delivered',
            'read' => 'Read',
            'failed' => 'Failed'
        };

        String mappedStatus = statusMap.get(status);
        if (mappedStatus != null) {
            WhatsAppService.updateMessageStatus(waMessageId, mappedStatus);
        }
    }

    private static Id findAccountByPhone(String phone) {
        String cleaned = phone.replaceAll('[^0-9+]', '');
        List<Account> accounts = [
            SELECT Id FROM Account
            WHERE Phone LIKE :('%' + cleaned.right(10))
            LIMIT 1
        ];
        return accounts.isEmpty() ? null : accounts[0].Id;
    }

    private static Id findContactByPhone(String phone) {
        String cleaned = phone.replaceAll('[^0-9+]', '');
        String phoneSuffix = '%' + cleaned.right(10);
        List<Contact> contacts = [
            SELECT Id FROM Contact
            WHERE Phone LIKE :phoneSuffix OR MobilePhone LIKE :phoneSuffix
            LIMIT 1
        ];
        return contacts.isEmpty() ? null : contacts[0].Id;
    }
}
