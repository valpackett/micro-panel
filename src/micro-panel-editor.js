import './micro-panel-editor-entry.js'
import { LitElement, html } from '@polymer/lit-element'
import { sharedStyles, icons, iconCode } from './util.js'

function micropubGet(endpoint, qs) {
	return fetch(endpoint.indexOf('?') === -1 ? endpoint + '?' + qs : endpoint + '&' + qs, {
		credentials: 'include',
		headers: {
			'Accept': 'application/json',
		},
	})
}

function micropubPost(endpoint, obj) {
	return fetch(endpoint, {
		method: 'post',
		credentials: 'include',
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(obj),
	})
}

export default class MicroPanelEditor extends LitElement {
	static get properties () { return { micropub: String, entry: Object } }

	_render ({ micropub, entry }) {
		return html`
			${sharedStyles}
			<style>
				:host {
					display: flex;
					flex-direction: column;
					position: fixed;
					top: 0;
					bottom: 0;
					left: 0;
					right: 0;
					background: var(--neutral);
				}
				#root-editor {
					flex: 1;
					overflow-y: auto;
					-webkit-overflow-scrolling: touch;
					padding: var(--major-padding);
				}
			</style>

			<header class="bar header-bar inverted">
				<button on-click=${_ => this.hidden = true} class="icon-button">${iconCode(icons.close)}</button>
			</header>

			<micro-panel-editor-entry id="root-editor" entry=${entry}></micro-panel-editor-entry>

		`
	}

	async editEntry (url) {
		if (this.entryIsModified && !confirm('Abandon current modified entry?')) {
			return
		}
		this.entry = await (await micropubGet(this.micropub, `q=source&url=${encodeURIComponent(url)}`)).json()
		this.entryIsNew = false
		this.entryIsModified = false
		this.hidden = false
	}

	newEntry (properties = { name: ['New post'], content: [''] }) {
		if (this.entryIsModified && !confirm('Abandon current modified entry?')) {
			return
		}
		this.entry = {
			type: ['h-entry'],
			properties,
		}
		this.entryIsNew = true
		this.entryIsModified = false
		this.hidden = false
	}

}

customElements.define('micro-panel-editor', MicroPanelEditor)
