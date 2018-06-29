// These are the defaults options when you build a new chain
const _DEFAULTS = {
  ensureName: false,     // enforce every plugin function to have a name (for tracability)
  wrapper: basicWrapper, // see below : logging and timing of every plugin execution
  inject: [],            // a list of dependency injections is given here
  debug: console.log,    // can be replaced by any logger package and in,jected in the chain after
}

/**
 * let chain = new Chain("do it")
 */
class Chain {

  constructor(name, opts = {}) {
    if (typeof name !== "string") {
      chain.exit("Every chain must be given a name")
    }
    if ( "inject" in opts && !Array.isArray(opts.inject) ) {
      chain.exit(`Parameters to inject must be an array`)
    }
    if ( typeof opts.debug !== "function" ) {
      console.log("Silenting debug")
      opts.debug = () => {}
    }
    this.name = name
    this.opts = Object.assign({}, _DEFAULTS, opts)
    this.steps = []
  }

  /**
   * Adds a new plugin to the list of steps in this chain
   * @param {Function|Runnable} fn
   * @returns the chain
   */
  use (fn) {
    let chain = this
    let { opts, steps } = chain

    if ( opts.ensureName && !fn.name ) {
      chain.exit(`Option ensureName tells us that any chain middleware must be given a name to ensure maximum tracability
      (anonymous function are not allowed).
      Reported plugin is ${fn}`)
    }

    if ( fn instanceof Chain || typeof fn.run === "function" ) { // That's great ! we now how to run this
      steps.push(fn.run.bind(fn))
      return chain
    }

    let wrapped = opts.wrapper(fn, opts)

    if ( typeof wrapped !== "function" ) {
      chain.exit(`Plugin wrapper ${opts.wrapper.name} didn't return a function.`)
    }
    steps.push(wrapped)

    return chain
  }

  /**
   * Runs the chain after it has been defined
   * If anything bad happens, it will just reports and exit with an error code !
   * (no Unhandled)
   */
  async run(/* any params here will be passed to the first plugin in the chain */) {
    let chain = this
    let { opts, steps } = chain
    let debug = opts.debug
    let args = [...arguments] || []
    args.push.apply(args, opts.inject)

    debug(`${chain.name} has started with ${args.length} arguments`)

    let i = 0, plugin
    while (plugin = steps[i++]) {
      try {
        let stepResult = await plugin.apply(plugin, args)
        args[0] = stepResult
      } catch (err) {
        debug(`${chain.name} has failed on step ${i} (${plugin})`)
        chain.exit(err)
      }
    }

    debug(`Chain ${chain.name} has succeeded`)
    return args[0]
  }

  /**
   * When something has gone wrong..
   * @param {String|Error} err
   */
  static exit(err) {
    if (typeof err === "string") {
      err = new Error(err)
    }
    console.error(err)
    process.exit(1)
  }

  exit(err) {
    Chain.exit(err)
  }

  get toString() {
    return this.name
  }
}

/**
 * This basic wrapper logs the start and end time of the plugin's execution
 * @param {Object} opts Chain options
 * @param {Function} fn a plugin
 */
function basicWrapper(fn, opts) {
  let wrapper = async function() {
    let args = [...arguments]
    let pluginName = fn.name || (fn.toString().substr(0, 40) + " (...)")
    try {
      opts.debug(`Plugin ${pluginName} is starting`)
      let start   = Date.now()
      let result  = await fn.apply(fn, args)
      let elapsed = Date.now() - start
      opts.debug(`Plugin ${pluginName} has returned after ${elapsed}ms`)
      return result

    } catch (err) {
      chain.exit(`Plugin ${pluginName} execution has failed`)
    }
  }
  return wrapper
}



module.exports = (name, opts) => new Chain(name, opts)
module.exports.Chain = Chain
