require('dotenv').config()

const EXPRESS = require('express'),
    APP_SERVER = EXPRESS(),
    HTTP_SERVER = require('http').createServer(APP_SERVER),
    SYNC_ADAPTER = require('./lib/syncAdapterSocketIO'),
    SYNC_PERSISTER = require('./lib/syncPersisterMongoDB'),
    CLIENT_SYNC_CONTROLLER = require('./client_sync_controller'),
    BODY_PARSER = require('body-parser'),
    PORT = process.env.SERVER_PORT || 6313,
    APP = require('./app.js'),
    CALL_QUEUE = require('./call_queue'),
    MONGO_CALL_STRATEGY = require('./call_queue_mongo_strategy'),
    RECENTS_COLLECTION = require('./mongo_recents_collection'),
    DB_URI = process.env.DB_URI,
    DB_NAME = process.env.DB_NAME,
    LIVE_CALL_COLLECTION_NAME = process.env.LIVE_CALL_COLLECTION_NAME,
    CALL_QUEUE_COLLECTION_NAME = process.env.CALL_QUEUE_COLLECTION_NAME,
    HOLD_QUEUE_COLLECTION_NAME = process.env.HOLD_QUEUE_COLLECTION_NAME,
    RECENTS_COLLECTION_NAME = process.env.RECENTS_COLLECTION_NAME,
    CALL_LOG_COLLECTION_NAME = process.env.CALL_LOG_COLLECTION_NAME,
    AGENT_COLLECTION_NAME = process.env.AGENT_COLLECTION_NAME,
    PLIVO = require('plivo'),
    SMS = require('./sms.js'),
    passport = require('passport'),
    SESSION = require('express-session'),
    COOKIE_PARSER = require('cookie-parser'),
    FileStore = require('session-file-store')(SESSION),
    PlivoPhonePlatformInterface = require('./plivo_phone_platform_interface'),
    MongoUserPersister = require('./mongo_user_persister'),
    passportInit = require('./passport_init'),
    AUTH = require('./middleware/authentication'),
    CORS = require('./middleware/cors'),
    CALL_POOL = require('./live_call_pool'),
    MONGO_CALL_POOL_STRATEGY = require('./mongo_live_call_pool')

let liveCallPool = new CALL_POOL({
        strategy: new MONGO_CALL_POOL_STRATEGY({
            mongo_uri: DB_URI,
            db_name: DB_NAME,
            call_collection_name: LIVE_CALL_COLLECTION_NAME
        })
    }),
    callQueue = new CALL_QUEUE({
        strategy: new MONGO_CALL_STRATEGY({
            mongo_uri: DB_URI,
            db_name: DB_NAME,
            call_collection_name: CALL_QUEUE_COLLECTION_NAME
        })
    }),
    holdQueue = new CALL_QUEUE({
        strategy: new MONGO_CALL_STRATEGY({
            mongo_uri: DB_URI,
            db_name: DB_NAME,
            call_collection_name: HOLD_QUEUE_COLLECTION_NAME
        })
    }),
    recentCollection = new RECENTS_COLLECTION({
        mongo_uri: DB_URI,
        db_name: DB_NAME,
        recent_collection_name: RECENTS_COLLECTION_NAME
    }),
    callLog = new RECENTS_COLLECTION({
        mongo_uri: DB_URI,
        db_name: DB_NAME,
        recent_collection_name: CALL_LOG_COLLECTION_NAME
    }),
    app,
    plivoClient = new PLIVO.Client(),
    syncAdapter = new SYNC_ADAPTER({http: HTTP_SERVER}),
    syncPersister = new SYNC_PERSISTER({mongo_uri: DB_URI, db_name: DB_NAME, sync_collection_name: 'syncState'}),
    syncController = new CLIENT_SYNC_CONTROLLER({syncPersister: syncPersister, syncAdapter: syncAdapter})

callLog.log = function(call) {this.post(call)}

APP_SERVER.set('trust proxy', 1) // trust first proxy
APP_SERVER.use(EXPRESS.static('./public'))
APP_SERVER.use(COOKIE_PARSER(process.env.SERVER_SECRET))
APP_SERVER.use(SESSION({
    store: new FileStore({}),
    secret: process.env.SERVER_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {secure: false}
}))
APP_SERVER.use(BODY_PARSER.json())
APP_SERVER.use(BODY_PARSER.urlencoded({extended: false}))
passportInit({app: APP_SERVER, passport: passport})
APP_SERVER.use(CORS)

console.log("Server says: ", JSON.stringify({mongo_uri: DB_URI, db_name: DB_NAME}))
app = new APP({
    liveCallPool: liveCallPool,
    syncControllers: [syncController],
    callQueue: callQueue,
    holdQueue: holdQueue,
    callEventLog: callLog,
    usersPersister: new MongoUserPersister({mongo_uri: DB_URI, db_name: DB_NAME}),
    recentCollection: recentCollection,
    phonePlatformInterface: new PlivoPhonePlatformInterface()
})


APP_SERVER.use('/auth', require('./routes/authentication')({syncController: syncController}))
APP_SERVER.use('/call', require('./routes/call')({app: app, dbName: DB_NAME, dbUri: DB_URI}))
APP_SERVER.use('/voicemail', require('./routes/voicemail')({}))
APP_SERVER.use('/activity', require('./routes/activity')({app: app}))
APP_SERVER.use('/sms', require('./routes/sms')({sms: SMS, phoneClient: plivoClient}))
APP_SERVER.use('/session', require('./routes/session')({}))
APP_SERVER.use('/user', require('./routes/user')({mongo_uri: DB_URI, userDbName: DB_NAME}))
APP_SERVER.use('/agent', require('./routes/agent')({mongo_uri: DB_URI, db_name: DB_NAME, agent_collection_name: AGENT_COLLECTION_NAME}))

// Redirect routes from previous versions
APP_SERVER.get('/recents', (req, res) => {
    res.redirect('/activity/recents')
})
APP_SERVER.post('/recent', (req, res) => {
    res.redirect('/activity/recent')
})
APP_SERVER.get('/login', (req, res) => {
    res.redirect('/session')
})

APP_SERVER.get('/', AUTH.isLoggedIn, async (req, res, next) => {
    res.redirect('/lib/client/app.html')
})


HTTP_SERVER.listen(PORT, () => console.log(`Server available at:\n http://127.0.0.1:${PORT}`))

module.exports.APP_SERVER = APP_SERVER