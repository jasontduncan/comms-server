module.exports = class SyncAdapterSocketIO {
    constructor(params) {
        this.io = require('socket.io')(params.http)

        this.io.on('connection', (conn) => {
            console.log("IO connection established")
        })
        this.io.on('disconnect', () => {
            console.log("IO connection severed")
        })
    }

    broadcast(state) {
        this.io.emit('state', state)
    }
}