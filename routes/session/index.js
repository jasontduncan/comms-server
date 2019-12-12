const PATH = require('path'),
    ROUTER = require('express').Router()

module.exports = function(params) {
    ROUTER.get('/', async(req, res, next) => {
        if(req.isAuthenticated()) {
            return res.redirect('/')
        } else {
            res.sendFile(PATH.resolve('public/login.html'))
        }
    })

    return ROUTER
}