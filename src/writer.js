const Path        = require('path');
const FileSystem  = require('fs');
const {
  isValid,
  hasFileNode,
}                 = require('./utils');
const Definers    = require('./definers');

const DEFAULT_WRITE_BUFFER_SIZE = 1024 * 16;

async function writeToStream() {
  const doWrite = (chunk) => {
    // On successful write, return
    if (writeStream.write(chunk))
      return;

    return new Promise((resolve, reject) => {
      writeStream.on('error', reject);

      writeStream.once('drain', () => {
        writeStream.off('error', reject);
        resolve();
      });
    });
  };

  var {
    writeStream,
    writeBuffer,
    writeBufferOffset,
  } = this;

  if (!writeBufferOffset)
    return;

  var chunk = Buffer.from(writeBuffer.slice(0, writeBufferOffset));
  await doWrite(chunk);

  this.updateWriteBufferOffset(0);
}

async function writeToBuffer(node, value, userContext) {
  const doWriteBuffer = async (sourceBuffer) => {
    var sourceBufferOffset = 0;

    while(true) {
      var sizeToCopy = writeBuffer.length - writeBufferOffset;
      if ((sourceBufferOffset + sizeToCopy) > sourceBuffer.length)
        sizeToCopy = sourceBuffer.length - sourceBufferOffset;

      sourceBuffer.copy(writeBuffer, writeBufferOffset, sourceBufferOffset, sourceBufferOffset + sizeToCopy);

      writeBufferOffset += sizeToCopy;
      this.updateWriteBufferOffset(writeBufferOffset);

      if (writeBufferOffset >= writeBuffer.length) {
        await writeToStream.call(this);
        writeBufferOffset = 0;
      }

      sourceBufferOffset += sizeToCopy;
      if (sourceBufferOffset >= sourceBuffer.length)
        break;
    }
  };

  var {
    writeBuffer,
    writeBufferOffset,
  } = this;

  if (node.kind !== 'string' && node.type !== 'custom') {
    var byteSize = (typeof node.byteSize === 'function') ? node.byteSize(node, value, this) : node.byteSize;
    if ((writeBufferOffset + byteSize) > writeBuffer.length) {
      await writeToStream.call(this);
      writeBufferOffset = 0;
    }

    node.writer.call(this, value, writeBuffer, writeBufferOffset, userContext);

    this.updateWriteBufferOffset(writeBufferOffset + byteSize);

    return byteSize;
  } else {
    var result = await node.writer.call(this, value, writeBuffer, writeBufferOffset, userContext);
    if (result && Buffer.isBuffer(result))
      await doWriteBuffer(result);

    return result.length;
  }
}

async function typeHandler(node, provider, options, userContext) {
  if (!this['endian'])
    throw new Error('Panic: Endianness not specified. Endianness can not be implicit, and must be defined.');

  const debug = (message, ...args) => {
    console.debug(`${message} @ ${this.writeBufferOffset}:`, ...args);
  };

  var path = Path.join(this.path, (node.name) ? node.name : node.type);
  var value;

  if (isValid(provider)) {
    if (provider instanceof Array) {
      if (this.sequence)
        value = provider[this.nodeIndex];
      else
        value = provider;
    } else if (node.name) {
      value = provider[node.name];
    } else {
      value = provider;
    }
  }

  if (value === undefined)
    value = node.value;

  if (node.type === 'custom') {
    if (value === provider)
      value = undefined;

    if (typeof value === 'function')
      value = value.call(this, userContext);

    return await writeToBuffer.call(this, node, value, userContext);
  }

  if (!isValid(value))
    throw new Error(`${path}: Invalid value provided`);

  const writeArrayItems = async (items) => {
    var sequenceSize = items.length;

    if (options.debug)
      debug('Writing raw sequence length', path, sequenceSize);

    await writeToBuffer.call(this, node, sequenceSize, userContext);

    for (var i = 0, il = items.length; i < il; i++) {
      var item      = items[i];
      var itemPath  = Path.join(path, `[${i}]`);

      if (!isValid(item))
        throw new Error(`${itemPath}: Invalid value provided`);

      if (options.debug)
        debug('Writing raw sequence item', itemPath, item);

      await process.call(this.newContext(this, { sequence: true, path: itemPath }), node.value, item, options, userContext);
    }
  };

  if (typeof value === 'function') {
    value = value.call(this, userContext);
    if (!isValid(value))
      throw new Error(`${path}: Invalid value provided`);

    // Handle a sequence
    if (node.value instanceof Array || (node.value && node.value.type === 'group')) {
      var items = value;

      // Raw array?
      if (items instanceof Array)
        return await writeArrayItems(items);

      // Or generator?
      var index = 0;
      for (var item of items) {
        // First is the length of items to follow
        if (index === 0) {
          var sequenceSize = item;

          if (options.debug)
            debug('Writing generated sequence length', path, sequenceSize);

          await writeToBuffer.call(this, node, sequenceSize, userContext);
        } else {
          var itemPath = Path.join(path, `[${index - 1}]`);
          if (!isValid(item))
            throw new Error(`${itemPath}: Invalid value provided`);

          if (options.debug)
            debug('Writing generated sequence item', itemPath, item);

          await process.call(this.newContext(this, { sequence: true, path: itemPath }), node.value, item, options, userContext);
        }

        index++;
      }

      return;
    }
  }

  if (value instanceof Array) {
    // Handle array of items
    return await writeArrayItems(value);
  } else if (node.value && node.value.kind === 'string') {
    // Handle writing a string
    var stringNode = node.value;

    // If value wasn't provided, then extract the actual value from the string node
    if (value === stringNode) {
      value = value.value;
      path  = Path.join(path, (stringNode.name) ? stringNode.name : stringNode.type);

      if (!isValid(value))
        throw new Error(`${path}: Invalid value provided`);
    }

    // Write length of string in bytes
    var byteSize = stringNode.byteSize(stringNode, value, this);

    if (options.debug)
      debug('Writing string byteLength', path, byteSize);

    await writeToBuffer.call(this, node, byteSize, userContext);

    // Write string
    if (options.debug)
      debug('Writing string', path, value);

    await writeToBuffer.call(this, stringNode, value, userContext);

    return;
  }

  if (options.debug)
    debug('Writing value', path, value);

  await writeToBuffer.call(this, node, value, userContext);
}

