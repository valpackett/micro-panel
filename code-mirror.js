'use strict'

Polymer({
	is: 'code-mirror',

	properties: {
		value: { type: String, value: '', notify: true },
		mode: { type: String, value: 'htmlmixed' },
	},

	ready () {
		this.mirror = new CodeMirror(this.$.codemirror, {
			value: this.value,
			mode: this.mode,
			theme: 'solarized light',
			lineNumbers: true,
			lineWrapping: true,
			inputStyle: 'contenteditable',
		})
		this.mirror.on('change', this.valueChanged.bind(this))
	},

	valueChanged () {
		if (!this.mirror) return
		let val = this.mirror.getValue()
		if (val === this.value) return
		this.set('value', val)
	},

	attached () {
		this.mirror.refresh()
		// I have no idea why it doesn't immediately refresh correctly when the first <code-mirror> is attached??
		setTimeout(() => this.mirror.refresh(), 250)
		setTimeout(() => this.mirror.refresh(), 500)
		setTimeout(() => this.mirror.refresh(), 1000)
		setTimeout(() => this.mirror.refresh(), 1250)
	},

	focus () {
		this.mirror.focus()
	},

})
