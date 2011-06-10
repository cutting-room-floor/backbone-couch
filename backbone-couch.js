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
    // There is a delay of 100ms between deleting / creating. This was
    // added to avoid sporadic 412 'DB exists' fails when re-creating existing
    // DBs.
    // TODO: 1) find out why delay is necessary. 2) make install() only install
    // and have API users explicitly destroy a DB before installing it.
    var install = function(options, callback) {
        if (_(options).isFunction()) {
            callback = options;
            options = {};
        }
        options = _(options || {}).defaults({
            doc: __dirname + '/base.json'
        });
        db.dbDel(function(err) {
            if (err && err.reason != 'missing') return callback(err);
            setTimeout(function() {
                db.dbPut(function(err) {
                    if (err) return callback(err);
                    db.putDesignDocs([options.doc], callback);
                });
            }, 100);
        });
    };

    // Prepare model for saving / deleting.
    var toJSON = function(model) {
        var doc = model.toJSON();
        doc._id = getUrl(model);
        return doc;
    }

    // Backbone sync method.
    var sync = function(method, model, success, error) {
        switch (method) {
        case 'read':
            if (model.id) {
                db.get(getUrl(model), function(err, doc) {
                    err ? error(new Error('No results')) : success(doc);
                });
            } else {
                var url = '_design/backbone/_rewrite' + getUrl(model);
                db.view(url, {}, function(err, res) {
                    if (err) return error(err);
                    data = [];
                    _.each(res.rows, function(val) {
                        data.push(val.doc);
                    });
                    success(data);
                });
            }
            break;
        case 'create':
            db.put(toJSON(model), function(err, res) {
                if (err) return error(err);
                success({'_rev': res.rev});
            });
            break;
        case 'update':
            // Ensure that partial updates work by retrieving the model
            // and merging its attributes.
            db.get(getUrl(model), function(err, doc) {
                if (err) doc = {};
                db.put(_(doc).extend(toJSON(model)), function(err, res) {
                    if (err) return error(err);
                    success({'_rev': res.rev});
                });
            });
            break;
        case 'delete':
            // TODO: backbone.js does not have provisions for passing on the
            // body of a DELETE request. Passing the revision through the 
            // DELETE request's URL would require additional set up work in
            // models. We take a short cut and retrieve the document's revision
            // with a HEAD request to CouchDB.
            db.head(getUrl(model), function(err, doc) {
                if (err) return error(err);
                model.set({'_rev': doc._rev}, {silent: true});
                db.del(toJSON(model), function(err, res) {
                    err ? error(err) : success(res);
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
