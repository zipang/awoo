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
 * And use some plugins to build
 */
class Site {

  constructor(opts = {}) {
    let site = this
    site.config(opts)
    site._build = chain("build", {
      // give every plugin a link to the site's configuration and a free logger function
      inject: [site._config, site._config.debug]
    })
    site._plugins = chain("plugins")
    site.debug = site._config.debug;
  }

  config (opts = {}) {
    let conf = this._config = Object.assign(this._config || {}, _DEFAULTS, opts)
    if (opts.destination) {
      conf.exclude.push(path.relative(process.cwd(), opts.destination))
    }
    return this
  }

  async _readFiles (conf) {
    return conf.no_read
      ? conf.files
      : await read(conf.source, conf.exclude)
  }

  async _writeFiles (files, conf, debug) {
    if (conf.no_write) {
      debug('skipping write...')
    } else {
      debug('starting write...')
      await write(files, conf)
    }
    return conf
  }

  use (/* conf|plugin|pluginbuilder, [opts] */) {
    let site = this
    let args = [...arguments]
    let debug = site.debug
    let pluginName = ''

    if (typeof(args[0]) === 'string') {
      pluginName = args.shift()
    }

    // Is it a change in the site's configuration
    if (typeof args[0] === 'object') {
      return site.config(args[0])
    }

    if (typeof args[0] !== 'function') {
      throw new Error(`.use method only allow configuration objects or functions`)
    }

    // Determine if the first parameter is indeed a plugin
    let plugin = args[0]
    let confirmedPlugin = false

    try {
      confirmedPlugin = (plugin.constructor.name !== 'AsyncFunction') && Array.isArray(plugin([]))
    } catch (err) { // nope
    }

    if (confirmedPlugin) {
      debug(`Raw plugin ${pluginName} has been added`)
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
    let { _config, _build, _readFiles, _plugins, _writeFiles } = site
    return await _build.use(_readFiles).use(_plugins).use(_writeFiles).run(_config)
  }
}

let site = module.exports = (conf) => new Site(conf)
site.use = () => {
  let args = [...arguments]
  let _site = new Site
  return _site.use.apply(_site, args)
}

module.exports.Site = Site
