const path = require('path'),
    MemoryCallQueueStrategy = require(path.resolve('call_queue_memory_strategy'))

module.exports = class CallQueue {
    constructor(params={}) {
        this.strategy = params.strategy || new MemoryCallQueueStrategy()
        this.observers = params.observers || []
    }

    /**
     * Adds the call to the Queue.
     *
     * @param {Object} call
     *
     * @returns {Promise<Object>}
     */
    async queue(call) {
        let rVal

        !!call.subscribe ? call.subscribe(this) : null
        rVal = await this.strategy.queue(call)
        this.updateObservers({type: 'queue', data: call})

        return rVal
    }

    /**
     * Retrieves the first call from the queue.
     *
     * @returns {Promise<callObject>}
     */
    async dequeue() {
        let call = await this.strategy.dequeue()
        if(!!call && !!call.unsubscribe) {
            call.unsubscribe(this)
        }
        this.updateObservers({type: 'dequeue', data: call})

        return call
    }

    /**
     * Retrieves the matching call from the queue.
     *
     * @param {Object} queryParams
     *
     * @returns {Promise<callObject>}
     */
    async remove(queryParams) {
        let call = await this.strategy.remove(queryParams)

        if(!!call) {
            this.updateObservers({type: 'remove', data: call})
            if(!!call.unsubscribe) call.unsubscribe(this)
        }

        return call
    }

    /**
     * Retrieves the length of the call queue.
     *
     * @returns {Promise<number>}
     */
    async length() {
        return await this.strategy.length()
    }

    /**
     * Updates registered observers with call queue details.
     *
     * @returns {Promise<void>}
     */
    async updateObservers(event) {
        let callCount = await this.strategy.length()

        if(!event) {
            console.log("No event with which to update observers.")
            event = {}
        }
        if(!event.data) {
            console.log("No event data with which to update observers about the call: ", event.type)
            event.data = {}
        }

        this.observers.forEach(async (observer) => {
            observer({
                callCount: callCount,
                latest: event
            })
        })
    }

    /**
     * Registers an observer with the call queue.
     *
     * @param {function} observer
     */

    observeState(observer) {
        this.observers.push(observer)
    }
}