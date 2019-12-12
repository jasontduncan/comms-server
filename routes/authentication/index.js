const ROUTER = require('express').Router(),
    PASSPORT  = require('passport')

module.exports = function(params) {
    let syncController = params.syncController

    ROUTER.post('/cognito', (req, res, next) => {
        PASSPORT.authenticate('cognito', (err, user, info) => {
            if(err) {
                return next(err)
            }
            if (!user) {
                if(info.message.match(/new password/i)) {
                    return res.redirect('/user/newpassword')
                }

                res.status(403)
                return res.send(info.message)
            }
            req.login(user, {}, (err) => {
                if(err) return next(err)
                syncController.addClient(user)
                return res.redirect('/')
            })
        })(req, res, next)
    })

    return ROUTER
}