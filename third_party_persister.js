module.exports = class ThirdPartyPersister {
    constructor(params) {
        if(!params) throw new Error("No params.")
        if(!params.persisters || params.persisters.length < 1) throw new Error("No persisters.")

        this.persisters = params.persisters
    }
    async createUser(params) {
        if(!params) throw new Error("No params.")

        let attributes = [],
            endpoints = []

        for(const persister of this.persisters) {
            let resp = await persister.createUser(params)

            attributes = attributes.concat(resp.attributes)
            endpoints = endpoints.concat(resp.endpoints)
        }

        return {attributes: attributes, endpoints: endpoints}
    }
}