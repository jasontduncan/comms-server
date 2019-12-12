const ClientSyncController = require("../client_sync_controller"),
    SHOULD = require('chai').should(),
    SINON = require('sinon').createSandbox(),
    getInvalidParams = require('./helpers/test_helper').getInvalidParams,
    matchException = require('./helpers/test_helper').matchException,
    VALID_CLIENT = {id: 'someID'},
    VALID_CALL = {}

describe("ClientSyncController", () => {
    let controller,
        syncAdapter,
        syncPersister,
        validParams

    beforeEach(() => {
        syncAdapter = {
            broadcast: SINON.spy()
        }
        syncPersister = {
            addClient: SINON.spy(),
            removeClient: SINON.spy(),
            addCall: SINON.spy(),
            removeCall: SINON.spy()
        }
        validParams = {
            syncAdapter : syncAdapter,
            syncPersister : syncPersister
        }
        controller = new ClientSyncController(validParams)
    })
    
    afterEach(() => {
        SINON.restore()
    })

    describe("#constructor()", () => {
        context("No params", () => {
            it("should throw with 'no param'", () => {
                matchException('no param', () => {new ClientSyncController()})
            })
        })

        context("No params.syncAdapter", () => {
            it("should throw with 'no sync adapter'", () => {
                matchException('no sync adapter', () => {new ClientSyncController(getInvalidParams(validParams, ['syncAdapter']))})
            })
        })

        context("No params.syncPersister", () => {
            it("should throw with 'no sync persister'", () => {
                matchException('no sync persister', () => {new ClientSyncController(getInvalidParams(validParams, ['syncPersister']))})
            })
        })
    })

    describe("#addClient()", () => {
        beforeEach(() => {
            SINON.spy(controller, 'updateClients')
            controller.addClient(VALID_CLIENT)
        })

        it("should persist the client info", () => {
            syncPersister.addClient.called.should.be.true
        })
        it("should call #updateClients", () => {
            controller.updateClients.called.should.be.true
        })
    })
    
    describe("#removeClient()", () => {
        beforeEach(() => {
            SINON.spy(controller, 'updateClients')
            controller.addClient(VALID_CLIENT)
            controller.removeClient(VALID_CLIENT)
        })

        it("should un-persist the client info", () => {
            syncPersister.removeClient.called.should.be.true
        })
        it("should call #updateClients", () => {
            controller.updateClients.called.should.be.true
        })
    })

    describe("#updateClients()", () => {
        it("should call #broadcast on the sync adapter", () => {
            controller.updateClients()
            syncAdapter.broadcast.called.should.be.true
        })
    })

    describe("#addCall()", () => {
        beforeEach(() => {
            SINON.spy(controller, 'updateClients')
        })

        it("should persist the call record", () => {
            controller.addCall(VALID_CALL)
            syncPersister.addCall.called.should.be.true
        })

        it("should call #updateClients()", () => {
            controller.addCall(VALID_CALL)
            controller.updateClients.called.should.be.true
        })
    })

    describe("#removeCall()", () => {
        beforeEach(() => {
            SINON.spy(controller, 'updateClients')
            controller.addCall(VALID_CALL)
        })

        it("should un-persist the call record", () => {
            controller.removeCall(VALID_CALL)
            syncPersister.removeCall.called.should.be.true
        })

        it("should call #updateClients()", () => {
            controller.removeCall(VALID_CALL)
            controller.updateClients.called.should.be.true
        })
    })

    describe("#updateCallCount()", () => {
        it("should call #updateClients()", () => {
            SINON.spy(controller, 'updateClients')

            controller.updateCallCount({callCount: 1})

            controller.updateClients.called.should.be.true
        })
    })
    describe("#updateHoldLists()", () => {
        it("should call #updateClients()", () => {
            SINON.spy(controller, 'updateClients')

            controller.updateHoldLists({data: {onHoldFor: {}}})

            controller.updateClients.called.should.be.true
        })
    })
})