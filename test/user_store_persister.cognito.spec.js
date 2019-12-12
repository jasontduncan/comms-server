const matchException = require('./helpers/test_helper').matchException,
    getInvalidParams = require('./helpers/test_helper').getInvalidParams,
    getValidParams = require("./helpers/test_helper").getValidParams,
    AWS = require("aws-sdk"),
    SHOULD = require("chai").should(),
    TEST_POOL_ID = 'somePoolId',
    TEST_USERNAME = 'someUsername',
    NORMALIZED_ATTRS = {"Name": "custom:Attr1", "Value": "Value1"}

describe("CognitoUserStorePersister", () => {
    let SINON,
        ADMIN_UPDATE_USER_ATTRS_SPY,
        ADMIN_CREATE_USER_SPY,
        ISP_FAKE,
        CISP,
        PERSISTER,
        persister,
        VALID_CONSTRUCTOR_PARAMS

    beforeEach(() => {
        SINON = require('sinon').createSandbox()
        ADMIN_UPDATE_USER_ATTRS_SPY = SINON.spy()
        ADMIN_CREATE_USER_SPY = SINON.fake.yields(null, {User: {Username:'', Attributes: [{Name: 'sub', Value: ''}]}})
        ISP_FAKE = SINON.fake.returns({async adminCreateUser () { ADMIN_CREATE_USER_SPY(...arguments)}, async adminUpdateUserAttributes () { ADMIN_UPDATE_USER_ATTRS_SPY(...arguments)}})
        CISP = SINON.stub(AWS, 'CognitoIdentityServiceProvider').callsFake(ISP_FAKE)
        PERSISTER = require('../user_store_persister.cognito.js')
        VALID_CONSTRUCTOR_PARAMS = {poolId: TEST_POOL_ID}
    })

    afterEach(() => {
        SINON.restore()
    })

    describe("#constructor", () => {
        context("No params", () => {
            it("should throw with 'no params'", () => {
                try {
                    persister = new PERSISTER()
                    throw new Error("Shouldn't be here.")
                } catch(e) {
                    e.message.should.match(/no params/i)
                }
            })
        })
        context("No poolId in params", () => {
            it("should throw with 'no poolId'", () => {
                let NO_POOL_ID_PARAMS = Object.assign({}, VALID_CONSTRUCTOR_PARAMS)
                delete NO_POOL_ID_PARAMS.poolId

                try {
                    persister = new PERSISTER(NO_POOL_ID_PARAMS)
                    throw new Error("Shouldn't be here.")
                } catch(e) {
                    e.message.should.match(/no poolId/i)
                }
            })
        })
    })

    describe("#createUser()", () => {
        const VALID_USERNAME = 'someUsername',
            VALID_ATTR_VAL = 'someVal',
            VALID_EMAIL = 'some@email.com',
            VALID_UNNORMALIZED_USER_ATTRS = {someAttr: VALID_ATTR_VAL, email: VALID_EMAIL},
            VALID_CREATE_PARAMS = {
                username: VALID_USERNAME,
                userAttributes: VALID_UNNORMALIZED_USER_ATTRS
            }

        beforeEach(() => {
            persister = new PERSISTER(VALID_CONSTRUCTOR_PARAMS)
        })

        context("Invalid params", () => {
            context("No params", () => {
                it("should throw with 'no param'", async () => {
                    await matchException('no param', persister.createUser)
                })
            })
            context("No 'Username' param", () => {
                let NO_USERNAME_PARAMS

                beforeEach(() => {
                    NO_USERNAME_PARAMS = getInvalidParams(VALID_CREATE_PARAMS, ['username'])
                })

                it("should throw with 'no username'", async () => {
                    await matchException('no username', async () => {return await persister.createUser(NO_USERNAME_PARAMS)})
                })
            })
            context("No 'UserAttributes.email' param", () => {
                let NO_EMAIL_ATTR_PARAMS

                beforeEach(() => {
                    NO_EMAIL_ATTR_PARAMS = getValidParams(VALID_CREATE_PARAMS)
                    delete NO_EMAIL_ATTR_PARAMS.userAttributes.email
                })

                it("should throw with 'no email attr'", async () => {
                    await matchException('no email attr', async () => {return await persister.createUser(NO_EMAIL_ATTR_PARAMS)})
                })
            })
        })

        context("Valid params", () => {
            it("should call #adminCreateUser on cognitoidentityserviceprovider", async () => {
                await persister.createUser(VALID_CREATE_PARAMS)
                ADMIN_CREATE_USER_SPY.called.should.equal(true)
            })
            it("should pass 'Username' to #adminCreateUser on cognitoidentityserviceprovider", async () => {
                await persister.createUser(VALID_CREATE_PARAMS)
                ADMIN_CREATE_USER_SPY.args[0][0].Username.should.equal(VALID_USERNAME)
            })
            it("should pass normalized 'UserAttributes' to #adminCreateUser on cognitoidentityserviceprovider", async () => {
                let UserAttributes,
                    matchingAttrCounter,
                    key

                await persister.createUser(VALID_CREATE_PARAMS)
                UserAttributes = ADMIN_CREATE_USER_SPY.args[0][0].UserAttributes

                UserAttributes.forEach((attr, i) => {

                    matchingAttrCounter = 0;

                    for(key in VALID_UNNORMALIZED_USER_ATTRS) {
                        if(key === attr.Name || 'custom:'+ key === attr.Name) {
                            ++matchingAttrCounter
                        }
                    }

                    if(matchingAttrCounter < 1) {
                        throw new Error('Expected matching attribute but found none.')
                    }
                })
            })
        })
    })

    describe("#updateAttributes()", () => {
        beforeEach(() => {
            persister = new PERSISTER(VALID_CONSTRUCTOR_PARAMS)
        })

        context("No params", () => {
            it("should throw with 'no params'", async () => {
                try {
                    await persister.updateAttributes()
                    throw new Error("Shouldn't be here")
                } catch(e) {
                    e.message.should.match(/no params/i)
                }

            })
        })
        context("No username param", () => {
            it("should throw with 'no username'", async () => {
                try {
                    await persister.updateAttributes(undefined, {})
                    throw new Error("Shouldn't be here")
                } catch(e) {
                    e.message.should.match(/no username/i)
                }
            })
        })

        context("Good params", () => {
            let updateAttrs = []

            it("should call #normalizeAttrs() with updateAttrs", async () => {
                SINON.spy(persister, 'normalizeAttrs')
                await persister.updateAttributes(TEST_USERNAME, updateAttrs)
                persister.normalizeAttrs.args[0][0].should.equal(updateAttrs)
            })
            it("should call #adminUpdateUserAttributes() on the cognitoidentityserviceprovider", async() => {
                await persister.updateAttributes(TEST_USERNAME, updateAttrs)
                ADMIN_UPDATE_USER_ATTRS_SPY.called.should.equal(true)
            })
            it("should pass params with 'UserAttributes' array", async () => {
                await persister.updateAttributes(TEST_USERNAME, updateAttrs)
                let args = ADMIN_UPDATE_USER_ATTRS_SPY.args[0][0]
                Array.isArray(args.UserAttributes).should.be.true
            })
            it("should pass params with 'UserPoolId' string", async () => {
                await persister.updateAttributes(TEST_USERNAME, updateAttrs)
                let args = ADMIN_UPDATE_USER_ATTRS_SPY.args[0][0]
                ;(typeof(args.UserPoolId)).should.equal('string')
            })
            it("should pass params with 'Username' string", async () => {
                await persister.updateAttributes(TEST_USERNAME, updateAttrs)
                let args = ADMIN_UPDATE_USER_ATTRS_SPY.args[0][0]
                ;(typeof(args.Username)).should.equal('string')
            })

            it("should pass it's own poolId as 'UserPoolId'", async () => {
                await persister.updateAttributes(TEST_USERNAME, updateAttrs)
                let args = ADMIN_UPDATE_USER_ATTRS_SPY.args[0][0]
                args.UserPoolId.should.equal(TEST_POOL_ID)
            })
            it("should pass username param as 'Username'", async () => {
                await persister.updateAttributes(TEST_USERNAME, updateAttrs)
                let args = ADMIN_UPDATE_USER_ATTRS_SPY.args[0][0]
                args.Username.should.equal(TEST_USERNAME)
            })
            it("should pass attrs as 'UserAttributes'", async () => {
                await persister.updateAttributes(TEST_USERNAME, updateAttrs)
                let args = ADMIN_UPDATE_USER_ATTRS_SPY.args[0][0]
                args.UserAttributes.should.equal(updateAttrs)
            })
        })
    })
    describe("#normalizeAttrs()", () => {
        beforeEach(() => {
            persister = new PERSISTER(VALID_CONSTRUCTOR_PARAMS)
        })

        context("Attrs already normalized", () => {
            it("should return identical params", async () => {
                let rVal = await persister.normalizeAttrs( NORMALIZED_ATTRS)
                JSON.stringify(rVal).should.equal(JSON.stringify([NORMALIZED_ATTRS]))
            })
        })
        context("Attrs not normalized", () => {
            it("should create a 'Name' key with value equal to the keyname of the input", async () => {
                let rVal = await persister.normalizeAttrs({testKey: "testValue"})
                rVal[0].Name.should.equal('custom:testKey')
            })
            it("should create a 'Value' key with value equal to the value of the input", async () => {
                let rVal = await persister.normalizeAttrs( {testKey: "testValue"})
                rVal[0].Value.should.equal("testValue")
            })
        })
    })
    describe("#normalizeAttr()", () => {
        beforeEach(() => {
            persister = new PERSISTER(VALID_CONSTRUCTOR_PARAMS)
        })
        context("Attribute is standard", () => {
            it("should return an object with 'Name' equal to the input attribute key", () => {
                const STANDARD_ATTRIBUTE_KEY = 'email'

                let standardAttribute = {},
                    rVal

                standardAttribute[STANDARD_ATTRIBUTE_KEY] = 'something'

                rVal = persister.normalizeAttr(standardAttribute)

                rVal.Name.should.equal(STANDARD_ATTRIBUTE_KEY)
            })
        })
        context("Attribute is non standard", () => {
            it("should return an object with 'Name' equal to the input attribute key with 'custom:' prepended", () => {
                const NON_STANDARD_ATTRIBUTE_KEY = 'crazy'

                let nonStandardAttribute = {},
                    rVal

                nonStandardAttribute[NON_STANDARD_ATTRIBUTE_KEY] = 'something'

                rVal = persister.normalizeAttr(nonStandardAttribute)

                rVal.Name.should.equal('custom:'+ NON_STANDARD_ATTRIBUTE_KEY)
            })
        })
    })
})