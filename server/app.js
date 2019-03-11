const bodyParser = require('body-parser')
const express = require('express')
const model = require('./model')
const cors = require('cors')
const qr = require('qr-image')

const auth = require('./auth')

const API_LEVEL = 'v2'

const app = express()

app.use(bodyParser.json({ limit: '50mb' }))

app.use(express.static('../website/dist'))

app.use(
    cors({
        origin: 'http://localhost:3000',
        credentials: true
    })
)

//Logs all requests.
app.use((req, res, next) => {
    console.log(`${req.ip}: ${req.method} ${req.originalUrl}`)
    next()
})

app.get('/ping', (req, res) => {
    res.send('pong')
})
app.get(
    '/order',
    auth.customer((req, res, next) =>
        model
            .getOrders(req.user._id)
            .then(orders => res.json({ success: true, orders }))
            .catch(next)
    )
)

app.get(
    '/order/:orderId',
    auth.customer((req, res, next) =>
        model
            .getOrderById(req.params.orderId)
            .then(order => {
                if (order && req.user._id.equals(order.userId)) res.json({ success: true, order })
                else if (order)
                    res.status(403).json({ success: false, error: 'You cannot view details on this order.' })
                else res.status(404).json({ success: true, order: null })
            })
            .catch(next)
    )
)
// TODO: Check if ordered items exist.
app.post(
    '/order',
    auth.customer((req, res, next) => {
        const order = {
            ...req.body,
            userId: req.user._id,
            timestamp: new Date().toISOString()
        }
        model
            .addOrder(order)
            .then(order => res.json({ success: true, order }))
            .catch(next)
    })
)
app.get('/warehouse', (req, res, next) => {
    model
        .getWarehouses()
        .then(warehouses => res.json({ success: true, warehouses }))
        .catch(next)
})
app.post(
    '/warehouse',
    auth.merchant((req, res, next) => {
        model
            .addWarehouse({ ...req.body, merchantId: req.user._id })
            .then(warehouse => res.json({ success: true, warehouse }))
            .catch(next)
    })
)
app.get('/warehouse/:warehouseId', (req, res, next) => {
    model
        .getWarehouseById(req.params.warehouseId)
        .then(warehouse => res.status(warehouse ? 200 : 404).json({ success: true, warehouse }))
        .catch(next)
})

