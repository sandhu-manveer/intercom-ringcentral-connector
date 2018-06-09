'use strict';

const ringcentralService = require('../services/ringcentral.service');

exports.processMessage = (req, res) => {
    ringcentralService.inboundRequest(req, res);
};