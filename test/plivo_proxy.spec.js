const SHOULD = require('chai').should(),
    SINON = require('sinon').createSandbox(),
    plivoClient = require('plivo'),
    PlivoPhoneProxy = require('../plivo_phone_platform_interface'),
    VALID_CALL = {callId: 'someUUID'},
    VALID_GREETING = {type: 'text', value: 'some text'}

describe("PlivoPhoneProxy", () => {
    let plivoResponseFake,
        proxy,
        nestedAddPlay

    beforeEach(() => {
        proxy = new PlivoPhoneProxy()
    })
    afterEach(() => {
        SINON.restore()
    })

    describe("#greetCaller()", () => {
        beforeEach(() => {
            nestedAddPlay = SINON.spy()
            plivoResponseFake = {
                addSpeak: SINON.spy(),
                addPlay: SINON.spy(),
                addGetDigits: SINON.fake.returns({addPlay: nestedAddPlay}),
                set: SINON.spy(),
                toXML: SINON.fake.returns({})
            }
            plivoClient.Response = SINON.fake.returns(plivoResponseFake)
        })

        context("No greeting passed in", () => {
            it("should throw with 'no greeting'", async () => {
                try {
                    await proxy.greetCaller(VALID_CALL)
                    throw new Error("Shouldn't be here")
                } catch(e) {
                    e.message.should.match(/no greeting/i)
                }
            })
        })

        it("should return the value of #toXML() on the response", () => {
            proxy.greetCaller(VALID_CALL, VALID_GREETING).should.equal(plivoResponseFake.toXML())
        })

        context("'greeting.type' is 'text'", () => {
            it("should call #addSpeak() on the Plivo response, with the value of 'greeting.value'", () => {
                proxy.greetCaller(VALID_CALL, VALID_GREETING)
                plivoResponseFake.addSpeak.args[0][0].should.equal(VALID_GREETING.value)
            })
        })

        context("'greeting.type' is 'url'", () => {
            it("should call #addPlay() on the Plivo response, with the value of the 'greeting.value'", () => {
                let urlGreeting = {type: 'url', value: 'someurl'}
                proxy.greetCaller(VALID_CALL, urlGreeting)
                nestedAddPlay.args[0][0].should.equal(urlGreeting.value)
            })
        })
    })

    describe("#connectToAgent()", () => {
        beforeEach(() => {
            plivoClientFake = {
                calls: {
                    transfer: SINON.spy()
                }
            }
            SINON.replace(plivoClient, 'Client', SINON.fake.returns(plivoClientFake))
        })

        it("should call #transfer on the Plivo client, with the call uuid", () => {
            proxy.connectToEndpoint(VALID_CALL, '1111111')
            plivoClientFake.calls.transfer.args[0][0].should.equal(VALID_CALL.callId)
        })
    })

    describe("#dialEndpoint()", () => {
        let addNumberSpy,
            addUserSpy

        beforeEach(() => {
            addNumberSpy = SINON.spy()
            addUserSpy = SINON.spy()

            plivoResponseFake = {
                addDial: SINON.fake.returns({addNumber: addNumberSpy, addUser: addUserSpy}),
                toXML: SINON.fake.returns({})
            }
            plivoClient.Response = SINON.fake.returns(plivoResponseFake)

            proxy = new PlivoPhoneProxy()
        })

        it("should call #addDial() on the response", () => {
            proxy.dialEndpoint({})

            plivoResponseFake.addDial.called.should.be.true
        })
        context("Number endpoint passed in", () => {
            it("should call #addNumber on the dial object", () => {
                proxy.dialEndpoint({type: 'number'})

                addNumberSpy.called.should.be.true
            })
        })
        context("User endpoint passed in", () => {
            it("should call #addUser on the dial object", () => {
                proxy.dialEndpoint({type: 'user'})

                addUserSpy.called.should.be.true
            })
        })
    })

    describe("#identifyEventType()", () => {
        context("Hangup event", () => {
            it("should return 'hangup'", () => {
                let call = {EndTime: 'nonEmpty'}

                proxy.identifyEventType(call).should.equal('hangup')
            })
        })
        context("Agent outbound call request", () => {
            it("should return 'agentCallRequest'", () => {
                let call = {'X-PH-AgentCall': true, CallStatus: 'ringing'}

                proxy.identifyEventType(call).should.equal('agentCallRequest')
            })
        })
        context("Default (Not outbound agent call, and no EndTime)", () => {
            it("should return 'incomingCall'", () => {
                let call = {CallStatus: 'ringing'}

                proxy.identifyEventType(call).should.equal('incomingCall')
            })
        })
    })

    describe("#normalizeCallEvent()", () => {
        context("Call initiated", () => {
            let clock,
                now

            beforeEach(() => {
                now = new Date()
                clock = SINON.useFakeTimers(now)
            })
            afterEach(() => {
                clock.restore()
            })

            it("should set 'type' to 'incomingCall'", () => {
                let normalizedEvent = proxy.normalizeCallEvent({CallStatus: 'ringing'})

                normalizedEvent.type.should.equal('incomingCall')
            })
            it("should set 'timestamp' to now", () => {
                let normalizedEvent

                normalizedEvent = proxy.normalizeCallEvent({CallStatus: 'ringing'})

                normalizedEvent.timestamp.toString().should.equal(now.toString())
            })
            it("should set 'callId' to CallUUID", () => {
                let plivoCallId = 'someId',
                    normalizedEvent = proxy.normalizeCallEvent({CallStatus: 'ringing', CallUUID: plivoCallId})

                normalizedEvent.callId.should.equal(plivoCallId)
            })
            it("should set 'platform' to 'plivo'", () => {
                let normalizedEvent = proxy.normalizeCallEvent({})

                normalizedEvent.platform.should.equal('plivo')
            })
            it("should set 'to' to To", () => {
                let target = 'target',
                    normalizedEvent = proxy.normalizeCallEvent({CallStatus: 'ringing', To: target})

                normalizedEvent.to.should.equal(target)
            })
            it("should set 'from' to From", () => {
                let initiator = 'fromer',
                    normalizedEvent = proxy.normalizeCallEvent({CallStatus: 'ringing', From: initiator})

                normalizedEvent.from.should.equal(initiator)
            })
            context("Agent call", () =>{
                it("should set 'type' to 'agentCallRequest'", () => {
                    let normalizedEvent = proxy.normalizeCallEvent({CallStatus: 'ringing', 'X-PH-AgentCall': true})

                    normalizedEvent.type.should.equal('agentCallRequest')
                })
                it("should set 'agent.role' to 'caller'", () => {
                    let normalizedEvent = proxy.normalizeCallEvent({"X-PH-AgentCall":'tim'})

                    normalizedEvent.agent.role.should.equal('caller')
                })
                it("should set the 'agent.id' to X-PH-AgentCall", () => {
                    let agentId = 'tim',
                        normalizedEvent = proxy.normalizeCallEvent({"X-PH-AgentCall":agentId})

                    normalizedEvent.agent.id.should.equal(agentId)
                })
            })
            context("Customer call", () => {
                it("should set 'agent.role', to 'callee'", () => {
                    let normalizedEvent = proxy.normalizeCallEvent({})

                    normalizedEvent.agent.role.should.equal('callee')
                })
            })
        })
        context("Call connected", () => {
            it("should set 'type' to 'callConnected'", () => {
                let normalizedEvent  = proxy.normalizeCallEvent({CallStatus: 'in-progress', DialAction: 'connected'})

                normalizedEvent.type.should.equal('callConnected')
            })
            it("should set 'childCallId' to DialBLegUUID", () => {
                let bLegUUID = 'something',
                    normalizedEvent  = proxy.normalizeCallEvent({CallStatus: 'in-progress', DialAction: 'connected', DialBLegUUID: bLegUUID})

                normalizedEvent.childCallId.should.equal(bLegUUID)
            })
        })
        context("Call hung up", () => {
            it("should set 'type' to 'hangup'", () => {
                let normalizedEvent  = proxy.normalizeCallEvent({CallStatus: 'completed'})

                normalizedEvent.type.should.equal('hangup')
            })
            it("should set 'duration' to Duration", () => {
                let duration = 'something',
                    normalizedEvent = proxy.normalizeCallEvent({CallStatus: 'completed', Duration: duration})

                normalizedEvent.duration.should.equal(duration)
            })
            it("should set 'answerTime' to an ISO representation of AnswerTime", () => {
                let answerTime = "2019-11-11 08:45:05",
                    answerTimeISOString = new Date(answerTime).toISOString(),
                    normalizedEvent = proxy.normalizeCallEvent({CallStatus: 'completed', AnswerTime: answerTime})

                normalizedEvent.answerTime.toISOString().should.equal(answerTimeISOString)
            })
            it("should set 'hangupTime' to an ISO representation of EndTime", () => {
                let endTime = "2019-11-11 08:45:05",
                    endTimeISOString = new Date(endTime).toISOString(),
                    normalizedEvent = proxy.normalizeCallEvent({CallStatus: 'completed', EndTime: endTime})

                normalizedEvent.endTime.toISOString().should.equal(endTimeISOString)
            })
        })
    })

    describe("#redirectCall()", () => {
        context("Invalid params", () => {
            context("No call param", () => {
                it("should throw with 'no call'", async () => {
                    try {
                        await proxy.redirectCall()
                        throw new Error("Shouldn't be here")
                    } catch(e) {
                        e.message.should.match(/no call/i)
                    }
                })
            })
            context("No URL param", () => {
                it("should throw with 'no url'", async () => {
                    try {
                        await proxy.redirectCall({})
                        throw new Error("Shouldn't be here")
                    } catch(e) {
                        e.message.should.match(/no url/i)
                    }
                })
            })
        })
        context("Valid params", () => {
            let transferSpy,
                PlivoClientFake,
                VALID_CALL = {callId: 'someId'},
                VALID_URL = 'someURL',
                VALID_REDIRECT_ARGS = [VALID_CALL, VALID_URL]

            beforeEach(() => {
                transferSpy = SINON.spy()
                PlivoClientFake = SINON.fake.returns({calls: {transfer: transferSpy}})

                SINON.replace(plivoClient, 'Client', PlivoClientFake)
            })

            it("should call calls.transfer on the Plivo client with the callId", async () => {
                await proxy.redirectCall(...VALID_REDIRECT_ARGS)

                transferSpy.args[0][0].should.equal('someId')
            })
            it("should call calls.transfer on the Plivo client directing the A leg to the new URL", async () => {
                await proxy.redirectCall(...VALID_REDIRECT_ARGS)
            })
        })
    })
})