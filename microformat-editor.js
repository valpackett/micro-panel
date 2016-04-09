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
		this.set('item.properties.' + name, [])
		this.$['new-prop-name'].value = ''
	},

	removeProp (e) {
		let props = {}
		Object.assign(props, this.item.properties)
		delete props[e.model.key]
		this.set('item.properties', props)
	},

	addPropValue (e) {
		// have to ~replace~ ~the~ ~array~, not push into the existing one. because, idk, computers
		// and the .map(x => x) clone prevents polymer from binding the new field to both the new element and the previous one
		// this should just be a `this.push` but polymer binding sucks for now
		this.set('item.properties.' + e.model.key, this.item.properties[e.model.key].map((x) => x).concat(['']))
	},

	removePropValue (e) {
		let index = e.model.index
		let key = e.currentTarget.dataset.key
		this.item.properties[key].splice(index, 1)
		this.set('item.properties.' + key, this.item.properties[key].map((x) => x))
	},

	isString (val) {
		return typeof val === 'string'
	},

	isContentHtml (val) {
		return typeof val.html === 'string'
	},

	isContentValueNotHtml (val) {
		return typeof val.html !== 'string' && !Array.isArray(val.type) && typeof val.value === 'string'
	},

	isMicroformat (val) {
		return (val.type || []).length >= 1
	},

})
