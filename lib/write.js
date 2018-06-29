const vfile = require('to-vfile')
const debug = require('debug')('awoo:write')
const mkdirp = require('mkdirp')
const path = require('path')

async function write (files, conf) {
  await Promise.all(files.map(file => {
    return writeOne(file, conf.destination)
  }))
  return conf
}

async function writeOne (file, dest) {
  file.path = path.resolve(dest, file.path)
  mkdirp(file.dirname, (err, _) => {
    if (err) {
      debug('an error occured while creating directories:')
      throw new Error(err)
    }

    vfile.write(file, (err, res) => {
      if (err) {
        debug('an error occured while writing:')
        throw new Error(err)
      }
      debug('wrote %s', file.path)
      return file
    })
  })
}

module.exports = write
