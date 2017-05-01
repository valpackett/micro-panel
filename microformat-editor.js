/* eslint-disable no-new-wrappers */
'use strict'

class MicroformatEditor extends Polymer.Element {
	static get is () { return 'microformat-editor' }

	static get properties () {
		return {
			item: {
				type: Object,
				value: () => ({ type: [ 'h-entry' ], properties: {} }),
			}
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
		tr.properties.set(name, [])
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
		this.addPropValue(e.model.key, { type: ['h-entry'], properties: {} })
		e.target.dispatchEvent(new CustomEvent('iron-select', { bubbles: true }))
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

	isContentValueNotHtml (val) {
		return !this.isString(val.html) && !Array.isArray(val.type) && this.isString(val.value)
	}

	isMicroformat (val) {
		return (val.type || []).length >= 1
	}
}

customElements.define(MicroformatEditor.is, MicroformatEditor)
