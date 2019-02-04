const bodyParser = require('body-parser')
const express = require('express')
const db = require('./db')
const model = require('./model')
const bonjour = require('bonjour')()
const utils = require('./utils')

const PORT = process.env.PORT || 9000

db.init()
    .then(db => console.log('Initialized database connection.'))
    .catch(err => console.error('Error initializing database connection.', err))

const app = express()

app.use(bodyParser.json())

app.use(express.static('public'))

//Logs all requests.
app.use((req, res, next) => {
    console.log(`${req.ip}: ${req.method} ${req.originalUrl}`)
    next()
})

app.get('/ping', (req, res) => {
    res.send('pong')
})
app.get('/order', (req, res, next) =>
    model
        .getAllOrders()
        .then(orders => {
            if (orders) res.json({ success: true, orders })
            else res.status(404).json({ success: false, orders: null })
        })
        .catch(next)
)

app.get('/order/:orderId', (req, res, next) => {
    const orderId = req.params.orderId
    model
        .getOrderById(orderId)
        .then(order => {
            if (order) res.json({ success: true, order })
            else res.status(404).json({ success: true, order: null })
        })
        .catch(next)
})

app.post('/order', (req, res, next) => {
    //verification steps?
    model
        .addOrder(req.body)
        .then(order => res.json({ success: true, order }))
        .catch(next)
})

app.post('/jobs', (req, res, next) => {
    model
        .addJob(req.body)
        .then(job => res.json({ success: true, job }))
        .catch(next)
})
app.get('/jobs', (req, res, next) => {
    model
        .getAllJobs(req.body)
        .then(jobs => {
            if (jobs) res.json({ success: true, jobs })
            else res.status(404).json({ success: true, jobs: null })
        })
        .catch(next)
})

app.get('/items', (req, res, next) => {
    model
        .getItems()
        .then(items => {
            if (items) res.json({ success: true, items })
            else res.status(404).json({ success: true, items: null })
        })
        .catch(next)
})

app.post('/items', (req, res, next) => {
    model
        .addItem(req.body)
        .then(item => res.json({ success: true, item }))
        .catch(next)
})

app.get('/turnon', (req, res, next) => {
    model
        .turnOn()
        .then(count => res.json({ success: true, count }))
        .catch(next)
})
app.get('/turnoff', (req, res, next) => {
    model
        .turnOff()
        .then(off => res.json({ success: true, off }))
        .catch(next)
})

//Logs all responses.
app.use((req, res, next) => {
    console.log(`${req.ip}: ${req.method} ${req.originalUrl} response: ${res.body}`)
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
bonjour.publish({ name: 'assis10t', type: 'http', host: utils.getIp(), port: PORT })
