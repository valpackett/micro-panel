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
			forceMicropubSource: { type: Boolean, value: false, reflectToAttribute: true },
			requestInProgress: { type: Boolean, value: false },
			itemModified: { type: Boolean, value: false },
			fileQueue: { type: Array, value: () => [] },
			model: { type: Object, value: {} },
		}
	}

	connectedCallback () {
		super.connectedCallback()
		this.setupData()
		this.dragFirst = false
		this.dragSecond = false
		for (const e of document.querySelectorAll('.p0lyfake')) {
			e.parentNode.removeChild(e)
		}
		this.setupAuth()
	}

	setupData () {
		window.mpstore = new Freezer({
			existingCategories: [],
			mediaEndpoint: null,
			item: { type: [], properties: {} },
		})
		this.model = window.mpstore.get()
		window.mpstore.on('update', (v, oldv) => {
			this.model = v
			if (!this.itemModified) {
				this.itemModified = v.item !== oldv.item
			}
			if (this.onNextUpdate) {
				this.onNextUpdate()
				delete this.onNextUpdate
			}
			this.storeDataLocally()
		})
		this.storeDataLocally = () => {}
		const setSetter = () => {
			this.storeDataLocally = MicroformatEditor.debounce(() => {
				if (this.model.item.type && this.model.item.type.length > 0) {
					localforage.setItem('item', this.model.item)
				}
			}, 500)
		}
		localforage.getItem('item').then(entry => {
			if (entry.type && entry.type.length > 0 && entry.properties) {
				this.model.set('item', entry)
				this.itemModified = true
				this.$['editor-wrapper'].open()
			}
		}).then(setSetter, setSetter)
	}

	setupAuth () {
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
				const excl = ':not(.h-cite):not(.p-author):not(.p-item)'
				style.innerHTML += '[class^="h-"]' + excl + ', [class*=" h-"]' + excl + ' { border: 2px solid #26a69a; }'
				style.innerHTML += '[class^="h-"]' + excl + '::before, [class*=" h-"]' + excl + '::before { content: "Edit"; background: #26a69a; color: white; padding: 6px; display: block; cursor: pointer; }'
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
			properties: {
				name: [], content: MicroformatEditor.blankPropFor('content'), category: [], photo: [],
				'in-reply-to': [], 'like-of': [], 'repost-of': []
			},
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
		const url = (props['editing-url'] || props.url || [this.currentPageUrl()])[0]
		this.requestInProgress = true
		this.micropubGet('q=source&url=' + encodeURIComponent(url))
		.then((resp) => resp.json())
			.then((fullEntry) => {
				this.requestInProgress = false
				this.editStart(fullEntry)
			})
		.catch((e) => {
			console.error(e)
			if (this.forceMicropubSource) {
				this.requestInProgress = false
				alert('Could not fetch the source of the requested entry.')
				return
			}
			fetch(url)
			.then(resp => resp.text())
			.then(body => {
				this.requestInProgress = false
				const mfs = Microformats.get({ html: body, textFormat: 'normalised' })
				if (mfs.length > 0) {
					this.editStart([0])
				} else {
					throw new Error('No microformats found on source page')
				}
			})
			.catch(e => {
				this.requestInProgress = false
				console.error(e)
				alert('Could not fetch the source of the requested entry.')
			})
		})
	}

	editStart (entry) {
		this.model.set('item', entry)
		this.$['editor-wrapper'].open()
		this.onNextUpdate = () => { this.itemModified = false }
	}

	deleteEntry (e) {
		if (!confirm('Are you sure you want to delete the entry?')) return
		const entry = this.model.item
		const url = ((entry.properties || {}).url || [null])[0]
		if (!url) return alert('Somehow, an entry with no URL! I have no idea how to delete that.')
		this.requestInProgress = true
		this.micropubPost({ 'action': 'delete', url: url })
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
		const entry = this.model.item
		const url = ((entry.properties || {}).url || [null])[0]
		if (!url) {
			return alert('Somehow, an entry with no URL! I have no idea how to save that.')
		}
		this.requestInProgress = true
		entry.properties.remove('url')
		this.micropubPost({
			'action': 'update',
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
		const entry = this.model.item
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
		if (this.useFrame) {
			const frame = this.querySelector('iframe')
			frame.src = redir || frame.src
			this.$['editor-wrapper'].close()
		} else {
			window.onbeforeunload = null
			location.reload()
		}
	}

	cancelEntry (e) {
		if (this.itemModified && !window.confirm('Are you sure you want to cancel?')) {
			return
		}
		this.$['editor-wrapper'].close()
		setTimeout(() => {
			this.model.set('item', { type: [], properties: {} })
			this.onNextUpdate = () => {
				this.itemModified = false
				localforage.removeItem('item')
			}
		}, 400)
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
				'&client_id=' + encodeURIComponent(location.href) + // e.g. indiecert demands same domain as redirect_uri
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
						if (!this.model.mediaEndpoint.startsWith('http')) {
							xhr.withCredentials = true
						}
						xhr.open('post', this.model.mediaEndpoint)
						xhr.setRequestHeader('Authorization', 'Bearer ' + (localStorage.getItem('access_token')
							|| document.cookie.split('; ').find(c => c.split('=')[0] === 'Bearer').split('=')[1]))
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

	isNew (item) {
		return item && item['x-micro-panel-new']
	}
}

customElements.define(MicroPanel.is, MicroPanel)
