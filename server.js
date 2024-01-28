const express = require("express");
const app = express();
const path = require('path');
const cors = require('cors');

// connection to mongodb
let propertiesReader = require("properties-reader");
let propertiesPath = path.resolve(__dirname, "conf/db.properties");
let properties = propertiesReader(propertiesPath);
let dbPprefix = properties.get("db.prefix");

//URL-Encoding of User and PWD
//for potential special characters
let dbUsername = encodeURIComponent(properties.get("db.user"));
let dbPwd = encodeURIComponent(properties.get("db.pwd"));
let dbName = properties.get("db.dbName");
let dbUrl = properties.get("db.dbUrl");
let dbParams = properties.get("db.params");
const uri = dbPprefix + dbUsername + ":" + dbPwd + dbUrl + dbParams;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
let db = client.db(dbName);


app.use(express.json());
app.use(cors());

// Static File Middleware
const imagesPath = path.resolve(__dirname, 'images');
app.use('/images', express.static(imagesPath));
// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, "public")));

// Serve the "app.html" file when the user visits the root path
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

app.param('collectionName', function (req, res, next, collectionName) {
    req.collection = db.collection(collectionName);
    return next();
  });

  app.get('/collections/:collectionName', function(req, res, next) {
   req.collection.find({}).toArray(function(err, results) {
   if (err) {
   return next(err);
   }
   res.send(results);
   });
  });



// POST route for saving a new order to the "order" collection
app.post('/orders', (req, res) => {
  const newOrder = req.body.orderDetails;

  // Assuming you have a collection named "orders"
  client.db(dbName).collection('orders').insertOne({ orderDetails: newOrder }, (err, result) => {
    if (err) {
        console.error('Error saving order:', err);
        res.status(500).json({ error: 'Error saving order' });
    } else {
        console.log('Order saved successfully', newOrder);
        res.json({ success: true });
    }
});
});

// PUT request to update lesson spaces
app.put('/products/:id', (req, res) => {
  const lessonId = req.params.id;
  const cartQuantity = req.body.quantity;

  // Update the lesson quantity in the 'products' collection
  db.collection('products').updateOne(
    {_id: new ObjectId(lessonId) },
    { $inc: { invQuantity: -cartQuantity } },
    (err, result) => {
      if (err) {
        console.error('Error updating lesson quantity:', err);
        res.status(500).json({ error: 'Error updating lesson quantity' });
      } else {
        if (result.modifiedCount === 1) {
          console.log(`Lesson quantity updated successfully for lesson ${lessonId}`);
          res.json({ success: true });
        } else {
          console.error(`Lesson with ID ${lessonId} not found or not updated.`);
          res.status(404).json({ error: 'Lesson not found or not updated' });
        }
      }
    }
  );
});

app.get('/search/:query', (req, res) => {
  const searchTerm = req.params.query;

  // Assuming you have a collection named "products"
  db.collection('products').find({
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } }, // Case-insensitive partial match for name
      { location: { $regex: searchTerm, $options: 'i' } }, // Case-insensitive partial match for location
    ],
  }).toArray((err, results) => {
    if (err) {
      console.error('Error searching lessons:', err);
      res.status(500).json({ error: 'Error searching lessons' });
    } else {
      res.json(results);
    }
  });
});

// Starts the server on port 3000
app.listen(3001);