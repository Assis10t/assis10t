const bodyParser = require('body-parser')
const express = require('express')
const db = require('./db')
const model = require('./model')
const bonjour = require('bonjour')()
const utils = require('./utils')
const cors = require('cors')
const auth = require('./auth')

const PORT = process.env.PORT || 9000

const API_LEVEL = 'v2'
console.log('Using api level ' + API_LEVEL)

db.init()
    .then(db => console.log('Initialized database connection.'))
    .catch(err => console.error('Error initializing database connection.', err))

const app = express()

app.use(bodyParser.json())

app.use(express.static('../website/dist'))

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

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
            .then(orders => {
                if (orders) res.json({ success: true, orders })
                else res.status(404).json({ success: false, orders: null })
            })
            .catch(next)
    )
)

app.get(
    '/order/:orderId',
    auth.customer((req, res, next) => {
        const orderId = req.params.orderId
        model
            .getOrderById(orderId)
            .then(order => {
                if (order) res.json({ success: true, order })
                else res.status(404).json({ success: true, order: null })
            })
            .catch(next)
    })
)
// TODO: Check if ordered items exist.
// TODO: Reduce amount on items ordered.
app.post(
    '/order',
    auth.customer((req, res, next) => {
        const order = { ...req.body, userId: req.user._id }
        model
            .addOrder(order)
            .then(order => res.json({ success: true, order }))
            .catch(next)
    })
)
app.get('/warehouse', (req, res, next) => {
    model
        .getWarehouses()
        .then(warehouses => {
            if (warehouses) res.json({ success: true, warehouses })
            else res.status(404).json({ success: true, warehouses: null })
        })
        .catch(next)
})
app.get('/warehouse/:warehouseId', (req, res, next) => {
    model
        .getWarehouseById(req.params.warehouseId)
        .then(warehouse => {
            if (warehouse) res.json({ success: true, warehouse })
            else res.status(404).json({ success: true, warehouse: null })
        })
        .catch(next)
})

app.post(
    '/warehouse/:warehouseId/items',
    auth.merchant((req, res, next) => {
        model
            .getWarehouseById(warehouseId)
            .then(warehouse => {
                if (!warehouse) {
                    res.status(404).json({
                        success: false,
                        error: 'Warehouse not found.'
                    })
                    throw null
                }
                if (warehouse.merchantId !== req.user._id) {
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
    '/warehouse/:warehouseId/orders',
    auth.merchant((req, res, next) => {
        model
            .getOrdersByWarehouseId({ warehouseId: req.params.warehouseId })
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
        .then(user => res.json({ success: true, user }))
        .catch(next)
})
app.post('/login', (req, res, next) => {
    model
        .authUser(req.body.username)
        .then(user => {
            if (user) res.json({ success: true, user })
            else res.status(401).json({ success: false, error: 'Username or password is incorrect.' })
        })
        .catch(next)
})

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

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}.`)
})
//assis10t._http._tcp.
bonjour.publish({ name: 'assis10t', type: 'http', host: utils.getIp(), port: PORT })
