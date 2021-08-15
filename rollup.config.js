import resolve from '@rollup/plugin-node-resolve'
import {terser} from 'rollup-plugin-terser'
import minifyHTML from 'rollup-plugin-minify-html-literals'
import license from 'rollup-plugin-license'

export default {
	input: 'src/micro-panel-all.js',
	output: [
		{
			format: 'iife',
			file: 'dist/micro-panel-all.bundle.min.js',
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
		license({
			banner: `@license
micro-panel | Unlicense.`
		}),
	],
	preserveEntrySignatures: 'strict',
}
