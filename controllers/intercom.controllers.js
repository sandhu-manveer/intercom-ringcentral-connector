'use strict';

const intercomService = require('../services/intercom.service');

exports.processMessage = (req, res) => {
    intercomService.sendToRingcentral(req, res);
};