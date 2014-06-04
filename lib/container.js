var capitalize = function(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
};
var isNumber = function(obj) {
  return obj.toString() === '[object Number]';
};
var throwError = function(message, name) {
  var error = new Error(message);
  message.name = name || 'Error';
  throw error;
};

function Container {}
Container.prototype.addPoint = function(obj) {
  var point = new PointContainer(obj);
  this._points.push(point);
  return point;
};

function PointContainer(obj) {
  this.set(obj);
}
PointContainer.prototype.set = function(obj) {
  for ( var p in obj ) {
    this[p](obj[p]);
  }
  return this;
};


['secs', 'cad', 'hr', 'km', 'kph', 'nm', 'watts', 'alt', 'lng', 'lat', 'headwind', 'slope', 'temp', 'lrbalance', 'lte', 'rte', 'lps', 'rps', 'smo2', 'thb', 'hrd', 'cadd', 'kphd', 'nmd', 'wattsd', 'interval', 'xp', 'np', 'apower', 'atiss', 'antiss'].forEach(function(prop) {
  PointContainer.prototype['_' + prop] = prop === 'temp' ? -255 : 0;
  PointContainer.prototype[prop] = function(newValue) {
    if ( arguments.length === 0 ) {
      return this['_' + prop];
    }
    if ( ! isNumber(newValue) ) {
      throwError(prop + ' must be a number. ' + newValue + ' given', 'TypeError');
    }
    this['_' + prop] = newValue;
    return this;
  }
});

exports.Container = Container;