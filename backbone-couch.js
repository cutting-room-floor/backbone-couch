// Provides a `Backbone.sync` or `Model.sync` method for the server-side
// context. Uses CouchDB for model persistence.
var _ = require('underscore'),
    Backbone = require('backbone'),
    Couch = require('./couch');

module.exports = function(config) {
    var db = new Couch(config);

    // Helper function to get a URL from a Model or Collection as a property
    // or as a function.
    var getUrl = function(object) {
        if (object.url instanceof Function) {
            return object.url();
        } else if (typeof object.url === 'string') {
            return object.url;
        }
    };

    // Set up database, populate with design documents.
    var install = function(options, callback) {
        if (_(options).isFunction()) {
            callback = options;
            options = {};
        }
        options = _(options || {}).defaults({
            doc: __dirname + '/backbone.json'
        });
        db.dbPut(function(err) {
            if (err) return callback(err);
            db.putDesignDocs([options.doc], callback);
        });
    };

    // Prepare model for saving / deleting.
    var toJSON = function(model) {
        var doc = model.toJSON();
        doc._id = getUrl(model);
        return doc;
    }

    // Backbone sync method.
    var sync = function(method, model, options) {
        var success = options.success || function() {};
        var error = options.error || function() {};
        switch (method) {
        case 'read':
            if (model.id) {
                db.get(getUrl(model), function(err, doc) {
                    err ? error(err) : success(doc);
                });
            } else {
                var url = '_design/backbone/_rewrite' + getUrl(model);
                db.view(url, {}, function(err, res) {
                    if (err) return error(err);
                    var data = [];
                    _.each(res.rows, function(val) {
                        data.push(val.doc);
                    });
                    success(data);
                });
            }
            break;
        case 'create':
        case 'update':
            if (model.get('_rev')) {
                // This is an update.
                // Ensure that partial updates work by retrieving the model
                // and merging its attributes.
                db.get(getUrl(model), function(err, doc) {
                    if (err) {
                        error(err);
                    } else if (doc._rev !== model.get('_rev')) {
                        // Create a fake object; we already know that sending
                        // the request would fail.
                        var err = new Error('Document update conflict.');
                        err.reason = 'Document update conflict.';
                        err.statusCode = 409;
                        error(err);
                    } else {
                        db.put(_(doc).extend(toJSON(model)), function(err, res) {
                            if (err) return error(err);
                            success({'_rev': res.rev});
                        });
                    }
                });
            } else {
                // This is a create.
                db.put(toJSON(model), function(err, res) {
                    if (err) return error(err);
                    success({'_rev': res.rev});
                });
            }
            break;
        case 'delete':
            // TODO: backbone.js does not have provisions for passing on the
            // body of a DELETE request. Passing the revision through the 
            // DELETE request's URL would require additional set up work in
            // models. We take a short cut and retrieve the document's revision
            // with a HEAD request to CouchDB.
            db.head(getUrl(model), function(err, doc) {
                if (err) return error(err);
                var attr = toJSON(model);
                attr._rev = doc._rev;
                db.del(attr, function(err, res) {
                    err ? error(err) : success({});
                })
            });
            break;
        }
    };

    return {
        db: db,
        install: install,
        sync: sync
    };
};
