const MONGO_CLIENT = require('mongodb').MongoClient

class MongoLiveCallPool {
    constructor(params={}) {
        let mongoUri = params.mongo_uri,
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

    async insert(call) {
        return this.doDbOperation(async (collection) => {
            return await collection.insertOne(call)
        })
    }

    async find(queryObject) {
        return this.doDbOperation(async (collection) => {
            return await collection.findOne(queryObject)
        })
    }

    async remove(queryObject) {
        return this.doDbOperation(async (collection) => {
            let call = await collection.findOneAndDelete(queryObject)

            return call.value
        })
    }

    async updateAgentRole(queryObject, newRole) {
        return this.doDbOperation(async (collection) => {
            return await collection.findOneAndUpdate(queryObject, {$set: {'agent.role': newRole}})
        })
    }
}

module.exports = MongoLiveCallPool