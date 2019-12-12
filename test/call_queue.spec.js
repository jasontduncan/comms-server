const path = require('path'),
    SHOULD = require('chai').should(),
    SINON = require('sinon').createSandbox(),
    MemoryCallQueue = require(path.resolve('call_queue_memory_strategy'))

let CallQueue = require('../call_queue')

describe("Call Queue", () => {
    afterEach(() => {
        SINON.restore()
    })

    describe("queue", () => {
        it("should add the call to the queue", async () => {
            let queueImplementation = [],
                queue = new MemoryCallQueue({queueImplementation: queueImplementation}),
                call = {},
                callQueue = new CallQueue({strategy: queue})

            await callQueue.queue(call)
            queueImplementation[0].should.equal(call)
        })

        it("should subscribe to the call events", async () => {
            let queueImplementation = [],
                queue = new MemoryCallQueue({queueImplementation: queueImplementation}),
                subscribers = [],
                call = {subscribe: (subscriber) => {subscribers.push(subscriber)}},
                callQueue = new CallQueue({strategy: queue})

            await callQueue.queue(call)
            subscribers[0].should.equal(callQueue)
        })

        it("should call #updateObservers()", async () => {
            let queueImplementation = [],
                queue = new MemoryCallQueue({queueImplementation: queueImplementation}),
                call = {},
                callQueue = new CallQueue({strategy: queue})

            SINON.spy(callQueue, 'updateObservers')

            await callQueue.queue(call)

            callQueue.updateObservers.called.should.be.true
        })
    })

    describe("dequeue", () => {
        let callQueue,
            call1,
            call2,
            call1Subscribers,
            call2Subscribers

        beforeEach(async () => {
            call1Subscribers = []
            call2Subscribers = []
            callQueue = new CallQueue()
            call1 = {subscribe: (sub) => {call1Subscribers.push(sub)}, unsubscribe: (sub) => {call1Subscribers.splice(call1Subscribers.indexOf(sub), 1)}}
            call2 = {subscribe: (sub) => {call2Subscribers.push(sub)}, unsubscribe: (sub) => {call2Subscribers.splice(call2Subscribers.indexOf(sub), 1)}}
            await callQueue.queue(call1)
            await callQueue.queue(call2)
        })

        it("should return the first element from the queue", async () => {
            let dequeued = await callQueue.dequeue()

            dequeued.should.equal(call1)
        })
        it("should remove the first element from the queue", async () => {
            let secondDequeued

            await callQueue.dequeue()
            secondDequeued = await callQueue.dequeue()

            secondDequeued.should.equal(call2)
        })
        it("should unsubscribe from the call events", async () => {
            await callQueue.dequeue()

            call1Subscribers.should.be.empty
        })
        it("should call #updateObservers()", async() => {
            let updateSpy = SINON.spy(callQueue, 'updateObservers')

            await callQueue.dequeue()

            updateSpy.args.length.should.equal(1)
        })
    })

    describe("remove", () => {
        let queueImplementation,
            queue,
            callQueue,
            unsubscribed

        beforeEach(() => {
            queueImplementation = [{callId: 1},{callId: 2, unsubscribe: (subscriber) => {unsubscribed = subscriber}}]
            queue = new MemoryCallQueue({queueImplementation: queueImplementation})
            callQueue = new CallQueue({strategy: queue})
        })

        it("should return the matching element from the queue", async () => {
            let returnValue = await callQueue.remove({callId: 2})

            JSON.stringify(returnValue).should.equal(JSON.stringify({callId: 2}))
        })

        it("should remove the matching element from the queue", async () => {
            await callQueue.remove({callId: 2})

            JSON.stringify(queueImplementation).should.equal(JSON.stringify([{callId: 1}]))
        })

        it("should unsubscribe from the matching element's events", async () => {
            await callQueue.remove({callId: 2})

            unsubscribed.should.equal(callQueue)
        })

        it("should call #updateObservers()", async() => {
            let updateSpy = SINON.spy(callQueue, 'updateObservers')

            await callQueue.remove({callId: 2})

            updateSpy.args.length.should.equal(1)
        })
    })

    describe("observeState", () => {
        it("should add the new observer to the observers collection", () => {
            let observersCollection = [],
                callQueue = new CallQueue({observers: observersCollection}),
                newObserver = {}

            callQueue.observeState(newObserver)

            observersCollection[0].should.equal(newObserver)
        })
    })

    describe("updateObservers", () => {
        let queue,
            queueImplementation,
            callQueue,
            observers

        beforeEach(() => {
            /*
            Init the queue with 1 call, to set the callCount.
            Init the queue with some observers.
             */
            queueImplementation = [{}]
            queue = new MemoryCallQueue({queueImplementation: queueImplementation})
            observers = [SINON.spy(), SINON.spy(), SINON.spy()]
            callQueue = new CallQueue({strategy: queue, observers: observers})
        })

        it("should call each observer with the current callCount", async () => {
            let boolAggregate = true

            await callQueue.updateObservers()

            // check that each observer is called with the call count
            observers.forEach((observer) =>{
                boolAggregate = boolAggregate && (observer.args[0][0].callCount === 1)
            })

            boolAggregate.should.be.true
        })

    })

    describe("length", () => {
        let queueImplementation,
            queue,
            callQueue,
            call1,
            call2

        beforeEach(async () => {
            queueImplementation = []
            queue = new MemoryCallQueue({queueImplementation: queueImplementation})
            callQueue = new CallQueue({strategy: queue})
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
})