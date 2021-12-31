const Definers  = require('./definers');
const Writer    = require('./writer');
const Reader    = require('./reader');

module.exports = Object.assign({},
  { Definers },
  Writer,
  Reader,
);
