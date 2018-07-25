const VFile = require('vfile')

Object.assign(VFile.prototype, {
  /**
   * Test if a file belong to a serie of extensions or filenames
   * Usage:
   * > vfile.is(['.md', '.markdown'])
   * > vfile.is('robots.txt')
   * @param {String|Function|Array[String|Function]}
   * @return {Boolean} TRUE if _any_ of the given tests is successful
   */
  is : function (what) {
    const vfile = this
    if (typeof what === 'string') {
      return vfile.extname === what || vfile.basename === what
    } else if (typeof what === 'function') {
      return what(vfile)
    } else if (Array.isArray(what)) {
      let passed = what.find(unary => vfile.is(unary))
      return passed !== undefined
    }
  }
});

module.exports = VFile
