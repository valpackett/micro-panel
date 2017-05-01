/* eslint-disable no-new-wrappers */
'use strict'

Polymer({
	is: 'microformat-editor',

	properties: {
		item: { type: Object, value: { type: [ 'h-entry' ], properties: {} } },
	},

	listeners: {
		tap: 'dismissMenus'
	},

	dismissMenus (e) {
		Array.prototype.forEach.call(this.querySelectorAll('paper-menu-button'), (b) => {
			if (!b.contains(e.target)) {
				b.close()
			}
		})
	},

	getPropKeys (item) {
		return Object.keys(item.properties)
	},

	getPropValues (e, key) {
		return e.base.properties[key]
	},

	addProp (e) {
		const name = this.$['new-prop-name'].value
		if (!name) return
		if (name.length < 1) return
		if (name in this.item.properties) {
			alert('This property already exists!')
			return
		}
		this.set('item.x-micro-panel-deleted-properties', (this.item['x-micro-panel-deleted-properties'] || []).filter((n) => n !== name))
		this.set('item.properties.' + name, [])
		this.$['new-prop-name'].value = ''
	},

	removeProp (e) {
		this.set('item.x-micro-panel-deleted-properties', (this.item['x-micro-panel-deleted-properties'] || []).concat([e.model.key]))
		const props = {}
		Object.assign(props, this.item.properties)
		delete props[e.model.key]
		this.set('item.properties', props)
	},

	addPropValue (key, obj) {
		// have to ~replace~ ~the~ ~array~, not push into the existing one. because, idk, computers
		this.set('item.properties.' + key, this.item.properties[key].concat([obj]))
	},

	addPropValueText (e) {
		// using the String class prevents polymer from binding the new field to both the new element and the previous one
		// https://github.com/Polymer/polymer/issues/1913
		this.addPropValue(e.model.key, new String())
		e.target.dispatchEvent(new CustomEvent('iron-select', { bubbles: true }));
	},

	addPropValueHTML (e) {
		this.addPropValue(e.model.key, { html: '' })
		e.target.dispatchEvent(new CustomEvent('iron-select', { bubbles: true }));
	},

	addPropValueObject (e) {
		this.addPropValue(e.model.key, { type: ['h-entry'], properties: {} })
		e.target.dispatchEvent(new CustomEvent('iron-select', { bubbles: true }));
	},

	removePropValue (e) {
		const index = e.model.index
		const key = e.currentTarget.dataset.key
		this.item.properties[key].splice(index, 1)
		this.set('item.properties.' + key, this.item.properties[key].map((x) => x))
	},

	isOnlyStrings (e, key) {
		return (e.base.properties[key] || []).reduce((acc, p) => acc && this.isString(p), true)
	},

	isString (val) {
		return typeof val === 'string' || val instanceof String
	},

	isContentHtml (val) {
		return this.isString(val.html)
	},

	isContentValueNotHtml (val) {
		return !this.isString(val.html) && !Array.isArray(val.type) && this.isString(val.value)
	},

	isMicroformat (val) {
		return (val.type || []).length >= 1
	},

})
