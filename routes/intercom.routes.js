'use strict';

const intercomControllers = require('../controllers/intercom.controllers');

module.exports = (server, url_prefix) => {
    url_prefix = url_prefix || '' ;
    server.get(url_prefix + '/intercom/subscribe', (req, res) => {
        res.send(501);
    });
    server.post(url_prefix + '/intercom/subscribe', intercomControllers.processMessage);
};