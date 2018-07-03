import { LitElement, html } from '@polymer/lit-element'
import { sharedStyles } from './util.js'
import produce from 'immer'

export default class MicroPanelEditorEntry extends LitElement {
	static get properties () { return { entry: Object } }

	_render ({ entry }) {
		return html`
			${sharedStyles}
			<style>
				:host { display: block; }
				fieldset {
					border: 0;
					margin: 1rem auto;
					padding: 0;
					box-shadow: rgba(20,20,20,0.2) 0 0 5px;
					border-radius: var(--roundness);
					overflow: hidden;
				}
				header {
					background: var(--light-accent);
					color: var(--neutral);
					padding: 0.15rem 0.5rem;
				}
				.input-row {
					padding: 0.5rem;
					display: flex;
					align-items: top;
				}
				.input-row + .input-row {
					padding-top: 0;
				}
				.input-row input {
					flex: 1;
				}
				.input-row button {
					margin: 0 0.5rem;
				}
				.input-row button:last-child {
					margin-right: 0;
				}

				@media screen and (min-width: 700px) {
					fieldset { width: 70%; }
				}
			</style>

			${entry && Object.keys(entry.properties).map(propname => html`
				<fieldset>
					<header class="bar">
						<label>${propname}</label>
						<button on-click=${_ =>
							this.entry = produce(entry, draft => { delete draft.properties[propname] })
						} title="Delete this property">-</button>
						<button on-click=${_ =>
							this.entry = produce(entry, draft => { draft.properties[propname].push('') })
						} title="Add new value to this property">+</button>
					</header>
					${entry.properties[propname].map((propval, idx) => html`
						<div class="input-row">
							${(typeof propval === 'string') ?
								html`
									<input type="text" value=${propval} on-change=${e =>
										this.entry = produce(entry, draft => { draft.properties[propname][idx] = e.target.value })
									}/>
								` : ''
							}
							<button on-click=${_ =>
								this.entry = produce(entry, draft => { draft.properties[propname].splice(idx, 1) })
							} title="Delete this value">-</button>
						</div>
					`)}
				</fieldset>
			`)}

		<fieldset class="input-row">
			<input type="text" placeholder="Add property..." id="new-prop-inp" on-keydown=${e => {
				this.addNewProp(e, entry)
			}}/>
			<button on-click=${e => this.addNewProp(e, entry)}>+</button>
		</fieldset>
		`
	}

	addNewProp (e, entry) {
		if ('key' in e && e.key !== 'Enter') {
			return
		}
		const inp = this.shadowRoot.getElementById('new-prop-inp')
		const propName = inp.value
		this.entry = produce(entry, draft => {
			propName.length > 0 && !(propName in draft.properties) && (draft.properties[propName] = [''])
		})
		inp.value = ''
	}

}

customElements.define('micro-panel-editor-entry', MicroPanelEditorEntry)
