const MONGO_CLIENT = require('mongodb').MongoClient,
    SYNC_STATE_VERSION = 1

module.exports = class SyncPersisterMongoDb {
    constructor(params={}) {
        let mongoUri = params.mongo_uri || 'mongodb://localhost:27017',
            dbName = params.db_name || 'default_sync_db',
            syncCollectionName = params.sync_collection_name || 'syncState',
            self = this

        this.getCollection = async function () {
            let client = await MONGO_CLIENT.connect(mongoUri, {useNewUrlParser: true}),
                db = client.db(dbName)

            return db.collection(syncCollectionName)
        }

        async function initDbCollection() {
            let collection = await self.getCollection()

            return collection.updateOne(
                {"_id": SYNC_STATE_VERSION},
                {
                    "$setOnInsert": {"clients": [], "calls": []}
                },
                {upsert: true}
            )
        }

        initDbCollection()
    }

    async addClient(client) {
        let collection = await this.getCollection()

        await collection.updateOne(
            {"_id": SYNC_STATE_VERSION},
            {
                "$addToSet": {"clients": client}
            }
        )
    }

    async addCall(call) {
        let collection = await this.getCollection()

        await collection.updateOne(
            {"_id": SYNC_STATE_VERSION},
            {
                "$addToSet": {"calls": call}
            }
        )
    }
}