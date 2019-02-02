const MongoClient = require('mongodb').MongoClient

const mongo_url = process.env.MONGO || 'mongodb://localhost:27017/db'

let client = null
let db = null

module.exports = () => {
    if (!client || !db) {
        throw new Error('Database connection has not been initialized.')
    }
    return db
}

module.exports.init = () => {
    client = new MongoClient(mongo_url, {
        useNewUrlParser: true
    })
    return new Promise((res, rej) => {
        client.connect(function(err) {
            if (err) {
                rej(err)
                return
            }
            db = client.db('bob')
            res(db)
            //console.log(`Initialized database connection on ${mongo_url}.`)
        })
    })
}
