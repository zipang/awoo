const vfile = require('to-vfile')
const debug = require('debug')('awoo:write')
const fs = require('fs-extra')
const path = require('path')

async function write (site) {
  await Promise.all(site.files.map(file => {
    return writeOne(file, site._config.source, site._config.destination)
  }))
  return site
}

async function writeOne (file, source, dest) {
  file.origin = path.resolve(source, file.path)
  file.path = path.resolve(dest, file.path)

  try {
    if (file.contents) {
      return await fs.writeFile(file.path, file.contents)
    } else {
      // copy file from its old source to the destination
      return await fs.copyFile(file.origin, file.path)
    }
  } catch (err) {
      debug('an error occured while writing:')
      throw new Error(err)
  }
}

module.exports = write
