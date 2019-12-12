const
    SHOULD = require('chai').should(),
    SINON = require('sinon').createSandbox(),
    PLIVO = require('plivo'),
    ThirdPartyPersisterPlivo = require('../third_party_persister.plivo'),
    VALID_USERNAME = 'someUsername',
    VALID_PASSWORD = 'somePassword',
    VALID_ALIAS = 'someAlias',
    VALID_APP_ID = 'someAppId',
    VALID_PARAMS = {
        username: VALID_USERNAME,
        password: VALID_PASSWORD,
        alias: VALID_ALIAS,
        app_id: VALID_APP_ID
    },
    matchException = require('./helpers/test_helper').matchException,
    getInvalidParams = require('./helpers/test_helper').getInvalidParams


describe("ThirdPartyPersisterPlivo", () => {
    let persister = new ThirdPartyPersisterPlivo()

    afterEach(() => {
        SINON.restore()
    })

    describe("#createUser()", () => {
        let responseObject,
            endpointCreateFake

        context("Invalid params", () => {
            beforeEach(() => {
                responseObject = {}
                endpointCreateFake = SINON.fake.returns(responseObject)

                SINON.replace(PLIVO, 'Client', SINON.fake.returns({
                    endpoints: {
                        create: endpointCreateFake
                    }
                }))
            })

            context("No params", () => {
                it("should throw with 'no param'", async () => {
                    await matchException('no param', persister.createUser)
                })
            })
            context("No username param", () => {
                const NO_USERNAME_PARAMS = getInvalidParams(VALID_PARAMS, ['username'])

                it("should throw with 'no username'", async () => {
                    await matchException('no username', async ()=> {await persister.createUser(NO_USERNAME_PARAMS)})
                })
            })
            context("No alias param", () => {
                const NO_ALIAS_PARAM = getInvalidParams(VALID_PARAMS, ['alias'])

                it("should throw with 'no alias'", async () => {
                    await matchException('no alias', async () => {await persister.createUser(NO_ALIAS_PARAM)})
                })
            })
            context("No app_id param", () => {
                let actualAppId

                beforeEach(() => {
                    actualAppId = process.env.PLIVO_APP_ID
                    delete(process.env.PLIVO_APP_ID)
                })

                afterEach(() => {
                    process.env.PLIVO_APP_ID = actualAppId
                })

                const NO_APP_ID_PARAM =  getInvalidParams(VALID_PARAMS, ['app_id'])

                it("should throw with 'no app id'", async () => {
                    await matchException('no app id', async () => {await persister.createUser(NO_APP_ID_PARAM)})
                })
            })
        })
        context("Valid params", () => {
            let responseObject,
                endpointCreateFake

            beforeEach(() => {
                responseObject = {}
                endpointCreateFake = SINON.fake.returns(responseObject)

                SINON.replace(PLIVO, 'Client', SINON.fake.returns({
                    endpoints: {
                        create: endpointCreateFake
                    }
                }))
            })

            it("should call #create() on plivoClient.endpoints", async () => {
                await persister.createUser(VALID_PARAMS)
                endpointCreateFake.calledOnce.should.be.true
            })

            context("Success response", () => {
                const responseUsername = 'someUsername',
                    responseAlias = 'someAlias',
                    responseEndpointId = 'someEndpointID'

                beforeEach(() => {
                    responseObject = {
                        username: responseUsername,
                        alias: responseAlias,
                        endpoint_id: responseEndpointId
                    }
                    endpointCreateFake = SINON.fake.returns(responseObject)

                    SINON.restore()
                    SINON.replace(PLIVO, 'Client', SINON.fake.returns({
                        endpoints: {
                            create: endpointCreateFake
                        }
                    }))
                })

                it("should return an object with attributes['plivo_user_id']", async () => {
                    let response = await persister.createUser(VALID_PARAMS)
                    response.attributes['plivo_user_id'].should.equal(VALID_USERNAME)
                })
                it("should return an object with attributes['plivo_user_pass']", async () => {
                    let response = await persister.createUser(VALID_PARAMS)
                    response.attributes['plivo_user_pass'].should.equal(VALID_PASSWORD)
                })
                it("should return an object with an endpoint of type 'user' in 'endpoints'", async () => {
                    let response = await persister.createUser(VALID_PARAMS)
                    response.endpoints.find((endpoint) => {return endpoint.type === 'user'}).should.exist
                })
                it("should return an object with an endpoint of alias 'App' in 'endpoints'", async () => {
                    let response = await persister.createUser(VALID_PARAMS)
                    response.endpoints.find((endpoint) => {return endpoint.alias === 'App'}).should.exist
                })
                it("should return an object with an endpoint of value 'sip:"+ responseUsername +"@phone.plivo.com'", async () => {
                    let response = await persister.createUser(VALID_PARAMS)
                    response.endpoints.find((endpoint) => {return endpoint.value === 'sip:'+ responseUsername +'@phone.plivo.com'}).should.exist
                })
            })
        })
    })
})