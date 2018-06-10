const SDK = require('ringcentral');
const config = require('../config');

const intercomService = require('./intercom.service');

const rcsdk = new SDK({
    server: config.ringcentral_credentials.server_url,
    appKey: config.ringcentral_credentials.client_id,
    appSecret: config.ringcentral_credentials.client_secret
});

const platform = rcsdk.platform();

exports.initRingcentral = () => {
    ringcentralLogin();
};

const ringcentralLogin = () => {
    platform.login({
        username: config.ringcentral_credentials.username,
        extension: config.ringcentral_credentials.extension,
        password: config.ringcentral_credentials.password
    }).then(() => {
        console.log('Ringcentral login successful');
        webhookInit();
    }).catch(e => {
        console.error(e);
    });
};

exports.sendSMS = (toNumber, messageContent) => {
    platform.post('/account/~/extension/~/sms', {
        from: { phoneNumber: config.ringcentral_credentials.username },
        to: [
            { 
                phoneNumber: toNumber,
            }
        ],
        text: messageContent
    }).then(response => {
        console.log('SMS sent: ' + response.json().id);
    }).catch(e => {
        console.error(e);
    });
};

const webhookInit = () => {
    var extensions = [];
    var page = 1;

    function getExtensionsPage() {

        return platform
            .get('/account/~/extension/', {
                type: 'User',
                status: 'Enabled',
                page: page,
                perPage: config.ringcentral_credentials.extensions_per_page //REDUCE NUMBER TO SPEED BOOTSTRAPPING
            })
            .then(function (response) {
                var data = response.json();
                extensions = extensions.concat(data.records);
                if (data.navigation.nextPage) {
                    page++;
                    return getExtensionsPage();
                } else {
                    return extensions;
                }
            });

    }

    return getExtensionsPage()
        .then(createEventFilter)
        .then(startSubscription)
        .catch(function (e) {
            console.error(e);
            throw e;
        });

};

const startSubscription = (eventFilterPayload) => {
    console.log('Event Filter Payload: ', eventFilterPayload);
    return platform.post('/subscription',
        {
            eventFilters: eventFilterPayload,
            deliveryMode: {
                transportType: config.ringcentral_credentials.delivery_mode_transport_type,
                address: config.ringcentral_credentials.delivery_mode_address// + '?auth_token=' + config.ringcentral_credentials.webhook_token
            }
        })
        .then(function() {
            console.log('Subscription established');
        })
        .catch(function(e) {
            console.error(e);
            throw e;
        });
};

const createEventFilter = (extensions) => {
    var _eventFilters = [];
    for(var i = 0; i < extensions.length; i++) {
        var extension = extensions[i];
        _eventFilters.push(generateInstantMessageEventFilter(extension));
    }
    return _eventFilters;
};

const generateInstantMessageEventFilter = (item) => {
    if (!item) {
        throw new Error('generateInstantMessageEventFilter requires an extension');
    } else {
        console.log('The Instant Message Event Filter added for the extension :' + item.id + ' : /account/~/extension/' + item.id + '/message-store/instant?type=SMS');
        return '/restapi/v1.0/account/~/extension/' + item.id + '/message-store/instant?type=SMS';
    }
};

exports.inboundRequest = (req, res) => {
    var method = req.method;
    var reqUrl = req.url;
    var headers = req.headers;
    var validationToken = headers['validation-token'];

    if( 'POST' != method || config.url_prefix + '/ringcentral/webhooks' != reqUrl) {
        res.statusCode = 403; // Forbidden
        res.end();
    } else {
        if(validationToken) {
            res.setHeader('Validation-Token', validationToken);
            res.statusCode = 200;
            res.end();
        } else {
            console.log('Webhook data received');
            res.send(req.body);
            intercomService.sentToIntercom(req.body);
        }
    }
};
