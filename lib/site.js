const path  = require("path")
const chain = require("./chain")
const read  = require("./read")
const write = require("./write")

const _DEFAULTS = {
  source: process.cwd(),
  destination: path.join(process.cwd(), '_site'),
  debug: console.log,
  dry_run: false,
  exclude: [
    'package.json',
    'node_modules/',
    'bower_components/',
    'coverage/',
    '_site',
    '.git'
  ],
  files: []
}

/**
 * A static site awoo configuration
 * Will take some initial configuration like `source` and `destination`
 * And some plugins to build
 */
class Site {

  constructor(opts = {}) {
    let site = this
    site.config(opts)
    site._build = chain("build", {
      inject: [site, site._config.debug]
    })
    site._plugins = chain("plugins")
    site.debug = site._config.debug;
  }

  config (opts = {}) {
    let conf = this._config = Object.assign({}, _DEFAULTS, opts)
    if (opts.destination) {
      conf.exclude.push(path.relative(process.cwd(), opts.destination))
    }
    return this
  }

  async _readFiles (site) {
    return site._config.no_read
      ? site._config.files
      : await read(site._config.source, site._config.exclude)
  }

  async _writeFiles (files, site, debug) {
    if (site._config.no_write) {
      debug('skipping write...')
    } else {
      debug('starting write...')
      await write(files, site)
    }
    return site
  }

  use (/* conf|plugin|pluginbuilder, [opts] */) {
    let site = this
    let args = [...arguments]
    let debug = site.debug

    // Is it a change in the site's configuration
    if (typeof args[0] === 'object') {
      return site.config(args[0])
    }

    if (typeof args[0] !== 'function') {
      throw new Error(`add method only allow configuration objects or functions`)
    }

    // Determine if the first parameter is indeed a plugin
    let plugin = args[0]
    let confirmedPlugin = false

    try {
      confirmedPlugin = (plugin.constructor.name !== 'AsyncFunction') && Array.isArray(plugin([]))
    } catch (err) { // nope
    }

    if (confirmedPlugin) {
      debug(`Raw plugin ${plugin} has been added`)
      site._plugins.use(plugin)
      return site
    }

    // We now are sure that we have a plugin builder function
    let pluginBuilder = args.shift()
    plugin = pluginBuilder.apply(pluginBuilder, args)

    if ('then' in plugin) {
      // That's a promise ! We must wrap it to use it when it's ready
      var delayedPlugin;
      delayedPlugin = async function () {
        try {
          let args = [...arguments]
          delayedPlugin = await plugin
          debug(`Async plugin ${pluginBuilder.name || finalPlugin} has been initialized`)
          return await delayedPlugin.apply(delayedPlugin, args)
        } catch (err) {
          throw new Error(`Plugin initialization has failed : ${plugin.name}}`)
        }
      }
      site._plugins.use(delayedPlugin)

    } else if (typeof plugin === 'function') {
      debug(`Final plugin ${pluginBuilder.name || plugin} has been added`)
      site._plugins.use(plugin)
    }

    return site
  }

  async build() {
    let site = this
    let { _build, _readFiles, _plugins, _writeFiles } = site
    return await _build.use(_readFiles).use(_plugins).use(_writeFiles).run(site)
  }
}

module.exports = Site
module.exports.site = (conf) => new Site(conf)
