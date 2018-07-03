import { LitElement, html } from '@polymer/lit-element'
import { mpe, sharedStyles, icons, iconCode } from './util.js'

export default class MicroPanelToolbar extends LitElement {
	static get properties () { return { } }

	_render ({micropub}) {
		return html`
			${sharedStyles}
			<style>
				:host {
					display: block;
				}
			</style>

			<header class="bar header-bar inverted">
				<button on-click=${_ => mpe().newEntry()}>${iconCode(icons.leadPencil)} New post</button>
			</header>
		`
	}

}

customElements.define('micro-panel-toolbar', MicroPanelToolbar)
