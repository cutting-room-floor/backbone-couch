Backbone Couch
--------------
Server-side overrides for Backbone to use couchdb for Model persistence.

### Compatibility

    documentcloud backbone 0.3.3
    developmentseed cradle v0.2.0

### Usage

    var Backbone = require('backbone');

    // Create a new backbone-couch handler for a database 'documents'.
    var couch = require('backbone-couch')({
        host: 'http://127.0.0.1/',
        port: '5984',
        name: 'documents'
    });

    // Create database, push default design documents to it and
    // assign sync method to Backbone.
    couch.install(function(err) {
        Backbone.sync = couch.sync;
    });

    // Backbone.sync will now load and save models from a 'documents' couch db.
