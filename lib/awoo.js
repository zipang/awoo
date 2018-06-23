const debug = require('debug')('awoo')
const trough = require('trough')
const read = require('./read')
const write = require('./write')
const { generateConfig } = require('./config')

<<<<<<< HEAD
=======
async function siteUse (fn, opts = {}) {
  try {
    const plugin = await fn(opts)
    this.hooks.use(plugin)
  } catch(err) {
    console.error(`plugin ${fn.name || fn} init failed:`)
    console.error(err)
    process.exit(1); // don't continue
  }
}

function siteConfig (conf = {}) {
  this._config = generateConfig(conf)
}
>>>>>>> UnhandledPromiseRejectionWarning

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

  try {
    debug('running plugins...')
    site.files = await _runMiddleware(site.hooks, site.files)
  } catch (err) {
<<<<<<< HEAD
    debug('an error occured while applying plugins:')
    debug(err)
    debug("ABORTING..")
    return site;
=======
    console.error('an error occured while applying plugins:')
    console.error(err)
    process.exit(1); // don't continue
>>>>>>> UnhandledPromiseRejectionWarning
  }

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
  site.add = function (/* conf|plugin|pluginbuilder, [opts] */) {
    let args = [...arguments];

    if (typeof args[0] === "object") {
      site._config = generateConfig(args[0]);
      return site;
    }

    if (typeof args[0] !== "function") {
      throw `add method only allow configuration objects or functions`;
    }

    // Determine if the first parameter is indeed 
    let plugin = args[0], confirmPlugin = false;

    try {
      confirmPlugin = Array.isArray(plugin([]));
    } catch(err) { // nope 
    }

    if (confirmPlugin) {
      debug(`Raw plugin ${plugin} has been added`);
      site.hooks.use(plugin);
      return site;
    }

    // We now are sure that we have a plugin builder function
    let pluginBuilder = args.shift();
    plugin = pluginBuilder.apply(pluginBuilder, args);

    if ("then" in plugin) {
      // That's a promise : we can't add it right now so we have to wrap it
      async function pluginInitialization () {
        try {
          return await (delayedPlugin = plugin);
        } catch(err) {
          throw new Error(`Plugin initialization has failed : ${plugin.name}}`);
        }
      }
      var delayedPlugin = async function(files) {
        let plugin = await pluginInitialization();
        return await plugin(files);
      }
      debug(`Unitialized plugin ${plugin} has been added`);
      site.hooks.use(delayedPlugin);

    } else if (typeof plugin === "function") {
      debug(`Final plugin ${pluginBuilder} has been added`);
      site.hooks.use(plugin);
    }

    return site
  }

  debug('awoo is ready to go!!!')

  const finalSite = await fn(site) || site
  if (Object.keys(finalSite._config).length === 0) {
    finalSite._config = generateConfig({})
  }
  return buildSite(finalSite)
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
