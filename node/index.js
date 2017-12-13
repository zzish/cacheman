'use strict';

/**
 * Module dependencies.
 */

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _ms = require('ms');

var _ms2 = _interopRequireDefault(_ms);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * Module constants.
 */

var engines = ['memory', 'redis', 'mongo', 'file'];

/**
 * Cacheman base error class.
 *
 * @constructor
 * @param {String} message
 * @api private
 */

var CachemanError = function (_Error) {
  _inherits(CachemanError, _Error);

  function CachemanError(message) {
    _classCallCheck(this, CachemanError);

    var _this2 = _possibleConstructorReturn(this, (CachemanError.__proto__ || Object.getPrototypeOf(CachemanError)).call(this, message));

    _this2.name = _this2.constructor.name;
    _this2.message = message;
    Error.captureStackTrace(_this2, _this2.constructor);
    return _this2;
  }

  return CachemanError;
}(Error);

/**
 * Helper to allow all async methods to support both callbacks and promises
 */

function maybePromised(_this, callback, wrapped) {
  if ('function' === typeof callback) {
    // Call wrapped with unmodified callback
    wrapped(callback);

    // Return `this` to keep the same behaviour Cacheman had before promises were added
    return _this;
  } else {
    var _Promise = _this.options.Promise;

    if ('function' !== typeof _Promise) {
      throw new CachemanError('Promises not available: Please polyfill native Promise before creating a Cacheman object, pass a Promise library as a Cacheman option, or use the callback interface');
    }

    if (_Promise.fromCallback) {
      // Bluebird's fromCallback, this is faster than new Promise
      return _Promise.fromCallback(wrapped);
    }

    // Standard new Promise based wrapper for native Promises
    return new _Promise(function (resolve, reject) {
      wrapped(function (err, value) {
        if (err) {
          reject(err);
        } else {
          resolve(value);
        }
      });
    });
  }
}

/**
 * Cacheman constructor.
 *
 * @param {String} name
 * @param {Object} options
 * @api public
 */

