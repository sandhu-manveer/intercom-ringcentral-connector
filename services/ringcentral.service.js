const SDK = require('ringcentral');
const config = require('../config');
const FormData = require('form-data');
const request = require('request');

const AWS = require('aws-sdk');
AWS.config.update({
    accessKeyId: config.aws_credentials.access_key,
    secretAccessKey: config.aws_credentials.secret_key
});
const s3 = new AWS.S3();
const ringcentral_bucket = config.aws_credentials.ringcentral_image_bucket;

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
        deleteAllSubscriptions()
            .then(() => {
                webhookInit();
            });
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

exports.sendMMS = (toNumber, messageContent, imgUrl) => {
    request(imgUrl, {encoding: null}, function(error, response, intercom_image) {
        const formData = new FormData();
        const body = {
            from: { phoneNumber: config.ringcentral_credentials.username },
            to: [
                { phoneNumber: toNumber }
            ],
            text: messageContent
        };
        formData.append('json', Buffer.from(JSON.stringify(body)), {filename: imgUrl.split('/').slice(-1)[0], contentType: 'application/json'});
        formData.append('attachment', intercom_image, imgUrl.split('/').slice(-1)[0]);
        platform.post('/account/~/extension/~/sms', formData).then(response => {
            console.log('MMS sent: ' + response.json().id);
        }).catch(e => {
            console.error(e.message);
            // sending sms if mms failure
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
        });
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
            res.statusCode = 200;
            res.end();
            
            // check if attachment
            let rc_body = req.body;
            let is_mms = false;
            rc_body.body.attachments.forEach(attachment => {
                if(attachment.type === 'MmsAttachment') is_mms = true;
            });
            if(is_mms) {
                uploadImagesToS3(rc_body, (err, rc_body_img) => {
                    if (err) console.log(err);
                    intercomService.sentToIntercom(rc_body_img);
                });
            } else {
                intercomService.sentToIntercom(rc_body);
            }
        }
    }
};

// TODO: safety for multiple attachments
const uploadImagesToS3 = (rc_body, callback) => {
    rc_body.body.attachments.forEach((attachment, index) => {
        if(attachment.type === 'MmsAttachment') {
            // get image from rc
            platform.get(attachment.uri)
                .then(img_res => {
                    return img_res.response().buffer();
                })
                .then(buffer => {
                    s3.putObject({
                        Bucket: ringcentral_bucket,
                        Key: attachment.id,
                        Body: buffer,
                        ACL: 'public-read',
                        ContentType: attachment.contentType
                    }).on('httpUploadProgress', function(evt) {
                        console.log('Uploaded :: ' + parseInt((evt.loaded * 100) / evt.total)+'%');
                    }).send(function(err) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log('Successfully uploaded ' + attachment.uri);
                            rc_body.body.attachments[index].uri = config.aws_credentials.s3_url + '/' + attachment.id;
                            callback(null, rc_body);
                        }
                    });
                })
                .catch(e => {
                    callback(e, null);
                });
        }
    });
};

const deleteAllSubscriptions = () => {
    console.log('deleting subscriptions');
    return platform.get('/subscription')
        .then(function(res) {
            let subs_obj = JSON.parse(res._text);
            subs_obj.records.map(record => {
                platform.delete('/subscription/' + record.id)
                    .then(() => {
                        console.log(record.id + 'deleted');
                    })
                    .catch(e => {
                        console.log(e);
                    });
            });
        });
};