import resolve from '@rollup/plugin-node-resolve'
import {terser} from 'rollup-plugin-terser'
import minifyHTML from 'rollup-plugin-minify-html-literals'

export default {
	input: 'src/micro-panel-all.js',
	manualChunks(id) {
		if (id.includes('@codemirror')) {
			return 'micro-panel-codemirror'
		}
	},
	output: [
		{
			format: 'es',
			dir: 'dist',
			sourcemap: true,
		}
	],
	plugins: [
		resolve(),
		minifyHTML(),
		terser({
			ecma: 2020,
			module: true,
			warnings: true,
		}),
	],
	preserveEntrySignatures: 'strict',
}
