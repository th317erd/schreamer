const Path  = require('path');
const OS    = require('os');

const { SNAPSHOT_PATH, compareToSnapshot }  = require('../support/utils');
const {
  Definers,
  createWriter,
  createReader,
} = require('../../src');

describe("Custom Test 01", function() {
  const { U32, U16, BIG_ENDIAN, LITTLE_ENDIAN, CUSTOM, GROUP } = Definers;

  function customWriter(_value) {
    var value     = _value || 'Hello World!';
    var stringBuf = Buffer.from(value);
    var buf       = Buffer.alloc(stringBuf.length + 2);

    buf[(this['endian'] === 'be') ? 'writeUInt16BE' : 'writeUInt16LE' ](value.length, 0);
    stringBuf.copy(buf, 2);

    return buf;
  }

  async function customReader() {
    await this.waitOnData(2);

    var byteLength = this.readBuffer[(this['endian'] === 'be') ? 'readUInt16BE' : 'readUInt16LE' ](this.readBufferOffset);
    this.updateReadBufferOffset(this.readBufferOffset + 2);

    await this.waitOnData(byteLength);

    var result = this.readBuffer.slice(this.readBufferOffset, this.readBufferOffset + byteLength);
    this.updateReadBufferOffset(this.readBufferOffset + byteLength);

    return result.toString('utf8');
  }

  const FORMAT = GROUP(
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
      'data2',
    )
  );

  const BE_FORMAT = BIG_ENDIAN(FORMAT);
  const LE_FORMAT = LITTLE_ENDIAN(FORMAT);

  const WRITE_PROVIDER = {
    data: 'Test String',
  };

  const READ_DATA = {
    "magic": 1280262991,
    "version": 1,
    "data": "Test String",
    "data2": "Hello World!",
  };

  it("should write successfully (BE)", function(done) {
    const writer = createWriter(BE_FORMAT, WRITE_PROVIDER);

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'custom01-be.bin');
    writer(filePath).then(() => {
      var result = compareToSnapshot('custom01-be.snap', filePath);
      expect(result).toBe(true);

      done();
    }, (error) => { fail(error); done(); });
  });

  it("should write successfully (LE)", function(done) {
    const writer = createWriter(LE_FORMAT, WRITE_PROVIDER);

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'custom01-le.bin');
    writer(filePath).then(() => {
      var result = compareToSnapshot('custom01-le.snap', filePath);
      expect(result).toBe(true);

      done();
    }, (error) => { fail(error); done(); });
  });

  it("should read successfully (BE)", function(done) {
    const writer = createWriter(BE_FORMAT, WRITE_PROVIDER);

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'custom01-be.bin');
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

    var filePath = Path.join(OS.tmpdir(), 'schreamer', 'custom01-le.bin');
    writer(filePath).then(() => {
      const reader = createReader(LE_FORMAT);

      reader(filePath).then((data) => {
        expect(data).toEqual(READ_DATA);

        done();
      }, (error) => { fail(error); done(); });
    }, (error) => { fail(error); done(); });
  });
});
