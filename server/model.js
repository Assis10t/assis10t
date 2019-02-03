const db = require('./db')
const assert = require('assert')
const ObjectID = require('mongodb').ObjectID
const factory = db => ({
    getAllOrders: () =>
        new Promise((res, rej) => {
            db()
                .collection('orders')
                .find({})
                .toArray((err, docs) => {
                    err ? rej(err) : res(docs)
                })
        }),
    getOrderById: orderId =>
        new Promise((res, rej) => {
            db()
                .collection('orders')
                .find({ _id: new ObjectID(orderId) })
                .toArray((err, docs) => {
                    err ? rej(err) : res(docs[0])
                })
        }),

    addOrder: orderData =>
        new Promise((res, rej) => {
            db()
                .collection('orders')
                .insertOne(orderData, (err, order) => {
                    err ? rej(err) : res(orderData)
                })
        }),
    addJob: jobData => 
        new Promise((res, rej) => {
            db()
                .collection('jobs')
                .insertOne(jobData, (err,job) => {
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
        })
})

module.exports = factory(db)

module.exports.factory = factory
