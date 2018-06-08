'use strict';

const ringcentralController = require('../controllers/ringcentral.controllers');

module.exports = (server, url_prefix) => {
    url_prefix = url_prefix || '' ;
    server.get(url_prefix + '/ringcentral/sendToIntercom', ringcentralController.sendToIntercom);
};