'use strict'

const fs = require('fs')
const Find = require('broccoli-stew').find
const Merge = require('broccoli-merge-trees')
const Babel = require('broccoli-babel-transpiler')
const Vulcanize = require('broccoli-vulcanize')

// I DO NOT WANT YOUR GOOGLE FONTS HERE
fs.writeFileSync('bower_components/font-roboto/roboto.html', ' ', { charset: 'utf-8' })

var root
root = new Find('.', { include: ['*.{js,html}', 'bower_components/**/*'], exclude: ['Brocfile.js'] })
root = new Babel(root, { ignore: ['bower_components/*'], compact: true })
root = new Merge([
	new Vulcanize(root, {
		input: 'micro-panel.html',
		output: 'micro-panel.html',
		excludes: ['bower_components/codemirror'],
		stripComments: true,
		inlineScripts: true
	}),
	new Find('./bower_components/codemirror/**/*'),
	new Find('./bower_components/{es6-promise,webcomponentsjs}/*.min.js'),
	new Find('./bower_components/fetch/*.js'),
	new Find('index.html'),
])

module.exports = root
