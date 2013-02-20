(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    
    require.define = function (filename, fn) {
        if (require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process){var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
        && window.setImmediate;
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return window.setImmediate;
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();

});

require.define("/package.json",function(require,module,exports,__dirname,__filename,process){module.exports = {}
});

require.define("/index.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var classes, deps, factory, inject, injectedClasses, utils;

  utils = require('./utils');

  classes = {
    ItemView: require('./ItemView'),
    ListView: require('./ListView')
  };

  injectedClasses = {};

  deps = {};

  inject = function(_arg) {
    var backbone, knockout;
    backbone = _arg.backbone, knockout = _arg.knockout;
    deps.backbone = backbone;
    return deps.knockout = knockout;
  };

  factory = function(classname) {
    if (injectedClasses[classname] == null) {
      injectedClasses[classname] = classes[classname](deps);
    }
    return injectedClasses[classname];
  };

  module.exports = {
    factory: factory,
    inject: inject,
    utils: utils
  };

}).call(this);

});

require.define("/utils.coffee",function(require,module,exports,__dirname,__filename,process){(function() {

  module.exports = {
    standardItemTemplate: function(fields) {
      var f, h, _i, _len;
      h = [];
      for (_i = 0, _len = fields.length; _i < _len; _i++) {
        f = fields[_i];
        h.push("<div>\n<strong>" + f + "</strong>:\n<span data-bind=\"text:" + f + "\"></span>\n</div>");
      }
      return h.join('\n');
    },
    standardListTemplate: function(fields) {
      var headHtml, headerRow, itemHtml, itemRow;
      itemHtml = function(fields) {
        var cells, field, _i, _len;
        cells = [];
        for (_i = 0, _len = fields.length; _i < _len; _i++) {
          field = fields[_i];
          cells.push("<td data-bind=\"text:" + field + "\"></td>");
        }
        return cells.join('');
      };
      headHtml = function(fields) {
        var cells, field, _i, _len;
        cells = [];
        for (_i = 0, _len = fields.length; _i < _len; _i++) {
          field = fields[_i];
          cells.push("<th>" + field + "</th>");
        }
        return cells.join('');
      };
      itemRow = itemHtml(fields);
      headerRow = headHtml(fields);
      return "<table border=\"1\" width=\"100%\">\n	<thead>\n		<tr>" + headerRow + "</tr>\n	</thead>\n	<tbody data-bind=\"foreach:items\">\n		<tr data-bind=\"attr:{'data-cid':$cid}\">" + itemRow + "</tr>\n	</tbody>\n</table>";
    }
  };

}).call(this);

});

require.define("/ItemView.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var utils,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  utils = require('./utils');

  module.exports = function(_arg) {
    var ItemView, backbone, bb, knockout, ko;
    backbone = _arg.backbone, knockout = _arg.knockout;
    bb = backbone;
    ko = knockout;
    return ItemView = (function(_super) {

      __extends(ItemView, _super);

      function ItemView() {
        this.onVmChange = __bind(this.onVmChange, this);

        this.onModelChange = __bind(this.onModelChange, this);
        return ItemView.__super__.constructor.apply(this, arguments);
      }

      ItemView.prototype.fields = [];

      ItemView.prototype.setModel = function(model) {
        if (this.model) {
          this.unsubscribeFromModel(this.model);
        }
        this.model = model;
        this.subscribeToModel(this.model);
        this.updateVmSpecialFields(this.model);
        return typeof this.afterSubscribeToModel === "function" ? this.afterSubscribeToModel() : void 0;
      };

      ItemView.prototype.subscribeToModel = function(model) {
        return model.on('change', this.onModelChange);
      };

      ItemView.prototype.onModelChange = function(model) {
        return this.updateVm(model, model.changedAttributes());
      };

      ItemView.prototype.unsubscribeFromModel = function(model) {
        model.off('change', this.onModelChange);
        return typeof this.afterUnsubscribeFromModel === "function" ? this.afterUnsubscribeFromModel() : void 0;
      };

      ItemView.prototype.updateVm = function(model, fieldValues) {
        var field, _i, _len, _ref;
        _ref = this.fields;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          field = _ref[_i];
          if (fieldValues.hasOwnProperty(field)) {
            this.vm[field](fieldValues[field]);
          }
        }
        return this.updateVmSpecialFields(model);
      };

      ItemView.prototype.updateVmSpecialFields = function(model) {
        return this.vm.$isNew(model.isNew());
      };

      ItemView.prototype.onVmChange = function(field, value) {
        return this.model.set(field, value);
      };

      ItemView.prototype.html = function() {
        return utils.standardItemTemplate(this.fields);
      };

      ItemView.prototype.render = function() {
        this.$el.html(this.html());
        return ko.applyBindings(this.vm, this.el);
      };

      ItemView.prototype.afterVmCreated = function() {};

      ItemView.prototype.initialize = function() {
        var f, observable, _i, _len, _ref,
          _this = this;
        this.vm = {};
        _ref = this.fields;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          f = _ref[_i];
          observable = ko.observable();
          this.vm[f] = observable;
          observable.subscribe((function(f) {
            return function(newValue) {
              return _this.onVmChange(f, newValue);
            };
          })(f));
        }
        this.vm.$isNew = ko.observable();
        return this.afterVmCreated();
      };

      return ItemView;

    })(bb.View);
  };

}).call(this);

});

