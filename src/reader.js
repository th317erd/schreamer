const Path        = require('path');
const FileSystem  = require('fs');
const {
  fileNodeCount,
  hasFileNode,
  createResolvable,
}                 = require('./utils');
const Definers    = require('./definers');

const DEFAULT_READ_BUFFER_SIZE = 1024;

function allNodesHaveNames(nodes) {
  for (var i = 0, il = nodes.length; i < il; i++) {
    var node = nodes[i];
    if (!node.name)
      return false;
  }

  return true;
}

async function typeHandler(node, provider, options, dataContext, userContext) {
  if (!this['endian'])
    throw new Error('Panic: Endianness not specified. Endianness can not be implicit, and must be defined.');

  var path = Path.join(this.path, (node.name) ? node.name : node.type);
  var value;

  if (node.value && node.value.kind === 'string') {
    var stringNode  = node.value;
    var byteLength  = await node.reader.call(this, node);
    value = await stringNode.reader.call(this, byteLength, options.readBufferSize);
  } else {
    value = await node.reader.call(this, node);

    if (node.value instanceof Array) {
      var itemCount = value;
      var items     = new Array(itemCount);

      for (var i = 0; i < itemCount; i++) {
        var itemPath    = Path.join(path, `[${i}]`);
        var itemContext = {};

        var result = await process.call(this.newContext(this, { path: itemPath }), node.value, (provider) ? provider[node.name] : undefined, options, itemContext, userContext);

        if (allNodesHaveNames(node.value))
          items[i] = itemContext;
        else
          items[i] = (node.value.length === 1) ? result[0] : result;
      }

      value = items;
    }
  }

  if (node.name)
    dataContext[node.name] = value;

  return value;
}

const methods = {
  big_endian: async function(node, provider, options, dataContext, userContext) {
    return await process.call(this.newContext(this, { endian: 'be' }), node.children, provider, options, dataContext, userContext);
  },
  little_endian: async function(node, provider, options, dataContext, userContext) {
    return await process.call(this.newContext(this, { endian: 'le' }), node.children, provider, options, dataContext, userContext);
  },
  dir: async function(node, provider, options, dataContext, userContext) {
    var path = Path.resolve(this.path, node.path);
    return await process.call(this.newContext(this, { path }), node.children, provider[node.path], options, dataContext, userContext);
  },
  file: async function(node, provider, options, _dataContext, userContext) {
    if (this['readStream'])
      throw new Error('Panic: Attempting to open a file within a file');

    var dataContext = _dataContext;

    return new Promise((resolve, reject) => {
      var path              = Path.resolve(this.path, node.path);
      var readStream        = (typeof options.createWritableStream === 'function')
                                ? options.createReadableStream.call(this, { node, provider, options, path, dataContext }, userContext)
                                : FileSystem.createReadStream(path);
      var readBuffer        = Buffer.alloc(0);
      var readBufferOffset  = 0;
      var dataAvailable     = createResolvable();
      var complete          = false;
      var throwError        = (error) => {
        this.error = error;
        reject(error);
      };

      readStream.on('error', throwError);

      readStream.on('open', () => {
        var newContext = this.newContext(this, {
          path,
          readStream,
          readBuffer,
          readBufferOffset,
          dataAvailable,
          complete,
        });

        newContext.updateReadBufferOffset = (readBufferOffset) => {
          newContext.readBufferOffset = readBufferOffset;
          return readBufferOffset;
        };

        newContext.updateReadBuffer = (readBuffer) => {
          newContext.readBuffer = readBuffer;
        };

        newContext.waitOnData = async (bytesNeeded) => {
          while(true) {
            if ((newContext.readBuffer.length - newContext.readBufferOffset) >= bytesNeeded)
              return;

            if (newContext.complete)
              throw new Error('Panic: Stream closed but data was still expected');

            if (newContext.error)
              throw new Error(newContext.error);

            return await newContext.dataAvailable;
          }
        };

        readStream.on('data', (chunk) => {
          var newBuffer = Buffer.concat([
            newContext.readBuffer.slice(newContext.readBufferOffset),
            chunk,
          ]);

          newContext.updateReadBuffer(newBuffer);
          newContext.updateReadBufferOffset(0);

          if (newBuffer.length >= options.readBufferSize) {
            var promise = newContext.dataAvailable;
            newContext.dataAvailable = createResolvable();
            promise.resolve();
          }
        });

        readStream.on('end', () => {
          newContext.complete = true;
          newContext.dataAvailable.resolve();
        });

        if (this.numberOfFileNodes > 1) {
          var newDataContext = {};
          dataContext[node.path] = newDataContext;
          dataContext = newDataContext;
        }

        process.call(
          newContext,
          node.children,
          provider[node.path],
          options,
          dataContext,
          userContext,
        ).then(async () => {
          readStream.destroy();

          resolve();
        }, throwError);
      });
    });
  },
  group: async function(node, provider, options, userContext) {
    return await process.call(this, node.children, provider, options, userContext);
  },
  select: async function(node, provider, options, userContext) {
    var format = node.callback.call(this, { node, provider, options }, userContext);
    format.parent = node.parent;

    return await process.call(this, format, provider, options, userContext);
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

async function process(_nodes, provider, options, dataContext, userContext) {
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

    results.push(await method.call(this, node, provider, options, dataContext, userContext));
  }

  return results;
}

function createReader(_format, _provider) {
  var format    = _format;
  var provider = _provider || {};

  return async function(_options, _userContext) {
    var options = {
      readBufferSize: DEFAULT_READ_BUFFER_SIZE,
      path: '.',
    };

    if (typeof _options === 'string' || (_options instanceof String)) {
      options.path = ('' + _options);
    } else if (typeof _options === 'object') {
      Object.assign(options, _options);
    }

    if (options.readBufferSize < 128)
      options.readBufferSize = 128;

    // A file node is required, so make sure one can be found...
    // if one isn't found, then add one
    var numberOfFileNodes = fileNodeCount(format);
    if (!numberOfFileNodes) {
      var path = options.path;
      options.path = Path.dirname(path);

      var fileName = Path.basename(path);
      format = Definers.FILE(fileName, format);

      provider = {
        [fileName]: provider,
      };
    }

    var dataContext = {};
    var userContext = _userContext || {};
    var context = {
      path: Path.resolve(options.path),
      numberOfFileNodes,
      newContext: function(context, obj) {
        var c = Object.create(context);

        if (obj)
          Object.assign(c, obj);

        return c;
      }
    };

    await process.call(context, format, provider, options, dataContext, userContext);

    return dataContext;
  };
}

module.exports = {
  createReader,
};
