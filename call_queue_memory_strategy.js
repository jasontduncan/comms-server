module.exports = class MemoryCallQueueStrategy {
    constructor(params={}) {
        this.queueImplementation = params.queueImplementation || []
    }

    queue(call) {
        this.queueImplementation.push(call)
    }

    dequeue() {
        let dequeued = this.queueImplementation.shift()
        return dequeued
    }

    remove(queryParams = {}){
        let call,
            removeIndex = this.queueImplementation.findIndex((elem) => {
                let sameCount = 0,
                    subParamArray,
                    elemSubPropertyPointer,
                    subParamCounter,
                    subParam

                for(let param in queryParams) {
                    subParamArray = param.split('.')
                    elemSubPropertyPointer = elem

                    for(subParamCounter = 0; subParamCounter < subParamArray.length; subParamCounter++) {
                        subParam = subParamArray[subParamCounter]
                        if(elemSubPropertyPointer.hasOwnProperty(subParam)) {
                            elemSubPropertyPointer = elemSubPropertyPointer[subParam]
                        } else {
                            --sameCount
                            break
                        }
                    }

                    if(queryParams[param] === elemSubPropertyPointer) {
                        ++sameCount
                    }
                }

                return sameCount === Object.keys(queryParams).length ? true : false
            })

        call = removeIndex < 0  ? undefined : this.queueImplementation.splice(removeIndex, 1)[0]

        return call
    }

    length() {
        return this.queueImplementation.length
    }
}