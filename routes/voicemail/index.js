const PATH = require('path'),
    ROUTER = require('express').Router(),
    AUTH = require(PATH.resolve('middleware/authentication')),
    PLIVO = require('plivo')

module.exports = function VoicemailRoutes(params) {
    ROUTER.get('/', AUTH.isLoggedIn, (req, res, next) => {
        let client = new PLIVO.Client()

        client.recordings.list(
            {
                offset: req.query.offset || 0,
                limit: req.query.limit || 10
            }
        )
            .then((recordings) => {
                res.send(recordings)
            },
                (err) => {
                    //TODO This structure is based on the Plivo docs. Seems they're confused about
                    // the difference between promises and callbacks. See if a proper promise
                    // structure will work.
                    next(err)
                })
    })
    ROUTER.post('/', (req, res, next) => {
        let response = PLIVO.Response()

        response.addSpeak("Please leave a message.")

        response.addRecord({

        })

        response.addSpeak("What? I didn't get that. Whatever. Nevermind.")

        res.send(response.toXML())
    })
    return ROUTER
}