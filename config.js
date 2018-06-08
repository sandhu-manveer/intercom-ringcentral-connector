module.exports = {
    name: 'ringcentral-intercom-connector',
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || process.env.VCAP_APP_PORT || 3000,
    base_url: process.env.BASE_URL || 'http://localhost:3000',
    url_prefix: '/api/v1/',
    ringcentral_credentials: {
        username: process.env.RINGCENTRAL_USERNAME,
        extension: process.env.RINGCENTRAL_EXTENSION,
        password: process.env.RINGCENTRAL_PASSWORD,
        server_url: process.env.RINGCENTRAL_SERVER_URL,
        client_id: process.env.RINGCENTRAL_CLIENT_ID,
        client_secret: process.env.RINGCENTRAL_CLIENT_SECRET
    }
};