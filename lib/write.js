const fs = require('fs-extra')
const path = require('path')

async function write (files, conf, debug) {
  return await Promise.all(
    files.map(file => writeOne(file, conf.source, conf.destination, debug))
  )
}

async function writeOne (file, source, dest, debug) {
  file.path = path.resolve(dest, file.path)
  let written

  if (file.contents) {
    await fs.ensureDir(file.dirname)
    written = fs.writeFile(file.path, file.contents)
  } else {
    // copy file from its original source to the destination
    written = fs.copy(file.history[0], file.path)
  }

  return written.catch(err => {
    debug(`An error occured when writing file ${file.basename}`)
    debug(err)
  })
}



module.exports = write
