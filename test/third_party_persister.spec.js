const ThirdPartyPersister = require("../third_party_persister"),
    SHOULD = require('chai').should(),
    SINON = require('sinon').createSandbox(),
    VALID_CREATE_PARAMS = {},
    VALID_CONSTRUCTOR_PARAMS = {persisters: [{}]}

describe("ThirdPartyPersister", () => {
    afterEach(() => {
        SINON.restore()
    })

    describe("#constructor()", () => {
        context("No params", () => {
            it("should throw with no param", () => {
                try {
                    new ThirdPartyPersister()
                    throw new Error("Shouldn't be here")
                } catch(e) {
                    e.message.should.match(/no param/i)
                }
            })
        })
        context("No params.persisters", () => {
            let noPersisterParams

            beforeEach(() => {
                noPersisterParams = {}
                Object.assign(noPersisterParams, VALID_CONSTRUCTOR_PARAMS)
                delete(noPersisterParams.persisters)
            })

            it("should throw with 'no persister'", () => {
                try {
                    new ThirdPartyPersister(noPersisterParams)
                    throw new Error("Shouldn't be here")
                } catch(e) {
                    e.message.should.match(/no persister/i)
                }
            })
        })
    })

    describe("#createUser()", () => {
        let thirdPartyPersister = new ThirdPartyPersister(VALID_CONSTRUCTOR_PARAMS)

        context("No params", () => {
            it("should throw with 'no param'", async () => {
                try {
                    await thirdPartyPersister.createUser()
                    throw new Error("Shouldn't be here")
                } catch(e) {
                    e.message.should.match(/no param/i)
                }
            })
        })
        context("Valid params", () => {
            let responseObjs

            beforeEach(() => {
                // Make test persisters valid
                VALID_CONSTRUCTOR_PARAMS.persisters.forEach((persister) => {
                    let responseObj = {attributes: [{fun: 'you'}], endpoints: [{}]}

                    responseObjs = []
                    responseObjs.push(responseObj)

                    persister.createUser = SINON.fake.returns(responseObj)
                })
            })
            it("should call '#createUser()' on each of it's persisters", async () => {
                await thirdPartyPersister.createUser(VALID_CREATE_PARAMS)
                VALID_CONSTRUCTOR_PARAMS.persisters.forEach((persister) => {
                    if(!persister.createUser.called) throw new Error('No call to #createUser on persister: '+ persister)
                })
                true.should.be.true
            })
            it("should return the aggregate attributes from the persisters", async () => {
                let rVal = await thirdPartyPersister.createUser(VALID_CREATE_PARAMS)
                responseObjs.forEach((resp) => {
                    resp.attributes.forEach((attr) => {
                        rVal.attributes.should.include(attr)
                    })
                })
            })
            it("should return the aggregate of the endpoints from the persisters", async () => {
                let rVal = await thirdPartyPersister.createUser(VALID_CREATE_PARAMS)
                responseObjs.forEach((resp) => {
                    resp.endpoints.forEach((endpoint) => {
                        rVal.endpoints.should.include(endpoint)
                    })
                })
            })
        })
    })
})