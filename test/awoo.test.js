const test = require('ava')
const vfile = require('vfile')
const awoo = require('../lib/awoo')

test('works correctly', async t => {
  const plugin = files => files.map(file => {
    file.contents = 'haha test'
    return file
  })

  const res = await awoo(site =>
    site({
      source: 'test/sample',
      no_write: true
    })
    .use(plugin)
  )

  t.is(res.files.find(f => f.basename === 'test.md').contents, 'haha test')
})

test('throws error at read', async t => {
  await t.throws(awoo(site => {
    site.config({
      source: 'test/fakepath',
      no_write: true
    })
    return site
  }))
})

test('correctly runs in integration mode', async t => {
  const plugin = () => {
    return files => {
      return files.map(file => Object.assign(file, {contents: 'test2'}))
    }
  }

  const files = [
    vfile({ path: 'a', contents: 'aaa' })
  ]

  const res = await awoo.integration(
    site => site().use(plugin),
    files
  )

  t.is(res.files[0].contents, 'test2')
})
