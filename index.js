'use strict';

// module dependencies
const config = require('./config');
const restify = require('restify');


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