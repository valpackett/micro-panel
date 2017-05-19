/* eslint-disable no-new-wrappers */

class MicroformatEditor extends Polymer.GestureEventListeners(Polymer.Element) {
	static debounce (f, delay) {
		let timeout
		return function () {
			const args = arguments
			clearTimeout(timeout)
			timeout = setTimeout(() => f.apply(this, args), delay)
		}
	}

	static blankObjFor (prop) {
		if (prop === 'item') {
			return { type: ['h-item'], properties: { name: [''], url: [''] } }
		}
		if (prop === 'location') {
			return { type: ['h-adr'], properties: { 'country-name': [''], locality: [''] } }
		}
	}

	static blankPropFor (prop) {
		let dflt = MicroformatEditor.blankObjFor(prop)
		if (prop === 'content') { dflt = { html: '', 'x-micro-panel-editor': 'wysiwyg' } }
		if (prop === 'photo' || prop === 'video' || prop === 'audio' || prop === 'category') {
			// Expecting file upload or clicking existing tags
			dflt = []
		} else {
			dflt = [dflt || '']
		}
		return dflt
	}

	static get is () { return 'microformat-editor' }

	static get properties () {
		return {
			item: {
				type: Object,
				value: () => ({ type: [ 'h-entry' ], properties: {} }),
			},
			model: Object,
			isNested: Boolean,
			minimizedProps: {
				type: Array,
				value: () => ['comment'],
			},
		}
	}

	constructor () {
		super()
		this._updatePropFromInput = MicroformatEditor.debounce((e) => {
			const target = e.composed ? e.composedPath()[0] : e.path[0]
			if (target.dataset.subkey) {
				this.item.properties[e.model.key][e.model.index].set(target.dataset.subkey, target.value)
			} else {
				const tr = this.item.properties[e.model.key].transact()
				tr[e.model.index] = target.value
				this.item.properties[e.model.key].run()
			}
		}, 200)
		this._updateJSONPropFromInput = MicroformatEditor.debounce((e) => {
			const target = e.composed ? e.composedPath()[0] : e.path[0]
			const tr = this.item.properties[e.model.key].transact()
			tr[e.model.index] = JSON.parse(target.value)
			this.item.properties[e.model.key].run()
		}, 200)
	}

	updatePropFromInput (e) {
		return this._updatePropFromInput(e)
	}

	updateJSONPropFromInput (e) {
		return this._updateJSONPropFromInput (e)
	}

	updateTypeFromInput (e) {
		const target = e.composedPath()[0]
		this.item.set('type', target.value.split(/\s+/))
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

	oneLineType (item) {
		return ((item || {}).type || []).join(' ')
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
		tr.properties.set(name, MicroformatEditor.blankPropFor(name))
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
		this.addPropValue(e.model.key, MicroformatEditor.blankObjFor(e.model.key) || { type: ['h-entry'], properties: {} })
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

	isMicroformat (val) {
		return (val.type || []).length >= 1
	}

	isNonMfObject (val) {
		return typeof val === 'object' && !this.isString(val) && !val.type
	}

	isEditorHtml (val) {
		const mpe = val['x-micro-panel-editor']
		return mpe ? mpe === 'html' : this.isString(val.html)
	}

	isEditorWysiwyg (val) {
		const mpe = val['x-micro-panel-editor']
		return mpe === 'wysiwyg'
	}

	isEditorMarkdown (val) {
		const mpe = val['x-micro-panel-editor']
		return mpe ? mpe === 'markdown' : this.isString(val.markdown)
	}

	isEditorJson (val) {
		const mpe = val['x-micro-panel-editor']
		return mpe ? mpe === 'json' : !(this.isString(val.markdown) || this.isString(val.html))
	}

	selectEditor (e, name) {
		const index = e.model.index
		const key = e.currentTarget.dataset.key
		this.item.properties[key][index].set('x-micro-panel-editor', e.currentTarget.dataset.editor)
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
		return item && item['x-micro-panel-new'] || isNested
	}

	showJSONBlob (val) {
		return JSON.stringify(val, null, 2)
	}

	toggleExpand (e) {
		if (this.minimizedProps.includes(e.model.key)) {
			this.splice('minimizedProps', this.minimizedProps.indexOf(e.model.key), 1)
		} else {
			this.push('minimizedProps', e.model.key)
		}
	}

	isExpanded (key) {
		return !this.minimizedProps.includes(key)
	}

	toggleIcon (key) {
		return this.minimizedProps.includes(key) ? 'expand-more' : 'expand-less'
	}
}

customElements.define(MicroformatEditor.is, MicroformatEditor)
