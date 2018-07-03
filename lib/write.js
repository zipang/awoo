const fs = require('fs-extra')
const path = require('path')

async function write (files, conf, debug) {
  await Promise.all(files.map(file => {
    return writeOne(file, conf.source, conf.destination, debug)
  }))
  return conf
}

async function writeOne (file, source, dest, debug) {
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
