# vavawoo

> is an experimental fork of [awoo]() by Olivia Hugger

**Table of Contents**

## Motivation

By now, i just had to build a new package to compare it more easily with `awoo` and `metalsmith` when deploying a static site on netlify.

## Features

Here are the main directions that this fork is exploring : (Work in Progress)

- extreme package size reduction by drastically reducing the number of dependencies
- focused on developper friendliness with features like :
  - ultra-simple chainable API similar to that of metalsmith
  - more guidelines as to how to build a plugin : we will provide documented namespaces for every usage 
  - cleaner async code with `async/await` : we won't support old node.js callback style
  - tracability and debuggability by adding the possibility to name every plugin in the build chain and having a nice stack trace everytime a plugin fails (no `UnhandledPromiseRejection`)
  - pretty good code documentation

## Code examples

Here are some code samples to illustrate some of the concepts seen before

```js
const vavawoo  = require('vavawoo')
const matter   = require('awoo-matter')
const markdown = require('awoo-markdown')

vavawoo(
  site => site({
    title: 'My awoosome static web site',
    lang: 'en',
    source: '/content',
    destination: '/public'
  })
  .use(files => files.sort(byDate)) // a one-line plugin that takes and return an array of files
  .use('awoo-matter', matter, {})
  .use('awoo-markdown', markdown, {plugins: require('markdown-bundle')})
