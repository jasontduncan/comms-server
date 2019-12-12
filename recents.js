module.exports = class Recents {
    constructor(params) {
        if (!params) throw new Error("No params")
        if (!params.persister) throw new Error("No persister")
        this.persister = params.persister
    }

    async get() {
        return await this.persister.find()
    }

    async post(recent) {
        return await this.persister.insertOne(recent)
    }
}