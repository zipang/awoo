const { basename, relative } = require('path')
const fs = require('fs-extra')
const VFile = require('./vfile')
const walker = require('walker')

/**
 * Load vfiles from source directory
 * Optionaly load the text content from the files
 * whose extension is in `conf.content_files`
 * @param {String} source
 * @param {Object} conf
 * @param {Function} debug
 * @return {Array[VFile]}
 */
module.exports = async (source, conf, debug) => {

  try {

    if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
      throw new Error(`Given source ${source} must exist and must be a directory`)
    }

    const { content_files, media_files, exclude } = conf

    // 1. build an array containing all the files extensions to include
    const includeAll = content_files.concat(media_files)
    // 2. build an array containing only the directories names to be skipped (without the final /)
    // 3. and another one with only the names of files to be excluded..
    const [excludeDirs, excludeFiles] = exclude.part(name => name.endsWith('/'))

    /**
     * load text contents and makes the path relative to source dir
     */
    async function loadContent(vfile) {

      if (vfile.is(content_files)) {
        vfile.contents = await fs.readFile(vfile.path, 'utf8')
      }
      vfile.path = relative(source, vfile.path)
      return vfile
    }

    let files = []

    await new Promise((resolve, reject) => {
      walker(source)
        .filterDir(dir => {
          const dirname = basename(dir) + '/'
          return !excludeDirs.find(excluded => excluded === dirname)
        })
        .on('dir', (dir) => {
          debug(`Exploring ${relative(source,dir)}/ for more content`)
        })
        .on('file', (path, stats) => {
          let vfile = new VFile({ path, stats })
          // Check that we want this file first
          const { basename, extname } = vfile
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
