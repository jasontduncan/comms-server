const path = require('path'),
    MemoryCallQueue = require(path.resolve('call_queue_memory_strategy')),
    SHOULD = require('chai').should(),
    SINON = require('sinon').createSandbox()

describe("MemoryCallQueue", () => {
    afterEach(() => {
        SINON.restore()
    })

    context("Array passed in to constructor", () => {
        describe("#queue()", () => {
            it("should add the call to the end of the queue implementation", async () => {
                let queueImp = [],
                    memoryCallQueue = new MemoryCallQueue({queueImplementation: queueImp}),
                    call = {}

                await memoryCallQueue.queue(call)

                queueImp.pop().should.equal(call)
            })
        })

        describe("#dequeue()", () => {
            it("should return the first call from the queue implementation", async () => {
                let call1 = {},
                    call2 = {},
                    queueImp = [call1, call2],
                    memoryCallQueue = new MemoryCallQueue({queueImplementation: queueImp}),
                    dequeuedCall

                dequeuedCall = await memoryCallQueue.dequeue()

                dequeuedCall.should.equal(call1)
            })
        })

        describe("#remove()", () => {
            it("should return the matching element from the queue implementation", async () => {
                let call1 = {testId: 1},
                    call2 = {testId: 2},
                    queueImp = [call1, call2],
                    memoryCallQueue = new MemoryCallQueue({queueImplementation: queueImp}),
                    removedCall

                removedCall = memoryCallQueue.remove({testId: 2})

                removedCall.should.equal(call2)
            })
        })

        describe("#length()", () => {
            it("should return the length of the queue implementation", async () => {
                let call1 = {testId: 1},
                    call2 = {testId: 2},
                    queueImp = [call1, call2],
                    memoryCallQueue = new MemoryCallQueue({queueImplementation: queueImp})

                memoryCallQueue.length().should.equal(queueImp.length)
            })
        })
    })
})