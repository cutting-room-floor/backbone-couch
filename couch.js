var request = require('request');

Couch = module.exports = function(config) {
    var host = config.host || '127.0.0.1';
    var port = config.port || '5984';
    if (!config.name) throw 'Database name is required';
    this.uri = 'http://' +
        host + ':' +
        port + '/' +
        config.name;
};

Couch.prototype.parse = function(callback) {
    return function(err, res, body) {
        if (!err && body) {
            body = JSON.parse(body);
            if (body.error) {
                err = body.error + ': ' + body.reason;
            } else if (res.headers['etag']) {
                // TODO: this will break if return value is an array.
                body._rev = res.headers['etag'].slice(1, -1);
            }
        }
        callback(err, body);
    }
};

Couch.prototype.put = function(doc, callback) {
    request.put({
        uri: this.uri + '/' + encodeURIComponent(doc._id),
        json: doc
    }, this.parse(callback));
};

Couch.prototype.post = function(doc, callback) {
    request.post({
        uri: this.uri,
        json: doc
    }, this.parse(callback));
};

Couch.prototype.del = function(doc, callback) {
    request.del({
        uri: this.uri + '/' + encodeURIComponent(doc._id) + '?_rev=' + doc._rev
    }, function(err, res) {
        callback && callback(err);
    });
};

Couch.prototype.get = function(id, callback) {
    request.get({
        uri: this.uri + '/' + encodeURIComponent(id)
    }, this.parse(callback));
};

Couch.prototype.view = function(view, options, callback) {
    var opts = [];
    _.each(options, function(k, v) {
        opts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    });
    request.get({
        uri: this.uri + '/_view/' + view + '/?' + opts.join('&')
    }, function(err, res) {
        console.log(res);
        // todo!!
        callback && callback(err, res);
    });
};

Couch.prototype.dbPut = function(callback) {
    request.put({
        uri: this.uri
    }, function(err, res) {
        callback && callback(err, res);
    });
};

Couch.prototype.dbDel = function(callback) {
    request.del({
        uri: this.uri
    }, function(err, res) {
        callback && callback(err, res);
    });
};

// Helper to put design docs from file.
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