app.post(
    '/warehouse/:warehouseId/items',
    auth.merchant((req, res, next) => {
        model
            .getWarehouseById(req.params.warehouseId)
            .then(warehouse => {
                if (!warehouse) {
                    res.status(404).json({
                        success: false,
                        error: 'Warehouse not found.'
                    })
                    throw null
                }
                if (!req.user._id.equals(warehouse.merchantId)) {
                    res.status(403).json({
                        success: false,
                        error: 'You cannot modify items in a warehouse you dont own.'
                    })
                    throw null
                }
                return model.addItem({ ...req.body, warehouseId: req.params.warehouseId })
            })
            .then(item => res.json({ success: true, item }))
            .catch(err => err && next(err))
    })
)
app.get(
    '/warehouse/:warehouseId/items/:itemId',
    auth.merchant((req, res, next) => {
        model
            .getItemById(req.params.itemId)
            .then(item => {
                if (!item) {
                    res.status(404).json({ success: false, error: 'Item not found.' })
                    throw null
                }
                return model.getWarehouseById(item.warehouseId).then(warehouse => {
                    if (!req.user._id.equals(warehouse.merchantId)) {
                        res.status(403).json({ success: false, error: 'You are not allowed to access this resource.' })
                        throw null
                    }
                    return item
                })
            })
            .then(item => res.json({ success: true, item }))
            .catch(err => err && next(err))
    })
)
app.delete(
    '/warehouse/:warehouseId/items/:itemId',
    auth.merchant((req, res, next) => {
        model
            .getItemById(req.params.itemId)
            .then(item => {
                if (!item) {
                    res.status(404).json({ success: false, error: 'Item not found.' })
                    throw null
                }
                return model.getWarehouseById(item.warehouseId)
            })
            .then(warehouse => {
                if (!req.user._id.equals(warehouse.merchantId)) {
                    res.status(403).json({ success: false, error: 'You are not allowed to access this resource.' })
                    throw null
                }
                return req.params.itemId
            })
            .then(itemId => model.deleteItemById(itemId))
            .then(() => res.json({ success: true }))
            .catch(err => err && next(err))
    })
)
app.get(
    '/warehouse/:warehouseId/orders',
    auth.merchant((req, res, next) => {
        model
            .getOrdersByWarehouseId(req.params.warehouseId)
            .then(orders => res.json({ success: true, orders }))
            .catch(next)
    })
)
app.put('/turnon/:nOfMarkers', (req, res, next) => {
    const markers = req.params.nOfMarkers
    model
        .turnOn(markers)
        .then(on => res.json({ success: true, on }))
        .catch(next)
})
app.put('/turnoff', (req, res, next) => {
    model
        .turnOff()
        .then(off => res.json({ success: true, off }))
        .catch(next)
})
app.get('/getmovement', (req, res, next) => {
    model
        .getMovement()
        .then(status => res.json({ success: true, status }))
        .catch(next)
})
app.post('/register', (req, res, next) => {
    model
        .createUser(req.body.username, req.body.type)
        .then(user => {
            if (req.body.type == 'robot') {
                model
                    .addRobot(user.username, 0, 0)
                    .then(res.json({ success: true, user }))
                    .catch(next)
            } else {
                res.json({ success: true, user })
            }
        })
        .catch(next)
})
app.post('/login', (req, res, next) => {
    model.authUser(req.body.username).then(user => {
        if (user) res.json({ success: true, user })
        else res.status(401).json({ success: false, error: 'Username or password is incorrect.' })
    })
})
app.get(
    '/robot',
    auth.robot((req, res, next) => {
        var currentUser = req.user
        model
            .getRobot(currentUser.username)
            .then(robot => res.json({ success: true, robot }))
            .catch(next)
    })
)

app.get(
    '/robot/:robotId',
    auth.merchant((req, res, next) => {
        model
            .getRobot(req.params.robotId)
            .then(robot => res.json({ success: true, robot }))
            .catch(next)
    })
)
app.post(
    '/robot/:robotid/sethome',
    auth.merchant((req, res, next) => {
        model
            .setHome(req.params.robotid, req.body.home_x, req.body.home_y)
            .then(robot => res.json({ success: true, robot }))
            .catch(next)
    })
)

app.get(
    '/robotjob',
    auth.robot((req, res, next) => {
        model
            .getNextJob(req.user.username)
            .then(job => res.json({ success: true, job }))
            .catch(next)
    })
)

// For imaging the database and updating fake_db.json
app.get('/db', (req, res, next) => {
    model
        .getWholeDB()
        .then(data => res.json(data))
        .catch(next)
})

//When the user places their order, sends them a qrcode as a png.
app.get("/qrcode", function(req, res){
  model.useLocker(req.params.warehouseId)
  .then(locker => res.status(locker ? 200 : 404).json({ success: true, locker }))
  .catch(next);

  if(locker == null){
    console.log("No free lockers!");
    res.send("No free lockers!");
    return;
  }

  var img = qr.imageSync(locker.toString());

  res.contentType("image/png");
  res.send(img);

  console.log(locker);
});

//When a locker is now free for use.
app.post("/addLocker", function(req, res){
  model.addLocker(req.params.warehouseId, req.params.locker)
  .then(res.json({ success: true, locker }))
  .catch(next)
});

app.listen(3000, function(){
  console.log("Server is listening on port 3000!");
});

//Logs all responses.
app.use((req, res, next) => {
    console.log(`${req.ip}: ${req.method} ${req.originalUrl} response: ${res.body || ''}`)
    next()
})

//Logs errors and responds properly.
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({ success: false, error: err.stack })
    next()
})

module.exports = app
module.exports.API_LEVEL = API_LEVEL
