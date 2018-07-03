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
	static get properties () {
		return {
			micropub: String, entry: Object, entryIsModified: Boolean, requestInFlight: Boolean,
		}
	}

	_render ({ micropub, entry, entryIsModified }) {
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
				<button on-click=${_ => this.close()} class="icon-button">${iconCode(icons.close)}</button>
				<slot name="title"><h1>micro-panel editor</h1></slot>
				${this.entryIsNew ? html`
					<button on-click=${_ => this.createEntry()} disabled?=${!entryIsModified}>Create</button>
				` : html`
					<button on-click=${_ => this.updateEntry()} disabled?=${!entryIsModified}>Save</button>
				`}
			</header>

			<micro-panel-editor-entry id="root-editor" entry=${entry}
				setEntry=${entry => {
					this.entry = entry
					this.entryIsModified = true
				}}></micro-panel-editor-entry>

		`
	}

	close () {
		if (this.entryIsModified && !confirm('Abandon current modified entry?')) {
			return
		}
		this.hidden = true
	}

	async editEntry (url) {
		this.entry = await (await micropubGet(this.micropub, `q=source&url=${encodeURIComponent(url)}`)).json()
		this.entryIsNew = false
		this.entryIsModified = false
		this.hidden = false
	}

	newEntry (properties = { name: ['New post'], content: [''] }) {
		this.entry = {
			type: ['h-entry'],
			properties,
		}
		this.entryIsNew = true
		this.entryIsModified = false
		this.hidden = false
	}

	createEntry () {
		this._post({
			type: this.entry.type,
			properties: this.entry.properties,
		})
	}

	updateEntry () {
		const url = ((this.entry.properties || {}).url || [null])[0]
		if (!url) {
			return alert('Somehow, an entry with no URL! I have no idea how to save that.')
		}
		this._post({
			'action': 'update',
			url,
			replace: this.entry.properties,
			// TODO 'delete': entry['x-micro-panel-deleted-properties'] || [],;w
		})
	}

	async _post (data) {
		this.requestInFlight = true
		let resp
		try {
			resp = await micropubPost(this.micropub, data)
		} catch (e) {
			alert(`Couldn't save the entry! Got error: ${e}`)
			return
		} finally {
			this.requestInFlight = false
		}
		if (resp.status >= 300) {
			alert(`Couldn't save the entry! Got status: ${resp.status}`)
			return
		}
		this.entryIsModified = false
		this.close()
		location.href = resp.headers.get('Location')
	}

}

customElements.define('micro-panel-editor', MicroPanelEditor)
