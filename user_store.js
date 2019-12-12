/**
 * An abstraction for the persistence of users.
 * Can be injected with a collection of third-party persisters,
 * to allow for the creation of external resources related to
 * the new users.
 *
 * @type {module.UserStore}
 */
module.exports = class UserStore {
    constructor(params) {
        if(!params) throw new Error("Can't initialize user store. No parameters given.")
        if(!params.persister) throw new Error("Can't initialize user store. No persister given.")
        this.persister = params.persister
        this.thirdParties = params.thirdParties
    }

    async updateAttributes(user, attrs) {
        let attrsUpdated = 0

        if (!user) throw new Error("Cannot update attributes. No User.")

        return this.persister.updateAttributes(user, attrs)
    }

    async createUser(params) {
        let myParams = {},
            newUser

        Object.assign(myParams, params)

        if (!params) throw new Error("No params.")
        if (!params.username) throw new Error("No username.")

        let thirdPartyAggregateResponse = []

        if(this.thirdParties) {
            thirdPartyAggregateResponse = await this.thirdParties.createUser(params)
        }

        myParams.userAttributes = [].concat(thirdPartyAggregateResponse.attributes)

        newUser = await this.persister.createUser(myParams)

        newUser.endpoints = [].concat(newUser.endpoints).concat(thirdPartyAggregateResponse.endpoints)

        return newUser
    }
}