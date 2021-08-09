import { LitElement, html, css } from 'lit'
import { mpe, sharedStyles, icons, iconCode } from './util.js'

export default class MicroPanelToolbar extends LitElement {
	static get properties () { return { } }

	static get styles() {
		return [
			sharedStyles,
			css`
				:host {
					display: block;
				}
			`
		]
	}

	render () {
		return html`
			<header class="bar header-bar inverted">
				<slot name="title"><h1>micro-panel</h1></slot>
				<button @click=${_ => mpe().editEntry(location.href)}>${iconCode(icons.leadPencil)} Edit</button>
				<button @click=${_ => mpe().newEntry()}>${iconCode(icons.plus)} New</button>
			</header>
		`
	}

}

customElements.define('micro-panel-toolbar', MicroPanelToolbar)
