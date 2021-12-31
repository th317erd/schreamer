const Path  = require('path');
const OS    = require('os');

const { SNAPSHOT_PATH, compareToSnapshot }  = require('../support/utils');
const { Definers, createWriter }            = require('../../src');

describe("Test01", function() {
  const { U32, U16, BIG_ENDIAN, LITTLE_ENDIAN } = Definers;

  const FORMAT = [
    // Header
    U32('magic',    0x4C4F434F),
    U16('version',  1),
    // Sequence
    U16('fibonacci', [
      U16(),
    ]),
  ];

  const BE_FORMAT = BIG_ENDIAN(FORMAT);
  const LE_FORMAT = LITTLE_ENDIAN(FORMAT);

  function *fibonacci() {
    var lastValue = 0;
    var value = 1;

    yield 0;
    yield 1;

    for (var i = 0; i < 16; i++) {
      var temp = lastValue;

      lastValue = value;
      value = value + temp;

      yield value;
    }
  }

  const PROVIDER = {
    fibonacci: function*() {
      // Size of sequence
      yield 18;

      // Sequence
      yield *fibonacci();
    }
  };

  it("should write successfully (BE)", function(done) {
    const writer = createWriter(BE_FORMAT, PROVIDER);

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'sequence01-be.bin');
    writer('/tmp/schreamer/sequence01-be.bin').then(() => {
      var result = compareToSnapshot('sequence01-be.snap', filePath);
      expect(result).toBe(true);

      done();
    }, (error) => { fail(error); done(); });
  });

  it("should write successfully (LE)", function(done) {
    const writer = createWriter(LE_FORMAT, PROVIDER);

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'sequence01-le.bin');
    writer('/tmp/schreamer/sequence01-le.bin').then(() => {
      var result = compareToSnapshot('sequence01-le.snap', filePath);
      expect(result).toBe(true);

      done();
    }, (error) => { fail(error); done(); });
  });

  it("should read successfully (BE)", function() {

  });

  it("should read successfully (LE)", function() {

  });
});
