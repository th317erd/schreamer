function isValid(value) {
  if (value == null)
    return false;

  if (typeof value === 'number' && !isFinite(value))
    return false;

  return true;
}

function fileNodeCount(format, _count) {
  var count = _count || 0;

  if (format instanceof Array) {
    for (var i = 0, il = format.length; i < il; i++) {
      var node = format[i];
      count += fileNodeCount(node);
    }

    return count;
  }

  if (format.type === 'file')
    count += 1;

  var children = format.children || format.value;
  if (children instanceof Array)
    count += fileNodeCount(children);

  return count;
}

function hasFileNode(format) {
  return (fileNodeCount(format) > 0)
}

function createResolvable() {
  var resolve;
  var reject;

  var promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  promise.resolve = resolve;
  promise.reject = reject;

  return promise;
}

module.exports = {
  isValid,
  fileNodeCount,
  hasFileNode,
  createResolvable,
};
