Backbone Stash
--------------
Server-side overrides for Backbone to use couchdb for Model persistence.

### Compatibility

    documentcloud backbone 0.3.3
    developmentseed stash 0.0.1

### Usage

Pass a database name to the stash directory (will be created if it doesn't exist
yet) when calling `require()`.

    var Backbone = require('backbone');
    Backbone.sync = require('backbone-couch')('documents').sync;

    // Backbone.sync will now load and save models from a 'documents' couch db.

