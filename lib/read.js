const { basename, relative } = require('path')
const fs = require('fs-extra')
const VFile = require('./vfile')
const walker = require('walker')

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

    // 1. build an array containing all the files extensions to include
    const includeAll   = content_files.concat(media_files)
    // 2. build an array containing only the directories names to be skipped (without the final /)
    const excludeDirs  = exclude.filter(name => name.endsWith('/')).map(str => str.slice(0, -1))
    // 3. and only the names of files to be excluded..
    const excludeFiles = exclude.filter(name => !name.endsWith('/'))

    // test if a file's content must be loaded as text
    const hasContent = (vfile) => content_files.find(ext => ext === vfile.extname)

    // load contents and makes the path relative to source dir
    async function loadContent(vfile) {

      if (hasContent(vfile)) {
        vfile.contents = await fs.readFile(vfile.path, 'utf8')
      }
      vfile.path = relative(source, vfile.path)
      return vfile
    }

    let files = []

    await new Promise((resolve, reject) => {
      walker(source)
        .filterDir(dir => {
          const dirname = basename(dir)
          return !excludeDirs.find(excluded => excluded === dirname)
        })
        .on('dir', (dir) => {
          debug(`Exploring ${relative(source,dir)}/ for more content`)
        })
        .on('file', (path, stats) => {
          let vfile = new VFile({ path, stats })
          // Check that we want this file first
          const { basename, extname } = vfile
          if (vfile.is(['.md', '.markdown'])) {
            debug(`${basename} is a markdown file`)
          }
          if (includeAll.find(included => included === extname)
          && !excludeFiles.find(excluded => excluded === basename)) {
            debug(`File ${basename} is added into files`)
            files.push(vfile)
          } else {
            debug(`File ${basename} was excluded`)
          }
        })
        .on('error', reject)
        .on('end', resolve)
    })

    // now that the empty vfiles have been walked,
    // we have to asynchronously load contents for these specific content_files
    return await Promise.all(files.map(loadContent))

  } catch (err) {
    console.error(err)
    throw new Error(err)
  }
}
