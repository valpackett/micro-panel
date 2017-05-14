/* eslint-disable no-new-wrappers */
'use strict'

function blankObjFor (prop) {
	if (prop === 'item') {
		return { type: ['h-item'], properties: { name: [''], url: [''] } }
	}
	if (prop === 'location') {
		return { type: ['h-adr'], properties: { 'country-name': [''], locality: [''] } }
	}
}

class MicroformatEditor extends Polymer.GestureEventListeners(Polymer.Element) {
	static get is () { return 'microformat-editor' }

	static get properties () {
		return {
			item: {
				type: Object,
				value: () => ({ type: [ 'h-entry' ], properties: {} }),
			},
			model: Object,
			isNested: Boolean,
		}
	}

	connectedCallback () {
		super.connectedCallback()
		this.addEventListener('tap', this.dismissMenus.bind(this))
	}

	dismissMenus (e) {
		for (const b of this.querySelectorAll('paper-menu-button')) {
			if (!b.contains(e.target)) {
				b.close()
			}
		}
	}

	updatePropFromInput (e) {
		const target = e.composedPath()[0]
		if (target.dataset.subkey) {
			this.item.properties[e.model.key][e.model.index].set(target.dataset.subkey, target.value)
		} else {
			const tr = this.item.properties[e.model.key].transact()
			tr[e.model.index] = target.value
			this.item.properties[e.model.key].run()
		}
	}

	updateJSONPropFromInput (e) {
		const target = e.composedPath()[0]
		const tr = this.item.properties[e.model.key].transact()
		tr[e.model.index] = JSON.parse(target.value)
		this.item.properties[e.model.key].run()
	}

	updateTypeFromInput (e) {
		const target = e.composedPath()[0]
		this.item.set('type', target.value.split(/\s+/))
	}

	oneLineType (item) {
		return (item.type || []).join(' ')
	}

	getPropKeys (item) {
		return Object.keys(item.properties || {})
	}

	getPropValues (e, key) {
		return e.base.properties[key]
	}

	addProp (e) {
		const name = this.$['new-prop-name'].value
		if (!name || name.length < 1) { return }
		if (name in this.item.properties) {
			alert('This property already exists!')
			return
		}
		const tr = this.item.transact()
		tr['x-micro-panel-deleted-properties'] = (tr['x-micro-panel-deleted-properties'] || []).filter(n => n !== name)
		let dflt = blankObjFor(name)
		if (name === 'content') { dflt = { html: '' } }
		if (name === 'photo' || name === 'video' || name === 'audio' || name === 'category') {
			dflt = []
		} else {
			dflt = [dflt || '']
		}
		tr.properties.set(name, dflt)
		this.item.run()
		this.$['new-prop-name'].value = ''
	}

	removeProp (e) {
		const tr = this.item.transact()
		tr['x-micro-panel-deleted-properties'] = tr['x-micro-panel-deleted-properties'] || []
		tr['x-micro-panel-deleted-properties'].push(e.model.key)
		tr.properties.remove(e.model.key)
		this.item.run()
	}

	addPropValue (key, obj) {
		const tr = this.item.properties.transact()
		tr[key] = tr[key] || []
		tr[key].push(obj)
		this.item.properties.run()
	}

	addPropValueText (e) {
		// using the String class prevents polymer from binding the new field to both the new element and the previous one
		// https://github.com/Polymer/polymer/issues/1913
		this.addPropValue(e.model.key, new String())
		e.target.dispatchEvent(new CustomEvent('iron-select', { bubbles: true }))
	}

	addPropValueHTML (e) {
		this.addPropValue(e.model.key, { html: '' })
		e.target.dispatchEvent(new CustomEvent('iron-select', { bubbles: true }))
	}

	addPropValueObject (e) {
		this.addPropValue(e.model.key, blankObjFor(e.model.key) || { type: ['h-entry'], properties: {} })
		e.target.dispatchEvent(new CustomEvent('iron-select', { bubbles: true }))
	}

	addPropValueJSON (e) {
		this.addPropValue(e.model.key, {})
		e.target.dispatchEvent(new CustomEvent('iron-select', { bubbles: true }))
	}

	addPropValueFile (e) {
		e.target.dispatchEvent(new CustomEvent('iron-select', { bubbles: true }))
		// XXX: https://github.com/PolymerElements/iron-overlay-behavior/issues/208#issuecomment-293349138
		const dialog = document.querySelector('micro-panel').$['file-upload-dialog']
		dialog.callback = result => {
			this.addPropValue(e.model.key, result)
		}
		dialog.open()
	}

	removePropValue (e) {
		const index = e.model.index
		const key = e.currentTarget.dataset.key
		const tr = this.item.properties.transact()
		tr[key].splice(index, 1)
		tr[key] = tr[key].map(x => x) // XXX: ?
		this.item.properties.run()
	}

	isOnlyStrings (e, key) {
		return (e.base.properties[key] || []).reduce((acc, p) => acc && this.isString(p), true)
	}

	isString (val) {
		return typeof val === 'string' || val instanceof String
	}

	isContentHtml (val) {
		return this.isString(val.html)
	}

	isMicroformat (val) {
		return (val.type || []).length >= 1
	}

	isWhateverJSONBlob (val) {
		return typeof val === 'object' && !this.isString(val) && !val.type && typeof val.html === 'undefined'
	}

	isCategories (key) {
		return key === 'category'
	}

	isUnusedCategory (cat) {
		return !(this.item.properties.category || []).includes(cat)
	}

	addCategory (e) {
		(this.item.properties.category || []).push(e.target.innerHTML)
	}

	hasMediaEndpoint (model) {
		return typeof model.mediaEndpoint === 'string'
	}

	isNew (item, isNested) {
		return item['x-micro-panel-new'] || isNested
	}

	showJSONBlob (val) {
		return JSON.stringify(val, null, 2)
	}
}

customElements.define(MicroformatEditor.is, MicroformatEditor)
