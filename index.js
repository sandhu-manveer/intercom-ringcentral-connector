'use strict';

// module dependencies
require('dotenv').config({silent: true});
const config = require('./config');
const restify = require('restify');

const ringcentralService = require('./services/ringcentral.service');

// Initialize Server 
const server = restify.createServer({
    name: config.name,
    version: config.version
});

// Middleware
server.use(restify.plugins.bodyParser());

// start server and import routes
server.listen(config.port, () => {
    require('./routes/ringcentral.routes')(server, config.url_prefix);
    console.log(`Server is listening on port ${config.port}`);
});

// login to ringcentral
ringcentralService.initRingcentral();