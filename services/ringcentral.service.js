const SDK = require('ringcentral');
const config = require('../config');

const rcsdk = new SDK({
    server: config.ringcentral_credentials.server_url,
    appKey: config.ringcentral_credentials.client_id,
    appSecret: config.ringcentral_credentials.client_secret
});

const platform = rcsdk.platform();

exports.ringcentralLogin = () => {
    platform.login({
        username: config.ringcentral_credentials.username,
        extension: config.ringcentral_credentials.extension,
        password: config.ringcentral_credentials.password
    }).then(() => {
        console.log('Ringcentral login successful');
    }).catch(e => {
        console.error(e);
    });
};

exports.sendSMS = (toNumber) => {
    platform.post('/account/~/extension/~/sms', {
        from: { phoneNumber: process.env.RINGCENTRAL_USERNAME },
        to: [
            { 
                phoneNumber: toNumber,
            }
        ],
        text: 'Message content'
    }).then(response => {
        console.log('SMS sent: ' + response.json().id);
    }).catch(e => {
        console.error(e);
    });
};
