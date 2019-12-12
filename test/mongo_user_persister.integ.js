const  path = require('path'),
    SHOULD = require('chai').should(),
    MONGO_URI = 'mongodb://localhost:27017',
    SINON = require('sinon').createSandbox(),
    MONGO_CLIENT = require('mongodb').MongoClient,
    DB_NAME = 'comms_test',
    COLLECTION_NAME = 'users',
    MongoUserPersister = require(path.resolve('mongo_user_persister')),
    VALID_USER = {
        name: 'someName'
    }

describe("MongoUserPersister", () => {
    let client,
        db,
        collectionHandle,
        userPersister

    beforeEach(async () => {
        client = await MONGO_CLIENT.connect(MONGO_URI, { useNewUrlParser: true })
        db = client.db(DB_NAME)
        collectionHandle = db.collection(COLLECTION_NAME)
        userPersister = new MongoUserPersister({mongo_uri: MONGO_URI, db_name: DB_NAME})
    })

    afterEach(async () => {
        await db.dropDatabase()
        client.close()
        SINON.restore()
    })


    describe("#create", async () => {
        it("should add the user to the users collection", async () => {
            let user = VALID_USER,
                foundUser

            await userPersister.create(user)

            foundUser = await collectionHandle.findOne()

            foundUser.name.should.equal(VALID_USER.name)
        })
    })

    describe("#update", async () => {
        beforeEach(async () => {
            collectionHandle.insertOne(VALID_USER)
        })

        it("should change the appropriate field in the record", async () => {
            let foundUser,
                newName = 'newName'

            await userPersister.update({name: VALID_USER.name}, {name: newName})
            foundUser = await collectionHandle.findOne()

            foundUser.name.should.equal(newName)
        })
    })

    describe("#find", async () => {
        beforeEach(async () => {
            collectionHandle.insertOne(VALID_USER)
        })

        it("should return the matching record", async () => {
            let foundUser

            foundUser = await userPersister.find({name: VALID_USER.name})

            foundUser.name.should.equal(VALID_USER.name)
        })
    })
})