const MONGO_CLIENT = require('mongodb').MongoClient

module.exports = class MongoRecentsCollection {
    constructor(params={}) {
        let mongoUri = params.mongo_uri || 'mongodb://localhost:27017',
            dbName = params.db_name,
            recentCollectionName = params.recent_collection_name || 'recents'

        this.doDbOperation = async function(operation) {
            let client = await MONGO_CLIENT.connect(mongoUri, {useNewUrlParser: true}),
                db = client.db(dbName),
                rVal = await operation(db.collection(recentCollectionName))

            await client.close()

            return rVal
        }
    }

    async get() {
        return this.doDbOperation(async (collection) => {
            let recents = await collection.find({})

            return recents.toArray()
        })
    }

    async post(recent) {
        return this.doDbOperation(async (collection) => {
            return collection.insertOne(recent)
        })
    }
}