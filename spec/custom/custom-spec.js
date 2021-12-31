const Path  = require('path');
const OS    = require('os');

const { SNAPSHOT_PATH, compareToSnapshot }  = require('../support/utils');
const { Definers, createWriter }            = require('../../src');

describe("Test01", function() {
  const { U32, U16, BIG_ENDIAN, LITTLE_ENDIAN, CUSTOM } = Definers;

  function customWriter(_value) {
    var value     = _value || 'Hello World!';
    var stringBuf = Buffer.from(value);
    var buf       = Buffer.alloc(stringBuf.length + 2);

    buf[(this['endian'] === 'be') ? 'writeUInt16BE' : 'writeUInt16LE' ](value.length, 0);
    stringBuf.copy(buf, 2);

    return buf;
  }

  function customReader() {

  }

  const FORMAT = [
    // Header
    U32('magic',    0x4C4F434F),
    U16('version',  1),
    CUSTOM(
      customWriter,
      customReader,
      'data',
    ),
    CUSTOM(
      customWriter,
      customReader,
    )
  ];

  const BE_FORMAT = BIG_ENDIAN(FORMAT);
  const LE_FORMAT = LITTLE_ENDIAN(FORMAT);

  const PROVIDER = {
    data: 'Test String',
  };

  it("should write successfully (BE)", function(done) {
    const writer = createWriter(BE_FORMAT, PROVIDER);

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'custom01-be.bin');
    writer('/tmp/schreamer/custom01-be.bin').then(() => {
      var result = compareToSnapshot('custom01-be.snap', filePath);
      expect(result).toBe(true);

      done();
    }, (error) => { fail(error); done(); });
  });

  it("should write successfully (LE)", function(done) {
    const writer = createWriter(LE_FORMAT, PROVIDER);

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'custom01-le.bin');
    writer(filePath).then(() => {
      var result = compareToSnapshot('custom01-le.snap', filePath);
      expect(result).toBe(true);

      done();
    }, (error) => { fail(error); done(); });
  });

  // it("should read successfully (BE)", function() {

  // });

  // it("should read successfully (LE)", function() {

  // });
});
