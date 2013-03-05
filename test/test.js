var BackboneCouch = require('..');
var assert = require('assert');
var Backbone = require('backbone');
var _ = require('underscore')._;
var url = require('url');

function cleanup(done) {
    this.dbDel(function(err) {
        done();
    });
}

var data = [
    {
        'id': 'one',
        'name': 'One - 1',
    },
    {
        'id': 'two',
        'name': 'Two - 2'
    },
    {
        'id': 'three',
        'name': 'Three - 3'
    }
];


var TestNumber = Backbone.Model.extend({
    url: function() {
        return '/api/Number/' + this.id;
    }
});

var TestNumbers = Backbone.Collection.extend({
    model: TestNumber,
    url: '/api/Number'
});


// Install and destroy database.
// -----------------------------
describe('install', function() {
    var couch = BackboneCouch({name: 'backbone_couch_test_install'});
    var db = couch.db;

    before(cleanup.bind(db));
    after(cleanup.bind(db));

    it('should install the database', function(done) {
        couch.install(done);
    });

    it('check that database exists', function(done) {
        db.get('_design/backbone', function(err, doc) {
            if (err) throw err;
            assert.ok(doc._rev);
            assert.ok(doc.language);
            assert.ok(doc.views);
            assert.ok(doc.rewrites);
            done();
        });
    });

    it('should delete the database', function(done) {
        db.dbDel(done);
    });

    it('check that database does not exist anymore', function(done) {
        db.get('_design/backbone', function(err, doc) {
            assert.deepEqual(err.error, 'not_found');
            done();
        });
    });
});

// Create db, save documents, load documents, destroy documents, destroy db.
// -------------------------------------------------------------------------
describe('save', function() {

    var couch = BackboneCouch({name: 'backbone_couch_test_save'});
    var db = couch.db;
    TestNumber.prototype.sync = couch.sync;

    before(cleanup.bind(db));

    it('should install the database', function(done) {
        couch.install(done);
    });

    _.each(data, function(d) {
        var model, rev;

        it('should save ' + d.id, function(done) {
            new TestNumber().save(d, {
                success: function(m) {
                    model = m;
                    rev = model.get('_rev');
                    assert.ok(rev);
                    done();
                },
                error: function(err) { throw err; }
            });
        });

        it('should load ' + d.id, function(done) {
            new TestNumber({ id: d.id }).fetch({
                success: function(model) {
                    assert.equal(model.get('_rev'), rev);
                    done();
                },
                error: function(err) { throw err; }
            });
        });

        it('should destroy ' + d.id, function(done) {
            model.destroy({
                success: function() { done() },
                error: function(err) { throw err; }
            });
        })
    });

    after(cleanup.bind(db));
});

// Use a view to load a collection.
// --------------------------------
describe('view', function() {
    var couch = BackboneCouch({name: 'backbone_couch_test_view'});
    var db = couch.db;

    before(cleanup.bind(db));

    // Extend TestNumber to not interfere with concurrently running save test.
    var ViewNumber = TestNumber.extend({});
    var ViewNumbers = TestNumbers.extend({
        model: ViewNumber
    });
    ViewNumber.prototype.sync = couch.sync;
    ViewNumbers.prototype.sync = couch.sync;

    it('should install the database', function(done) {
        couch.install(done);
    });

    _.each(data, function(d) {
        it('should save ' + d.id, function(done) {
            new ViewNumber().save(d, {
                success: function() { done(); },
                error: function(err) { throw err; }
            });
        });
    });

    it('should return all data in the view', function(done) {
        new ViewNumbers().fetch({
            success: function(collection) {
                var names = collection.map(function(model) {
                    return model.get('name');
                });
                _.each(data, function(d) {
                    assert.equal(true, names.indexOf(d.name) != -1);
                });
                done();
            },
            error: function(err) { throw err; }
        });
    });

    after(cleanup.bind(db));
});


// Test custom design docs
// -----------------------
describe('custom', function() {
    var couch = BackboneCouch({name: 'backbone_couch_test_custom'});
    var db = couch.db;

    before(cleanup.bind(db));

    var ViewNumber = TestNumber.extend({});
    var ViewNumbers = TestNumbers.extend({
        model: ViewNumber
    });
    ViewNumber.prototype.sync = couch.sync;
    ViewNumbers.prototype.sync = couch.sync;

    it('should install the database', function(done) {
       couch.install({ doc: {
            "_id":"_design/backbone",
            "language":"javascript",
            "views": {
                "custom": {
                    "map": "function(doc) { emit(doc._id, doc._id); }"
                }
            },
            "rewrites": [
                {
                    "from": "/api/Number",
                    "to": "_view/custom",
                    "query": {
                        "limit": "2",
                        "descending": "true",
                        "include_docs": "true"
                    }
                }
            ]
        }}, done);
    });

    _.each(data, function(d) {
        it('should save ' + d.id, function(done) {
            new ViewNumber().save(d, {
                success: function() { done(); },
                error: function(err) { throw err; }
            });
        });
    });

    it('should return the correct amount of docs', function(done) {
        (new ViewNumbers()).fetch({
            success: function(collection) {
                assert.equal(collection.length, 2);
                assert.equal(collection.at(0).id, 'two');
                assert.equal(collection.at(1).id, 'three');
                done();
            },
            error: function(err) { throw err; }
        });
    });

    after(cleanup.bind(db));
});

// Test configuration options.
// ---------------------------
describe('configure', function() {
    it('should use https and port 6984', function(done) {
        var couch = BackboneCouch({
            secure: true,
            name: 'backbone_couch_test_config'}
        );
        var db = couch.db;
        var parts = url.parse(couch.db.uri);

        assert.equal(parts.protocol, 'https:');
        assert.equal(parts.port, '6984');
        db.dbDel();
        done();
    });

    it('should use https and custom port', function(done) {
        var couch = BackboneCouch({
            secure: true,
            port: '7984',
            name: 'backbone_couch_test_config'}
        );
        var db = couch.db;
        var parts = url.parse(couch.db.uri);

        assert.equal(parts.protocol, 'https:');
        assert.equal(parts.port, '7984');
        db.dbDel();
        done();
    });

    it('should use default options', function(done) {
        var couch = BackboneCouch({
            name: 'backbone_couch_test_config'}
        );
        var db = couch.db;
        var parts = url.parse(couch.db.uri);

        assert.equal(parts.protocol, 'http:');
        assert.equal(parts.port, '5984');
        db.dbDel();
        done();
    });
});
