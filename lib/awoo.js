const debug = require('debug')('awoo')
const trough = require('trough')
const read = require('./read')
const write = require('./write')
const { generateConfig } = require('./config')


function _runMiddleware (hooks, files) {
  return new Promise((resolve, reject) => {
    hooks.run(files, (err, res) => {
      if (err) reject(err)
      resolve(res)
    })
  })
}

async function buildSite (site) {
  site.files = []

  debug('starting read...')
  try {
    site.files = site._config.no_read
      ? site._config.files
      : await read(site._config.source, site._config.exclude)
  } catch (errs) {
    debug('one or more errors occured while reading:')
    errs.forEach(err => { throw err })
  }

  debug('running plugins...')
  site.files = await _runMiddleware(site.hooks, site.files)

  debug('got %d files', site.files.length)
  if (site._config.no_write) {
    debug('skipping write...')
  } else {
    debug('starting write...')
    site = await write(site)
  }

  debug('all done!')
  return site
}

async function awooCore (site, fn) {
  site.use = async function (fn, opts = {}) { // not chainable because it's async !
    site.hooks.use(await fn(opts))
  }
  site.config = function (conf = {}) {
    site._config = generateConfig(conf)
    return site // allow chainability
  }
  site.add = function (/*plugin|pluginbuilder, opts*/) {
    let args = [...arguments];

    if (args.length === 2) {
      let pluginBuilder = args[0]
      let pluginOptions = args[1]
      site.hooks.use(pluginBuilder(pluginOptions))

    } else if (args.length === 1) {
      if (typeof args[0] === "object") {
        let conf = args[0];
        site._config = generateConfig(conf);

      } else if (typeof args[0] === "function") {
        let plugin = args[0], testResult;
        try {
          testResult = plugin([]); // apply plugin to an empty array to see if it returns an array
        } catch (notAPlugin) {
        }
        if (Array.isArray(testResult)) {
          site.hooks.use(plugin)   // that's the files => result plugin function itself
        } else {
          site.hooks.use(plugin()) // that's a plugin generator with no options passed
        }
      }
    }

    return site
  }

  debug('awoo is ready to go!!!')

  const resSite = await fn(site)
  if (Object.keys(site._config).length === 0) {
    site._config = generateConfig({})
  }
  return buildSite(resSite)
}

async function awoo (fn) {
  const site = {}
  site._config = {}
  site.hooks = trough()
  return awooCore(site, fn)
}

async function awooIntegration (fn, files) {
  const site = {}
  site._config = {
    no_read: true,
    no_write: true,
    files
  }
  site.hooks = trough()
  return awooCore(site, fn)
}

module.exports = awoo
module.exports.integration = awooIntegration
