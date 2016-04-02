'use strict'


function micropubGet (qs) {
	let link = localStorage.getItem('micropub_link')
	return fetch(link.indexOf('?') === -1 ? link + '?' + qs : link + '&' + qs, {
		headers: {
			Accept: 'application/json',
			Authorization: 'Bearer ' + localStorage.getItem('access_token')
		}
	})
}

function micropubPost (obj) {
	return fetch(localStorage.getItem('micropub_link'), {
		method: 'post',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: 'Bearer ' + localStorage.getItem('access_token')
		},
		body: JSON.stringify(obj)
	})
}

Polymer({
	is: 'micro-panel',

	properties: {
		selected: { type: Number, value: 0 },
		src: { type: String, value: "/" },
		editing: { type: Array, value: [] }
	},

	attached() {
		if (!(localStorage.getItem('access_token') && localStorage.getItem('micropub_link'))) {
			if (location.search.match(/code=/))
				this.authFinish()
			else
				this.showAuthDialog()
		}
		this.$.frame.addEventListener('load', load => {
			console.log(load)
			let style = load.target.contentDocument.createElement('style')
			style.innerHTML += '.h-entry { border: 2px solid blue; }'
			style.innerHTML += '.h-entry::before { content: "Edit"; background: blue; color: white; padding: 6px; display: block; cursor: pointer; }'
			load.target.contentDocument.body.appendChild(style)
			load.target.contentDocument.addEventListener('click', this.editClick.bind(this))
		})
	},

	editClick(e) {
		if (!e.target.classList.contains('h-entry')) return
		let entry = Microformats.get({ node: e.target, textFormat: 'normalised' }).items[0]
		let i = 0
		if (this.editing.find(editingEntry => {
			i += 1
			return ((editingEntry.properties || {}).uid || [1])[0] == ((entry.properties || {}).uid || [1])[0]
		})) {
			this.selected = 1 + i
			return
		}
		let frameUrl = this.$.frame.contentWindow.location.href
		let url = ((entry.properties || {}).url || [frameUrl])[0]
		if (frameUrl == url)
			return this.editStart(entry)
		micropubGet('q=source&url=' + encodeURIComponent(url))
		.then(resp => resp.json())
		.then(fullEntry => this.editStart(fullEntry))
		.catch(e => {
			console.log('Error when asking micropub for entry source', e)
			fetch(url)
			.then(resp => resp.text())
			.then(body => {
				let fullEntry = Microformats.get({ html: body, textFormat: 'normalised', filter: ['h-entry'] }).items[0]
				this.editStart(fullEntry)
			})
			.catch(e => {
				console.log('Error when fetching entry', e)
				this.editStart(entry)
			})
		})
	},

	editStart(entry) {
		this.push('editing', entry)
		this.selected = 1 + this.editing.length
	},

	deleteEntry(e) {
		if (!confirm('Are you sure you want to delete the entry?')) return
		let entry = e.model.item
		let url = ((entry.properties || {}).url || [null])[0]
		if (!url) return alert('Somehow, an entry with no URL! I have no idea how to delete that.')
		micropubPost({ 'mp-action': 'delete', url: url })
		.then(resp => {
			if (resp.status >= 300) throw new Error("Couldn't delete the entry! Response: " + resp.status)
			this.stopEditing(entry)
		})
		.catch(e => {
			console.log('Error when deleting entry', e)
			alert(e)
		})
	},

	saveEntry(e) {
		if (!confirm('Are you sure you want to save the entry?')) return
		let entry = e.model.item
		let url = ((entry.properties || {}).url || [null])[0]
		if (!url) return alert('Somehow, an entry with no URL! I have no idea how to save that.')
		micropubPost({ 'mp-action': 'update', url: url, replace: { properties: entry.properties } })
		.then(resp => {
			if (resp.status >= 300) throw new Error("Couldn't save the entry! Response: " + resp.status)
			this.stopEditing(entry)
		})
		.catch(e => {
			console.log('Error when saving entry', e)
			alert(e)
		})
	},

	stopEditing(entry) {
		this.splice('editing', this.editing.indexOf(entry), 1)
		this.$.frame.src = this.$.frame.src // reload
		this.selected = 0
	},

	showAuthDialog() {
		this.$['auth-url-input'].value = location.origin
		this.$['auth-dialog'].open()
	},

	authStart() {
		fetch(this.$['auth-url-input'].value)
		.then(resp => {
			let links = resp.headers.get('Link')
			let micropub_link = links.match(/<([^>]+)>;[^,]*rel="[^,]*micropub[^,]*"/)[1]
			let auth_link = links.match(/<([^>]+)>;[^,]*rel="[^,]*authorization_endpoint[^,]*"/)[1] || 'https://indieauth.com/auth'
			let token_link = links.match(/<([^>]+)>;[^,]*rel="[^,]*token_endpoint[^,]*"/)[1]
			let state = new Uint8Array(32)
			crypto.getRandomValues(state)
			state = state.join('')
			localStorage.setItem('micropub_link', micropub_link)
			localStorage.setItem('auth_link', auth_link)
			localStorage.setItem('token_link', token_link)
			localStorage.setItem('state', state)
			localStorage.setItem('redirect_uri', location.href)
			location.href = auth_link +
				'?me=' + encodeURIComponent(this.$['auth-url-input'].value) +
				'&client_id=' + encodeURIComponent(this.$['auth-url-input'].value) +
				'&redirect_uri=' + encodeURIComponent(location.href) +
				'&state=' + encodeURIComponent(state) +
				'&scope=post'
		})
	},

	authFinish() {
		let code = location.search.match(/code=([^&]+)/)[1]
		let me = location.search.match(/me=([^&]+)/)[1]
		fetch(localStorage.getItem('token_link'), {
			method: 'post',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
			body: 'code=' + code + '&me=' + me + '&client_id=' + me +
				'&redirect_uri=' + encodeURIComponent(localStorage.getItem('redirect_uri')) +
				'&state=' + encodeURIComponent(localStorage.getItem('state')) + '&scope=post'
		}).then(resp => {
			console.log(resp)
			return resp.text()
		}).then(body => {
			let token = body.match(/access_token=([^&]+)/)[1]
			if (!token) throw new Error('No access token in response')
			localStorage.setItem('access_token', token)
			localStorage.removeItem('auth_link')
			localStorage.removeItem('token_link')
			localStorage.removeItem('state')
			localStorage.removeItem('redirect_uri')
			history.replaceState({}, '', location.href.replace(/\?[^#]*/, ''))
		}).catch(e => {
			console.log(e)
			// TODO: show error to user
			this.authStart()
		})
	},

	showOpenUrl() {
		this.$['menu-button'].close()
		this.$['open-url-input'].value = this.$.frame.contentWindow.location.href
		this.$['open-url-dialog'].open()
	},

	openUrlClosed(e) {
		if (!e.detail.confirmed) return
		this.src = this.$['open-url-input'].value
		this.selected = 0
	},

	showAbout() {
		this.$['menu-button'].close()
		this.$['about-dialog'].open()
	}

})

