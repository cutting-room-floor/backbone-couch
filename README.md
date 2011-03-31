Backbone Couch
--------------
Server-side overrides for Backbone to use couchdb for Model persistence.

### Compatibility

    documentcloud backbone 0.3.3
    developmentseed cradle v0.2.0

### Usage

    var Backbone = require('backbone');
        connection = new cradle.Connection();

    // Create a new backbone-couch handler for a database 'documents'.
    var couch = require('backbone-couch')(connection, 'documents');

    // Create database, push default design documents to it and
    // assign sync method to Backbone.
    couch.install(function(err) {
        Backbone.sync = couch('documents').sync;
    });

    // Backbone.sync will now load and save models from a 'documents' couch db.
