module.exports.matchException = async function matchException(matchMessage = '', exceptionTrigger) {
    try {
        await exceptionTrigger()
        throw new Error("exceptionTrigger was supposed to throw, but didn't.")
    } catch (e) {
        e.message.should.match(new RegExp(matchMessage, 'i'))
    }
}

module.exports.getValidParams = function getValidParams(validParams = {}, options) {
    let cloner = (obj) => {
        let clone = {},
            key

        if(Array.isArray(obj)) {
            clone = []
            obj.forEach((elem) => {
                clone.push(elem)
            })
        } else if(typeof(obj) === 'object') {
            for(key in obj) {
                clone[key] = cloner(obj[key])
            }
        }




        if(Object.keys(clone).length < 1) {
            // Nothing cloned
            clone = obj
        }

        return clone
    }

    return cloner(validParams)
}

module.exports.getInvalidParams = function getInvalidParams(validParams = {}, membersToRemove = []) {
    let invalidParams = {}

    // If membersToRemove is unspecified, prepare to remove all members
    if (membersToRemove.length < 1) {
        for (let key in validParams) {
            membersToRemove.push(key)
        }
    }

    // Remove all the appropriate members
    Object.assign(invalidParams, validParams)
    membersToRemove.forEach((key) => {
        delete invalidParams[key]
    })

    return invalidParams
}