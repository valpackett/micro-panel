import resolve from 'rollup-plugin-node-resolve'
import minify from 'rollup-plugin-minify-es'
import license from 'rollup-plugin-license'

export default {
	input: 'src/micro-panel-all.js',
	output: [
		{
			format: 'iife',
			name: 'codeflask_element',
			file: 'dist/micro-panel-all.bundle.min.js',
			sourcemap: true,
		}
	],
	plugins: [
		resolve(),
		minify(),
		license({
			banner: `@license
micro-panel | Unlicense.
lit-element/lit-html (c) The Polymer Authors | BSD 3-Clause.
CodeFlask (c) Claudio Holanda | MIT.
Prism (c) Lea Verou | MIT.`
		}),
	],
}
