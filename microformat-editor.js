'use strict'

Polymer({
	is: 'microformat-editor',

	properties: {
		item: { type: Object, value: { type: [ "h-entry" ], properties: {} } },
	},

	getPropKeys(item) {
		return Object.keys(item.properties)
	},

	getPropValues(e, key) {
		return e.base.properties[key]
	},

	addPropValue(e) {
		// have to ~replace~ ~the~ ~array~, not push into the existing one. because, idk, computers
		this.set('item.properties.' + e.model.key, this.item.properties[e.model.key].concat(['']))
	},

	removePropValue(e) {
		let index = e.model.index
		let key = e.currentTarget.dataset.key
		this.item.properties[key].splice(index, 1)
		this.set('item.properties.' + key, this.item.properties[key].map(x => x))
	},

	isString(val) {
		return typeof val === 'string'
	},

	isContentHtml(val) {
		return typeof val.html === 'string'
	},

	isContentValueNotHtml(val) {
		return typeof val.html !== 'string' && typeof val.type !== 'array' && typeof val.value === 'string'
	},

	isMicroformat(val) {
		return (val.type || []).length >= 1
	},

})
