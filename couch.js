var request = require('request');

Couch = module.exports = function(config) {
    this.uri = 'http://' +
        config.host + ':' +
        config.port + '/' +
        config.name;
}

Couch.prototype.put = function(doc, callback) {
    request.put({
        uri: this.uri + '/' + encodeURIComponent(doc._id),
        json: doc
    }, function(err, res) {
        doc._rev = res.headers['etag'].slice(1, -1);
        callback && callback(err, doc);
    });
};

Couch.prototype.post = function(doc, callback) {
    request.post({
        uri: this.uri + '/' + encodeURIComponent(doc._id),
        json: doc
    }, function(err, res) {
        doc._rev = res.headers['etag'].slice(1, -1);
        callback && callback(err, doc);
    });
};

Couch.prototype.del = function(id, callback) {
    request.del({
        uri: this.uri + '/' + encodeURIComponent(doc._id) + '?_rev=' + doc._rev
    }, function(err, res) {
        callback && callback(err);
    });
};

Couch.prototype.get = function(id, callback) {
    request.get({
        uri: this.uri + '/' + encodeURIComponent(doc._id)
    }, function(err, res) {
        // doc._rev = res.headers['etag'].slice(1, -1);
        console.log(res);
        // todo!!
        callback && callback(err, res);
    });
};

Couch.prototype.view = function(view, options, callback) {
    var opts = [];
    _.each(options, function(k, v) {
        opts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    });
    request.get({
        uri: this.uri + '/_view/' + view + '/?' + opts.join('&')
    }, function(err, res) {
        // doc._rev = res.headers['etag'].slice(1, -1);
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
