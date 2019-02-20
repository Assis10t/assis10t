const db = require('./db')
const assert = require('assert')
const ObjectID = require('mongodb').ObjectID
const factory = db => ({
    getOrders: userId =>
        new Promise((res, rej) => {
            db()
                .collection('orders')
                .find({ userId })
                .toArray((err, docs) => {
                    err ? rej(err) : res(docs)
                })
        }),
    getOrderById: (orderId, userId) =>
        new Promise((res, rej) => {
            db()
                .collection('orders')
                .find({ _id: orderId, userId })
                .toArray((err, docs) => {
                    err ? rej(err) : res(docs[0])
                })
        }),
    addOrder: orderData =>
        // TODO: Check stock before finishing the order.
        new Promise((res, rej) => {
            db()
                .collection('orders')
                .insertOne(orderData, (err, order) => {
                    if (err) {
                        rej(err)
                        return
                    }
                    Promise.all(orderData.items.map(i => factory(db).removeItem(i)))
                        .then(() => factory(db).turnOn(1))
                        .then(() => res(orderData))
                        .catch(err => rej(err))
                })
        }),
    addJob: jobData =>
        new Promise((res, rej) => {
            db()
                .collection('jobs')
                .insertOne(jobData, (err, job) => {
                    err ? rej(err) : res(jobData)
                })
        }),
    getAllJobs: () =>
        new Promise((res, rej) => {
            db()
                .collection('jobs')
                .find({})
                .toArray((err, docs) => {
                    err ? rej(err) : res(docs)
                })
        }),
    turnOn: markers =>
        new Promise((res, rej) => {
            db()
                .collection('bob_movement')
                .updateOne(
                    { _id: 'movement' },
                    { $set: { moving: true, markers: parseInt(markers) } },
                    (err, count_modified) => {
                        err ? rej(err) : res('on')
                    }
                )
        }),
    turnOff: () =>
        new Promise((res, rej) => {
            db()
                .collection('bob_movement')
                .updateOne({ _id: 'movement' }, { $set: { moving: false } }, (err, count_modified) => {
                    err ? rej(err) : res('off')
                })
        }),
    getMovement: () =>
        new Promise((res, rej) => {
            db()
                .collection('bob_movement')
                .find({})
                .toArray((err, docs) => {
                    err ? rej(err) : res(docs[0])
                })
        }),

    addItem: item =>
        new Promise((res, rej) => {
            db()
                .collection('inventory')
                .insertOne({ _id: new ObjectID(), ...item }, (err, item) => {
                    err ? rej(err) : res(item)
                })
        }),
    removeItem: item =>
        new Promise((res, rej) => {
            db()
                .collection('inventory')
                .deleteOne({ _id: item._id }, (err, item) => {
                    err ? rej(err) : res(item)
                })
        }),
    getItems: () =>
        new Promise((res, rej) => {
            db()
                .collection('inventory')
                .find({})
                .toArray((err, items) => {
                    err ? rej(err) : res(items)
                })
        }),
    createUser: (username, type) =>
        new Promise((res, rej) => {
            const user = { _id: new ObjectID(), username, type }
            db()
                .collection('users')
                .insertOne(user, (err, result) => {
                    err ? rej(err) : res(user)
                })
        }),
    authUser: username =>
        new Promise((res, rej) => {
            db()
                .collection('users')
                .find({ username })
                .toArray((err, users) => {
                    console.log(users)
                    if (err) {
                        rej(err)
                        return
                    }
                    res(users[0] || null)
                })
        })
})

module.exports = factory(db)

module.exports.factory = factory
