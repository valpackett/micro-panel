import { ReactiveElement } from '@lit/reactive-element'
import { EditorState, EditorView, basicSetup } from "@codemirror/basic-setup"
import { markdown } from "@codemirror/lang-markdown"
import { html } from "@codemirror/lang-html"
import { css } from "@codemirror/lang-css"
import { json } from "@codemirror/lang-json"

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

	createRenderRoot() {
		const shadowRoot = super.createRenderRoot()
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
			root: shadowRoot,
			parent: shadowRoot,
		})
		return shadowRoot
	}

	update(changed) {
		if (changed.has('value'))
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
