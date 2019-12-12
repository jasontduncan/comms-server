const PATH = require('path'),
    SHOULD = require('chai').should(),
    SINON = require('sinon').createSandbox(),
    LiveCallPool = require(PATH.resolve('live_call_pool'))

describe("LiveCallPool", () => {
    describe("#insert()", () => {
        it("should call #insert() on the strategy with the call", async () => {
            let callToInsert = {},
                fakeStrategy = {insert: SINON.spy()},
                callPool = new LiveCallPool({strategy: fakeStrategy})

            await callPool.insert(callToInsert)

            fakeStrategy.insert.calledWith(callToInsert).should.be.true
        })
    })
    describe("#find()", () => {
        it("should call #find() on the strategy with the query parameters", async () => {
            let fakeStrategy = {find: SINON.spy()},
                callPool = new LiveCallPool({strategy: fakeStrategy}),
                queryParams = {}

            await callPool.find(queryParams)

            fakeStrategy.find.calledWith(queryParams).should.be.true
        })
    })
    describe("#remove()", () => {
        it("should call #remove() on the strategy with the query params", async () => {
            let fakeStrategy = {remove: SINON.spy()},
                callPool = new LiveCallPool({strategy: fakeStrategy}),
                queryParams = {}

            await callPool.remove(queryParams)

            fakeStrategy.remove.calledWith(queryParams).should.be.true
        })

        it("should return the result from the strategy", async () => {
            let callToRemove = {},
                fakeStrategy = {remove: SINON.fake.returns(callToRemove)},
                callPool = new LiveCallPool({strategy: fakeStrategy}),
                removedCall = await callPool.remove()

            removedCall.should.equal(callToRemove)
        })
    })
    //TODO remove this feature once call tracking code is implemented
    describe("#updateAgentRole()", () => {
        it("should call #updateAgentRoll() on the strategy with the call identifier and new role", async () => {
            let callQuery = {},
                fakeStrategy = {updateAgentRole: SINON.spy()},
                callPool = new LiveCallPool({strategy: fakeStrategy}),
                newRole = 'something'

            await callPool.updateAgentRole(callQuery, newRole)

            console.log(fakeStrategy.updateAgentRole.calledWith(callQuery, newRole))
        })
    })
})