const MONGO_CLIENT = require('mongodb').MongoClient

module.exports = class MongoCallQueueStrategy {
    constructor(params={}) {
        let mongoUri = params.mongo_uri || 'mongodb://localhost:27017',
            dbName = params.db_name,
            callCollectionName = params.call_collection_name

        this.doDbOperation = async function(operation) {
            let client = await MONGO_CLIENT.connect(mongoUri, {useNewUrlParser: true}),
                db = client.db(dbName),
                rVal = await operation(db.collection(callCollectionName))

            await client.close()

            return rVal
        }
    }

    async queue(call) {
        return this.doDbOperation(async (collection) => {
            return await collection.insertOne(call)
        })
    }

    async dequeue() {
        return this.doDbOperation(async (collection) => {
            let call = await collection.findOneAndDelete({})

            return call.value
        })
    }

    async remove(query = {}) {
        return this.doDbOperation(async (collection) => {
            let call = await collection.findOneAndDelete(query)

            return call.value
        })
    }

    async length() {
        return this.doDbOperation(async (collection) => {
            return await collection.countDocuments()
        })
    }
}