const Intercom = require('intercom-client');
const config = require('../config');

var client = new Intercom.Client({ token: config.intercom_credentials.token });

exports.sendMessageToIntercom = () => {
    // TODO
};
