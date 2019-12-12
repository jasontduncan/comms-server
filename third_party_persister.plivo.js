require('dotenv').config()

const PLIVO = require('plivo')

module.exports = class ThirdPartyPersisterPlivo {
    async createUser(params) {
        if(!params) throw new Error("No param")
        if(!params.username) throw new Error("No username")
        if(!params.alias) throw new Error("No alias")
        if(!params.app_id && !process.env.PLIVO_APP_ID) throw new Error("No app ID")

        if(!params.alias) params.alias = params.username
        // Random string ala https://gist.github.com/6174/6062387
        if(!params.password) params.password = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        if(!params.app_id) params.app_id = process.env.PLIVO_APP_ID

        let plivoClient = new PLIVO.Client(),
            createResponse

        try {
            createResponse = await plivoClient.endpoints.create(
                params.username,
                params.password,
                params.alias,
                params.app_id
            )
        } catch(e) {
            throw new Error(e)
        }

        return {
            attributes: {
                "plivo_user_id": createResponse.username,
                "plivo_user_pass": params.password
            },
            endpoints: [{
                type: 'user',
                alias: 'App',
                value: 'sip:'+ createResponse.username +'@phone.plivo.com'
            }]
        }
    }
}