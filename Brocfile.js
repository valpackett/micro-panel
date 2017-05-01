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
		stripComments: true,
		inlineScripts: true
	}),
	new Funnel('./bower_components/webcomponentsjs', { include: ['*.min.js'], destDir: 'bower_components/webcomponentsjs' }),
	new Funnel('./bower_components/web-animations-js', { include: ['*.min.js'], destDir: 'bower_components/web-animations-js' }),
	new Funnel('./bower_components/fetch', { include: ['*.js'], destDir: 'bower_components/fetch' }),
	new Funnel('.', { include: [ 'index.html' ] }),
])

module.exports = root
