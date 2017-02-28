'use strict'

const fs = require('fs')
const Funnel = require('broccoli-funnel')
const Merge = require('broccoli-merge-trees')
const Vulcanize = require('broccoli-vulcanize')

// I DO NOT WANT YOUR GOOGLE FONTS HERE
fs.writeFileSync('bower_components/font-roboto/roboto.html', ' ', { charset: 'utf-8' })

let root = new Funnel('.', { include: ['*.{js,html}', 'bower_components/**/*'], exclude: ['Brocfile.js'] })
root = new Merge([
	new Vulcanize(root, {
		input: 'micro-panel.html',
		output: 'micro-panel.html',
		excludes: ['bower_components/codemirror'],
		stripComments: true,
		inlineScripts: true
	}),
	new Funnel('./bower_components/codemirror', { destDir: 'bower_components/codemirror' }),
	new Funnel('./bower_components/es6-promise', { include: ['*.min.js'], destDir: 'bower_components/es6-promise' }),
	new Funnel('./bower_components/webcomponentsjs', { include: ['*.min.js'], destDir: 'bower_components/webcomponentsjs' }),
	new Funnel('./bower_components/fetch', { include: ['*.js'], destDir: 'bower_components/fetch' }),
	new Funnel('.', { include: [ 'index.html' ] }),
])

module.exports = root
