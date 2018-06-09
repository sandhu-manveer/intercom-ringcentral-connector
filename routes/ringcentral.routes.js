'use strict';

const ringcentralControllers = require('../controllers/ringcentral.controllers');

module.exports = (server, url_prefix) => {
    url_prefix = url_prefix || '' ;
    server.post(url_prefix + '/ringcentral/webhooks', ringcentralControllers.processMessage);
};