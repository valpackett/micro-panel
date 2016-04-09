/*eslint-disable no-new-wrappers */
'use strict'

Polymer({
	is: 'microformat-editor',

	properties: {
		item: { type: Object, value: { type: [ 'h-entry' ], properties: {} } },
	},

	getPropKeys (item) {
		return Object.keys(item.properties)
	},

	getPropValues (e, key) {
		return e.base.properties[key]
	},

	addProp (e) {
		let name = this.$['new-prop-name'].value
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
		let props = {}
		Object.assign(props, this.item.properties)
		delete props[e.model.key]
		this.set('item.properties', props)
	},

	addPropValue (e) {
		// have to ~replace~ ~the~ ~array~, not push into the existing one. because, idk, computers
		// and using the String class prevents polymer from binding the new field to both the new element and the previous one
		// https://github.com/Polymer/polymer/issues/1913
		this.set('item.properties.' + e.model.key, this.item.properties[e.model.key].concat([new String()]))
	},

	removePropValue (e) {
		let index = e.model.index
		let key = e.currentTarget.dataset.key
		this.item.properties[key].splice(index, 1)
		this.set('item.properties.' + key, this.item.properties[key].map((x) => x))
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
