require('dotenv').config()

const PLIVO = require('plivo'),
    DEFAULT_HOLD_MUSIC_URL = 'http://com.twilio.music.ambient.s3.amazonaws.com/aerosolspray_-_Living_Taciturn.mp3'

module.exports = class PlivoPhoneProxy{
    greetCaller(call, greeting) {
        let xmlResponse,
            getDigitsParams = {
                action: process.env.PLIVO_VOICEMAIL_URL,
                validDigits: 1,
                numDigits: 1,
                timeout: 60,
                method: 'POST'
            },
            response,
            getDigits

        if(!greeting) throw new Error("No greeting supplied")

        response = PLIVO.Response()

        if(greeting.type === 'text') {
            response.addSpeak(greeting.value)
        } else if(greeting.type === 'url') {
            getDigits = response.addGetDigits(getDigitsParams)
            getDigits.addPlay(greeting.value)
        }


        response.addPlay(DEFAULT_HOLD_MUSIC_URL, {loop: 0})
        xmlResponse = response.toXML()

        return xmlResponse
    }

    putOnHold(musicUrl) {
        let response,
            xmlResponse

        if(!musicUrl) throw new Error("No hold music URL provided")

        response = PLIVO.Response()

        response.addPlay(musicUrl, {loop: 0})
        xmlResponse = response.toXML()

        return xmlResponse
    }
    async connectToEndpoint(call, user) {
        // TODO find out why call is sometimes null (yes, null).
        let url = process.env.PLIVO_CALL_CONNECT_URL +'?username='+ user +'&call='+ call.callId

        return this.redirectCall(call, url)
    }
    async redirectCall(call, url) {
        if(!call) throw new Error("Redirect failed. No call parameter provided.")
        if(!url) throw new Error("Redirect failed. No URL parameter provided.")

        let client = new PLIVO.Client()

        if(!!call.leg && call.leg === 'bleg') {
            return client.calls.transfer(call.callId, {legs: 'bleg', blegUrl: url, blegMethod: 'GET'})
        }
        return client.calls.transfer(call.callId, {legs: 'aleg', alegUrl: url, alegMethod: 'GET'})
    }

    dialEndpoint(endpoint, callId) {
        let response = PLIVO.Response(),
            dial = response.addDial({
                redirect: false,
                callerId: process.env.PHONE_CALL_FROM_NUMBER,
                sipHeaders: "X-PH-CallId="+ callId,
                callbackUrl: process.env.PLIVO_DIAL_CALLBACK_URL
            })

        if(endpoint.type === 'number') {
            dial.addNumber(endpoint.value)
        } else if(endpoint.type === 'user') {
            dial.addUser(endpoint.value)
        }

        return response.toXML()
    }

    identifyEventType(event) {
        if(event.EndTime) return 'hangup'
        if(!!event['X-PH-AgentCall'] && event.CallStatus === 'ringing') return 'agentCallRequest'
        if(!!event.DialALegUUID && !!event.DialBLegUUID) return 'callConnected'
        if(event.CallStatus === 'ringing' && !event['X-PH-AgentCall']) return 'incomingCall' //The negation isn't technically required, due to previous if statement, but there to make conditions explicit.
    }

    normalizeCallEvent(event) {
        let normalizedEvent = {
            platform: 'plivo',
            callId: event.CallUUID,
            timestamp: new Date()
        }

        if(event.CallStatus === 'ringing') {
            if(!!event['X-PH-AgentCall']) {
                normalizedEvent.type = 'agentCallRequest'
            } else {
                normalizedEvent.type = 'incomingCall'
            }
            normalizedEvent.to = event.To
            normalizedEvent.from = event.From
        } else if(event.CallStatus === 'in-progress' && event.DialAction === 'connected') {
            normalizedEvent.type = 'callConnected'
            normalizedEvent.childCallId = event.DialBLegUUID
        } else if(event.CallStatus === 'completed') {
            normalizedEvent.type = 'hangup'
            normalizedEvent.duration = event.Duration
            if(event.AnswerTime) normalizedEvent.answerTime = new Date(event.AnswerTime)
            if(event.EndTime) normalizedEvent.endTime = new Date(event.EndTime)
        }

        if(!!event['X-PH-AgentCall']) {
            normalizedEvent.agent = {
                role: 'caller',
                id: event['X-PH-AgentCall']
            }
        } else {
            normalizedEvent.agent = {
                role: 'callee'
            }
        }

        return normalizedEvent
    }

    getCallId(call) {
        return call.CallUUID
    }
}