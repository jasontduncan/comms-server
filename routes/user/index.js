const PATH = require('path'),
    ROUTER = require('express').Router(),
    AUTH = require(PATH.resolve('middleware/authentication')),
    CognitoUserStorePersiter = require(PATH.resolve('user_store_persister.cognito')),
    PlivoThirdPartyPersister = require(PATH.resolve('third_party_persister.plivo')),
    UserStore = require(PATH.resolve('user_store')),
    MongoUserPersister = require(PATH.resolve('mongo_user_persister')),
    ThirdPartyPersister = require(PATH.resolve('third_party_persister'))

module.exports = function(params) {
    let userDbName = params.userDbName,
        mongoUri = params.mongo_uri

    ROUTER.get('/new', AUTH.isLoggedIn, async(req, res, next) => {
        res.sendFile(PATH.resolve('public/user/new.html'))
    })

    ROUTER.post('/', AUTH.isLoggedIn, async(req, res, next) => {
        let plivoPersister = new PlivoThirdPartyPersister(),
            thirdPartyPersister = new ThirdPartyPersister({persisters: [plivoPersister]}),
            cognitoPersister = new CognitoUserStorePersiter({poolId: process.env.AWS_USER_POOL_ID}),
            userStore = new UserStore({persister: cognitoPersister, thirdParties: thirdPartyPersister}),
            userPersister = new MongoUserPersister({mongo_uri: mongoUri, db_name: userDbName}),
            newUser

        try {
            newUser = await userStore.createUser(req.body)
            newUser = await userPersister.create(newUser)
        } catch(e) {
            console.error("Failed to create user.")
            return next(e)
        }

        res.send(JSON.stringify(newUser))
    })

    ROUTER.get('/details', AUTH.isLoggedIn, async (req, res, next) => {
        let userPersister = new MongoUserPersister({mongo_uri: mongoUri, db_name: userDbName}),
            foundUser = await userPersister.find({sub: req.user.sub}),
            details = {
                email: req.user.email,
                username: req.user.username,
                phoneCreds: {
                    username: req.user['custom:plivo_user_id'],
                    password: req.user['custom:plivo_user_pass']
                },
                endpoints: foundUser.endpoints
            }

        res.send(details)
    })

    ROUTER.post('/current_endpoint', AUTH.isLoggedIn, async (req, res, next) => {
        let userPersister = new MongoUserPersister({mongo_uri: mongoUri, db_name: userDbName}),
            foundUser,
            updated

        try {
            foundUser = await userPersister.find({sub: req.user.sub})
            foundUser.endpoints.forEach((endpoint) => {
                if(endpoint.value === req.body.endpoint.value) {
                    endpoint.current = true
                } else {
                    delete(endpoint.current)
                }
            })

            updated = await userPersister.update({_id: foundUser._id}, {endpoints: foundUser.endpoints})
        } catch(e) {
            return next(e)
        }

        res.send(updated)
    })

    ROUTER.get('/newpassword', (req, res, next) => {
        res.sendFile(PATH.resolve('public/changepassword.html'))
    })

    return ROUTER
}