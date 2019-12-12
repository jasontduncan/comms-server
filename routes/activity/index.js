const PATH = require('path'),
    ROUTER = require('express').Router(),
    AUTH = require(PATH.resolve('middleware/authentication'))

module.exports = function activityRoutes(params) {
    let app = params.app

    ROUTER.get('/recents', AUTH.isLoggedIn, async(req, res, next) => {
        let recents = await app.getRecents()
        res.send(recents)
    })

    ROUTER.post('/recent', AUTH.isLoggedIn, async(req, res, next) => {
        try {
            await app.postRecent(req.body.recent)
        } catch(e) {
            return next(e)
        }
        res.sendStatus(200)
    })

    return ROUTER
}