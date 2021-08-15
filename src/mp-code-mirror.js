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
		const { markdown } = await import('@codemirror/lang-markdown')
		const { html } = await import('@codemirror/lang-html')
		const { css } = await import('@codemirror/lang-css')
		const { json } = await import('@codemirror/lang-json')
		const exts = [
			basicSetup,
			EditorView.lineWrapping,
			EditorView.updateListener.of(e => {
				if (e.focusChanged) this.setValue(e.state.doc.toString())
			}),
			EditorView.theme({
				".cm-activeLine": { backgroundColor: 'var(--very-light-accent)' },
				".cm-activeLineGutter": { backgroundColor: 'var(--light-accent)', color: 'var(--neutral)' },
			}),
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
