Backbone Couch
--------------
Overrides for [Backbone](http://documentcloud.github.com/backbone/) to use
[CouchDB](http://couchdb.apache.org/) for Model persistence. Intended for
server-side use of Backbone like in
[Bones](https://github.com/developmentseed/bones).

### Installation

    npm install backbone-couch

### Usage

    var Backbone = require('backbone');

    // Create a new backbone-couch handler for a database 'documents'.
    var couch = require('backbone-couch')({
        host: '127.0.0.1',
        port: '5984',
        name: 'documents'
    });

    // Create database, push default design documents to it and
    // assign sync method to Backbone.
    couch.install(function(err) {
        Backbone.sync = couch.sync;
    });

    // Backbone.sync will now load and save models from a 'documents' couch db.

### Conventions

`backbone-couch` stores models in using the `model.url` as its `_id`.
By default, Collections retrieve models by matching the Collection url against
the initial portion of the Model url. See `backbone.json` for the default
design document and collection view.

    var orange = new FruitModel({id: 'orange'});
    var apple = new FruitModel({id: 'apple'});
    var banana = new FruitModel({id: 'banana'});

    console.log(orange.url()); // fruits/orange
    console.log(apple.url());  // fruits/apple
    console.log(banana.url()); // fruits/banana

    var fruits = new FruitCollection();

    console.log(fruits.url);   // fruits

    fruits.fetch();            // retrieves orange, apple, banana

To override the default design doc with your own special sauce use the `doc`
option when calling `couch.install()`.

    // Pass a filepath to your design doc.
    couch.install({doc: '/path/to/my/doc.json'}, callback);

    // Or provide a literal js object directly.
    couch.install({doc: {
        _id: '_design/backbone',
        language: 'javascript'
    }, callback);

Your design doc should use `_design/backbone` as its `_id`. Collections will be
called against this design doc using their `url`. For example, if you have a
Collection `/blog/recent`, your design doc should provide a rewrite rule to
respond to this path:

    {
        "_id":"_design/backbone",
        "language":"javascript",
        "views": {
            "recent": {
                "map": "function(doc) { emit(doc._id, doc._id) }"
            }
        },
        "rewrites": [
            {
                "from": "/blog/recent",
                "to": "_view/recent",
                "query": {
                    "limit": "10"
                    "include_docs": "true"
                }
            }
        ]
    }

See the [rewrite handler docs](http://wiki.apache.org/couchdb/Rewriting_urls)
or this [blog post](http://blog.couchbase.com/whats-new-in-apache-couchdb-0-11-part-one-nice-urls)
for more info on design doc rewrites.

### Run tests

You must configure CouchDB to work with HTTPS in order to run tests.
See [this wiki page](http://wiki.apache.org/couchdb/How_to_enable_SSL)

    cd backbone-couch/
    npm test

