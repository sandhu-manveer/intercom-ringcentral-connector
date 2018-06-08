module.exports = {
    name: 'ringcentral-intercom-connector',
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || process.env.VCAP_APP_PORT || 3000,
    base_url: process.env.BASE_URL || 'http://localhost:3000',
    url_prefix: '/api/v1/'
};