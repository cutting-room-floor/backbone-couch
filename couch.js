var _ = require('underscore')._,
    request = require('request');

Couch = module.exports = function(config) {
    var host = config.host || '127.0.0.1';
    var port = config.port || '5984';
    if (!config.name) throw 'Database name is required';
    var credentials = config.auth ? config.auth.username + ":" + config.auth.password + "@" : '';
    this.uri = 'http://' +
        credentials +
        host + ':' +
        port + '/' +
        config.name;
    this.name = config.name;
};

// General response parser
// -----------------------
Couch.prototype.parse = function(callback) {
    var that = this;
    return function(err, res, body) {
        body = body ? JSON.parse(body) : {};
        if (!err) {
            if (body.error) {
                err = new Error(that.name +
                    ': ' + body.reason +
                    ' (' + res.statusCode + ')');
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
        uri: this.uri + '/' + encodeURIComponent(id)
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

// PUT design docs from file  
// -------------------------
Couch.prototype.putDesignDocs = function(files, callback) {
    var counter = 0;
    var that = this;
    files.forEach(function(file) {
        require('fs').readFile(file, function(err, data) {
            var id = data.toString().match(/.*"_id".*?:.*?"(.*?)".*/)[1];
            request.put({
                uri: that.uri + '/' + id,
                body: data.toString()
            }, function(err, res) {
                callback && callback(err, res);
            });
        });
    });
};
