'use strict';

var express = require('express');
var mongoose = require('mongoose');
const bodyParser = require('body-parser');
const urlExists = require('url-exists');
require('dotenv').config();


var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/
// mongoose.connect(process.env.DB_URI);
mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toString()}:=> ${req.originalUrl}`);
  next();
})

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});


// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({ greeting: 'hello API' });
});

// setup Model
const shortUrlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
})
const ShortUrlModel = mongoose.model('ShortUrl', shortUrlSchema);


//
app.post('/api/shorturl/new', (req, res) => {
  const url = req.body.url;
  if (typeof url === 'undefined') {
    res.json({ error: 'invalid URL' });
    return;
  }

  urlExists(url, (err, exists) => {
    if (err) {
      console.log('urlExists err', err);
      res.json({ error: 'internal error' });
    } else {
      if (exists) {

        // check if url already in DB
        ShortUrlModel.findOne({ original_url: url }, (err, doc) => {
          if (err) {
            console.log('ShortUrlModel.findOne err:', err);
            res.status(500).json({ error: 'internal error' });
            return;
          }

          if (doc) {
            // url already exists
            res.json({ original_url: doc.original_url, short_url: doc.short_url });
          } else {
            // create new
            // count total
            ShortUrlModel.countDocuments({}, (err, count) => {
              if (err) {
                // error counting documents
                console.log('ShortUrlModel.count err', err);
                res.status(500).json({ error: 'internal error' });
                return;
              }

              // create new record and save
              new ShortUrlModel({ original_url: url, short_url: count + 1 }).save()
                .then(doc => {
                  if (!doc || doc.length === 0) {
                    return res.status(500).json({ error: 'internal error' });
                  }
                  res.json({ original_url: doc.original_url, short_url: doc.short_url });
                })
                .catch(err => {
                  res.status(500).json(err);
                });
            });
          }
        });

      } else {
        res.json({ error: 'invalid URL' });
      }
    }
  });
});

app.get('/api/shorturl/:short_url', (req, res) => {
  ShortUrlModel.findOne({ short_url: req.params.short_url }, (err, doc) => {
    if (err) {
      console.log('ShortUrlModel.findOne err:', err);
      res.status(500).json({ error: 'internal error' });
      return;
    }

    if (doc) {
      // url  exists
      res.redirect(doc.original_url);
    } else {
      res.json({ error: 'No short URL found for the given input' })
    }
  })
})

app.listen(port, function () {
  console.log('Node.js listening at port', port);
});