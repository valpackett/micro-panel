import { ReactiveElement } from '@lit/reactive-element'

export default class CodeMirrorElement extends ReactiveElement {
	static get properties () {
		return {
			value: { type: String, attribute: false },
			setValue: { type: Function },
		}
	}

	constructor () {
		super()
		this.value = ''
	}

	async connectedCallback() {
		super.connectedCallback()
		const { EditorState, EditorView, basicSetup } = await import('@codemirror/basic-setup')
		const { HighlightStyle, tags } = await import ('@codemirror/highlight')
		const { markdown } = await import('@codemirror/lang-markdown')
		const { html } = await import('@codemirror/lang-html')
		const { css } = await import('@codemirror/lang-css')
		const { json } = await import('@codemirror/lang-json')
		const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
		const exts = [
			basicSetup,
			EditorView.lineWrapping,
			EditorView.updateListener.of(e => {
				if (e.focusChanged) this.setValue(e.state.doc.toString())
			}),
			EditorView.theme({
				"&.cm-focused .cm-selectionBackground, ::selection": { backgroundColor: 'var(--light-accent)', color: 'var(--neutral)' },
				".cm-gutters": { backgroundColor: 'var(--neutral-hover)' },
				".cm-activeLine": { backgroundColor: 'var(--very-light-accent)' },
				".cm-activeLineGutter": { backgroundColor: 'var(--light-accent)', color: 'var(--neutral)' },
				"&.cm-focused .cm-cursor": { borderLeftColor: "var(--accent)" },
			}, { dark }),
			HighlightStyle.define([
				{ tag: tags.link, color: (dark ? '#3af0e8' : '#3a67f0') },
				{ tag: tags.invalid, color: (dark ? '#f03a3a' : '#bb0d0d') },
				{ tag: [tags.heading, tags.strong], fontWeight: "bold" },
				{ tag: tags.emphasis, fontStyle: "italic" },
				{ tag: tags.strikethrough, textDecoration: "line-through" },
			]),
		]
		if (this.getAttribute('lang') === 'markdown')
			exts.push(markdown())
		if (this.getAttribute('lang') === 'html')
			exts.push(html())
		if (this.getAttribute('lang') === 'css')
			exts.push(css())
		if (this.getAttribute('lang') === 'json')
			exts.push(json())
		this.cmview = new EditorView({
			state: EditorState.create({
				doc: this.value,
				extensions: exts,
			}),
			root: this.renderRoot,
			parent: this.renderRoot,
		})
	}

	update(changed) {
		if (changed.has('value') && this.cmview)
			this.cmview.dispatch({
				changes: {
					from: 0, 
					to: this.cmview.state.doc.toString().length,
					insert: this.value,
				}
			})
		super.update(changed)
	}
}

customElements.define('mp-code-mirror', CodeMirrorElement)
