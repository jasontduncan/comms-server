const PATH = require('path'),
    ROUTER = require('express').Router(),
    AUTH = require(PATH.resolve('middleware/authentication'))

module.exports = function(params) {
    let SMS = params.SMS,
        phoneClient = params.phoneClient

    ROUTER.post('/', AUTH.isLoggedIn, async (req, res, next) => {
        try {
            await SMS.send({to: req.body.toNumber, message: req.body.msg, phoneClient: phoneClient})
        } catch(e) {
            return next(e)
        }

        res.sendStatus(200)
    })

    return ROUTER
}