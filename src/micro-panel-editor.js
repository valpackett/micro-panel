import './micro-panel-editor-entry.js'
import { LitElement, html, css } from 'lit'
import { sharedStyles, icons, iconCode } from './util.js'

function micropubGet(endpoint, qs) {
	return fetch(endpoint.indexOf('?') === -1 ? endpoint + '?' + qs : endpoint + '&' + qs, {
		credentials: 'include',
		headers: {
			'Accept': 'application/json',
		},
	})
}

function micropubPost(endpoint, obj, csrf_key, csrf_val) {
	const headers = {
		'Accept': 'application/json',
		'Content-Type': 'application/json',
	}
	if (csrf_key && csrf_val)
		headers[csrf_key] = csrf_val
	return fetch(endpoint, {
		method: 'post',
		credentials: 'include',
		headers,
		body: JSON.stringify(obj),
	})
}

export default class MicroPanelEditor extends LitElement {
	static get properties () {
		return {
			micropub: { type: String }, media: { type: String }, mediatoken: { type: String }, mediafirehose: { type: String },
			defaultctype: { type: String },
			originalUrl: { type: String },
			entry: { type: Object },
			entryIsNew: { type: Boolean }, entryIsModified: { type: Boolean },
			requestInFlight: { type: Boolean },
			cats: { type: Array },
		}
	}

	constructor () {
		super()
		// Use Set to prevent duplicates. Set does keep insertion order!
		this.cats = new Set()
		for (const el of document.querySelectorAll('[data-mf-category]')) {
			const catname = el.dataset.mfCategory.trim()
			if (catname.length > 0) {
				this.cats.add(catname)
			}
		}
	}

	connectedCallback () {
		super.connectedCallback()
		// Quick reply/like/etc URL for e.g. indie-action
		const query = new URLSearchParams(document.location.search.substring(1))
		if (query.has('mp-reaction')) {
			if (query.has('with')) {
				this.newReaction(query.get('mp-reaction'), query.get('with'), query.get('content'))
			} else {
				this.newEntry({ name: [], content: [{[this.defaultctype || 'html']: query.get('content')}], category: [], photo: [] })
			}
		}
	}

	static get styles() {
		return [
			sharedStyles,
			css`
				:host {
					display: flex;
					flex-direction: column;
					position: fixed;
					top: 0;
					bottom: 0;
					left: 0;
					right: 0;
					background: var(--neutral);
					z-index: 69420;
				}
				#root-editor {
					flex: 1;
					overflow-y: auto;
					-webkit-overflow-scrolling: touch;
					padding: var(--major-padding);
				}
			`
		]
	}

	render () {
		const { micropub, media, mediatoken, mediafirehose, defaultctype, originalUrl, entry, entryIsNew, entryIsModified, cats } = this
		return html`
			<header class="bar header-bar inverted">
				<button @click=${_ => this.close()} class="icon-button">${iconCode(icons.close)}</button>
				<slot name="title"><h1>micro-panel editor</h1></slot>
				${originalUrl ? html`
					<button @click=${_ => this.deleteEntry()}>Delete</button>
				` : ''}
				${entryIsNew ? html`
					<button @click=${_ => this.createEntry()} ?disabled=${!entryIsModified}>Create</button>
				` : html`
					<button @click=${_ => this.updateEntry()} ?disabled=${!entryIsModified}>Save</button>
				`}
			</header>

			<micro-panel-editor-entry id="root-editor" class="root-editor"
				.media=${media} .mediatoken=${mediatoken} .mediafirehose=${mediafirehose} .cats=${cats} .defaultctype=${defaultctype}
				.entry=${entry} .entryIsNew=${entryIsNew}
				.setEntry=${entry => {
					this.entry = entry
					this.entryIsModified = true
				}}></micro-panel-editor-entry>

		`
	}

	async close () {
		if (this.entryIsModified && !confirm('Abandon current modified entry?')) {
			return
		}
		if ('animate' in this && 'Animation' in window && 'finished' in Animation.prototype) {
			await this.animate({transform: ['none', 'translateY(100vh)']}, {duration: 300, easing: 'ease-out'}).finished
		}
		this.hidden = true
		document.body.style.overflow = this.oldBodyOverflow
	}

	show () {
		this.oldBodyOverflow = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		this.hidden = false
		if ('animate' in this) {
			this.animate({transform: ['translateY(100vh)', 'none']}, {duration: 300, easing: 'ease-out'})
		}
	}

	async editEntry (url) {
		this.entry = await (await micropubGet(this.micropub, `q=source&url=${encodeURIComponent(url)}`)).json()
		if (!this.entry.properties) {
			this.entry.properties = {}
		}
		for (const k of Object.keys(this.entry.properties)) {
			if (!this.entry.properties[k]) {
				this.entry.properties[k] = []
			}
		}
		if (!this.entry.properties.url) {
			this.entry.properties.url = []
		}
		if (this.entry.properties.url.length < 1) {
			this.entry.properties.url.push(url)
		}
		this.originalUrl = this.entry.properties.url[0] // Store to allow changing the URL
		this.entryIsNew = false
		this.entryIsModified = false
		this.show()
	}

	newEntry (properties = { name: [],
		content: [{ [this.defaultctype || 'html']: '' }],
		category: [],
		photo: [],
		location: [],
	}) {
		this.entry = {
			type: ['h-entry'],
			properties,
		}
		this.originalUrl = undefined
		this.entryIsNew = true
		this.entryIsModified = false
		this.show()
	}

	newReaction (kind, url, content) {
		this.newEntry({
			[kind]: [url],
			content: [{ [this.defaultctype]: content || '' }],
			photo: [],
		})
		this.entryIsModified = true
	}

	createEntry () {
		this._post({
			type: this.entry.type,
			properties: this.entry.properties,
		})
	}

	updateEntry () {
		const url = this.originalUrl || ((this.entry.properties || {}).url || [null])[0]
		if (!url) {
			return alert('Somehow, an entry with no URL! I have no idea how to save that.')
		}
		this._post({
			action: 'update',
			url,
			replace: this.entry.properties,
			'delete': this.entry['x-micro-panel-deleted-properties'] || [],
		})
	}

	deleteEntry () {
		if (!this.originalUrl) {
			return alert('Somehow, an entry with no URL! I have no idea how to delete that.')
		}
		if (!confirm('Delete this entry?')) {
			return
		}
		this._post({
			action: 'delete',
			url: this.originalUrl
		})
	}

	async _post (data) {
		this.requestInFlight = true
		let resp
		try {
			resp = await micropubPost(this.micropub, data, this.getAttribute('csrfheader'), this.getAttribute('csrftoken'))
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
		location.href = resp.headers.has('Location') ? resp.headers.get('Location') : this.entry.properties.url[0]
	}

}

customElements.define('micro-panel-editor', MicroPanelEditor)
