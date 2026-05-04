public with sharing class WhatsAppService {

    private static final String MIDDLEWARE_ENDPOINT = WhatsApp_Settings__c.getOrgDefaults().Middleware_URL__c;

    public static String sendMessage(String phoneNumber, String messageBody, Id accountId, Id contactId) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint(MIDDLEWARE_ENDPOINT + '/api/send');
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('X-API-Key', WhatsApp_Settings__c.getOrgDefaults().API_Key__c);

        Map<String, Object> payload = new Map<String, Object>{
            'to' => phoneNumber,
            'message' => messageBody,
            'accountId' => accountId,
            'contactId' => contactId
        };
        req.setBody(JSON.serialize(payload));
        req.setTimeout(30000);

        Http http = new Http();
        HttpResponse res = http.send(req);

        if (res.getStatusCode() == 200) {
            Map<String, Object> responseBody = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
            String waMessageId = (String) responseBody.get('messageId');

            createMessageRecord(phoneNumber, messageBody, 'Outbound', 'Sent', waMessageId, accountId, contactId);

            return waMessageId;
        } else {
            createMessageRecord(phoneNumber, messageBody, 'Outbound', 'Failed', null, accountId, contactId);
            throw new WhatsAppException('Failed to send message: ' + res.getStatusCode() + ' ' + res.getBody());
        }
    }

    public static WhatsApp_Message__c createMessageRecord(
        String phoneNumber,
        String messageBody,
        String direction,
        String status,
        String waMessageId,
        Id accountId,
        Id contactId
    ) {
        WhatsApp_Message__c msg = new WhatsApp_Message__c();
        msg.Phone_Number__c = phoneNumber;
        msg.Message_Body__c = messageBody;
        msg.Direction__c = direction;
        msg.Status__c = status;
        msg.WhatsApp_Message_Id__c = waMessageId;
        msg.Account__c = accountId;
        msg.Contact__c = contactId;
        msg.Timestamp__c = Datetime.now();
        insert msg;
        return msg;
    }

    public static void updateMessageStatus(String waMessageId, String status) {
        List<WhatsApp_Message__c> messages = [
            SELECT Id, Status__c
            FROM WhatsApp_Message__c
            WHERE WhatsApp_Message_Id__c = :waMessageId
            LIMIT 1
        ];
        if (!messages.isEmpty()) {
            messages[0].Status__c = status;
            update messages[0];
        }
    }

    public class WhatsAppException extends Exception {}
}
