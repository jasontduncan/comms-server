module.exports = function(params) {
    "use strict";

    const CognitoStrategy = require('passport-cognito')

    let app = params.app,
        passport = params.passport

    passport.use(new CognitoStrategy({
            userPoolId: process.env.AWS_USER_POOL_ID,
            clientId: process.env.AWS_USER_APP_ID,
            region: process.env.AWS_USER_REGION
        },
        function(accessToken, idToken, refreshToken, user, cb) {
            process.nextTick(function() {
                cb(null, user);
            })
        }
    ))

    passport.serializeUser(function(user, done) {
        done(null, user);
    })

    passport.deserializeUser(function(user, done) {
        done(null, user);
    })

    app.use(passport.initialize())
    app.use(passport.session())
}