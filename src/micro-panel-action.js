import { mpe } from './util.js'

export default class MicroPanelAction extends HTMLElement {
	connectedCallback () {
		for (const el of this.querySelectorAll('a, button')) {
			el.addEventListener('click', e => mpe().editEntry(this.getAttribute('with')))
		}
	}
}

customElements.define('micro-panel-action', MicroPanelAction)
