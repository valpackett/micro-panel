'use strict'

Polymer({
	is: 'microformat-editor',

	properties: {
		item: { type: Object, value: { type: [ "h-entry" ], properties: {} } }
	},

	getPropKeys(item) {
		return Object.keys(item.properties)
	},

	getPropValues(item, key) {
		return item.properties[key]
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
	}

})
