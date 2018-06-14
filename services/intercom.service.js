const Intercom = require('intercom-client');
const config = require('../config');

const ringcentralService = require('./ringcentral.service');

const client = new Intercom.Client({ token: config.intercom_credentials.token });

var contexts = [];

exports.sentToIntercom = (rc_data) => {
    // check if first message
    // TODO: cannot find conversationId in instant message event object using from number for now
    const rc_id = rc_data.body.from.phoneNumber;
    if(!contexts[rc_id]) {
        let ringcentralContext = findOrCreateContext(rc_id);
        
        // Create a user
        client.users.create({
            user_id: rc_id,
            custom_attributes: {
                ringcentral: true
            }
        }, (confirm) => {
            // save intercom user id
            ringcentralContext.intercom_user_id = confirm.body.id;
            contexts[rc_id] = { intercom_context: {intercom_user_id: confirm.body.id }};

            let message = {
                from: {
                    type: 'user',
                    id: ringcentralContext.intercom_user_id
                },
                body: rc_data.body.subject
            };

            // add image attachments
            // can attachment be added to /message endpoint
            // rc_data.attachments.forEach((attachment) => {
            //     if(attachment.type === 'MmsAttachment') {
            //         if (!message.attachment_urls) message.attachment_urls = [];
            //         message.attachment_urls.push(attachment.uri);
            //     }
            // });
               
            client.messages.create(message, (confirm) => {
                if(confirm.body.type === 'error.list') console.error(confirm.body);
                else {
                    contexts[rc_id].intercom_context.intercom_message_id = confirm.body.id;
                    console.log('message sent to intercom');
                }
            });
        });
    } else {
        let ringcentralContext = findOrCreateContext(rc_id);

        // have to use last because conv id not returned
        let reply = {
            id: 'last',
            intercom_user_id: ringcentralContext.intercom_context.intercom_user_id,
            body: rc_data.body.subject,
            type: 'user',
            message_type: 'comment'
        };

        // add image attachments
        if(rc_data.body.attachments) {
            rc_data.body.attachments.forEach((attachment) => {
                if(attachment.type === 'MmsAttachment') {
                    if (!reply.attachment_urls) reply.attachment_urls = [];
                    reply.attachment_urls.push(attachment.uri);
                }
            });
        }
           
        client.conversations.reply(reply, (confirm) => {
            if(confirm.body.type === 'error.list') console.error(confirm.body);
            console.log('send message with existing data');
        });
    }
};

const findOrCreateContext = (convId) => {
    if (!contexts) contexts = [];
    
    if (!contexts[convId]) {
        contexts[convId] = { intercom_context: {intercom_user_id: null, intercom_message_id: null} };
    }
    return contexts[convId];
};

exports.sendToRingcentral = (req, res) => {
    
    let intercomReq = req.body;

    if (intercomReq.topic === 'conversation.admin.replied') {
        let userId = null;
        let itemId = null;
        let assigneeId = null;
        let inputMessage = '';
        // check if message
        try {
            userId = intercomReq.data.item.user.user_id; // using user_id which is phone number in this case
            itemId = intercomReq.data.item.id;
            assigneeId = intercomReq.data.item.assignee.id;
        } catch (e) {
            res.send(500);
        }

        // if first message
        try { 
            inputMessage = intercomReq.data.item.conversation_parts.conversation_parts[0].body;
        } catch (e) {
            inputMessage = intercomReq.data.item.conversation_message.body;
        }

        inputMessage = inputMessage.replace(/<(?:.|\n)*?>/gm, '');

        if (userId && inputMessage && itemId && assigneeId) { 
            ringcentralService.sendSMS(userId.replace('+', ''), inputMessage);
            res.send(200);
        } else {
            res.send(500);
        }
    } else {
        res.send(500);
    }
};