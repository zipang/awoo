const util = require('util')
const path = require('path')
const fs = require('fs-extra')
const { all, SKIP } = require('vfile-find-down')
const scanDir = util.promisify(all)

// this require appends a .test() method to all new vfiles !
const enhance = require('./enhanced-vfile')

/**
 * Recursively read vfile from source directory
 * Load text content from the files mentionned in `conf.content_files`
 * @param {String} source
 * @param {Object} conf
 * @param {Function} debug
 */
module.exports = async (source, conf, debug) => {

  try {

    if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
      throw new Error(`Given source ${source} must exist and must be a directory`)
    }

    const { content_files, media_files, exclude } = conf
    // build an array containing all files extensions to include
    const includeAll = content_files.concat(media_files)
    // build an array containing only the directories names to be skipped (without the final /)
    const excludeDirs = exclude.filter(name => name.endsWith('/')).map(str => str.slice(0, -1))
    // and only the names of files to be excluded..
    const excludeFiles = exclude.filter(name => !name.endsWith('/'))

    // test if a file's content must be loaded as text
    const isContent = (vfile) => content_files.find(ext => ext === vfile.extname)

    // load contents and makes the path relative to source dir
    async function loadContent(vfile) {
      if (!vfile.test) enhance(Object.getPrototypeOf(vfile))
      if (vfile.test(isContent)) {
        vfile.contents = await fs.readFile(vfile.path, 'utf8')
      }
      vfile.path = path.relative(source, vfile.path)
      return vfile
    }


    // Tell if this file must be added to result or if this directory must be skipped
    const test = (vfile, stats) => {
      let result;
      if (stats.isDirectory()) {
        result = (excludeDirs.find(dirname => dirname === vfile.basename)) ? SKIP : undefined
        debug(`Directory ${vfile.basename} is ${result === undefined?'explored for more content':'skipped'}`)
      } else {
        // it must be a file
        result =
          (includeAll.find(ext => ext === vfile.extname)
          && !excludeFiles.find(basename => basename === vfile.basename))
        debug(`File ${vfile.basename} is ${result === true?'added into files':'excluded'}`)
      }
      return result
    }
    let files = await scanDir(test, source)
    // now we have to asynchronously load contents for these specific content_files
    return await Promise.all(files.map(loadContent))

  } catch (err) {
    console.error(err)
    throw new Error(err)
  }
}
