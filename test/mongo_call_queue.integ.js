const path = require('path'),
    SHOULD = require('chai').should(),
    MONGO_URI = 'mongodb://localhost:27017',
    SINON = require('sinon').createSandbox(),
    MONGO_CLIENT = require('mongodb').MongoClient,
    DB_NAME = 'comms_test',
    COLLECTION_NAME = 'test_call_queue_calls',
    MongoCallQueue = require(path.resolve('call_queue_mongo_strategy')),
    CallQueue = require(path.resolve('call_queue'))


describe("Mongo Call Queue", () => {
    let client,
        db,
        collectionHandle,
        callQueue

    beforeEach(async () => {
        client = await MONGO_CLIENT.connect(MONGO_URI, { useNewUrlParser: true })
        db = client.db(DB_NAME)
        collectionHandle = db.collection(COLLECTION_NAME)
        callQueue = new CallQueue({strategy: new MongoCallQueue({mongo_uri: MONGO_URI, db_name: DB_NAME, call_collection_name: COLLECTION_NAME})})
    })

    afterEach(async () => {
        await db.dropDatabase()
        await client.close()
        await SINON.restore()
    })

    describe("queue", () => {
        it("should add the call to the db", async () => {
            let call = {testId: 'addedCall'},
                returnedCall

            await callQueue.queue(call)
            returnedCall = await collectionHandle.findOne()

            returnedCall.testId.should.equal(call.testId)
        })
        it("should call #updateObservers()", async() => {
            let call = {testId: 'addedCall'}

            SINON.spy(callQueue, 'updateObservers')
            await callQueue.queue(call)

            callQueue.updateObservers.called.should.be.true
        })
    })

    describe("dequeue", () => {
        let callQueue,
            call1,
            call2

        beforeEach(async () => {
            callQueue = new CallQueue({strategy: new MongoCallQueue({mongo_uri: MONGO_URI, db_name: DB_NAME, call_collection_name: COLLECTION_NAME})})
            call1 = {testId: 'call1TestId'}
            call2 = {testId: 'call2TestId'}
            await callQueue.queue(call1)
            await callQueue.queue(call2)
        })

        it("should return the first element from the queue", async () => {
            let firstCall = await callQueue.dequeue()
            firstCall.testId.should.equal(call1.testId)
        })
        it("should remove the first element from the queue", async () => {
            await callQueue.dequeue()

            let secondCall = await callQueue.dequeue()
            secondCall.testId.should.equal(call2.testId)
        })
    })

    describe("remove", () => {
        let callQueue,
            call1,
            call2

        beforeEach(async () => {
            callQueue = new CallQueue({strategy: new MongoCallQueue({mongo_uri: MONGO_URI, db_name: DB_NAME, call_collection_name: COLLECTION_NAME})})
            call1 = {testId: 'call1TestId'}
            call2 = {testId: 'call2TestId'}
            await callQueue.queue(call1)
            await callQueue.queue(call2)
        })

        it("should return the matching element from the queue", async () => {
            let returnValue = await callQueue.remove({testId: call2.testId})

            returnValue.testId.should.equal(call2.testId)
        })

        it("should remove the matching element from the queue", async () => {
            let returnValue

            await callQueue.remove({testId: call1.testId})
            returnValue = await collectionHandle.findOne({testId: call1.testId})

            ;(returnValue === null).should.be.true
        })

        it("should call #updateObservers()", async () => {
            SINON.spy(callQueue, 'updateObservers')
            await callQueue.remove({testId: call1.testId})

            callQueue.updateObservers.called.should.be.true
        })
    })

    describe("length", () => {
        let callQueue,
            call1,
            call2

        beforeEach(async () => {
            callQueue = new CallQueue({strategy: new MongoCallQueue({mongo_uri: MONGO_URI, db_name: DB_NAME, call_collection_name: COLLECTION_NAME})})
            call1 = {testId: 'call1TestId'}
            call2 = {testId: 'call2TestId'}
            await callQueue.queue(call1)
            await callQueue.queue(call2)
        })

        it("should return the length of the queue", async () => {
            let returnValue

            returnValue = await callQueue.length()

            returnValue.should.equal(2)
        })
    })

    describe("updateObservers", () => {
        let callQueue,
            observers,
            call1,
            call2

        beforeEach(async() => {
            /*
            Init the queue with 1 call, to set the callCount.
            Init the queue with some observers.
             */
            observers = [SINON.spy(), SINON.spy(), SINON.spy()]
            callQueue = new CallQueue({strategy: new MongoCallQueue({mongo_uri: MONGO_URI, db_name: DB_NAME, call_collection_name: COLLECTION_NAME}), observers: observers})
            call1 = {testId: 'call1TestId'}
            call2 = {testId: 'call2TestId'}
            await callQueue.queue(call1)
            await callQueue.queue(call2)
        })

        it("should call each observer with the current callCount", async () => {
            let boolAggregate = true

            await callQueue.updateObservers()

            // check that each observer is called with the call count
            observers.forEach((observer) =>{
                boolAggregate = boolAggregate && (observer.args[observer.args.length-1][0].callCount === 2)
            })

            boolAggregate.should.be.true
        })
    })

    describe("#observeState()", () => {
        it("should add the new observer to the observers collection", () => {
            let observersCollection = [],
                callQueue = new CallQueue({strategy: new MongoCallQueue({mongo_uri: MONGO_URI, db_name: DB_NAME, call_collection_name: COLLECTION_NAME}), observers: observersCollection}),
                newObserver = {}

            callQueue.observeState(newObserver)

            observersCollection[0].should.equal(newObserver)
        })
    })
})