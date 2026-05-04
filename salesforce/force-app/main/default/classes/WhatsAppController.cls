public with sharing class WhatsAppController {

    @AuraEnabled
    public static String sendMessage(String phoneNumber, String messageBody, String accountId, String contactId) {
        try {
            Id accId = String.isNotBlank(accountId) ? Id.valueOf(accountId) : null;
            Id conId = String.isNotBlank(contactId) ? Id.valueOf(contactId) : null;
            return WhatsAppService.sendMessage(phoneNumber, messageBody, accId, conId);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled(cacheable=true)
    public static List<WhatsApp_Message__c> getMessages(String recordId) {
        Id recId = Id.valueOf(recordId);
        String sObjectType = recId.getSObjectType().getDescribe().getName();

        if (sObjectType == 'Account') {
            return [
                SELECT Id, Name, Message_Body__c, Direction__c, Status__c,
                       Phone_Number__c, Timestamp__c, WhatsApp_Message_Id__c,
                       Contact__r.Name
                FROM WhatsApp_Message__c
                WHERE Account__c = :recId
                ORDER BY Timestamp__c ASC
                LIMIT 200
            ];
        } else if (sObjectType == 'Contact') {
            return [
                SELECT Id, Name, Message_Body__c, Direction__c, Status__c,
                       Phone_Number__c, Timestamp__c, WhatsApp_Message_Id__c,
                       Account__r.Name
                FROM WhatsApp_Message__c
                WHERE Contact__c = :recId
                ORDER BY Timestamp__c ASC
                LIMIT 200
            ];
        }
        return new List<WhatsApp_Message__c>();
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, String> getRecordPhone(String recordId) {
        Id recId = Id.valueOf(recordId);
        String sObjectType = recId.getSObjectType().getDescribe().getName();
        Map<String, String> result = new Map<String, String>();

        if (sObjectType == 'Account') {
            Account acc = [SELECT Id, Name, Phone FROM Account WHERE Id = :recId LIMIT 1];
            result.put('phone', acc.Phone);
            result.put('name', acc.Name);
            result.put('type', 'Account');
        } else if (sObjectType == 'Contact') {
            Contact con = [
                SELECT Id, Name, Phone, MobilePhone, AccountId
                FROM Contact WHERE Id = :recId LIMIT 1
            ];
            result.put('phone', String.isNotBlank(con.MobilePhone) ? con.MobilePhone : con.Phone);
            result.put('name', con.Name);
            result.put('type', 'Contact');
            result.put('accountId', con.AccountId);
        }
        return result;
    }

    @AuraEnabled
    public static List<WhatsApp_Message__c> refreshMessages(String recordId) {
        return getMessages(recordId);
    }
}
