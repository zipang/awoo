const findUp = require('vfile-find-up')
const util = require('util')
const scan = util.promisify(findUp.all)
const vfileReadAsync = util.promisify(require('to-vfile').read)

async function loadContent(file) {
  let loaded = await vfileReadAsync(file.path, 'utf8')
  return loaded
}

module.exports = async (source, conf, debug) => {

  const { content_files, media_files, exclude } = conf
  const includeAll = Array.concat(content_files, media_files)
  const isContent = (vfile) => content_files.find(ext => ext === vfile.extname)
  const test = (vfile) => {
    const result =
      ! exclude.find(basename => basename === vfile.basename)
      && includeAll.find(ext => ext === vfile.extname)
    console.log(`file ${vfile.path} is ${result?'included':'excluded'} in scan result`)
    return result
  }
  const files = await scan(test, source)
  // now we have to load contents for these specific content_files
  return Promise.all(files.map(
    async file => isContent(file) ? await loadContent(file) : file
  ))
}
