# Comms Server
Comms Server is a basic router for comms requests. At time of writing, a non-authenticating express server (server.js) routes requests to the application (app.js). The application translates the requests into persister (call_queue_mongo_strategy.js) actions.

Return values, such as call records, are meant to be used by the client to take actions on a third-party platform, such as Plivo.