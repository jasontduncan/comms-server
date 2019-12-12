const PATH = require('path'),
    SHOULD = require('chai').should(),
    MONGO_CLIENT = require('mongodb').MongoClient,
    MONGO_URI = 'mongodb://localhost:27017',
    DB_NAME = 'comms_test',
    COLLECTION_NAME = 'test_live_calls',
    MongoLiveCallPool = require(PATH.resolve('mongo_live_call_pool')),
    LiveCallPool = require(PATH.resolve('live_call_pool'))

describe("MongoLiveCallPool", () => {
    let client,
        db,
        collectionHandle,
        callPool

    beforeEach(async () => {
        client = await MONGO_CLIENT.connect(MONGO_URI, { useNewUrlParser: true })
        db = client.db(DB_NAME)
        collectionHandle = db.collection(COLLECTION_NAME)
        callPool = new LiveCallPool({strategy: new MongoLiveCallPool({mongo_uri: MONGO_URI, db_name: DB_NAME, call_collection_name: COLLECTION_NAME})})
    })

    afterEach(async () => {
        await db.dropDatabase()
        await client.close()
    })

    describe("#insert()", () => {
        it("should add the call to the collection", async () => {
            let call = {testId: 'addedCall'},
                returnedCall

            await callPool.insert(call)
            returnedCall = await collectionHandle.findOne()

            returnedCall.testId.should.equal(call.testId)
        })
    })

    describe("#find()", () => {
        let someCallId = 'someId',
            callToFind = {callId: someCallId}

        beforeEach(async () => {
            await collectionHandle.insertOne(callToFind)
        })

        it("should return the matching call", async () => {
            let foundCall = await callPool.find({callId: someCallId})

            foundCall.callId.should.equal(callToFind.callId)
        })
    })

    describe("#remove()", () => {
        let someCallId = 'someId',
            callToRemove = {callId: someCallId}

        beforeEach(async () => {
            await collectionHandle.insertOne(callToRemove)
        })

        context("No match to query", () => {
            it("should return nothing", async () => {
                let removedCall = await callPool.remove({callId: 'noMatch'})

                SHOULD.not.exist(removedCall)
            })
        })
        context("Matching query", () => {
            it("should return the matching call", async () => {
                let removedCall = await callPool.remove({callId: someCallId})

                removedCall.callId.should.equal(someCallId)
            })

            it("should remove the matching call from the collection", async () => {
                let foundCall

                await callPool.remove({callId: someCallId})
                foundCall = await collectionHandle.findOne({callId: someCallId})

                SHOULD.not.exist(foundCall)
            })
        })
    })
    describe("#updateAgentRole()", () => {
        let callToUpdate

        beforeEach(async () => {
            callToUpdate = {callId: 'someId', agent: {role: 'someRole'}}
            await collectionHandle.insertOne(callToUpdate)
        })

        it("should set the agent of the matching call to the new role", async () => {
            let foundCall,
                newRole = 'someRole',
                callIdentifier = {callId: callToUpdate.callId}

            await callPool.updateAgentRole(callIdentifier, newRole)
            foundCall = await collectionHandle.findOne({callId: callToUpdate.callId})

            foundCall.agent.role.should.equal(newRole)
        })
    })
})