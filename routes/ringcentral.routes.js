'use strict';

const ringcentralControllers = require('../controllers/ringcentral.controllers');

module.exports = (server, url_prefix) => {
    url_prefix = url_prefix || '' ;
    server.get(url_prefix + '/ringcentral/sendToIntercom', ringcentralControllers.sendToIntercom);
};