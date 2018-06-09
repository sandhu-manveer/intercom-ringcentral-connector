const Intercom = require('intercom-client');
const config = require('../config');

const client = new Intercom.Client({ token: config.intercom_credentials.token });

var contexts = [];

exports.sentToIntercom = (rc_data) => {
    // check if first message
    if(!contexts[rc_data.body.id]) {
        let ringcentralContext = findOrCreateContext(rc_data.body.id);
        
        // Create a user
        client.users.create({
            user_id: rc_data.body.id,
            custom_attributes: {
                ringcentral: true
            }
        }, (confirm) => {
            // save intercom user id
            ringcentralContext.intercom_user_id = confirm.body.id;
            contexts[rc_data.body.id] = { intercom_context: {intercom_user_id: confirm.body.id }};

            let message = {
                from: {
                    type: 'user',
                    id: ringcentralContext.intercom_user_id
                },
                body: rc_data.body.subject
            };
               
            client.messages.create(message, (confirm) => {
                if(confirm.body.type === 'error.list') console.error(confirm.body);
                else {
                    contexts[rc_data.body.id].intercom_context.intercom_message_id = confirm.body.id;
                    console.log('message sent to intercom');
                }
            });
        });
    } else {
        let ringcentralContext = findOrCreateContext(rc_data.body.id);

        let reply = {
            id: 'last',
            intercom_user_id: ringcentralContext.intercom_context.intercom_user_id,
            body: rc_data.body.subject,
            type: 'user',
            message_type: 'comment'
        };
           
        client.conversations.reply(reply, (confirm) => {
            if(confirm.body.type === 'error.list') console.error(confirm.body);
            console.log('send message with existing message');
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
