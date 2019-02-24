const db = require('./db')
const assert = require('assert')
const ObjectID = require('mongodb').ObjectID
const robotPathfinding = require('./robot-pathfinding')
const factory = db => ({
    getOrders: userId =>
        db()
            .collection('orders')
            .find({ userId })
            .toArray(),
    getOrderById: orderId =>
        db()
            .collection('orders')
            .findOne({ _id: ObjectID(orderId) }),
    addOrder: orderData =>
        // TODO: Check stock before finishing the order.
        db()
            .collection('orders')
            .insertOne(orderData)
            .then(() => Promise.all(orderData.items.map(i => factory(db).removeItem(i))))
            .then(() => factory(db).turnOn(1))
            .then(() => orderData),
    turnOn: markers =>
        db()
            .collection('bob_movement')
            .updateOne({ _id: 'movement' }, { $set: { moving: true, markers: parseInt(markers) } })
            .then(() => 'on'),
    turnOff: () =>
        db()
            .collection('bob_movement')
            .updateOne({ _id: 'movement' }, { $set: { moving: false } })
            .then(() => 'off'),
    getMovement: () =>
        db()
            .collection('bob_movement')
            .findOne(),
    getWarehouses: () =>
        db()
            .collection('warehouses')
            .find()
            .toArray(),
    getWarehouseById: async warehouseId => {
        const warehouse = await db()
            .collection('warehouses')
            .findOne({ _id: warehouseId })
        if (!warehouse) return null

        const items = await factory(db).getItemsByWarehouseId(warehouseId)
        return {
            ...warehouse,
            items
        }
    },
    getItemsByWarehouseId: warehouseId =>
        db()
            .collection('inventory')
            .find({ warehouseId })
            .toArray(),
    getOrdersByWarehouseId: warehouseId =>
        db()
            .collection('orders')
            .find({ warehouseId })
            .toArray(),
    addItem: item => {
        if (!item._id) {
            item = { _id: new ObjectID(), ...item }
            return db()
                .collection('inventory')
                .insertOne(item)
                .then(() => item)
        } else {
            return db()
                .collection('inventory')
                .updateOne({ _id: item._id }, { $set: item })
                .then(modifiedCount => (modifiedCount ? item : null))
        }
    },
    removeItem: item =>
        db()
            .collection('inventory')
            .deleteOne({ _id: item._id }),
    createUser: (username, type) => {
        const user = { _id: new ObjectID(), username, type }
        return db()
            .collection('users')
            .insertOne(user)
            .then(() => user)
        
    
    },
    authUser: username =>
        db()
            .collection('users')
            .findOne({ username }),
    setHome: (robot_id,home_x,home_y) => 
    new Promise((res, rej) => {
        db()
            .collection('robot')
            .updateOne({_id : robot_id}, {$set: {"home_x": home_x, "home_y":home_y}}, (err, warehouse) => {
                err ? rej(err) : res(warehouse);
            });
    }),
    getRobot: (robot_id) => {
        return new Promise((res, rej) => {
            db()
                .collection('robot')
                .find({_id:robot_id})
                .toArray((err,robot) => {
                    console.log(robot)
                    console.log(err)
                    if (err) {
                        rej(err)
                    } else {
                        res(robot)
                    }
                })
        })
    },
    addRobot: (robot_id, home_x, home_y) =>
        new Promise((res,rej) => {
            db()
                .collection('robot')
                .insertOne(
                            {   
                                _id: robot_id, 
                                status: 'WAITING',
                                home_x:home_x,
                                home_y:home_y,
                                location: {
                                    x:0,
                                    y:0,
                                    z:0
                                }
                            }, (err,robot) => {
                    err ? rej(err) : res(robot)
                });
        }),
    getNextJob: (robot_id) =>
        new Promise((res,rej) => {
           
            db().collection('robot')
            .findOne({"_id":robot_id})
            .then((robot,err) => {
               
                if (err) {
                    rej(err)
                } else {
                    db()
                        .collection('warehouse')
                        .find({})
                        .toArray((err,warehouse) => {
                            db()
                                .collection('orders')
                                .find({"status":"PENDING"})
                                .toArray((err, orders) => {
                                    if (err) {
                                        rej(err)
                                    } else {
                                        //console.log(orders.length)
                                        if (orders.length == 0) {
                                            res([])
                                        } else {
                                            const robot_job = robotPathfinding.get_robot_path(orders[0],robot,warehouse[0])
                                        
                                            db()
                                                .collection('orders')
                                                .updateOne({"_id":orders[0]._id},{$set:{"status":"IN_TRANSIT"}}, (err) => {
                                                    if (err) {
                                                        rej(err)
                                                    } else {
                                                        db()
                                                            .collection('robot')
                                                            .updateOne({"_id":robot_id}, {'$set':{'status':'ON_JOB'}})
                                                            .then(() => res(robot_job))
                                                       
                                                    }
                                                })
                                        }       
                                    }
                                })          
                        })
                }
            })
        })
})

module.exports = factory(db)

module.exports.factory = factory
