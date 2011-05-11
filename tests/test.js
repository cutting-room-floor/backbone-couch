var assert = require('assert'),
    Backbone = require('backbone'),
    _ = require('underscore')._;

// Global fatal error handler.
// ---------------------------
var error = function(db) {
    return function(result, error) {
        console.error(new Error(error).stack);
        db.dbDel(function() {
            process.exit(0);
        });
    }
};

// Install and destroy database.
// -----------------------------
exports['install'] = function() {
    var couch = require('backbone-couch')({name: 'backbone_couch_test_install'});
    var db = couch.db;
    couch.install(function(err) {
        assert.isNull(err);
        db.get('_design/base', function(err, doc) {
            assert.isNull(err);
            assert.isDefined(doc);
            db.dbDel(function(err, res) {
                assert.isNull(err);
                db.get('_design/base', function(err, doc) {
                    assert.eql(err, 'not_found: no_db_file');
                });
            });
        })
    });
};

// Create db, save documents, load documents, destroy documents, destroy db.
// -------------------------------------------------------------------------
exports['save'] = function() {
    var couch = require('backbone-couch')({name: 'backbone_couch_test_save'});
    var db = couch.db;
    TestNumber.prototype.sync = couch.sync;
    couch.install(function(err) {
        var models = [];
        var destroyed = 0;
        var destroy = function(model) {
            model.destroy({
                success: function() {
                    destroyed++;
                    if (destroyed == data.length) {
                        db.dbDel();
                    }
                },
                error: error(db)
            });
        };
        var reload = function(model) {
            assert.isDefined(model.get('_rev'));
            var rev = model.get('_rev');
            (new TestNumber({id: model.id})).fetch({
                success: function(model) {
                    assert.eql(model.get('_rev'), rev);
                    destroy(model);
                },
                error: error(db)
            });
        };
        _.each(data, function(d) {
            models.push((new TestNumber()).save(d, {
                success: reload,
                error: error(db)
            }));
        });
    });
};

// Use a view to load a collection.
// --------------------------------
exports['view'] = function() {
    var couch = require('backbone-couch')({name: 'backbone_couch_test_view'});
    var db = couch.db;
    var ViewNumber = TestNumber.extend({});
    var ViewNumbers = TestNumbers.extend({
        model: ViewNumber
    });
    TestNumber.prototype.sync = couch.sync;
    TestNumbers.prototype.sync = couch.sync;
    couch.install(function(err) {
        var models = [];
        var saved = 0;
        var loadAll = function() {
            saved++;
            if (saved == data.length) {
                (new ViewNumbers()).fetch({
                    success: function(collection) {
                        var names = collection.map(function(model) {
                            return model.get('name');
                        });
                        _.each(data, function(d) {
                            assert.eql(true, names.indexOf(d.name) != -1);
                        });
                        db.dbDel();
                    },
                    error: error(db)
                })
            }
        };
        _.each(data, function(d) {
            models.push((new ViewNumber()).save(d, {
                success: loadAll,
                error: error(db)
            }));
        });
    });
};

var TestNumber = Backbone.Model.extend({
    url: function() {
        return '/api/Number/' + this.id;
    }
});

var TestNumbers = Backbone.Collection.extend({
    model: TestNumber,
    url: '/api/Number'
});

var data = [{
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
}];
