import { mpe } from './util.js'

function matchingKey (action) {
	switch (action) {
		case 'like': return 'like-of'
		case 'repost': return 'repost-of'
		case 'bookmark': return 'bookmark-of'
		default: return 'in-reply-to'
	}
}

export default class IndieAction extends HTMLElement {
	connectedCallback () {
		const editor = mpe()
		for (const el of this.querySelectorAll('a, button')) {
			el.addEventListener('click', e => editor.newEntry({
				[matchingKey(this.getAttribute('do'))]: [this.getAttribute('with')],
				content: [{ [editor.defaultctype]: '' }],
			}))
		}
	}
}

customElements.define('indie-action', IndieAction)
