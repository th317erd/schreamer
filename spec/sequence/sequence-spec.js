const Path  = require('path');
const OS    = require('os');

const { SNAPSHOT_PATH, compareToSnapshot }  = require('../support/utils');
const {
  Definers,
  createWriter,
  createReader,
} = require('../../src');

describe("Sequence Test 01", function() {
  const { U32, U16, BIG_ENDIAN, LITTLE_ENDIAN, GROUP } = Definers;

  const FORMAT = GROUP(
    // Header
    U32('magic',    0x4C4F434F),
    U16('version',  1),
    // Sequence
    U16('fibonacci', [
      U16(),
    ]),
  );

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

  const WRITE_PROVIDER = {
    fibonacci: function*() {
      // Size of sequence
      yield 18;

      // Sequence
      yield *fibonacci();
    }
  };

  const READ_DATA = {
    "magic": 1280262991,
    "version": 1,
    "fibonacci": [ 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597 ],
  };

  it("should write successfully (BE)", function(done) {
    const writer = createWriter(BE_FORMAT, WRITE_PROVIDER);

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'sequence01-be.bin');
    writer(filePath).then(() => {
      var result = compareToSnapshot('sequence01-be.snap', filePath);
      expect(result).toBe(true);

      done();
    }, (error) => { fail(error); done(); });
  });

  it("should write successfully (LE)", function(done) {
    const writer = createWriter(LE_FORMAT, WRITE_PROVIDER);

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'sequence01-le.bin');
    writer(filePath).then(() => {
      var result = compareToSnapshot('sequence01-le.snap', filePath);
      expect(result).toBe(true);

      done();
    }, (error) => { fail(error); done(); });
  });

  it("should read successfully (BE)", function(done) {
    const writer = createWriter(BE_FORMAT, WRITE_PROVIDER);

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'sequence01-be.bin');
    writer(filePath).then(() => {
      const reader = createReader(BE_FORMAT);

      reader(filePath).then((data) => {
        expect(data).toEqual(READ_DATA);

        done();
      }, (error) => { fail(error); done(); });
    }, (error) => { fail(error); done(); });
  });

  it("should read successfully (LE)", function(done) {
    const writer = createWriter(LE_FORMAT, WRITE_PROVIDER);

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'sequence01-le.bin');
    writer(filePath).then(() => {
      const reader = createReader(LE_FORMAT);

      reader(filePath).then((data) => {
        expect(data).toEqual(READ_DATA);

        done();
      }, (error) => { fail(error); done(); });
    }, (error) => { fail(error); done(); });
  });
});
