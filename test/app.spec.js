require('dotenv').config()

const SHOULD = require('chai').should(),
    SINON = require('sinon').createSandbox(),
    path = require('path')

let CommsServer = require('../app'),
    CallQueue = require('../call_queue'),
    MemoryStrategy = require(path.resolve('call_queue_memory_strategy'))

describe("App", () => {
    let call1,
        call2,
        call,
        queueGuts,
        queue,
        holdQueueGuts,
        holdQueue,
        someUser,
        app,
        phoneGuts


    describe("#handleCallEvent()", () => {
        context("New call", () => {
            beforeEach(() => {
                queue = new CallQueue()
            })
            afterEach(() => {
                SINON.restore()
            })

            it("should log the call", async () => {
                let callEventLog = {log: SINON.spy()},
                    call = {}

                app = new CommsServer({callQueue: queue, phonePlatformInterface: {identifyEventType: SINON.fake(), getCallId: SINON.fake(), greetCaller: SINON.fake(), normalizeCallEvent: SINON.fake.returns(call)}, callEventLog: callEventLog})

                await app.handleCallEvent(call)

                callEventLog.log.firstCall.args[0].should.equal(call)
            })
            context("Agent making outbound call", () => {
                beforeEach(() => {
                    phoneGuts = {greetCaller: SINON.spy(), dialEndpoint: SINON.spy(), normalizeCallEvent: (call) => {return Object.assign(call, {type: 'agentCallRequest', to: call.To})},identifyEventType: SINON.fake.returns('agentCallRequest'), getCallId: (call) => {return call.callId}}
                    app = new CommsServer({callQueue: queue, phonePlatformInterface: phoneGuts})
                })
                it("should dial the requested number", async () => {
                    let num = 'someNum'

                    call = {To: num}

                    await app.handleCallEvent(call)

                    phoneGuts.dialEndpoint.args[0][0].value.should.equal(num)
                })
            })
            context("Customer making inbound call", () => {
                let normalizedCall

                beforeEach(() => {
                    normalizedCall = {type: 'incomingCall'}
                    phoneGuts = {greetCaller: SINON.spy(), dialEndpoint: SINON.spy(), normalizeCallEvent: SINON.fake.returns(normalizedCall), identifyEventType: SINON.fake.returns('incomingCall'), getCallId: (call) => {return call.callId}}
                    app = new CommsServer({callQueue: queue, phonePlatformInterface: phoneGuts})
                })
                it("should call #greetCaller() on phoneGuts with a normalized version of the call", async () => {
                    call = {}

                    await app.handleCallEvent(call)

                    phoneGuts.greetCaller.calledWith(normalizedCall).should.be.true
                })
                it("should queue a normalized version of the new call", async () => {
                    let dequeued

                    call = {}

                    await app.handleCallEvent(call)
                    dequeued = await queue.dequeue()

                    dequeued.should.equal(normalizedCall)
                })
            })

        })

        context("Call hangup", () => {
            let callId,
                call,
                recents,
                normalizedCall

            beforeEach(() => {
                callId = 'someUUID'
                call = {callId: callId}
                normalizedCall = {callId: callId, type: 'hangup'}
                queue = new CallQueue()
                holdQueue = new CallQueue()
                recents = {post: SINON.spy()}
                phoneGuts = {greetCaller: SINON.spy(),identifyEventType: SINON.fake.returns('hangup'), normalizeCallEvent: SINON.fake.returns(normalizedCall), getCallId: (call) => {return call.callId}}
                app = new CommsServer({callQueue: queue, phonePlatformInterface: phoneGuts, recentCollection: recents, holdQueue: holdQueue})
            })

            it("should call #remove() on call queue with query matching call id", async () => {
                SINON.spy(queue, 'remove')

                await app.handleCallEvent(call)

                queue.remove.args[0][0].callId.should.equal(callId)
            })
            it("should add the normalized version of the completed call record to recents", async () => {
                await app.handleCallEvent(call)

                recents.post.args[0][0].callId.should.equal(callId)
            })
        })
    })

    describe("#hangupCall", () => {
        let
            callOnHold,
            recents,
            holdQueueGuts

        beforeEach(() => {
            call1 = {callId: '1'}
            call2 = {callId: '2'}
            callOnHold = {callId: '3'}
            queueGuts = [call1, call2]
            holdQueueGuts = [callOnHold]
            queue = new CallQueue({strategy: new MemoryStrategy({queueImplementation: queueGuts})})
            holdQueue = new CallQueue({strategy: new MemoryStrategy({queueImplementation: holdQueueGuts})})
            recents = {post: SINON.spy()}
            phoneGuts = {
                greetCaller: SINON.spy(),
                identifyEventType: SINON.fake.returns('hangup'),
                getCallId: (call) => {
                    return call1.callId
                }
            }
            app = new CommsServer({
                callQueue: queue,
                phonePlatformInterface: phoneGuts,
                recentCollection: recents,
                holdQueue: holdQueue
            })
        })

        it("should return the call from the queue", async () => {
            let returned = await app.hangupCall(call1.callId)

            returned.should.equal(call1)
        })
        context("Call queued", () => {
            it("should remove the call from the call queue", async () => {
                await app.hangupCall(call1.callId)

                queueGuts[0].should.equal(call2)
            })
        })

        context("Call on hold", () => {
            context("Incoming call", () => {
                it("should remove the call from the hold queue", async () => {
                    callOnHold.agent = {role: 'callee'}
                    await app.hangupCall(callOnHold.callId)

                    holdQueueGuts.should.be.empty
                })
            })
            context("Outgoing call", () => {
                context("Agent leg hang up", () => {
                    it("should not remove the call from the hold queue", async () => {
                        callOnHold.agent = {role: 'caller'}
                        await app.hangupCall(callOnHold.callId)

                        holdQueueGuts.should.include(callOnHold)
                    })
                })
                context("Customer leg hang up", () => {
                    it("should remove the call from the hold queue", async () => {
                        let childCallId = 'something'
                        callOnHold.childCallId = childCallId
                        callOnHold.agent = {role: 'caller'}

                        await app.hangupCall(callOnHold.childCallId)

                        holdQueueGuts.should.be.empty
                    })
                })
            })
        })
    })

    describe("#getCall", () => {
        beforeEach(() => {
            call1 = {callId: 1}
            call2 = {callId: 2}
            queueGuts = [call1, call2]
            queue = new CallQueue({strategy: new MemoryStrategy({queueImplementation: queueGuts})})
            app = new CommsServer({callQueue: queue, phonePlatformInterface: {connectToEndpoint: ()=>{}}})
        })

        context("No args", () => {
            it("should return the next call", async() => {
                call = await app.getCall()

                call.should.equal(call1)
            })
        })

        context("CallId arg provided", () => {
            it("should return the matching call", async() => {
                call = await app.getCall({callId: 2})

                call.should.equal(call2)
            })
        })
        it("should set the agent's currentCall state to the callId", async () => {
            SINON.spy()
            call = await app.getCall({callId: 2})


        })
    })

    describe("#getCallOnHold", () => {
        beforeEach(() => {
            call1 = {callId: 1}
            call2 = {callId: 2}
            let call3 = {callId: 3}
            queueGuts = [call1, call2, call3]
            let callQueue = new CallQueue()
            holdQueue = new CallQueue({strategy: new MemoryStrategy({queueImplementation: queueGuts})})
            app = new CommsServer({callQueue: callQueue, phonePlatformInterface: {connectToEndpoint: ()=>{}}, holdQueue: holdQueue})
        })

        context("Invalid parameters", () => {
            context("No params", () => {
                it("should throw with 'no param'", async () => {
                    try {
                        await app.getCallOnHold()
                        throw new Error("Shouldn't be here")
                    } catch(e) {
                        e.message.should.match(/no param/i)
                    }
                })
            })
            context("No 'callId' parameter", () => {
                it("should throw with 'no call'", async () => {
                    try {
                        await app.getCallOnHold({})
                        throw new Error("Shouldn't be here")
                    } catch(e) {
                        e.message.should.match(/no call id/i)
                    }
                })
            })
            context("No 'username' parameter", () => {
                it("should throw with 'no user'", async () => {
                    try {
                        await app.getCallOnHold({callId: call1.callId})
                        throw new Error("Shouldn't be here")
                    } catch(e) {
                        e.message.should.match(/no user/i)
                    }
                })
            })
        })
        context("Valid parameters", () => {
            it("should return the requested call from the hold queue", async () => {
                let returnedCall = await app.getCallOnHold({callId: 2, user: 'some'})

                returnedCall.should.equal(call2)
            })
        })
    })

    describe("#transferCall", () => {
        let phonePlatformInterfaceFake

        beforeEach(() => {
            phonePlatformInterfaceFake = {
                redirectCall: SINON.spy(),
                connectToEndpoint: ()=>{}
            }
            call1 = {callId: 1}
            call2 = {callId: 2}
            queueGuts = [call1, call2]
            queue = new CallQueue({strategy: new MemoryStrategy({queueImplementation: queueGuts})})
            holdQueueGuts = []
            holdQueue = new CallQueue({strategy: new MemoryStrategy({queueImplementation: holdQueueGuts})})
            someUser = 'someUser'
            app = new CommsServer({liveCallPool: {find: (callId) => {return call2}}, callQueue: queue, holdQueue: holdQueue, usersPersister: {find: (q) => { return q.username === someUser ? {username: someUser} : undefined }}, phonePlatformInterface: phonePlatformInterfaceFake})
        })

        context("No params", () => {
            it("should throw with 'no parameters'", async() => {
                try {
                    await app.transferCall()
                    throw new Error("Shouldn't be here")
                } catch(e) {
                    e.message.should.match(/no parameters/i)
                }

            })
        })
        context("No callId param", () => {
            it("should throw with 'callId required'", async() => {
                try {
                    await app.transferCall({someParam: 1})
                    throw new Error("Shouldn't be here")
                } catch(e) {
                    e.message.should.match(/callId required/i)
                }
            })
        })
        context("callId param provided", () => {
            context("no transferTo param provided", () => {
                it("should throw with 'no transferTo'", async() => {
                    try {
                        await app.transferCall({callId: 2})
                        throw new Error("Shouldn't be here")
                    } catch(e) {
                        e.message.should.match(/no transferTo/i)
                    }
                })
            })
            context("transferTo param provided", () => {
                context("No such user", () => {
                    it("should throw with 'no such user'", async() => {
                        try {
                            await app.transferCall({callId: 2, transferTo: 'unrecognizedUser'})
                            throw new Error("Shouldn't be here")
                        } catch(e) {
                            e.message.should.match(/no such user/i)
                        }
                    })
                })
                context("User exists", () => {
                    context("Call already on hold", () => {
                        beforeEach(() => {
                            holdQueueGuts.push({callId: 2, transferTo: someUser, agent: {role: 'callee'}})
                        })
                        it("should remove the call from the hold queue", async () => {
                            await app.transferCall({callId: 2, transferTo: someUser})

                            holdQueueGuts.should.be.empty
                        })
                    })
                    context("Call not already on hold", () => {
                        it("should put the call in the hold queue", async() => {
                            let dequeued

                            await app.transferCall({callId: 2, transferTo: someUser})

                            dequeued = await holdQueue.dequeue()

                            dequeued.callId.should.equal(call2.callId)
                        })
                        it("should set the 'onHoldFor' attribute to the username", async () => {
                            let dequeued

                            await app.transferCall({callId: 2, transferTo: someUser})

                            dequeued = await holdQueue.dequeue()

                            dequeued.onHoldFor.should.equal(someUser)
                        })
                        it("should call #redirectCall() on the phone proxy with the call object", async () => {
                            await app.transferCall({callId: 2, transferTo: someUser})

                            phonePlatformInterfaceFake.redirectCall.args[0][0].callId.should.equal(2)
                        })
                        it("should call #redirectCall() on the phone proxy with the PLIVO_HOLD_MUSIC_URL", async () => {
                            let url = 'someURL'
                            process.env.PLIVO_HOLD_MUSIC_URL = url

                            await app.transferCall({callId: 2, transferTo: someUser})

                            phonePlatformInterfaceFake.redirectCall.args[0][1].should.equal(url)
                        })
                    })
                })
            })
        })
    })
})