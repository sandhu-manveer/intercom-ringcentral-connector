'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../../index');
const config = require('../../config');
chai.should();

chai.use(chaiHttp);

describe('Ringcentral Routes Test', () => {
    describe('/GET ' + config.url_prefix + '/ringcentral/webhooks', () => {
        it('it should provide a 501 response', (done) => {
            chai.request(server)
                .get(config.url_prefix + '/ringcentral/webhooks')
                .end((err, res) => {
                    res.should.have.status(501);
                    done();
                });
        });
    });
});
