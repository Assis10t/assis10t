# API Schema
```bash
Schema Version: v2 # Increase this number whenever the schema changes.
```

The interactions with the server and data storage in the database are all done using JSON objects. The file that contains code for these interactions should have the version number in a comment. This will make any API level incompability easily noticable.

## Connecting to the Server

Using zeroconf, look for this service: `assis10t._http._tcp.`

## Authentication

For requests that require authentication, include an http header called `"username"` with the username.

## Data Types:

```javascript
User {
    "_id": String,
    "username": String,
    "type": "merchant" or "customer" or "robot"
}

Item {
    "_id": String,
    "warehouseId": String,
    "name": String,
    "image": Base64 encoded String (or null for default image),
    "position": {
        "x": Int, // Perpendicular to robot's initial position.
        "y": Int, // Parallel to robot's initial position.
        "z": Int // Vertical
    },
    "quantity": Double,
    "unit": String (or null if there is no unit)
}

Order {
    "_id": String,
    "userId": String,
    "warehouseId": String,
    "timestamp": String,
    "items": [Item],
    "status": "PENDING", "IN_TRANSIT", "COMPLETE", "CANCELED"
}

Warehouse {
    "_id": String,
    "merchantId": String, // The merchant that owns this warehouse.
    "image": Base64 encoded String (or null for default image),
    "location": String, // String to be used for the Google Maps API query
    "dimensions": {
        "x": Int, // Perpendicular to robot's initial position.
        "y": Int, // Parallel to robot's initial position.
        "z": [Double] // Vertical. Each element is height of a shelf, in ascending order, in meters. (Include bottom shelf as 0.0)
    },
    "items": [Item] // Only for GET /warehouse/:warehouseId
}

Robot {
    "_id": String,
    "warehouseId": String,
    "last_seen": ISO-8601 formatted date String,
    "status": "WAITING" or "ON_JOB" or "MIA" or "NOT_RESPONDING" or "MANUAL_CONTROL",
    "location": {
        "x": Int, // Perpendicular to robot's initial position.
        "y": Int, // Parallel to robot's initial position.
        "z": Int // Vertical
    }
}
```


## API Endpoints

| Method | Path | Auth | Description |
|-|-|:-:|-
| `GET` | `/ping` | | Returns `Pong`. |
| `POST` | `/register` | | Registers a new `User`. |
| `POST` | `/login` | | Logs in existing `User`. |
| `GET` | `/order` | `Customer` | Gets all `Order`s of current `User`. |
| `GET` | `/order/:orderId` | `Customer` | Gets `Order` with given id. |
| `POST` | `/order` | `Customer` | Adds given `Order`. |
| `GET` | `/warehouse` | | Gets all `Warehouse`s. |
| `GET` | `/warehouse/:warehouseId` | | Gets given `Warehouse` with its items. |
| `POST` | `/warehouse/:warehouseId/items` | `Merchant` | Adds an `Item` to a `Warehouse`. |
| `GET` | `/warehouse/:warehouseId/orders` | `Merchant` | Gets all orders in the given `Warehouse`. |
| `GET` | `/warehouse/:warehouseId/robot` | `Merchant` | Gets the state of the robot(s). |
| `PUT` | `/turnon/:n` | | Starts moving the robot. Robot stops after seeing `n` markers. |
| `PUT` | `/turnoff` | | Stops the robot. |
| `GET` | `/getmovement` | `Robot` | Gets the current task for the robot. |
| `PUT` | `/updatemovement` | `Robot` | Signals the server that robot is finished with current movement task. The server should assign a new task here. |

#### Internal Server Error (Status 500)
```javascript
===== Output =====
{
    "success": false,
    "error": String
}
```
#### Unauthorized (Status 401)
```javascript
===== Output =====
{
    "success": false,
    "error": "You are not authorized to use this resource."
}
```

#### `GET /ping`
```javascript
===== Output =====
pong
```

#### `POST /register`
```javascript
===== Input =====
{
    "username": String
}
===== Output =====
{
    "success": Boolean,
    "user": User
}
```

#### `POST /login`
```javascript
===== Input =====
{
    "username": String
}
===== Output =====
{
    "success": true,
    "user": User
}
```

#### `GET /order`
```javascript
===== Output =====
{
    "success": true,
    "orders": [Order]
}
```

#### `GET /order/:orderId`
```javascript
===== Output =====
{
    "success": true,
    "orders": Order (or null if order isnt found)
}
```

#### `POST /order`
```javascript
===== Input =====
Order // without _id field

===== Output =====
{
    "success": true
}
```

#### `GET /warehouse`
```javascript
===== Output =====
{
    "success": true,
    "warehouses": [Warehouse]
}
```

#### `GET /warehouse/:warehouseId`
```javascript
===== Output =====
{
    "success": true,
    "warehouse": Warehouse // Including list of items in the warehouse.
}
```

#### `POST /warehouse/:warehouseId/items`
```javascript
===== Input =====
Item //With _id if updating an existing item, or without _id if creating a new one.
===== Output =====
{
    "success": true
}
```

#### `GET /warehouse/:warehouseId/orders`
```javascript
===== Output =====
{
    "success": true,
    "orders": [Order]
}
```

#### `GET /warehouse/:warehouseId/robot`
```javascript
===== Output =====
{
    "success": true,
    "robots": [Robot]
}
```

#### `PUT /turnon/:n`
```javascript
===== Output =====
{
    "success": true
}
```

#### `PUT /turnoff`
```javascript
===== Output =====
{
    "success": true
}
```

#### `GET /getmovement`
```javascript
===== Output =====
{
    "success": true,
    "status": {
        "moving": Boolean,
        "markers": Int (or null if not moving)
    }
}
```

#### `PUT /updatemovement`
```javascript
===== Input =====
// TODO: Put information about the robot's current state, so the server can provide proper instructions.
===== Output =====
{
    "success": true
}
```