'use strict'

const SCOPE = 'post,update,delete'
const CLIENT_ID = 'https://github.com/myfreeweb/micro-panel'

function saveAuthParams (links) {
	let micropubLink = links.match(/<([^>]+)>;[^,]*rel="[^,]*micropub[^,]*"/)[1]
	let authLink = links.match(/<([^>]+)>;[^,]*rel="[^,]*authorization_endpoint[^,]*"/)[1] || 'https://indieauth.com/auth'
	let tokenLink = links.match(/<([^>]+)>;[^,]*rel="[^,]*token_endpoint[^,]*"/)[1]
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

function micropubGet (qs) {
	let link = localStorage.getItem('micropub_link')
	return fetch(link.indexOf('?') === -1 ? link + '?' + qs : link + '&' + qs, {
		headers: {
			Accept: 'application/json',
			Authorization: 'Bearer ' + localStorage.getItem('access_token'),
		},
	})
}

function micropubPost (obj) {
	return fetch(localStorage.getItem('micropub_link'), {
		method: 'post',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: 'Bearer ' + localStorage.getItem('access_token'),
		},
		body: JSON.stringify(obj),
	})
}

Polymer({
	is: 'micro-panel',

	properties: {
		selected: { type: Number, value: 0 },
		editing: { type: Array, value: [] },
		requestInProgress: { type: Boolean, value: false },
	},

	attached () {
		Array.prototype.forEach.call(document.querySelectorAll('.p0lyfake'), (e) => e.parentNode.removeChild(e))
		if (!(localStorage.getItem('access_token') && localStorage.getItem('micropub_link'))) {
			if (location.search.match(/code=/)) {
				this.authFinish()
			} else {
				this.showAuthDialog()
			}
		}
		let frame = this.queryEffectiveChildren('iframe')
		frame.addEventListener('load', (e) => {
			console.log(e)
			let style = e.target.contentDocument.createElement('style')
			style.innerHTML += '.h-entry { border: 2px solid #26a69a; }'
			style.innerHTML += '.h-entry::before { content: "Edit"; background: #26a69a; color: white; padding: 6px; display: block; cursor: pointer; }'
			e.target.contentDocument.body.appendChild(style)
			e.target.contentDocument.addEventListener('click', this.editClick.bind(this))
		})
	},

	// Editing {{{
	openNewEntry (e) {
		this.editStart({
			type: ['h-entry'],
			'x-micro-panel-new': true,
			properties: { name: [], content: [{html: ''}], 'in-reply-to': [], 'like-of': [], 'repost-of': [] },
		})
	},

	editClick (e) {
		if (!e.target.classList.contains('h-entry')) return
		let entry = Microformats.get({ node: e.target, textFormat: 'normalised' }).items[0]
		let i = 0
		if (this.editing.find((editingEntry) => {
			i += 1
			return ((editingEntry.properties || {}).uid || [1])[0] === ((entry.properties || {}).uid || [1])[0]
		})) {
			this.selected = 1 + i
			return
		}
		let frame = this.queryEffectiveChildren('iframe')
		let frameUrl = frame.contentWindow.location.href
		let url = ((entry.properties || {}).url || [frameUrl])[0]
		micropubGet('q=source&url=' + encodeURIComponent(url))
		.then((resp) => resp.json())
		.then((fullEntry) => this.editStart(fullEntry))
		.catch((e) => {
			console.log('Error when asking micropub for entry source', e)
			fetch(url)
			.then((resp) => resp.text())
			.then((body) => {
				let fullEntry = Microformats.get({ html: body, textFormat: 'normalised', filter: ['h-entry'] }).items[0]
				this.editStart(fullEntry)
			})
			.catch((e) => {
				console.log('Error when fetching entry', e)
				this.editStart(entry)
			})
		})
	},

	editStart (entry) {
		this.push('editing', entry)
		this.selected = 1 + this.editing.length
	},

	deleteEntry (e) {
		if (!confirm('Are you sure you want to delete the entry?')) return
		let entry = this.$['editing-repeat'].modelForElement(e.target).item // XXX: https://github.com/Polymer/polymer/issues/1865
		let url = ((entry.properties || {}).url || [null])[0]
		if (!url) return alert('Somehow, an entry with no URL! I have no idea how to delete that.')
		this.requestInProgress = true
		micropubPost({ 'mp-action': 'delete', url: url })
		.then((resp) => {
			if (resp.status >= 300) throw new Error("Couldn't delete the entry! Response: " + resp.status)
			this.editFinish(entry)
			this.requestInProgress = false
		})
		.catch((e) => {
			console.log('Error when deleting entry', e)
			alert(e)
			this.requestInProgress = false
		})
	},

	saveEntry (e) {
		let entry = this.$['editing-repeat'].modelForElement(e.target).item
		let url = ((entry.properties || {}).url || [null])[0]
		if (!url) return alert('Somehow, an entry with no URL! I have no idea how to save that.')
		this.requestInProgress = true
		delete entry.properties.url
		micropubPost({
			'mp-action': 'update',
			url: url,
			replace: entry.properties,
			'delete': entry['x-micro-panel-deleted-properties'] || []
		})
		.then((resp) => {
			if (resp.status >= 300) throw new Error("Couldn't save the entry! Response: " + resp.status)
			this.editFinish(entry)
			this.requestInProgress = false
		})
		.catch((e) => {
			console.log('Error when saving entry', e)
			alert(e)
			this.requestInProgress = false
			entry.properties.url = url
		})
	},

	createEntry (e) {
		let entry = this.$['editing-repeat'].modelForElement(e.target).item
		this.requestInProgress = true
		micropubPost({ type: entry.type, properties: entry.properties })
		.then((resp) => {
			if (resp.status >= 300) throw new Error("Couldn't create the entry! Response: " + resp.status)
			this.editFinish(entry, resp.headers.get('Location'))
			this.requestInProgress = false
		})
		.catch((e) => {
			console.log('Error when creating entry', e)
			alert(e)
			this.requestInProgress = false
		})
	},

	editFinish (entry, redir) {
		this.splice('editing', this.editing.indexOf(entry), 1)
		let frame = this.queryEffectiveChildren('iframe')
		frame.src = redir || frame.src
		this.selected = 0
	},
	// }}}

	// Auth {{{
	showAuthDialog () {
		this.$['auth-url-input'].value = location.origin
		this.$['auth-dialog'].open()
	},

	authStart () {
		this.requestInProgress = true
		fetch(this.$['auth-url-input'].value)
		.then((resp) => {
			let links = resp.headers.get('Link')
			saveAuthParams(links)
			let state = saveAndGetState()
			location.href = localStorage.getItem('auth_link') +
				'?me=' + encodeURIComponent(this.$['auth-url-input'].value) +
				'&client_id=' + encodeURIComponent(CLIENT_ID) +
				'&redirect_uri=' + encodeURIComponent(location.href) +
				'&state=' + encodeURIComponent(state) +
				'&scope=' + SCOPE
		}).catch((e) => {
			console.log(e)
			alert('Could not connect.')
			this.requestInProgress = false
		})
	},

	authFinish () {
		let code = location.search.match(/code=([^&]+)/)[1]
		let me = location.search.match(/me=([^&]+)/)[1]
		this.requestInProgress = true
		fetch(localStorage.getItem('token_link'), {
			method: 'post',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
			body: 'code=' + code + '&me=' + me + '&client_id=' + encodeURIComponent(CLIENT_ID) +
				'&redirect_uri=' + encodeURIComponent(localStorage.getItem('redirect_uri')) +
				'&state=' + encodeURIComponent(localStorage.getItem('state')) + '&scope=' + SCOPE,
		}).then((resp) => {
			console.log(resp)
			return resp.text()
		}).then((body) => {
			let token = body.match(/access_token=([^&]+)/)[1]
			if (!token) throw new Error('No access token in response')
			setAccessToken(token)
			this.requestInProgress = false
		}).catch((e) => {
			console.log(e)
			alert('Could not get access token from the token endpoint.')
			this.authStart()
			this.requestInProgress = false
		})
	},
	// }}}

	// Open URL {{{
	showOpenUrl () {
		this.$['menu-button'].close()
		this.$['open-url-dialog'].open()
		let frame = this.queryEffectiveChildren('iframe')
		this.$['open-url-input'].value = frame.contentWindow.location.href
	},

	openUrlClosed (e) {
		if (!e.detail.confirmed) return
		let frame = this.queryEffectiveChildren('iframe')
		frame.src = this.$['open-url-input'].value
		this.selected = 0
	},
	// }}}

	showAbout () {
		this.$['menu-button'].close()
		this.$['about-dialog'].open()
	},

	closeMenu () {
		this.$['menu-button'].close()
	}

})
