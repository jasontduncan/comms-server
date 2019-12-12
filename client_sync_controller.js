/**
 * Controls synchronization of application state with a collection of clients.
 *
 * @type {module.ClientSyncController}
 */
module.exports = class ClientSyncController {
    constructor(params) {
        if(!params) throw new Error("No params")
        if(!params.syncAdapter) throw new Error("No sync adapter")
        if(!params.syncPersister) throw new Error("No sync persister")

        this.syncPersister = params.syncPersister
        this.syncAdapter = params.syncAdapter

        this.state = {
            clients: [],
            calls: [],
            callCount: 0,
            callsOnHold: []
        }
    }

    addClient(newClient) {
        let client = this.state.clients.find((client) => {
            client.username === newClient.username
        })
        if(!client) {
            this.state.clients.push(newClient)
            this.syncPersister.addClient(newClient)
            this.updateClients()
        }
    }

    removeClient(client) {
        this.state.clients = this.state.clients.filter(existingClient => existingClient.username !== client.username)
        this.syncPersister.removeClient(client)
        this.updateClients()
    }

    updateClients() {
        this.syncAdapter.broadcast({state:this.state})
    }

    addCall(call) {
        this.state.calls.push(call)
        this.syncPersister.addCall(call)
        this.updateClients()
    }

    removeCall(call) {
        this.state.calls = this.state.calls.filter(existingCall => existingCall.id !== call.id)
        this.syncPersister.removeCall(call)
    }

    updateCallCount(count) {
        this.state.callCount = count
        this.updateClients()
    }

    updateHoldLists(updateEvent) {
        let onHoldForUser = updateEvent.data.onHoldFor,
            eventType = updateEvent.type,
            list = this.state.callsOnHold.find((holdList) => {return holdList.onHoldFor === onHoldForUser})

        if(!onHoldForUser) {
            return
        }

        if(!list) {
            list = {onHoldFor: onHoldForUser, calls: []}
            this.state.callsOnHold.push(list)
        }

        switch(eventType) {
            case 'queue' :
                list.calls.push(updateEvent.data.callId)
                break;
            default :
                for(let i=0; i<list.calls.length; i++){
                    if(list.calls[i] === updateEvent.data.callId) {
                        list.calls.splice(i, 1)
                    }
                }
                break;
        }

        this.updateClients()
    }
}