var Cacheman = function () {

  /**
   * Class constructor method.
   *
   * @param {String} name
   * @param {Object} [options]
   * @return {Cacheman} this
   * @api public
   */

  function Cacheman(name) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, Cacheman);

    if (name && 'object' === (typeof name === 'undefined' ? 'undefined' : _typeof(name))) {
      options = name;
      name = null;
    }

    var _Promise = options.Promise || function () {
      try {
        return Promise;
      } catch (e) {}
    }();

    var _options = options,
        _options$prefix = _options.prefix,
        prefix = _options$prefix === undefined ? 'cacheman' : _options$prefix,
        _options$engine = _options.engine,
        engine = _options$engine === undefined ? 'memory' : _options$engine,
        _options$delimiter = _options.delimiter,
        delimiter = _options$delimiter === undefined ? ':' : _options$delimiter,
        _options$ttl = _options.ttl,
        ttl = _options$ttl === undefined ? 60 : _options$ttl;


    if ('string' === typeof ttl) {
      ttl = Math.round((0, _ms2.default)(ttl) / 1000);
    }

    prefix = [prefix, name || 'cache', ''].join(delimiter);
    this.options = _extends({}, options, { Promise: _Promise, delimiter: delimiter, prefix: prefix, ttl: ttl, count: 1000 });
    this._prefix = prefix;
    this._ttl = ttl;
    this._fns = [];
    this.engine(engine);
  }

  /**
   * Set get engine.
   *
   * @param {String} engine
   * @param {Object} options
   * @return {Cacheman} this
   * @api public
   */

  _createClass(Cacheman, [{
    key: 'engine',
    value: function engine(_engine, options) {

      if (!arguments.length) return this._engine;

      var type = typeof _engine === 'undefined' ? 'undefined' : _typeof(_engine);

      if (!/string|function|object/.test(type)) {
        throw new CachemanError('Invalid engine format, engine must be a String, Function or a valid engine instance');
      }

      if ('string' === type) {

        var Engine = void 0;

        if (_engine === "memory") {
          Engine = require("cacheman-memory");
        } else {
          throw new CachemanError('Missing required npm module ' + _engine);
        }

        this._engine = new Engine(options || this.options, this);
      } else if ('object' === type) {
        ['get', 'set', 'del', 'clear'].forEach(function (key) {
          if ('function' !== typeof _engine[key]) {
            throw new CachemanError('Invalid engine format, must be a valid engine instance');
          }
        });

        this._engine = _engine;
      } else {
        this._engine = _engine(options || this.options, this);
      }

      return this;
    }

    /**
     * Wrap key with prefix.
     *
     * @param {String} key
     * @return {String}
     * @api private
     */

  }, {
    key: 'key',
    value: function key(_key) {
      if (Array.isArray(_key)) {
        _key = _key.join(this.options.delimiter);
      }
      return this.options.engine === 'redis' ? _key : this._prefix + _key;
    }

    /**
     * Sets up namespace middleware.
     *
     * @return {Cacheman} this
     * @api public
     */

  }, {
    key: 'use',
    value: function use(fn) {
      this._fns.push(fn);
      return this;
    }

    /**
     * Executes the cache middleware.
     *
     * @param {String} key
     * @param {Mixed} data
     * @param {Number} ttl
     * @param {Function} fn
     * @api private
     */

  }, {
    key: 'run',
    value: function run(key, data, ttl, fn) {
      var fns = this._fns.slice(0);
      if (!fns.length) return fn(null);

      var go = function go(i) {
        fns[i](key, data, ttl, function (err, _data, _ttl, _force) {
          // upon error, short-circuit
          if (err) return fn(err);

          // if no middleware left, summon callback
          if (!fns[i + 1]) return fn(null, _data, _ttl, _force);

          // go on to next
          go(i + 1);
        });
      };

      go(0);
    }

    /**
     * Set an entry.
     *
     * @param {String} key
     * @param {Mixed} data
     * @param {Number} ttl
     * @param {Function} [fn]
     * @return {Cacheman} this
     * @api public
     */

  }, {
    key: 'cache',
    value: function cache(key, data, ttl, fn) {
      var _this3 = this;

      if ('function' === typeof ttl) {
        fn = ttl;
        ttl = null;
      }

      return maybePromised(this, fn, function (fn) {

        _this3.get(key, function (err, res) {

          _this3.run(key, res, ttl, function (_err, _data, _ttl, _force) {

            if (err || _err) return fn(err || _err);

            var force = false;

            if ('undefined' !== typeof _data) {
              force = true;
              data = _data;
            }

            if ('undefined' !== typeof _ttl) {
              force = true;
              ttl = _ttl;
            }

            if ('undefined' === typeof res || force) {
              return _this3.set(key, data, ttl, fn);
            }

            fn(null, res);
          });
        });
      });
    }

    /**
     * Get an entry.
     *
     * @param {String} key
     * @param {Function} [fn]
     * @return {Cacheman} this
     * @api public
     */

  }, {
    key: 'get',
    value: function get(key, fn) {
      var _this4 = this;

      return maybePromised(this, fn, function (fn) {
        return _this4._engine.get(_this4.key(key), fn);
      });
    }

    /**
     * Set an entry.
     *
     * @param {String} key
     * @param {Mixed} data
     * @param {Number} ttl
     * @param {Function} [fn]
     * @return {Cacheman} this
     * @api public
     */

  }, {
    key: 'set',
    value: function set(key, data, ttl, fn) {
      var _this5 = this;

      if ('function' === typeof ttl) {
        fn = ttl;
        ttl = null;
      }

      if ('string' === typeof ttl) {
        ttl = Math.round((0, _ms2.default)(ttl) / 1000);
      }

      return maybePromised(this, fn, function (fn) {
        if ('string' !== typeof key && !Array.isArray(key)) {
          return process.nextTick(function () {
            fn(new CachemanError('Invalid key, key must be a string or array.'));
          });
        }

        if ('undefined' === typeof data) {
          return process.nextTick(fn);
        }

        return _this5._engine.set(_this5.key(key), data, ttl || _this5._ttl, fn);
      });
    }

    /**
     * Delete an entry.
     *
     * @param {String} key
     * @param {Function} [fn]
     * @return {Cacheman} this
     * @api public
     */

  }, {
    key: 'del',
    value: function del(key, fn) {
      var _this6 = this;

      if ('function' === typeof key) {
        fn = key;
        key = '';
      }

      return maybePromised(this, fn, function (fn) {
        return _this6._engine.del(_this6.key(key), fn);
      });
    }

    /**
     * Clear all entries.
     *
     * @param {String} key
     * @param {Function} [fn]
     * @return {Cacheman} this
     * @api public
     */

  }, {
    key: 'clear',
    value: function clear(fn) {
      var _this7 = this;

      return maybePromised(this, fn, function (fn) {
        return _this7._engine.clear(fn);
      });
    }

    /**
     * Wraps a function in cache. I.e., the first time the function is run,
     * its results are stored in cache so subsequent calls retrieve from cache
     * instead of calling the function.
     *
     * @param {String} key
     * @param {Function} work
     * @param {Number} ttl
     * @param {Function} [fn]
     * @api public
     */

  }, {
    key: 'wrap',
    value: function wrap(key, work, ttl, fn) {
      var _this8 = this;

      // Allow work and ttl to be passed in the oposite order to make promises nicer
      if ('function' !== typeof work && 'function' === typeof ttl) {
        var _ref = [work, ttl];
        ttl = _ref[0];
        work = _ref[1];
      }

      if ('function' === typeof ttl) {
        fn = ttl;
        ttl = null;
      }

      return maybePromised(this, fn, function (fn) {

        _this8.get(key, function (err, res) {
          if (err || res) return fn(err, res);

          var _next = function next(err, data) {
            if (err) return fn(err);
            _this8.set(key, data, ttl, function (err) {
              fn(err, data);
            });

            // Don't allow callbacks to be called twice
            _next = function next() {
              process.nextTick(function () {
                throw new CachemanError('callback called twice');
              });
            };
          };

          if (work.length >= 1) {
            var result = work(function (err, data) {
              return _next(err, data);
            });
            if ('undefined' !== typeof result) {
              process.nextTick(function () {
                throw new CachemanError('return value cannot be used when callback argument is used');
              });
            }
          } else {
            try {
              var _result = work();
              if ('object' === (typeof _result === 'undefined' ? 'undefined' : _typeof(_result)) && 'function' === typeof _result.then) {
                _result.then(function (value) {
                  return _next(null, value);
                }).then(null, function (err) {
                  return _next(err);
                });
              } else {
                _next(null, _result);
              }
            } catch (err) {
              _next(err);
            }
          }
        });
      });
    }
  }]);

  return Cacheman;
}();

exports.default = Cacheman;


Cacheman.engines = engines;
module.exports = exports['default'];