var assert = require('assert'),
    Backbone = require('backbone'),
    _ = require('underscore');

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

exports['save'] = function() {
    var couch = require('backbone-couch')({name: 'backbone_couch_test_save'});
    var db = couch.db;
    Number.prototype.sync = couch.sync;
    couch.install(function(err) {
        var models = [];
        var destroyed = 0;
        var destroy = function(model) {
            assert.isDefined(model.get('_rev'));
            model.destroy();
            destroyed++;
            if (destroyed == data.length) {
                couch.db.dbDel();
            }
        };
        _.each(data, function(d) {
            models.push((new Number()).save(d, {
                success: destroy,
                error: destroy
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
