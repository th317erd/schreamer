const Path          = require('path');
const FileSystem    = require('fs');
const { isValid }   = require('./utils');
const Definers      = require('./definers');

const DEFAULT_WRITE_BUFFER_SIZE = 1024 * 2;

function hasFileNode(format) {
  if (format instanceof Array) {
    for (var i = 0, il = format.length; i < il; i++) {
      var node = format[i];
      if (hasFileNode(node))
        return true;
    }
  }

  if (format.type === 'dir')
    return true;

  if (format.type === 'file')
    return true;

  var children = format.children || format.value;
  if (children instanceof Array)
    return hasFileNode(children);

  return false;
}

async function writeToStream() {
  const doWrite = (chunk) => {
    if (!writeStream.write(chunk)) {
      return new Promise((resolve, reject) => {
        const errorHandler = (error) => reject(error);

        stream.on('error', errorHandler);

        stream.once('drain', async () => {
          stream.off('error', errorHandler);

          await doWrite(chunk);

          resolve();
        });
      });
    }
  };

  var {
    writeStream,
    writeBuffer,
    writeBufferOffset,
  } = this;

  if (!writeBufferOffset)
    return;

  var chunk = writeBuffer.slice(0, writeBufferOffset);
  await doWrite(chunk);

  this.updateWriteBufferOffset(0);
}

async function writeToBuffer(node, value) {
  var {
    writeBuffer,
    writeBufferOffset,
  } = this;

  var byteSize = (typeof node.byteSize === 'function') ? node.byteSize(node, value, this) : node.byteSize;
  if ((writeBufferOffset + byteSize) > writeBuffer.length) {
    await writeToStream.call(this);
    writeBufferOffset = 0;
  }

  node.writer.call(this, writeBuffer, value, writeBufferOffset);

  this.updateWriteBufferOffset(writeBufferOffset + byteSize);

  return byteSize;
}

async function typeHandler(node, processor, options, userContext) {
  if (!this['endian'])
    throw new Error('Panic: Endianness not specified. Endianness can not be implicit, and must be defined.');

  var path = Path.join(this.path, (node.name) ? node.name : node.type);
  var value;

  if (isValid(processor))
    value = (node.name) ? processor[node.name] : processor;

  if (value === undefined)
    value = node.value;

  if (!isValid(value))
    throw new Error(`${path}: Invalid value provided`);

  if (typeof value === 'function') {
    // Handle a sequence
    if (node.value instanceof Array) {
      var iter          = value.call(this, userContext);
      var sequenceSize  = iter.next();

      if (sequenceSize.done)
        return;

      sequenceSize = sequenceSize.value;

      await writeToBuffer.call(this, node, sequenceSize);

      for (var item = iter.next(), index = 0; !item.done; item = iter.next(), index++) {
        var itemValue = item.value;
        var itemPath  = Path.join(path, `[${index}]`);

        if (!isValid(itemValue))
          throw new Error(`${itemPath}: Invalid value provided`);

        await process.call(this.newContext(this, { path: itemPath }), node.value, itemValue, options, userContext);
      }

      return;
    } else {
      value = value.call(this, userContext);
    }
  }

  await writeToBuffer.call(this, node, value);
}

const methods = {
  big_endian: async function(node, processor, options, userContext) {
    return await process.call(this.newContext(this, { endian: 'be' }), node.children, processor, options, userContext);
  },
  little_endian: async function(node, processor, options, userContext) {
    return await process.call(this.newContext(this, { endian: 'le' }), node.children, processor, options, userContext);
  },
  dir: async function(node, processor, options, userContext) {
    var path = Path.resolve(this.path, node.path);
    return await process.call(this.newContext(this, { path }), node.children, processor[node.path], options, userContext);
  },
  file: async function(node, processor, options, userContext) {
    return new Promise((resolve, reject) => {
      FileSystem.mkdirSync(this.path, { recursive: true });

      var path              = Path.resolve(this.path, node.path);
      var writeStream       = FileSystem.createWriteStream(path);
      var writeBuffer       = Buffer.alloc(options.writeBufferSize);
      var writeBufferOffset = 0;

      writeStream.on('error', reject);
      writeStream.on('open', () => {
        var newContext = this.newContext(this, {
          path,
          writeStream,
          writeBuffer,
          writeBufferOffset,
        });

        newContext.updateWriteBufferOffset = (writeBufferOffset) => {
          newContext.writeBufferOffset = writeBufferOffset;
        };

        process.call(
          newContext,
          node.children,
          processor[node.path],
          options,
          userContext,
        ).then(async () => {
          await writeToStream.call(newContext);
          resolve();
        }, reject);
      });
    });
  },
  i8: typeHandler,
  u8: typeHandler,
  i16: typeHandler,
  u16: typeHandler,
  i32: typeHandler,
  u32: typeHandler,
  i64: typeHandler,
  u64: typeHandler,
  f32: typeHandler,
  f64: typeHandler,

  // TODO: String types
};

async function process(_nodes, processor, options, userContext) {
  var nodes = _nodes;
  if (!(nodes instanceof Array))
    nodes = [ nodes ];

  var results = [];

  for (var i = 0, il = nodes.length; i < il; i++) {
    var node    = nodes[i];
    var type    = node.type;
    var method  = methods[type];

    if (!method)
      throw new Error(`Unknown type '${type.toUpperCase()}'... aborting`);

    results.push(await method.call(this, node, processor, options, userContext));
  }

  return results;
}

function createWriter(_format, processor) {
  var format = _format;

  return async function(_options, _userContext) {
    var options = {
      writeBufferSize: DEFAULT_WRITE_BUFFER_SIZE,
      path: '.',
    };

    if (typeof _options === 'string' || (_options instanceof String)) {
      options.path = ('' + _options);
    } else if (typeof _options === 'object') {
      Object.assign(options, _options);
    }

    // A file node is required, so make sure one can be found...
    // if one isn't found, then add one
    if (!hasFileNode(format)) {
      var path = options.path;

      options.path = Path.dirname(path);
      format = Definers.FILE(Path.basename(path), format);
    }

    var userContext = _userContext || {};
    var context = {
      path: Path.resolve(options.path),
      newContext: function(context, obj) {
        var c = Object.create(context);

        if (obj)
          Object.assign(c, obj);

        return c;
      }
    };

    return await process.call(context, format, processor, options, userContext);
  };
}

module.exports = {
  createWriter,
};
