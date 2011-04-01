// Provides a `Backbone.sync` or `Model.sync` method for the server-side
// context. Uses CouchDB for model persistence.
var _ = require('underscore')._,
    Backbone = require('backbone');

module.exports = function(connection, dbName) {
    var db = connection.database(dbName);

    // Helper function to get a URL from a Model or Collection as a property
    // or as a function.
    var getUrl = function(object) {
        if (object.url instanceof Function) {
            return object.url();
        } else if (typeof object.url === 'string') {
            return object.url;
        }
    };

    var urlEncode = function(url) {
        return escape(url).replace(/\//g, '%2F');
    };

    // Helper to push design docs.
    var pushDesignDocs = function(docs, callback) {
        var counter = 0;
        docs.forEach(function(doc) {
            require('fs').readFile(doc.file, function(err, data) {
                var headers = {
                    'Content-Length': data.length,
                    'Content-Type': 'application/json'
                };
                connection.rawRequest('PUT', db.name + '/' + doc.id, null, data, headers)
                .on('response', function(res) {
                    counter++;
                    if (res.statusCode != 201) {
                        callback('Failed to push document');
                    }
                    else if (counter == docs.length) {
                        callback(err);
                    }
                });
            });
        });
    };

    // Set up database, populate with design documents.
    var install = function(callback) {
        db.destroy(function() {
            db.create(function(err) {
                err && callback(err);
                pushDesignDocs([{
                    id: '_design/base',
                    file: __dirname + '/base.json'
                }], callback);
            })
        });
    };

    // Backbone sync method.
    var sync = function(method, model, success, error) {
        switch (method) {
        case 'read':
            if (model.id) {
                db.get(urlEncode(getUrl(model)), function(err, doc) {
                    console.log(doc);
                    err ? error('No results') : success(doc);
                });
            } else {
                db.view('base/all', {limit: 10, include_docs: true}, function(err, res) {
                    if (err || !res.length) return error('No results');
                    data = [];
                    _.each(res, function(val, key) {
                        data.push(val.doc);
                    });
                    success(data);
                });
            }
            break;
        case 'create':
            doc = model.toJSON();
            doc._id = getUrl(model);
            db.post(doc, function(err, res) {
                if (err) return error(err.reason);
                model.attributes._rev = res.rev;
                success({});
            });
            break;
        case 'update':
            db.save(urlEncode(getUrl(model)), model.attributes._rev, model.toJSON(), function(err, res) {
                if (err) return error(err.reason);
                model.attributes._rev = res.rev;
                success({});
            });
            break;
        case 'delete':
            db.remove(urlEncode(getUrl(model)), model.attributes._rev, function(err, res) {
                err ? error(err) : success(res);
            })
            break;
        }
    };

    return {
        db: db,
        install: install,
        pushDesignDocs: pushDesignDocs,
        sync: sync
    };
};
