'use strict';
var proxyquire = require('proxyquire'),
    chai = require('chai'),
    sinon = require('sinon'),
    assert = chai.assert,
    expect = chai.expect,
    testHelper = require('../../util/testHelper'),
    secrets = require('../../lib/secrets');

//var createUser = require('./createUser');

const testPassword = 'Iam@llright2';

describe('createUser', function() {
    beforeEach(function() {
        this.sinon = sinon.sandbox.create();
        this.hashSpy = this.sinon.spy(secrets.passwordDigest);

        this.createdUserProxy = proxyquire('./createUser', {
            '../../lib/log': testHelper.mockLog,
            '../../lib/secrets': {
                passwordDigest: this.hashSpy
            }
        });
    });

    afterEach(function() {
        this.sinon.restore();
    });

    it('should throw an error on empty request body', function(done) {
        this.createdUserProxy({}, {}, (err, data) => {
            let body = JSON.parse(data.body);
            testHelper.check(done, () => {
                expect(err).to.be.null;
                expect(data.statusCode).to.equal(500);
                expect(body.message).to.equal('server error');
            });
        });
    });

    it('should validate that username field is present in request', function(done) {
        let event = testHelper.lambdaEvent({ password: '123' });        

        this.createdUserProxy(event, {}, (err, data) => {
            let body = JSON.parse(data.body);
            testHelper.check(done, () => {
                expect(err).to.be.null;
                expect(data.statusCode).to.equal(500);
                expect(body.name).to.equal('InvalidUsernameOrPassword');
                expect(body.message).to.equal('The username or password was not provided');
            });
        });
    });

    it('should validate that username field is not empty in request', function(done) {
        let event = testHelper.lambdaEvent({ username: '', password: '123' });        

        this.createdUserProxy(event, {}, (err, data) => {
            let body = JSON.parse(data.body);
            testHelper.check(done, () => {
                expect(err).to.be.null;
                expect(data.statusCode).to.equal(500);
                expect(body.name).to.equal('InvalidUsernameOrPassword');
                expect(body.message).to.equal('The username or password was not provided');
            });
        });
    });

    it('should validate that password field is present in request', function(done) {
        let event = testHelper.lambdaEvent({ username: 'myman' });        

        this.createdUserProxy(event, {}, (err, data) => {
            let body = JSON.parse(data.body);
            testHelper.check(done, () => {
                expect(err).to.be.null;
                expect(data.statusCode).to.equal(500);
                expect(body.name).to.equal('InvalidUsernameOrPassword');
                expect(body.message).to.equal('The username or password was not provided');
            });
        });
    });

    it('should validate that password field is not empty in request', function(done) {
        let event = testHelper.lambdaEvent({ username: 'myman', password: '' });    

        this.createdUserProxy(event, {}, (err, data) => {
            let body = JSON.parse(data.body);
            testHelper.check(done, () => {
                expect(err).to.be.null;
                expect(data.statusCode).to.equal(500);
                expect(body.name).to.equal('InvalidUsernameOrPassword');
                expect(body.message).to.equal('The username or password was not provided');
            });
        });
    });

    it('should enforce strong password validation', function(done) {
        let event = testHelper.lambdaEvent({ username: 'myman', password: 'notgood' });

        this.createdUserProxy(event, {}, (err, data) => {
            let body = JSON.parse(data.body);
            testHelper.check(done, () => {
                expect(err).to.be.null;
                expect(data.statusCode).to.equal(500);
                expect(body.name).to.equal('InvalidUsernameOrPassword');
                expect(body.message).to.equal('Weak password strength');
            });
        });
    });

//TODO: implement
/*
    it('should check if user already exists before storing new user item', function(done) {

    });
*/
});