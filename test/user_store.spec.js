const UserStore = require('../user_store.js'),
    SHOULD = require('chai').should(),
    SINON = require('sinon').createSandbox()

describe("UserStore", () => {
    let VALID_CONSTRUCTOR_PARAMS

    beforeEach(() => {
        VALID_CONSTRUCTOR_PARAMS = {persister: {createUser: (params) => {}, updateAttributes: (user, attrs) => {return Object.keys(attrs).length}}}
    })

    afterEach(() => {
        SINON.restore()
    })

    describe("constructor", () => {
        context("No params", () => {
            it("should throw 'no parameters'", () => {
                try {
                    new UserStore()
                    throw new Error("Shouldn't be here")
                } catch(e) {
                    e.message.should.match(/no parameters/i)
                }
            })
        })
        context("No persister", () => {
            const NO_PERSISTER_CONSTRUCTOR_PARAMS = {}
            it("should throw 'no persister'", async () => {
                try {
                    new UserStore(NO_PERSISTER_CONSTRUCTOR_PARAMS)
                    throw new Error("Shouldn't be here")
                } catch(e) {
                    e.message.should.match(/no persister/i)
                }
            })
        })
    })

    describe("CreateUser", () => {
        context("Invalid params", () => {
            context("No params", () => {
                it("should throw with 'no param'", async () => {
                    let userStore = new UserStore(VALID_CONSTRUCTOR_PARAMS)

                    try {
                        await userStore.createUser()
                        throw new Error("Shouldn't be here")
                    } catch(e) {
                        e.message.should.match(/no param/i)
                    }
                })
            })
            context("No 'username'", () => {
                const NO_USERNAME_PARAMS = {}

                it("should throw with 'no username'", async () => {
                    let userStore = new UserStore(VALID_CONSTRUCTOR_PARAMS)

                    try {
                        await userStore.createUser(NO_USERNAME_PARAMS)
                        throw new Error("Shouldn't be here")
                    } catch (e) {
                        e.message.should.match(/no username/i)
                    }
                })
            })
        })
        context("Valid params", () => {
            const VALID_USERNAME = 'validUsername',
                VALID_EMAIL = 'test@email.com',
                VALID_CREATE_PARAMS = {username: VALID_USERNAME, email: VALID_EMAIL}

            beforeEach(() => {
                SINON.stub(VALID_CONSTRUCTOR_PARAMS.persister, 'createUser').returns({})
            })

            /**
             * Cause Plivo...
             */
            context("Third party function present", () => {
                const RETURNED_USERNAME = 'someName34223r58'
                beforeEach(() => {
                    VALID_CONSTRUCTOR_PARAMS.thirdParties = {createUser: () => {return {attributes: [{Name: 'LameOUsername', Value: 'someName'}, {Name: 'LameOPassword', Value: 'somePassword'}], endpoints: [{}]}}}
                })

                it("should call 'createUser' on third party attr providers" , async () => {
                    let userStore = new UserStore(VALID_CONSTRUCTOR_PARAMS)

                    SINON.spy(VALID_CONSTRUCTOR_PARAMS.thirdParties, 'createUser')

                    await userStore.createUser(VALID_CREATE_PARAMS)
                    VALID_CONSTRUCTOR_PARAMS.thirdParties.createUser.called.should.be.true
                })

                it("should pass attributes returned from third party #createUser as UserAttributes objects", async () => {
                    let userStore = new UserStore(VALID_CONSTRUCTOR_PARAMS),
                        missingObjects = []

                    SINON.spy(VALID_CONSTRUCTOR_PARAMS.thirdParties, 'createUser')

                    await userStore.createUser(VALID_CREATE_PARAMS)
                    VALID_CONSTRUCTOR_PARAMS.thirdParties.createUser.firstCall.returnValue.attributes.forEach((attr) => {
                        if(VALID_CONSTRUCTOR_PARAMS.persister.createUser.args[0][0].userAttributes.indexOf(attr) < 0) {
                            missingObjects.push(attr.Name)
                        }
                    })
                    missingObjects.length.should.equal(0)
                })

                it("should return an object with 'endpoints' from third party persisters", async () => {
                    let userStore = new UserStore(VALID_CONSTRUCTOR_PARAMS),
                        missingObjects = [],
                        rVal

                    SINON.spy(VALID_CONSTRUCTOR_PARAMS.thirdParties, 'createUser')

                    rVal = await userStore.createUser(VALID_CREATE_PARAMS)
                    VALID_CONSTRUCTOR_PARAMS.thirdParties.createUser.firstCall.returnValue.endpoints.forEach((endpoint) => {
                        if(rVal.endpoints.indexOf(endpoint) < 0) {
                            missingObjects.push(endpoint)
                        }
                    })
                    missingObjects.length.should.equal(0)
                })
            })

            it("should call 'createUser' on persister", async () => {
                let userStore = new UserStore(VALID_CONSTRUCTOR_PARAMS)

                await userStore.createUser(VALID_CREATE_PARAMS)
                VALID_CONSTRUCTOR_PARAMS.persister.createUser.called.should.be.true
            })


            // it("should return an object with 'User'", async () => {
            //     let userStore = new UserStore(VALID_CONSTRUCTOR_PARAMS),
            //         rVal = await userStore.createUser(VALID_CREATE_PARAMS)
            //
            //     rVal.User.should.exist
            // })
            // it("should return an object with 'User.username' the same as the input username.", async () => {
            //     let userStore = new UserStore(VALID_CONSTRUCTOR_PARAMS),
            //         rVal = await userStore.createUser(VALID_CREATE_PARAMS)
            //
            //     rVal.User.username.should.equal(VALID_USERNAME)
            // })
        })
    })

    describe("UpdateAttributes", () => {
        context("No user", () => {
            it("should throw with 'no user'", async () => {

                let userStore = new UserStore(VALID_CONSTRUCTOR_PARAMS),
                    user = undefined,
                    attrs = {}

                try {
                    await userStore.updateAttributes(user, attrs)
                    throw new Error("Shouldn't be here")
                } catch(e) {
                    e.message.should.match(/no user/i)
                }

            })
        })
        context("Good params", () => {
            let userStore,
                VALID_USER,
                rVal

            beforeEach(() => {
                userStore = new UserStore({persister: {updateAttributes: (user, attrs) => {return Object.keys(attrs).length}}})
                VALID_USER = {_id: 1}
            })

            context("No attributes updated", () => {
                it("should return 0", async () => {
                    let noAttrParams = {}
                    try {
                        rVal = await userStore.updateAttributes(VALID_USER, noAttrParams)
                    } catch(e) {
                        throw new Error("Shouldn't be here, but: "+ e.message)
                    }

                    rVal.should.equal(0)
                })
            })
            context("One attribute updated", () => {
                it("should return 1", async () => {
                    let singleAttrParam = {attr1: 'someVal'}

                    try {
                        rVal = await userStore.updateAttributes(VALID_USER, singleAttrParam)
                    } catch(e) {
                        throw new Error("Shouldn't be here, but: "+ e.message)
                    }

                    rVal.should.equal(1)
                })
            })
            context("Some attributes updated", () => {
                beforeEach(() => {
                    // Need to spy on the persister that is passed in to the constructor
                    SINON.spy(VALID_CONSTRUCTOR_PARAMS.persister, 'updateAttributes')
                    userStore = new UserStore(VALID_CONSTRUCTOR_PARAMS)
                })
                it("should return the number of updated attrs", async () => {
                    let some = 2,
                        someAttrParam = {}


                    for(let someCount=0; someCount<some; someCount++) {
                        someAttrParam['param'+someCount] = someCount
                    }

                    try {
                        rVal = await userStore.updateAttributes(VALID_USER, someAttrParam)
                    } catch(e) {
                        throw new Error("Shouldn't be here, but: "+ e.message)
                    }

                    rVal.should.equal(some)
                })

                it("should call #update() on the persister, with the attrs", async () => {
                    let updateAttrs = {a: 1, b: 2}
                    try {
                        rVal = await userStore.updateAttributes(VALID_USER, updateAttrs)
                    } catch(e) {
                        throw new Error("Shouldn't be here, but: "+ e.message)
                    }

                    VALID_CONSTRUCTOR_PARAMS.persister.updateAttributes.args[0][1].should.equal(updateAttrs)
                })
            })
        })
    })
})