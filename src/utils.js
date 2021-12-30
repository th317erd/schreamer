function isValid(value) {
  if (value == null)
    return false;

  if (typeof value === 'number' && !isFinite(value))
    return false;

  return true;
}

function isNOE(...args) {
  const empty = (value) => {
    if (value == null)
      return true;

    if (typeof value === 'number' && !isFinite(value))
      return true;

    if (typeof value === 'string' && value.trim() === '')
      return true;

    if (value instanceof Array && value.length === 0)
      return true;

    if (value && value.constructor === Object.prototype.constructor && Object.keys(value).length === 0)
      return true;

    return false;
  };

  for (var i = 0, il = args.length; i < il; i++) {
    var arg = args[i];
    if (empty(arg))
      return true;
  }

  return false;
}

function isNotNOE() {
  return !isNOE.apply(this, arguments);
}

module.exports = {
  isValid,
  isNOE,
  isNotNOE,
};
