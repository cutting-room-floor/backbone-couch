var _ = require('underscore'),
    fs = require('fs'),
    request = require('request');

var Couch = module.exports = function(config) {
    var host = config.host || '127.0.0.1';
    var port = config.port || (config.secure ? '6984' : '5984');
    if (!config.name) throw 'Database name is required';
    var credentials = config.auth ? config.auth.username + ":" + config.auth.password + "@" : '';
    this.uri = (config.secure ? 'https://' : 'http://') +
        credentials +
        host + ':' +
        port + '/' +
        config.name;
    this.name = config.name;
};

module.exports.request = request;

// General response parser
// -----------------------
Couch.prototype.parse = function(callback) {
    var that = this;
    return function(err, res, body) {
        body = (typeof body === 'string' ? JSON.parse(body) : body) || {};
        if (!err) {
            if (body.error) {
                err = new Error(body.reason);
                err.error = body.error;
                err.reason = body.reason;
                err.statusCode = res.statusCode;
            } else if (res.headers['etag']) {
                body._rev = res.headers['etag'].slice(1, -1);
            }
        }
        callback && callback(err, body);
    }
};

// PUT a document to Couch
// -----------------------
Couch.prototype.put = function(doc, callback) {
    request.put({
        uri: this.uri + '/' + encodeURIComponent(doc._id),
        json: doc
    }, this.parse(callback));
};

// POST a document to Couch
// ------------------------
Couch.prototype.post = function(doc, callback) {
    request.post({
        uri: this.uri,
        json: doc
    }, this.parse(callback));
};

// DELETE a document from Couch
// ----------------------------
Couch.prototype.del = function(doc, callback) {
    request.del({
        uri: this.uri + '/' + encodeURIComponent(doc._id) + '?rev=' + doc._rev
    }, this.parse(callback));
};

// GET a document from Couch
// -------------------------
Couch.prototype.get = function(id, callback) {
    request.get({
        uri: this.uri + '/' + encodeURIComponent(id)
    }, this.parse(callback));
};

// HEAD request to retrieve document _rev.
// ---------------------------------------
Couch.prototype.head = function(id, callback) {
    request.head({
        uri: this.uri + '/' + encodeURIComponent(id),
        json: true
    }, this.parse(function(err, body) {
        body && !err && (body._id = id);
        callback(err, body);
    }));
};

// GET documents via view from Couch
// ---------------------------------
Couch.prototype.view = function(view, options, callback) {
    var opts = [];
    _.each(options, function(v, k) {
        opts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    });
    request.get({
        uri: this.uri + '/' + view + '/?' + opts.join('&')
    }, this.parse(callback));
};

// Create database
// ---------------
Couch.prototype.dbPut = function(callback) {
    request.put({
        uri: this.uri
    }, this.parse(callback));
};

// Delete database
// ---------------
Couch.prototype.dbDel = function(callback) {
    request.del({
        uri: this.uri
    }, this.parse(callback));
};

// PUT design docs from files or JSON objects
// ------------------------------------------
Couch.prototype.putDesignDocs = function(files, callback) {
    callback = callback || function() {};

    var remaining = files.length;
    var put = function(id, doc) {
        if (!id) return callback(new Error('Document _id required.'));
        doc = _(doc).isString() ? doc : JSON.stringify(doc);
        request.put({
            uri: this.uri + '/' + id,
            body: doc
        }, function(err, res) {
            remaining--;
            if (err) return callback(err);
            if (!remaining) return callback(err, res);
        });
    }.bind(this);

    files.forEach(function(file) {
        if (_(file).isString()) {
            fs.readFile(file, 'utf8', function(err, data) {
                if (err) return callback(err);
                var id = data.match(/.*"_id".*?:.*?"(.*?)".*/)[1];
                put(id, data);
            });
        } else {
            put(file._id, file);
        }
    }.bind(this));
};
