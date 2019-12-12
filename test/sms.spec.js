const SHOULD = require('chai').should(),
    SINON = require('sinon').createSandbox(),
    PHONE_CLIENT = {
        messages: {
            create: SINON.spy()
        }
    },
    VALID_PARAMS = {
        to: '1234567890',
        message: "test message",
        phoneClient: PHONE_CLIENT
    },
    SMS = require('../sms.js')

describe("SMS", () => {
    afterEach(async () => {
        SINON.restore()
    })

    describe("Send", () => {
        let params

        context("No params", () => {
            beforeEach(() => {
                params = undefined
            })

            it("should throw with 'no parameters'", async () => {
                try {
                    await SMS.send()
                    throw new Error("Shouldn't be here")
                } catch(e) {
                    e.message.should.match(/no parameters/i)
                }
            })
        })
        context("No number", () => {
            beforeEach(() => {
                params = {message: 'message'}
            })

            it("should throw with 'no number'", async () => {
                try {
                    await SMS.send(params)
                    throw new Error("Shouldn't be here")
                } catch(e) {
                    e.message.should.match(/no number/i)
                }
            })
        })
        context("No message", () => {
            beforeEach(() => {
                params = {to: '1234'}
            })

            it("should throw with 'no message'", async () => {
                try {
                    await SMS.send(params)
                    throw new Error("Should't be here")
                } catch(e) {
                    e.message.should.match(/no message/i)
                }
            })
        })
        context("No phoneClient", () => {
            beforeEach(() => {
                params = {to: VALID_PARAMS.to, message: VALID_PARAMS.message}
            })

            it("should throw with 'no phoneClient'", async () => {
                try {
                    await SMS.send(params)
                    throw new Error("Shouldn't be here")
                } catch(e) {
                    e.message.should.match(/no phoneClient/i)
                }
            })
        })
        context("Good parameters", () => {
            beforeEach(() => {
                params = VALID_PARAMS
            })

            it("should call #create() on phoneClient.messages", async () => {
                await SMS.send(params)
                PHONE_CLIENT.messages.create.callCount.should.equal(1)
            })
        })
    })
})