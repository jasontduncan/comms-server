class LiveCallPool {
    constructor(params) {
        this.strategy = params.strategy
    }
    async insert(call) {
        return this.strategy.insert(call)
    }
    async find(queryParams) {
        return this.strategy.find(queryParams)
    }
    async remove(queryParams) {
        return this.strategy.remove(queryParams)
    }
    async updateAgentRole(callQuery, newRole) {
        return this.strategy.updateAgentRole(callQuery, newRole)
    }
}

module.exports = LiveCallPool