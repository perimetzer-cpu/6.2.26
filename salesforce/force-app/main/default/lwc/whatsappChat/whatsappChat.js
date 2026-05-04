import { LightningElement, api, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getMessages from '@salesforce/apex/WhatsAppController.getMessages';
import sendMessage from '@salesforce/apex/WhatsAppController.sendMessage';
import getRecordPhone from '@salesforce/apex/WhatsAppController.getRecordPhone';
import refreshMessages from '@salesforce/apex/WhatsAppController.refreshMessages';

export default class WhatsappChat extends LightningElement {
    @api recordId;
    @track messages = [];
    @track messageText = '';
    @track isLoading = true;
    @track isSending = false;

    phoneNumber = '';
    recordName = '';
    recordType = '';
    accountId = '';
    refreshInterval;

    @wire(getRecordPhone, { recordId: '$recordId' })
    wiredRecordPhone({ error, data }) {
        if (data) {
            this.phoneNumber = data.phone || '';
            this.recordName = data.name || '';
            this.recordType = data.type || '';
            this.accountId = data.accountId || '';
        } else if (error) {
            this.showToast('Error', 'Failed to load record phone', 'error');
        }
    }

    @wire(getMessages, { recordId: '$recordId' })
    wiredMessages({ error, data }) {
        this.isLoading = false;
        if (data) {
            this.messages = this.formatMessages(data);
            this.scrollToBottom();
        } else if (error) {
            this.showToast('Error', 'Failed to load messages', 'error');
        }
    }

    connectedCallback() {
        this.refreshInterval = setInterval(() => {
            this.handleRefresh();
        }, 15000);
    }

    disconnectedCallback() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    get phoneDisplay() {
        return this.phoneNumber
            ? `${this.recordName}: ${this.phoneNumber}`
            : `${this.recordName}: No phone number`;
    }

    get hasMessages() {
        return this.messages && this.messages.length > 0;
    }

    get isSendDisabled() {
        return !this.messageText || !this.messageText.trim() || this.isSending || !this.phoneNumber;
    }

    formatMessages(rawMessages) {
        return rawMessages.map(msg => {
            const isOutbound = msg.Direction__c === 'Outbound';
            return {
                ...msg,
                isOutbound,
                bubbleClass: `message-bubble ${isOutbound ? 'outbound' : 'inbound'}`,
                innerClass: `bubble-inner ${isOutbound ? 'bubble-outbound' : 'bubble-inbound'}`,
                formattedTime: this.formatTimestamp(msg.Timestamp__c)
            };
        });
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return '';
        const dt = new Date(timestamp);
        const now = new Date();
        const isToday = dt.toDateString() === now.toDateString();

        const timeStr = dt.toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit'
        });

        if (isToday) {
            return timeStr;
        }
        const dateStr = dt.toLocaleDateString('he-IL', {
            day: '2-digit',
            month: '2-digit'
        });
        return `${dateStr} ${timeStr}`;
    }

    handleMessageChange(event) {
        this.messageText = event.target.value;
    }

    handleKeyUp(event) {
        if (event.key === 'Enter' && !this.isSendDisabled) {
            this.handleSend();
        }
    }

    async handleSend() {
        if (this.isSendDisabled) return;

        this.isSending = true;
        const text = this.messageText.trim();
        this.messageText = '';

        try {
            const accId = this.recordType === 'Account' ? this.recordId : this.accountId;
            const conId = this.recordType === 'Contact' ? this.recordId : '';

            await sendMessage({
                phoneNumber: this.phoneNumber,
                messageBody: text,
                accountId: accId,
                contactId: conId
            });

            this.showToast('Success', 'Message sent!', 'success');
            await this.handleRefresh();
        } catch (error) {
            this.showToast('Error', error.body?.message || 'Failed to send message', 'error');
            this.messageText = text;
        } finally {
            this.isSending = false;
        }
    }

    async handleRefresh() {
        try {
            const data = await refreshMessages({ recordId: this.recordId });
            if (data) {
                this.messages = this.formatMessages(data);
                this.scrollToBottom();
            }
        } catch (error) {
            // Silent refresh failure
        }
    }

    scrollToBottom() {
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            const container = this.template.querySelector('[data-id="chatContainer"]');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }, 100);
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
