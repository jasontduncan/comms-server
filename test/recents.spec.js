const SHOULD = require('chai').should(),
    SINON = require('sinon').createSandbox(),
    RECENTS = require('../recents.js')

describe("Recents", () => {
    describe("#constructor()", () => {
        context("No params", () => {
            it("should throw with 'no params'", () => {
                try {
                    new RECENTS()
                    throw new Error("Shouldn't be here")
                } catch(e) {
                    e.message.should.match(/no params/i)
                }
            })
        })
        context("No persister", () => {
            it("should throw with 'no persister'", async () => {
                try {
                    new RECENTS({})
                    throw new Error("Shouldn't be here")
                } catch(e) {
                    e.message.should.match(/no persister/i)
                }
            })
        })
    })
    describe("#get()", () => {
        it("should return all recents", async () => {
            let all = [],
                gotten

            recents = new RECENTS({persister: {find: ()=>{return all}}})
            gotten = await recents.get()
            gotten.should.equal(all)
        })
    })
    describe("#post()", () => {
        it("should add the recent to the collection", async () => {
            let all = [],
                newRecent = {},
                pushSpy = SINON.spy()

            recents = new RECENTS({persister: {insertOne: pushSpy}})
            recents.post(newRecent)

            pushSpy.getCall(0).args[0].should.equal(newRecent)
        })
    })
})