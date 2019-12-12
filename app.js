const GREETING_TYPE = process.env.GREETING_TYPE,
    GREETING_VALUE = process.env.GREETING_VALUE

module.exports = class CommsServer {
    constructor(params) {
        this.liveCallPool = params.liveCallPool
        this.callQueue = params.callQueue
        this.holdQueue = params.holdQueue
        this.users = params.usersPersister
        this.recentCollection = params.recentCollection
        this.phonePlatformInterface = params.phonePlatformInterface
        this.syncControllers = params.syncControllers || []
        this.callEventLog = params.callEventLog || {log: ()=>{}}

        // Link sync controllers with call queue
        this.syncControllers.forEach((syncController) => {
            this.callQueue.observeState((newState) => {syncController.updateCallCount(newState.callCount)})
            this.holdQueue.observeState((newState) => {syncController.updateHoldLists(newState.latest)})
        })
    }

    /**
     * Fetches appropriate response to a call event, sent from the phone platform (ie. Twilio or Plivo).
     * Phone platform interface is used to decode the call object, and to construct a response.
     *
     * @param {object} callEvent
     * @returns {Promise<PhonePlatformCommand>}
     */
    async handleCallEvent(callEvent) {
        let normalizedEvent = this.phonePlatformInterface.normalizeCallEvent(callEvent)
        this.callEventLog.log(normalizedEvent)

        switch(normalizedEvent.type) {
            case 'hangup':
                if(!!this.recentCollection) {
                    await this.recentCollection.post(normalizedEvent)
                }
                return this.hangupCall(normalizedEvent.callId)
                break
            case 'agentCallRequest':
                return this.phonePlatformInterface.dialEndpoint({type: 'number', value: normalizedEvent.to})
                break
            case 'incomingCall':
                await this.callQueue.queue(normalizedEvent)
                return this.phonePlatformInterface.greetCaller(normalizedEvent, {type: GREETING_TYPE, value: GREETING_VALUE})
            case 'callConnected':
                await this.liveCallPool.insert(normalizedEvent)
                break
            default:
                console.log("Unknown call event type: ", JSON.stringify(callEvent))
        }
    }


    /**
     * Removes a call record from either the callQueue or the holdQueue, and returns the record.
     *
     * @param {string} callId
     *
     * @returns {Promise<callObject>}
     */
    async hangupCall(callId) {
        let removed

        // If the call is still queued, remove it.
        removed = await this.callQueue.remove({callId: callId})
        // If not in the queue, see if it is an incoming call put on hold, and remove it
        removed = removed || await this.holdQueue.remove({callId: callId, 'agent.role': 'callee'})
        // If not an incoming call on hold, see if it's actually the child leg of an outgoing call put on hold, and remove it
        removed = removed || await this.holdQueue.remove({childCallId: callId, 'agent.role': 'caller'})
        // If still not matched, it could just be the agent hangup of a call on hold. Do nothing.


        return removed
    }

    /**
     * Retrieves either the requested call (if callId provided), or the first call from the call queue.
     * Also, attempts to connect the call, through the phone platform, to the agent making the request.
     *
     * @param {Object} params
     * @param {Object} params.user
     * @param {string} [params.callId]
     *
     * @returns {Promise<callObject>}
     */
    async getCall(params={}) {
        let call,
            user = params.user

        //TODO remove debugging output
        if(!params.callId) {
            call = await this.callQueue.dequeue()
            if(!call) console.error("No calls to dequeue for: ", params.user)
        } else {
            call = await this.callQueue.remove({callId: params.callId})
            if(!call) console.error("Could not remove call: ", params.callId)
        }

        if(!!call) {
            await this.phonePlatformInterface.connectToEndpoint(call, user)

            return call
        }
    }

    /**
     * Fetches a response for a phone platform request. The response instructs
     * the phone platform to connect an endpoint, such as an agent, to the call.
     *
     * @param {string} endpoint
     *
     * @returns {Promise<PhonePlatformCommand>}
     */
    async connectCallToEndpoint(endpoint, callId){
        return this.phonePlatformInterface.dialEndpoint(endpoint, callId)
    }

    /**
     * Fetches a response for a phone platform request. The response instructs
     * the phone platform to connect the call to the on-hold endpoint.
     *
     * @returns {Promise<PhonePlatformCommand>}
     */
    async connectCallToOnHold() {
        return this.phonePlatformInterface.putOnHold(process.env.ON_HOLD_MUSIC_URL)
    }

    /**
     * Retrieves the specified call from the hold queue.
     * Additionally, requests that the phone platform connect the call to the
     * agent endpoint (user).
     *
     * @param {Object} params
     * @param {string} params.callId
     * @param {string} params.username
     *
     * @returns {Promise<callObject>}
     */
    async getCallOnHold(params) {
        let call,
            user

        if(!params) throw new Error("No parameters provided")
        if(!params.callId) throw new Error("No call id parameter provided")
        if(!params.user) throw new Error("No user parameter provided")

        user = params.user
        call = await this.holdQueue.remove({callId: params.callId})

        await this.phonePlatformInterface.connectToEndpoint(call, user)

        return call
    }

    /**
     * Requests that the phone platform redirect the call to a specific user.
     *
     * @param {Object} params
     * @param {string} params.callId
     * @param {string} params.transferTo
     *
     * @returns {Promise<void>}
     */
    async transferCall(params={}) {
        let targetUser,
            call,
            callOnHold,
            targetUrl,
            callId = params.callId

        console.log("callId: ", params.callId, "\n", "transferTo: ", params.transferTo)
        if(Object.keys(params).length < 1) throw new Error("Transfer called with no parameters.")
        if(!params.callId) throw new Error("Could not transfer unknown call. callId required.")
        if(!params.transferTo) throw new Error("Could not transfer to unknown user. No transferTo")

        targetUser = await this.users.find({username: params.transferTo})

        if(!!targetUser) {
            callOnHold = await this.holdQueue.remove({callId: callId})
            callOnHold = callOnHold  ||  await this.holdQueue.remove({childCallId: callId})
            if(!callOnHold) {
                call = await this.liveCallPool.find({callId: params.callId})
                    || await this.liveCallPool.find({childCallId: params.callId})

                call.leg = params.leg
                call.onHoldFor = targetUser.username
                await this.holdQueue.queue(call)
                targetUrl = process.env.PLIVO_HOLD_MUSIC_URL
            } else {

                call = callOnHold
                if(call.agent.role === 'caller' && params.callId === call.callId) {
                    this.liveCallPool.updateAgentRole(call, 'callee')
                    // Transfer the child leg
                    call.callId = call.childCallId
                    call.leg ='aleg'
                }

                targetUrl = process.env.PLIVO_CALL_CONNECT_URL +'?username='+ call.onHoldFor +'&call='+ call.callId
                // delete call.onHoldFor
            }

            await this.phonePlatformInterface.redirectCall(call, targetUrl)
        } else {
            throw new Error("No such user: "+ params.transferTo)
        }
    }

    /**
     * Retrieves recent activity records
     *
     * @returns {Promise<object[]>}
     */
    async getRecents() {
        return await this.recentCollection.get()
    }

    /**
     * Adds an activity record to the recents collection
     *
     * @param {object} recent
     *
     * @returns {Promise<object>}
     */
    async postRecent(recent) {
        return await this.recentCollection.post(recent)
    }
}
