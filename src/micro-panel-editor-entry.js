import 'codeflask-element'
import 'prismjs/components/prism-markdown.min.js'
import { LitElement, html } from '@polymer/lit-element'
import { sharedStyles, icons, iconCode } from './util.js'
import produce from 'immer'

export default class MicroPanelEditorEntry extends LitElement {
	static get properties () { return { entry: Object, setEntry: Function } }

	_render ({ entry }) {
		return html`
			${sharedStyles}
			<style>
				:host { display: block; }
				fieldset {
					border: 0;
					margin: 1rem auto;
					padding: 0;
					box-shadow: rgba(20,20,20,0.24) 0 0 6px;
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
					align-items: start;
				}
				.input-row + .input-row {
					padding-top: 0;
				}
				.input-row input, .input-row textarea, .input-row code-flask {
					flex: 1;
				}
				.input-row button {
					margin: 0 0.5rem;
				}
				.input-row button:last-child {
					margin-right: 0;
				}
				textarea, code-flask {
					resize: vertical;
					min-height: 200px;
				}

				@media screen and (min-width: 700px) {
					fieldset { width: 70%; }
				}
			</style>

			${entry && entry.properties && Object.keys(entry.properties).map(propname => html`
				<fieldset>
					<header class="bar">
						<label>${propname}</label>
						<button on-click=${_ =>
							this._modify(entry, draft => delete draft.properties[propname])
						} title="Delete this property" class="icon-button">${iconCode(icons.minus)}</button>
						<button on-click=${_ =>
							this._modify(entry, draft => draft.properties[propname].push(''))
						} title="Add new value to this property" class="icon-button">${iconCode(icons.plus)}</button>
					</header>
					${entry.properties[propname].map((propval, idx) => html`
						<div class="input-row">
							${this._rowEditor(entry, propname, propval, idx)}
							<button on-click=${_ =>
								this._modify(entry, draft => draft.properties[propname].splice(idx, 1))
							} title="Delete this value" class="icon-button">${iconCode(icons.minus)}</button>
						</div>
					`)}
				</fieldset>
			`)}

		<fieldset class="input-row">
			<input type="text" placeholder="Add property..." id="new-prop-inp" on-keydown=${e => this.addNewProp(e, entry)}/>
			<button on-click=${e => this.addNewProp(e, entry)} class="icon-button">${iconCode(icons.plus)}</button>
		</fieldset>
		`
	}

	_rowEditor (entry, propname, propval, idx) {
		if (typeof propval === 'string') {
			return html`
				<input type="text" value=${propval} on-change=${e =>
					this._modify(entry, draft => draft.properties[propname][idx] = e.target.value)
				}/>
			`
		}
		if (typeof propval !== 'object') {
			return `Unsupported object type ${typeof propval}`
		}
		if ('html' in propval) {
			return html`
				<code-flask language="markup" value=${propval.html} on-value-changed=${e =>
					this._modify(entry, draft => draft.properties[propname][idx].html = e.target.value)
				}></code-flask>
			`
		} else if ('markdown' in propval) {
			return html`
				<code-flask language="markdown" value=${propval.markdown} on-value-changed=${e =>
					this._modify(entry, draft => draft.properties[propname][idx].markdown = e.target.value)
				}></code-flask>
			`
		}
	}

	addNewProp (e, entry) {
		if ('key' in e && e.key !== 'Enter') {
			return
		}
		const inp = this.shadowRoot.getElementById('new-prop-inp')
		const propName = inp.value
		this._modify(entry, draft =>
			propName.length > 0 && !(propName in draft.properties) && (draft.properties[propName] = ['']))
		inp.value = ''
	}

	_modify (entry, fn) {
		// NOTE: propagating the entry property assignment up to the top component
		// NOTE: eat return value here to avoid returning assignment results
		this.setEntry(produce(entry, draft => { fn(draft) }))
	}
}

customElements.define('micro-panel-editor-entry', MicroPanelEditorEntry)
