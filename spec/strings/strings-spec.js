const Path  = require('path');
const OS    = require('os');

const { SNAPSHOT_PATH, compareToSnapshot }  = require('../support/utils');
const { Definers, createWriter }            = require('../../src');

describe("Test01", function() {
  const { U32, U16, BIG_ENDIAN, LITTLE_ENDIAN, LATIN1, UTF16, UTF8 } = Definers;

  const FORMAT = [
    // Header
    U32('magic',    0x4C4F434F),
    U16('version',  1),
    U16('string_latin1', LATIN1()),
    U16('string_utf16', UTF16()),
    U16('string_utf8', UTF8()),
    U16('string_utf8_defualt', UTF8('Test String 123')),
  ];

  const BE_FORMAT = BIG_ENDIAN(FORMAT);
  const LE_FORMAT = LITTLE_ENDIAN(FORMAT);

  const PROVIDER = {
    string_latin1: 'LATIN1 string',
    string_utf16: 'UTF16 string that is really long! Continue going so that we know this string is long enough',
    string_utf8: 'UTF8 string',
  };

  it("should write successfully (BE)", function(done) {
    const writer = createWriter(BE_FORMAT, PROVIDER);

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'strings01-be.bin');
    writer(filePath).then(() => {
      var result = compareToSnapshot('strings01-be.snap', filePath);
      expect(result).toBe(true);

      done();
    }, (error) => { fail(error); done(); });
  });

  it("should write successfully (LE)", function(done) {
    const writer = createWriter(LE_FORMAT, PROVIDER);

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'strings01-le.bin');
    writer(filePath).then(() => {
      var result = compareToSnapshot('strings01-le.snap', filePath);
      expect(result).toBe(true);

      done();
    }, (error) => { fail(error); done(); });
  });

  // it("should read successfully (BE)", function() {

  // });

  // it("should read successfully (LE)", function() {

  // });
});
