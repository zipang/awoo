const site = require('./site')
const Site = require('./site').Site
require('./Array')

async function awoo (prepare, opts) {
  let blueprint = (prepare instanceof Site) ? prepare : prepare(site)
  if (typeof opts === 'object') {
    blueprint.use(opts)
  }
  blueprint.debug('awoo is ready to go!!!')
  return await blueprint.build()
}
awoo.build = awoo // nice alias

module.exports = awoo
module.exports.integration = (prepare) => awoo(prepare, { no_read: true, no_write: true, files })
