const MONGO_CLIENT = require('mongodb').MongoClient

module.exports = class MongoUserPersister {
    constructor(params={}) {
        let mongoUri = params.mongo_uri || 'mongodb://localhost:27017',
            dbName = params.db_name,
            userCollectionName = params.call_collection_name || 'users'

        this.doDbOperation = async function(operation) {
            let client = await MONGO_CLIENT.connect(mongoUri, {useNewUrlParser: true}),
                db = client.db(dbName),
                rVal = await operation(db.collection(userCollectionName))

            await client.close()

            return rVal
        }
    }

    async create(userObj) {
        return this.doDbOperation(async (collection) => {
            return collection.insertOne(userObj)
        })
    }

    async update(userQuery, updateAttrs) {
        return this.doDbOperation(async (collection) => {
            return collection.findOneAndUpdate(userQuery, {"$set": updateAttrs})
        })
    }

    async find(userQuery) {
        return this.doDbOperation(async (collection) => {
            return collection.findOne(userQuery)
        })
    }
}