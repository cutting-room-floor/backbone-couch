var assert = require('assert'),
    Backbone = require('backbone'),
    _ = require('underscore');

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
            couch.db.dbDel(function(err, res) {
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
    Number.prototype.sync = couch.sync;
    couch.install(function(err) {
        var models = [];
        var destroyed = 0;
        var destroy = function(model) {
            model.destroy(function() {
                destroyed++;
                if (destroyed == data.length) {
                    couch.db.dbDel();
                }
            });
        };
        var reload = function(model) {
            assert.isDefined(model.get('_rev'));
            var rev = model.get('_rev');
            (new Number({id: model.id})).fetch({
                success: function(model) {
                    assert.eql(model.get('_rev'), rev);
                    destroy(model);
                },
                error: function(model) {
                    console.error('Error fetching model');
                    destroy(model);
                }
            });
        };
        _.each(data, function(d) {
            models.push((new Number()).save(d, {
                success: reload,
                error: reload
            }));
        });
    });
};

var Number = Backbone.Model.extend({
    url: function() {
        return '/api/Number/' + this.id;
    }
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
