const PATH = require('path'),
    ROUTER = require('express').Router(),
    AUTH = require(PATH.resolve('middleware/authentication')),
    MongoUserPersister = require(PATH.resolve('mongo_user_persister'))

module.exports = function CallRoutes(params) {
    let app = params.app,
        dbName = params.dbName,
        dbUri = params.dbUri

    ROUTER.post('/', async (req, res) => {
        res.set({"Content-Type": "text/xml"})
        let resp = await app.handleCallEvent(req.body)
        res.send(resp)
    })

    ROUTER.get('/', AUTH.isLoggedIn, async (req, res) => {
        let call = await app.getCall({callId: req.callId ? req.callId : null, user: req.user.username})

        res.send(call)
    })

    ROUTER.get('/onHold', AUTH.isLoggedIn, async (req, res) => {
        console.log("Off holding ", req.query.callId, ' to ', req.user.username)
        let call = await app.getCallOnHold({callId: req.query.callId ? req.query.callId : null, user: req.user.username})

        res.send(call)
    })

    ROUTER.get('/connect', async (req, res) => {
        let  userPersister = new MongoUserPersister({mongo_uri: dbUri, db_name: dbName}),
            call,
            endpoint,
            foundUser = await userPersister.find({username: req.query.username}),
            callId = req.query.call


        endpoint = foundUser.endpoints.find((endpoint) => {return !!endpoint.current})
        call  = await app.connectCallToEndpoint(endpoint, callId)

        res.send(call)
    })

    ROUTER.post('/hold', AUTH.isLoggedIn, async (req, res, next) => {

        let transferParams = req.body

        transferParams.transferTo = req.user.username
        transferParams.transferFrom = req.user.username

        try {
            await app.transferCall(transferParams)
        } catch (e) {
            return next(e)
        }

        res.sendStatus(200)
    })

    ROUTER.get('/hold_procedure', async (req, res, next) => {
        let response

        try {
            response = await app.connectCallToOnHold()
        } catch(e) {
            return next(e)
        }

        res.set({'Content-Type': 'text/xml'})
        res.send(response)
    })

    ROUTER.post('/transfer', AUTH.isLoggedIn, async (req, res, next) => {
        let transferParams = req.body

        transferParams.transferTo = req.body.transferTo || req.user.username
        transferParams.transferFrom = req.user.username

        try {
            await app.transferCall(transferParams)
        } catch (e) {
            return next(e)
        }

        res.sendStatus(200)
    })

    ROUTER.post('/update', async(req, res, next) => {
        app.handleCallUpdateEvent(req.body)
        res.sendStatus(200)
    })

    return ROUTER
}