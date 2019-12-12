const MONGO_CLIENT = require('mongodb').MongoClient,
    PATH = require('path'),
    ROUTER = require('express').Router(),
    AUTH = require(PATH.resolve('middleware/authentication'))

module.exports = function(params) {
    let mongoUri = params.mongo_uri,
        dbName = params.db_name,
        agentCollectionName = params.agent_collection_name

    this.doDbOperation = async function(operation) {
        let client = await MONGO_CLIENT.connect(mongoUri, {useNewUrlParser: true}),
            db = client.db(dbName),
            rVal = await operation(db.collection(agentCollectionName))

        await client.close()

        return rVal
    }

    ROUTER.get('/', AUTH.isLoggedIn, async (req, res, next) => {
        return this.doDbOperation(async (collection) => {
            let agents,
                getAgentsResponse = []

            try {
                agents = await collection.find({}, {username: 1, alias: 1})
            } catch (e) {
                next(e)
            }

            await agents.forEach((agent) => {
                getAgentsResponse.push({username: agent.username, alias: agent.alias || agent.username})
            })

            res.send(getAgentsResponse)

        })
    })

    return ROUTER
}