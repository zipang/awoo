const path  = require("path")
const chain = require("./chain")
const Chain = chain.Chain
const read  = require("./read")
const write = require("./write")

const _DEFAULTS = {
  source: process.cwd(),
  destination: path.join(process.cwd(), '_site'),
  debug: console.log,
  dry_run: false,
  content_files: ['.md', '.markdown', '.yaml'], // load only the content for these extension
  media_files: ['.jpg', '.png', '.jpeg', '.gif', '.svg'], // load only description for these extension
  exclude: [
    'package.json',
    'node_modules/',
    'bower_components/',
    'coverage/',
    '_site/',
    '.git/'
  ],
  files: []
}

/**
 * A static site awoo configuration
 * Will take some initial configuration like `source` and `destination`
 * And use some plugins to build
 *
 * Usage examples :
 *   let site = new Site({ source: "content/", destination: "public/ "})
 *   // add plugins one by one
 *   site.use(awoomatter)
 *   site.use(markdown)
 *   // or in a chainable way and with named plugins :
 *   new Site(opts)
 *     .use("awoo-markdown", markdownPlugin, markdownOptions)
 *     .use("awoo-metalsmith", metalsmithPlugin, metalsmithOptions)
 */
class Site {

  constructor(opts = {}) {
    let site = this
    site.config(opts)
    site.debug = site._config.debug
    site._build = chain("build", {
      // give every plugin a link to the site's configuration and a free logger function
      inject: [site._config, site._config.debug],
      debug: site.debug
    })
    site._plugins = chain("plugins")
  }

  config (opts = {}) {
    let conf = this._config = Object.assign(this._config || {}, _DEFAULTS, opts)
    if (opts.destination) {
      conf.exclude.push(path.relative(process.cwd(), opts.destination))
    }
    return this
  }

  async _readFiles (conf, debug) {
    return conf.no_read
      ? conf.files
      : await read(conf.source, conf, debug)
  }

  async _writeFiles (files, conf, debug) {
    if (conf.no_write) {
      debug('skipping write...')
    } else {
      debug('starting write...')
      await write(files, conf)
    }
    return files
  }

  use (/* [name], conf|plugin|pluginbuilder, [opts] */) {
    let site = this
    let args = [...arguments]
    let debug = site.debug

    // First passed argument can be the plugin name
    let pluginName = (typeof args[0] === "string") ? args.shift() : ""

    // Is it a change in the site's configuration
    if (typeof args[0] === 'object') {
      return site.config(args[0])
    }

    if (typeof args[0] !== 'function') {
      throw new Error(`.use method only allow configuration objects or functions`)
    }

    // Determine if the function is a raw plugin (synchronous and without init step)
    let plugin = args[0]
    let confirmedPlugin = false

    try {
      confirmedPlugin = (plugin.constructor.name !== 'AsyncFunction') && Array.isArray(plugin([]))
    } catch (err) { // nope
    }

    if (confirmedPlugin) {
      site._plugins.use(new AwooPlugin(pluginName, plugin, debug))
      return site
    }

    // We now are sure that we have a plugin builder function
    let pluginBuilder = args.shift()
    plugin = pluginBuilder.apply(pluginBuilder, args)

    if ('then' in plugin) {
      // That's a promise ! We must wrap it to use it when it's ready
      site._plugins.use(new AwooPlugin(pluginName, AwooPlugin.initAndRun(plugin, debug), debug))

    } else if (typeof plugin === 'function') {
      site._plugins.use(new AwooPlugin(pluginName, plugin, debug))
    }

    return site
  }

  async build() {
    let { _build, _readFiles, _plugins, _writeFiles } = this
    let files = await _build.use(_readFiles).use(_plugins).use(_writeFiles).run()
    return this
  }
}

/**
 * AwooPlugin runnable instances are used to wrap async or sync plugin functions
 * Because the `name` property on anonymous functions is read-only
 * So, when calling `site.use(name, fn, opts)`
 * an AwooPlugin will be created and added to the plugins chain
 */
class AwooPlugin {

  constructor (name, fn, debug) {
    this.name = name
    this.fn = fn.bind(this)
    if (debug) debug(`Added new plugin ${this}`)
  }

  /**
   * Build the init and run method that will be executed on the AwooPlugin instance
   */
  static initAndRun (pluginInit, debug) {
    return async function delayedRun() {
      try {
        this.fn = await pluginInit // note : `this` will be the AwooPlugin instance
        debug(`Plugin ${this} has been initialized`)
      } catch (err) {
        debug(`Plugin initialization has failed : ${this}}`)
        Chain.exit(err)
      }
      return await this.run.apply(this, arguments)
    }
  }

  async run(/* arguments */) {
    return await this.fn.apply(this, arguments)
  }

  toString() {
    return this.name || this.fn.name || this.fn.toString().substr(0, 50) + "(...)"
  }
}


/**
 * Exporting a simple factory function for new Sites
 */
let site = module.exports = (conf) => new Site(conf)
site.use = () => {
  let args = [...arguments]
  let _site = new Site
  return _site.use.apply(_site, args)
}
site.config = (conf) => new Site(conf)

module.exports.Site = Site
module.exports.AwooPlugin = AwooPlugin
