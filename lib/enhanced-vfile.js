module.exports = (proto) => {
  proto.test = function (what) {
    const vfile = this
    if (typeof what === 'string') {
      return vfile.basename === what || vfile.extname === what
    } else if (typeof what === 'function') {
      return what(vfile)
    } else if (Array.isArray(what)) {
      let passed = what.find(unary => vfile.test(unary))
      return passed !== undefined
    }
  }
}


