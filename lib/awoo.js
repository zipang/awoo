const Site = require('./site')

async function awoo ( prepare, blueprint = {} ) {
  let site = prepare( new Site(blueprint) )
  site.debug('awoo is ready to go!!!')
  return await site.build()
}
awoo.build = awoo // nice alias

module.exports = awoo
module.exports.integration = (prepare) => awoo(prepare, { no_read: true, no_write: true, files })
