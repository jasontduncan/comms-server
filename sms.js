require('dotenv').config()

module.exports.send = async (params)=>{
    if( !params ) throw new Error("No parameters")
    if( !params.to || params.to.trim().length < 1 ) throw new Error("No number")
    if( !params.message || params.message.trim().length < 1) throw new Error("No message")
    if( !params.phoneClient ) throw new Error("No phoneClient")

    params.phoneClient.messages.create(process.env.SMS_FROM_NUMBER, params.to, params.message)
}