const methods = {
  big_endian: async function(node, provider, options, userContext) {
    return await process.call(this.newContext(this, { endian: 'be' }), node.children, provider, options, userContext);
  },
  little_endian: async function(node, provider, options, userContext) {
    return await process.call(this.newContext(this, { endian: 'le' }), node.children, provider, options, userContext);
  },
  dir: async function(node, provider, options, userContext) {
    var path = Path.resolve(this.path, node.path);
    return await process.call(this.newContext(this, { path }), node.children, provider[node.path], options, userContext);
  },
  file: async function(node, provider, options, userContext) {
    if (this['writeStream'])
      throw new Error('Panic: Attempting to open a file within a file');

    return new Promise((resolve, reject) => {
      FileSystem.mkdirSync(this.path, { recursive: true });

      var path              = Path.resolve(this.path, node.path);
      var writeStream       = (typeof options.createWritableStream === 'function')
                                ? options.createWritableStream.call(this, { node, provider, options, path }, userContext)
                                : FileSystem.createWriteStream(path);
      var writeBuffer       = Buffer.alloc(options.writeBufferSize);
      var writeBufferOffset = 0;
      var throwError        = (error) => {
        this.error = error;
        reject(error);
      };

      writeStream.on('error', throwError);

      writeStream.on('open', () => {
        var newContext = this.newContext(this, {
          path,
          writeStream,
          writeBuffer,
          writeBufferOffset,
        });

        newContext.updateWriteBufferOffset = (writeBufferOffset) => {
          newContext.writeBufferOffset = writeBufferOffset;
          return writeBufferOffset;
        };

        newContext.writeToStream = writeToStream.bind(newContext);

        process.call(
          newContext,
          node.children,
          provider[node.path],
          options,
          userContext,
        ).then(async () => {
          await writeToStream.call(newContext);

          writeStream.end();

          resolve();
        }, throwError);
      });
    });
  },
  group: async function(node, provider, options, userContext) {
    return await process.call(this, node.children, provider, options, userContext);
  },
  select: async function(node, provider, options, userContext) {
    var newNode = node.callback.call(this, {}, userContext, { node, provider, options });
    newNode.parent = node.parent;

    return await process.call(this, newNode, provider, options, userContext);
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
  custom: typeHandler,
  // String handlers aren't here deliberately.
  // They are handled by their "length" specifier,
  // which could be a U8, U16, U32, or U64 node.
};

async function process(_nodes, provider, options, userContext) {
  if (this.error)
    throw new Error(this.error);

  var nodes = _nodes;
  if (!(nodes instanceof Array))
    nodes = [ nodes ];

  var results = [];

  for (var i = 0, il = nodes.length; i < il; i++) {
    var node = nodes[i];
    if (!node)
      throw new Error(`Panic: Invalid type '${this['path']}/${node}'`);

    var type    = node.type;
    var method  = methods[type];

    if (!method)
      throw new Error(`Panic: Unknown type '${this['path']}/${type.toUpperCase()}'`);

    results.push(await method.call(this.newContext(this, { nodeIndex: i }), node, provider, options, userContext));
  }

  return results;
}

function createWriter(_format, _provider) {
  var format    = _format;
  var provider = _provider;

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

      var fileName = Path.basename(path);
      format = Definers.FILE(fileName, format);

      provider = {
        [fileName]: provider,
      };
    }

    var userContext = _userContext || {};
    var context = {
      mode: 'write',
      path: Path.resolve(options.path),
      newContext: function(context, obj) {
        var c = Object.create(context);

        if (obj)
          Object.assign(c, obj);

        return c;
      }
    };

    return await process.call(context, format, provider, options, userContext);
  };
}

module.exports = {
  createWriter,
};