require.define("/ListView.coffee",function(require,module,exports,__dirname,__filename,process){(function() {
  var utils,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  utils = require('./utils');

  module.exports = function(_arg) {
    var ListView, backbone, bb, knockout, ko;
    backbone = _arg.backbone, knockout = _arg.knockout;
    bb = backbone;
    ko = knockout;
    return ListView = (function(_super) {

      __extends(ListView, _super);

      function ListView() {
        this.onCollectionClear = __bind(this.onCollectionClear, this);

        this.onCollectionReset = __bind(this.onCollectionReset, this);

        this.onCollectionChange = __bind(this.onCollectionChange, this);

        this.onCollectionRemove = __bind(this.onCollectionRemove, this);

        this.onCollectionAdd = __bind(this.onCollectionAdd, this);
        return ListView.__super__.constructor.apply(this, arguments);
      }

      ListView.prototype.fields = [];

      ListView.prototype.setCollection = function(collection) {
        if (this.collection) {
          this.unsubscribeFromCollection(this.collection);
        }
        this.collection = collection;
        return this.subscribeToCollection(this.collection);
      };

      ListView.prototype.subscribeToCollection = function(collection) {
        collection.on('add', this.onCollectionAdd);
        collection.on('reset', this.onCollectionReset);
        collection.on('change', this.onCollectionChange);
        collection.on('clear', this.onCollectionClear);
        collection.on('remove', this.onCollectionRemove);
        return typeof this.afterSubscribeToCollection === "function" ? this.afterSubscribeToCollection() : void 0;
      };

      ListView.prototype.unsubscribeFromCollection = function(collection) {
        collection.off('add', this.onCollectionAdd);
        collection.off('reset', this.onCollectionReset);
        collection.off('change', this.onCollectionChange);
        collection.off('clear', this.onCollectionClear);
        collection.off('remove', this.onCollectionRemove);
        return typeof this.afterUnsubscribeFromCollection === "function" ? this.afterUnsubscribeFromCollection() : void 0;
      };

      ListView.prototype.modelToVm = function(model) {
        var field, item, raw, value, _i, _len, _ref;
        item = {};
        raw = model.toJSON();
        _ref = this.fields;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          field = _ref[_i];
          value = raw[field];
          item[field] = ko.observable(value);
        }
        item.$id = ko.observable(model.id);
        item.$cid = ko.observable(model.cid);
        return item;
      };

      ListView.prototype.collectionToVm = function(collection) {
        var m, _i, _len, _ref, _results;
        _ref = collection.models;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          m = _ref[_i];
          _results.push(this.modelToVm(m));
        }
        return _results;
      };

      ListView.prototype.onCollectionAdd = function(model, collection, _arg1) {
        var at, index;
        at = _arg1.at, index = _arg1.index;
        return this.vmInsert(model, index);
      };

      ListView.prototype.onCollectionRemove = function(model, collection) {
        return this.vmRemove(model);
      };

      ListView.prototype.onCollectionChange = function(model) {
        return this.vmUpdate(model);
      };

      ListView.prototype.onCollectionReset = function(collection) {
        return this.vmReset(collection);
      };

      ListView.prototype.onCollectionClear = function(collection) {
        return this.vmClear();
      };

      ListView.prototype.vmInsert = function(model, index) {
        return this.vm.items.splice(index, 0, this.modelToVm(model));
      };

      ListView.prototype.vmClear = function() {
        return this.vm.items([]);
      };

      ListView.prototype.vmReset = function(collection) {
        return this.vm.items(this.collectionToVm(collection));
      };

      ListView.prototype.vmUpdate = function(model) {
        var changes, field, item, value, _results;
        item = ko.utils.arrayFirst(this.vm.items(), function(item) {
          return item.$cid() === model.cid;
        });
        if (!item) {
          return;
        }
        changes = model.changedAttributes();
        _results = [];
        for (field in changes) {
          if (!__hasProp.call(changes, field)) continue;
          value = changes[field];
          if (__indexOf.call(this.fields, field) >= 0) {
            _results.push(typeof item[field] === "function" ? item[field](value) : void 0);
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      };

      ListView.prototype.vmRemove = function(model) {
        var cid;
        cid = model.cid;
        return this.vm.items.remove(function(item) {
          return item.$cid() === cid;
        });
      };

      ListView.prototype.html = function() {
        return utils.standardListTemplate(this.fields);
      };

      ListView.prototype.render = function() {
        this.$el.html(this.html());
        return ko.applyBindings(this.vm, this.el);
      };

      ListView.prototype.afterVmCreated = function() {};

      ListView.prototype.initialize = function() {
        this.vm = {};
        this.vm.items = ko.observableArray();
        return this.afterVmCreated();
      };

      return ListView;

    })(bb.View);
  };

}).call(this);

});

require.define("/global.coffee",function(require,module,exports,__dirname,__filename,process){
/*
This file is used for global build (dist/backstage.js).
*/


(function() {

  window.backstage = require('./index');

}).call(this);

});
require("/global.coffee");
})();

