'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../../index');
const config = require('../../config');
chai.should();

chai.use(chaiHttp);

describe('Intercom Routes Test', () => {
    before((done) => {
        // delay to wait for subscription to be establish - fix
        setTimeout(() => {
            done();
        }, 7000);
    });

    describe('/GET ' + config.url_prefix + '/intercom/subscribe', () => {
        it('it should provide a 501 response', (done) => {
            chai.request(server)
                .get(config.url_prefix + '/intercom/subscribe')
                .end((err, res) => {
                    res.should.have.status(501);
                    done();
                });
        });
    });
});
