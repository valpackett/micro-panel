'use strict'

const SCOPE = 'post,update,delete,undelete'
const CLIENT_ID = 'https://github.com/myfreeweb/micro-panel'

function saveAuthParams (links) {
	const micropubLink = links.match(/<([^>]+)>;[^,]*rel="?[^,]*micropub[^,]*"?/)[1]
	const authLink = links.match(/<([^>]+)>;[^,]*rel="?[^,]*authorization_endpoint[^,]*"?/)[1] || 'https://indieauth.com/auth' // XXX: the [1] will fail first
	const tokenLink = links.match(/<([^>]+)>;[^,]*rel="?[^,]*token_endpoint[^,]*"?/)[1]
	localStorage.setItem('micropub_link', micropubLink)
	localStorage.setItem('auth_link', authLink)
	localStorage.setItem('token_link', tokenLink)
	localStorage.setItem('redirect_uri', location.href)
}

function saveAndGetState () {
	let state = new Uint8Array(32)
	crypto.getRandomValues(state)
	state = state.join('')
	localStorage.setItem('state', state)
	return state
}

function setAccessToken (token) {
	localStorage.setItem('access_token', token)
	localStorage.removeItem('auth_link')
	localStorage.removeItem('token_link')
	localStorage.removeItem('state')
	localStorage.removeItem('redirect_uri')
	history.replaceState({}, '', location.href.replace(/\?[^#]*/, ''))
}

class MicroPanel extends Polymer.GestureEventListeners(Polymer.Element) {
	static get is () { return 'micro-panel' }

	static get properties () {
		return {
			useFrame: { type: Boolean, value: false, reflectToAttribute: true },
			useAuth: { type: Boolean, value: false, reflectToAttribute: true },
			selected: { type: Number, value: 0 },
			requestInProgress: { type: Boolean, value: false },
			fileQueue: { type: Array, value: () => [] },
			model: { type: Object, value: {} },
		}
	}

	connectedCallback () {
		super.connectedCallback()
		window.mpstore = new Freezer({ entries: [], existingCategories: [], mediaEndpoint: null })
		this.model = window.mpstore.get()
		window.mpstore.on('update', (v, oldv) => {
			this.model = v
		})
		this.dragFirst = false
		this.dragSecond = false

		for (const e of document.querySelectorAll('.p0lyfake')) {
			e.parentNode.removeChild(e)
		}

		Polymer.RenderStatus.afterNextRender(this, () => {
			if (this.useAuth && !(localStorage.getItem('access_token') && localStorage.getItem('micropub_link'))) {
				if (location.search.match(/code=/)) {
					this.authFinish()
				} else {
					this.showAuthDialog()
				}
			} else if (!this.useAuth) {
				fetch(location.href).then(resp => saveAuthParams(resp.headers.get('Link')))
			}
			if (localStorage.getItem('micropub_link')) {
				this.micropubGet('q=config').then(resp => resp.json()).then(conf => {
					this.model.set('mediaEndpoint', conf['media-endpoint'])
				})
			}
			const makeStyle = (doc) => {
				const style = doc.createElement('style')
				const excl = ':not(.h-cite):not(.p-author)'
				style.innerHTML += '[class^="h-"]'+excl+', [class*=" h-"]'+excl+' { border: 2px solid #26a69a; }'
				style.innerHTML += '[class^="h-"]'+excl+'::before, [class*=" h-"]'+excl+'::before { content: "Edit"; background: #26a69a; color: white; padding: 6px; display: block; cursor: pointer; }'
				// not really making the style but while we're at it, get tags
				const tr = this.model.existingCategories.transact()
				for (const el of doc.querySelectorAll('[data-mf-category]')) {
					tr.push(el.dataset.mfCategory)
				}
				this.model.existingCategories.run()
				return style
			}
			if (this.useFrame) {
				// XXX: DOES querySelector WORK FOR THIS?
				const frame = this.querySelector('iframe')
				frame.addEventListener('load', e => {
					console.log(e)
					const style = makeStyle(e.target.contentDocument)
					e.target.contentDocument.body.appendChild(style)
					e.target.contentDocument.addEventListener('click', this.editClick.bind(this))
				})
			} else {
				const style = makeStyle(document)
				document.body.appendChild(style)
				this.$['content-container'].addEventListener('click', this.editClick.bind(this))
			}
		})
	}

	micropubGet (qs) {
		const headers = {
			Accept: 'application/json'
		}
		if (this.useAuth) {
			headers.Authorization = 'Bearer ' + localStorage.getItem('access_token')
		}
		const link = localStorage.getItem('micropub_link')
		return fetch(link.indexOf('?') === -1 ? link + '?' + qs : link + '&' + qs, {
			credentials: 'include',
			headers: headers,
		})
	}

	micropubPost (obj) {
		const headers = {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		}
		if (this.useAuth) {
			headers.Authorization = 'Bearer ' + localStorage.getItem('access_token')
		}
		return fetch(localStorage.getItem('micropub_link'), {
			method: 'post',
			credentials: 'include',
			headers: headers,
			body: JSON.stringify(obj),
		})
	}

	// Editing {{{
	openNewEntry (e) {
		this.editStart({
			type: ['h-entry'],
			'x-micro-panel-new': true,
			properties: { name: [], content: [{html: ''}], 'in-reply-to': [], 'like-of': [], 'repost-of': [] },
		})
	}

	currentPageUrl () {
		if (this.useFrame) {
			const frame = this.querySelector('iframe')
			return frame.contentWindow.location.href
		}
		return location.href
	}

	editClick (e) {
		if (![].some.call(e.target.classList, x => x.startsWith('h-'))) return
		const entry = Microformats.get({ node: e.target, textFormat: 'normalised' }).items[0]
		const props = entry.properties || {}
		let i = 0
		if (this.model.entries.find((editingEntry) => {
			i += 1
			return ((editingEntry.properties || {}).uid || [1])[0] === (props.uid || [1])[0]
		})) {
			this.selected = 0 + i
			return
		}
		const url = (props['editing-url'] || props.url || [this.currentPageUrl()])[0]
		this.micropubGet('q=source&url=' + encodeURIComponent(url))
		.then((resp) => resp.json())
		.then((fullEntry) => this.editStart(fullEntry))
		.catch((e) => {
			console.log('Error when asking micropub for entry source', e)
			fetch(url)
			.then(resp => resp.text())
			.then(body => {
				for (const fullEntry of Microformats.get({ html: body, textFormat: 'normalised' })) {
					this.editStart(fullEntry)
				}
			})
			.catch(e => {
				console.log('Error when fetching entry', e)
				this.editStart(entry)
			})
		})
	}

	editStart (entry) {
		this.model.entries.push(entry)
		Polymer.RenderStatus.afterNextRender(this, () => {
			this.selected = 0 + this.model.entries.length
		})
	}

	deleteEntry (e) {
		if (!confirm('Are you sure you want to delete the entry?')) return
		const entry = this.$['editing-repeat'].modelForElement(e.target).item // XXX: https://github.com/Polymer/polymer/issues/1865
		const url = ((entry.properties || {}).url || [null])[0]
		if (!url) return alert('Somehow, an entry with no URL! I have no idea how to delete that.')
		this.requestInProgress = true
		this.micropubPost({ 'mp-action': 'delete', url: url })
		.then(resp => {
			if (resp.status >= 300) throw new Error("Couldn't delete the entry! Response: " + resp.status)
			this.editFinish(entry)
			this.requestInProgress = false
		})
		.catch(e => {
			console.log('Error when deleting entry', e)
			alert(e)
			this.requestInProgress = false
		})
	}

	saveEntry (e) {
		let entry = this.$['editing-repeat'].modelForElement(e.target).item
		let url = ((entry.properties || {}).url || [null])[0]
		if (!url) return alert('Somehow, an entry with no URL! I have no idea how to save that.')
		this.requestInProgress = true
		entry.properties.remove('url')
		this.micropubPost({
			'mp-action': 'update',
			url: url,
			replace: entry.properties,
			'delete': entry['x-micro-panel-deleted-properties'] || []
		})
		.then(resp => {
			if (resp.status >= 300) throw new Error("Couldn't save the entry! Response: " + resp.status)
			this.editFinish(entry)
			this.requestInProgress = false
		})
		.catch(e => {
			console.log('Error when saving entry', e)
			alert(e)
			this.requestInProgress = false
			entry.properties.url = url
		})
	}

	createEntry (e) {
		const entry = this.$['editing-repeat'].modelForElement(e.target).item
		this.requestInProgress = true
		this.micropubPost({ type: entry.type, properties: entry.properties })
		.then(resp => {
			if (resp.status >= 300) throw new Error("Couldn't create the entry! Response: " + resp.status)
			this.editFinish(entry, resp.headers.get('Location'))
			this.requestInProgress = false
		})
		.catch(e => {
			console.log('Error when creating entry', e)
			alert(e)
			this.requestInProgress = false
		})
	}

	editFinish (entry, redir) {
		this.model.entries.splice(this.model.entries.indexOf(entry), 1)
		if (this.useFrame) {
			const frame = this.querySelector('iframe')
			frame.src = redir || frame.src
		} else {
			location.reload()
		}
		this.selected = 0
	}
	// }}}

	// Auth {{{
	showAuthDialog () {
		this.$['auth-url-input'].value = location.origin
		this.$['auth-dialog'].open()
	}

	authStart () {
		this.requestInProgress = true
		fetch(this.$['auth-url-input'].value)
		.then(resp => {
			const links = resp.headers.get('Link')
			saveAuthParams(links)
			const state = saveAndGetState()
			location.href = localStorage.getItem('auth_link') +
				'?me=' + encodeURIComponent(this.$['auth-url-input'].value) +
				'&client_id=' + encodeURIComponent(CLIENT_ID) +
				'&redirect_uri=' + encodeURIComponent(location.href) +
				'&state=' + encodeURIComponent(state) +
				'&scope=' + SCOPE
		}).catch(e => {
			console.log(e)
			alert('Could not connect.')
			this.requestInProgress = false
		})
	}

	authFinish () {
		const code = location.search.match(/code=([^&]+)/)[1]
		const me = location.search.match(/me=([^&]+)/)[1]
		this.requestInProgress = true
		fetch(localStorage.getItem('token_link'), {
			method: 'post',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
			body: 'code=' + code + '&me=' + me + '&client_id=' + encodeURIComponent(CLIENT_ID) +
				'&redirect_uri=' + encodeURIComponent(localStorage.getItem('redirect_uri')) +
				'&state=' + encodeURIComponent(localStorage.getItem('state')) + '&scope=' + SCOPE,
		}).then(resp => {
			console.log(resp)
			return resp.text()
		}).then(body => {
			const token = body.match(/access_token=([^&]+)/)[1]
			if (!token) throw new Error('No access token in response')
			setAccessToken(token)
			this.requestInProgress = false
		}).catch(e => {
			console.log(e)
			alert('Could not get access token from the token endpoint.')
			this.authStart()
			this.requestInProgress = false
		})
	}
	// }}}

	// Open URL {{{
	showOpenUrl () {
		this.$['menu-button'].close()
		this.$['open-url-dialog'].open()
		const frame = this.querySelector('iframe')
		this.$['open-url-input'].value = frame.contentWindow.location.href
	}

	openUrlClosed (e) {
		if (!e.detail.confirmed) return
		const frame = this.querySelector('iframe')
		frame.src = this.$['open-url-input'].value
		this.selected = 0
	}
	// }}}

	showAbout () {
		this.$['menu-button'].close()
		this.$['about-dialog'].open()
	}

	closeMenu () {
		this.$['menu-button'].close()
	}

	// dragFirst/dragSecond trick from https://github.com/bensmithett/dragster/blob/gh-pages/src/dragster.coffee
	fileUploadDropShow (e) {
		e.stopPropagation()
		e.preventDefault()
		if (this.dragFirst) {
			this.dragSecond = true
		} else {
			this.dragFirst = true
			console.log(e)
			e.dataTransfer.dropEffect = 'copy'
			this.$['file-upload-dialog'].classList.add('dragging')
		}
	}

	fileUploadDrag (e) {
		e.stopPropagation()
		e.preventDefault()
	}

	fileUploadDropHide (e) {
		e.stopPropagation()
		e.preventDefault()
		if (this.dragSecond) {
			this.dragSecond = false
		} else {
			this.dragFirst = false
		}
		if (!this.dragFirst && !this.dragSecond) {
			this.$['file-upload-dialog'].classList.remove('dragging')
		}
	}

	fileUploadDrop (e) {
		e.stopPropagation()
		e.preventDefault()
		this.dragFirst = false
		this.dragSecond = false
		this.$['file-upload-dialog'].classList.remove('dragging')
		for (const file of e.dataTransfer.files) {
			this.push('fileQueue', file)
		}
	}

	fileUploadPick (e) {
		for (const file of e.target.files) {
			this.push('fileQueue', file)
		}
	}

	fileUploadGo (e) {
		if (typeof this.$['file-upload-dialog'].callback === 'function') {
			this.requestInProgress = true
			this.fileQueue.reduce((prom, file) => {
				console.log('Starting file upload', file)
				return prom.then(_ => {
					return new Promise((resolve, reject) => {
						const xhr = new XMLHttpRequest()
						xhr.upload.addEventListener('progress', e => {
							if (e.lengthComputable) {
								this.$['upload-progress'].value = e.loaded / e.total * 100
							} else {
								this.$['upload-progress'].indeterminate = true
							}
						}, false)
						xhr.addEventListener('load', e => {
							if (xhr.status >= 200 && xhr.status < 300) {
								if (xhr.getResponseHeader('Content-Type').includes('application/json')) {
									resolve(JSON.parse(xhr.responseText))
								} else {
									resolve(xhr.getResponseHeader('Location'))
								}
							} else {
								reject(xhr.status)
							}
						})
						xhr.addEventListener('error', reject)
						xhr.addEventListener('abort', reject)
						xhr.addEventListener('timeout', reject)
						xhr.upload.addEventListener('error', reject)
						xhr.upload.addEventListener('abort', reject)
						xhr.upload.addEventListener('timeout', reject)
						xhr.open('post', this.model.mediaEndpoint)
						const form = new FormData()
						form.append('file', file)
						xhr.send(form)
					})
				}).then(obj => {
					this.$['file-upload-dialog'].callback(obj)
					// NOTE: need to find index here because indices shift on removal
					this.splice('fileQueue', this.fileQueue.findIndex(x => x === file), 1)
				})
			}, Promise.resolve()).then(x => {
				this.requestInProgress = false
				this.$['upload-progress'].value = 0
				this.$['file-upload-dialog'].close()
			}).catch(e => {
				console.error(e)
				this.requestInProgress = false
				this.$['upload-progress'].value = 0
			})
		}
	}

	fileUploadRemove (e) {
		this.splice('fileQueue', e.model.index, 1)
	}
}

customElements.define(MicroPanel.is, MicroPanel)
