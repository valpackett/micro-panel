import './mp-code-mirror.js'
import { rgbToHex, rgbTupleToRgb, hexToRgbTuple } from '@wessberg/color'
import { LitElement, html, css } from 'lit'
import { reportError, upload, geolocate, reverseGeocode, sharedStyles, icons, iconCode } from './util.js'
import produce, { produceWithPatches, applyPatches } from 'immer'

export default class MicroPanelEditorEntry extends LitElement {
	static get properties () {
		return {
			defaultctype: { type: String },
			entry: { type: Object }, entryIsNew: { type: Boolean }, setEntry: { type: Function },
			hiddenProps: { type: Object },
			openUploaders: { type: Object }, uploadQueues: { type: Object },
			openJsonEditors: { type: Object }, jsonParseError: { type: Object },
			media: /* endpoint */ { type: String }, mediatoken: { type: String }, mediafirehose: { type: String },
			cats: /* suggestions */ { type: Array },
		}
	}

	constructor () {
		super()
		this.hiddenProps = {}
		this.openUploaders = { photo: true, video: true, audio: true }
		this.uploadQueues = { photo: [], video: [], audio: [] }
		this.openJsonEditors = { filter: true, unfilter: true, 'feed-settings': true, 'site-settings': true, 'site-web-push-subscriptions': true, }
		this.jsonParseError = {}
		this.undos = []
		this.redos = []
	}

	connectedCallback () {
		super.connectedCallback()
		if (this.mediafirehose) {
			this.mediaEventSrc = new EventSource(this.mediafirehose)
			this.mediaEventSrc.addEventListener('message', e => {
				if (e.data.length < 2) { return }
				const { object, url } = JSON.parse(e.data)
				this._modify(this.entry, draft => {
					for (const propname of Object.keys(draft.properties)) {
						draft.properties[propname] = draft.properties[propname].map(o =>
							o == url ? object : o)
					}
				})
			})
		}
	}

	static get styles() {
		return [
			sharedStyles,
			css`
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
				.bar button + label {
					margin-left: 0;
				}
				.input-row {
					padding: 0.5rem;
					display: flex;
					align-items: start;
				}
				.input-row + .input-row {
					padding-top: 0;
				}
				fieldset > .input-row:nth-of-type(even) {
					background: #fafafa;
				}
				.input-row input, .input-row textarea, .input-row mp-code-mirror,
				.input-row micro-panel-editor-entry, .input-row .media-editor, .input-row .error-value {
					flex: 1;
				}
				.input-row button {
					margin: 0 0.5rem;
				}
				.input-row button:last-child {
					margin-right: 0;
				}
				.input-row-labeled {
					align-items: baseline;
				}
				.input-row-photo-stuff input {
					width: 5em;
				}
				textarea {
					resize: vertical;
					min-height: 200px;
				}
				.error-value {
					color: #bb1111;
				}
				.json-error {
					background: #bb1111;
					color: #fff;
					padding: 0.5rem;
				}

				.cat-suggest {
					padding: 0.5rem;
					font-size: 1.1em;
					line-height: 2;
				}

				.upload-zone {
					position: relative;
					padding: 0.5rem;
				}
				.drag-overlay {
					display: none;
				}
				.dragging .drag-overlay {
					display: flex;
					align-items: center;
					justify-content: center;
					text-align: center;
					position: absolute;
					top: 0;
					right: 0;
					bottom: 0;
					left: 0;
					background: rgba(60, 60, 60, 0.8);
					color: #fff;
				}
				progress {
					display: block;
					width: 100%;
					margin: 0.1rem 0 0.4rem;
				}

				img, video {
					max-width: 100%;
				}
				.palette-row {
					flex-wrap: wrap;
					line-height: 1.9;
				}
				.palette-color, .input-row-photo-stuff label {
					border-right: 1px solid #999;
					padding-right: 0.5rem;
					margin-right: 0.5rem;
				}
				.palette-color:first-of-type {
					margin-left: 0.5rem;
				}
				.palette-color:last-of-type, .input-row-photo-stuff label:last-of-type {
					border-right: 0;
				}

				@media screen and (min-width: 700px) {
					:host(.root-editor) fieldset { width: 70%; }
				}
			`
		];
	}

	render () {
		const {
			defaultctype, entry, entryIsNew, hiddenProps, openUploaders, uploadQueues,
			openJsonEditors, jsonParseError, media, mediatoken, cats
		} = this
		return html`
			${(entry && entry.type) ? html`
				<fieldset>
					${entry.type.map((tval, idx) => html`
						<div class="input-row">
							<input type="text" .value=${tval} @change=${e =>
								this._modify(entry, draft => draft.type[idx] = e.target.value)
							} ?disabled=${!entryIsNew}>
							${(idx === 0 || !entryIsNew) ? '' : html`
								<button @click=${_ =>
									this._modify(entry, draft => draft.type.splice(idx, 1))
								} title="Delete this type" class="icon-button">${iconCode(icons.minus)}</button>
							`}
							${!entryIsNew ? '' : html`
								<button @click=${_ =>
									this._modify(entry, draft => draft.type.push(''))
								} title="Add new type" class="icon-button">${iconCode(icons.plus)}</button>
							`}
						</div>
					`)}
				</fieldset>
			` : ''}

			${entry && entry.properties && Object.keys(entry.properties).map(propname => html`
				<fieldset>
					<header class="bar">
						<button @click=${_ => {
							this.hiddenProps = produce(hiddenProps, x => { x[propname] = !(x[propname] || false) })
						}} title="Toggle display of this property" class="icon-button">${iconCode(hiddenProps[propname] ? icons.chevronDown : icons.chevronUp)}</button>
						<label>${propname}</label>
						<button @click=${_ =>
							this._modify(entry, draft => {
								delete draft.properties[propname]
								if (!('x-micro-panel-deleted-properties' in draft)) {
									draft['x-micro-panel-deleted-properties'] = []
								}
								draft['x-micro-panel-deleted-properties'].push(propname)
							})
						} title="Delete this property" class="icon-button">${iconCode(icons.minus)}</button>
						<button @click=${_ => {
							this.openJsonEditors = produce(openJsonEditors, x => { x[propname] = !(x[propname] || false) })
							this.jsonParseError = produce(jsonParseError, pes => { pes[propname] = null })
						}} title="Edit this property as JSON" class="icon-button">${iconCode(icons.json)}</button>
						${'geolocation' in navigator ? html`
							<button @click=${_ =>
								geolocate()
									.then(loc => this._modify(entry, draft => draft.properties[propname].push(loc)))
									.catch(reportError)
							} title="Add geolocation" class="icon-button">${iconCode(icons.mapMarkerPlus)}</button>
						` : ''}
						${media && !openUploaders[propname] ? html`
							<button @click=${_ => {
								this.uploadQueues = produce(uploadQueues, x => { x[propname] = [] })
								this.openUploaders = produce(openUploaders, x => { x[propname] = true })
							}} title="Upload media files" class="icon-button">${iconCode(icons.cloudUpload)}</button>
						` : ''}
						<button @click=${_ =>
							this._modify(entry, draft => draft.properties[propname].push(''))
						} title="Add new value to this property" class="icon-button">${iconCode(icons.plus)}</button>
					</header>
					${hiddenProps[propname] ? ''
						: openJsonEditors[propname] ? this._jsonEditor(entry, propname, jsonParseError)
						: (entry.properties[propname] && entry.properties[propname].map((propval, idx) => html`
						<div class="input-row input-row-labeled">
							${this._rowEditor(entry, propname, propval, idx, media, mediatoken, cats, defaultctype)}
							<button @click=${_ =>
								this._modify(entry, draft => draft.properties[propname].splice(idx, 1))
							} title="Delete this value" class="icon-button">${iconCode(icons.minus)}</button>
						</div>
					`))}
					${(!hiddenProps[propname] && propname === 'category') ? html`
						<div class="cat-suggest">
							${[...cats].map(cat => entry.properties.category.includes(cat) ? '' : html`
								<button @click=${_ => this._modify(entry, draft => draft.properties.category.push(cat))}>${cat}</button>
							`)}
						</div>
					` : ''}
					${(!hiddenProps[propname] && openUploaders[propname]) ? this._mediaUploader(entry, propname, media, mediatoken, uploadQueues) : ''}
				</fieldset>
			`)}

		${(entry && entry.type && entry.type.length > 0 && entry.type[0] === 'h-geo') ? html`
			<fieldset class="input-row">
				<button @click=${_ => reverseGeocode(entry.properties).then(props =>
					this._modify(entry, draft => {
						draft.type[0] = 'h-adr'
						draft.properties = props
					})).catch(reportError)
				}>Find street address via Nominatim</button>
			</fieldset>
		` : ''}

		<fieldset class="input-row">
			<input type="text" placeholder="Add property..." id="new-prop-inp" @keydown=${e => this.addNewProp(e, entry)}/>
			<button @click=${e => this.addNewProp(e, entry)} class="icon-button">${iconCode(icons.plus)}</button>
		</fieldset>
		`
	}

	_rowEditor (entry, propname, propval, idx, media, mediatoken, cats, defaultctype) {
		if (propname === 'site-css' && typeof propval === 'string') {
			return html`
				<mp-code-mirror lang="css" .value=${propval} .setValue=${v =>
					this._modify(entry, draft => draft.properties[propname][idx] = v)
				}></mp-code-mirror>
			`
		}
		if (typeof propval === 'string') {
			return html`
				<input type="text" .value=${propval} @change=${e =>
					this._modify(entry, draft => draft.properties[propname][idx] = e.target.value)
				}/>
			`
		}
		if (propval === null) {
			return html`<div class="error-value">null</div>`
		}
		if (typeof propval !== 'object') {
			return html`<div class="error-value">Item of unsupported type ${typeof propval}</div>`
		}
		if (propname === 'subscriptions') {
			return html`
				Feed&nbsp;<input type="url" .value=${propval.feed} @value-changed=${e =>
					this._modify(entry, draft => draft.properties[propname][idx].feed = e.target.value)
				}>&nbsp;entries: ${(propval.entries || []).length}
			`
		}
		if ('type' in propval) {
			return html`
				<micro-panel-editor-entry
					.media=${media} .mediatoken=${mediatoken} .cats=${cats} .defaultctype=${defaultctype}
					.entry=${propval}
					.setEntry=${nentry => this._modify(entry, draft => draft.properties[propname][idx] = nentry)}>
				</micro-panel-editor-entry>
			`
		}
		if ('html' in propval) {
			return html`
				<mp-code-mirror lang="html" .value=${propval.html} .setValue=${v =>
					this._modify(entry, draft => draft.properties[propname][idx].html = v)
				}></mp-code-mirror>
			`
		}
		if ('markdown' in propval) {
			return html`
				<mp-code-mirror lang="markdown" .value=${propval.markdown} .setValue=${v =>
					this._modify(entry, draft => draft.properties[propname][idx].markdown = v)
				}></mp-code-mirror>
			`
		}
		if ('source' in propval) {
			return html`
				<div class="media-editor">
					${(propval.width || propval.height) ? html`
						<div class="input-row">
							<img src=${propval.tiny_preview} alt="" />
							[${propval.width}x${propval.height}]
						</div>` : ''}
					${propval.source.map(src => html`
						<div class="input-row">
							Source&nbsp;<code>${src.type}</code>&nbsp;${src.original ? 'original' : ''}
							${src.src ? html`&nbsp;<a href=${src.src}>&lt;src&gt</a>` : ''}
							${src.srcset ? src.srcset.map(setitem => html`&nbsp;<a href=${setitem.src}>&lt;width ${setitem.width}&gt</a>`) : ''}
						</div>
					`)}
					${propval.palette ? html`
						<div class="input-row input-row-labeled palette-row">
							Palette
							${Array.isArray(propval.palette) && propval.palette.map((clr, i) => html`
								<label class="palette-color">
									<input type="color" value=${rgbToHex(rgbTupleToRgb([clr.r || 0, clr.g || 0, clr.b || 0]))} @change=${e =>
										this._modify(entry, draft => {
											const [r, g, b] = hexToRgbTuple(e.target.value)
											draft.properties[propname][idx].palette[i] = {r, g, b}
										})
									}/>
								</label>
							`)}
						</div>` : ''}
					<div class="input-row input-row-labeled input-row-photo-stuff">
						<label>
							ƒ/<input type="number" min="0.0" step="0.01" value=${propval.aperture || null} @change=${e =>
								this._modify(entry, draft => draft.properties[propname][idx].aperture = parseFloat(e.target.value))
							}/>
						</label>
						<label>
							Shutter <input type="number" min="0" step="1" value=${(propval.shutter_speed || [])[0] || null} @change=${e =>
								this._modify(entry, draft => draft.properties[propname][idx].shutter_speed = [parseFloat(e.target.value), (draft.properties[propname][idx].shutter_speed || [])[1] || 1] )
							}/>/<input type="number" min="0" step="1" value=${(propval.shutter_speed || [])[1] || null} @change=${e =>
								this._modify(entry, draft => draft.properties[propname][idx].shutter_speed = [(draft.properties[propname][idx].shutter_speed || [])[0] || 1, parseFloat(e.target.value)] )
							}/> s
						</label>
						<label>
							ISO <input type="number" min="0" step="1" value=${propval.iso || null} @change=${e =>
								this._modify(entry, draft => draft.properties[propname][idx].iso = parseInt(e.target.value))
							}/>
						</label>
						<label>
							Focal <input type="number" min="0" step="0.01" value=${propval.focal_length || null} @change=${e =>
								this._modify(entry, draft => draft.properties[propname][idx].focal_length = parseFloat(e.target.value))
							}/> mm
						</label>
					</div>
					<label class="input-row input-row-labeled">
						Alt text&nbsp;
						<input type="text" value=${propval.alt || ''} @change=${e =>
							this._modify(entry, draft => draft.properties[propname][idx].alt = e.target.value)
						}/>
					</label>
					<label class="input-row input-row-labeled">
						ID&nbsp;
						<input type="text" value=${propval.id || ''} @change=${e =>
							this._modify(entry, draft => draft.properties[propname][idx].id = e.target.value)
						}/>&nbsp;
					</label>
				</div>
			`
		}
		return html`<div class="error-value">Unsupported object with keys: ${Object.keys(propval).join(', ')}</div>`
	}

	_jsonEditor (entry, propname, jsonParseError) {
		return html`
			<mp-code-mirror lang="json" .value=${JSON.stringify(entry.properties[propname], null, 2)} .setValue=${v =>
				this._modify(entry, draft => {
					try {
						draft.properties[propname] = JSON.parse(v)
						this.jsonParseError = produce(jsonParseError, pes => { pes[propname] = null })
					} catch (e) {
						this.jsonParseError = produce(jsonParseError, pes => { pes[propname] = e.toString() })
					}
				})
			}></mp-code-mirror>
			${jsonParseError[propname] ? html`<div class="json-error">
				<p><strong>JSON parsing error!</strong> The changes are not saved when this error is present. Please fix the syntax in the editor above. The error is:</p>
				<p><code>${jsonParseError[propname]}</code></p>
			</div>` : ''}
		`
	}

	_mediaUploader (entry, propname, media, mediatoken, uploadQueues) {
		return html`
			<div class="upload-zone"
				@dragenter=${e => {
					e.stopPropagation()
					e.preventDefault()
					console.log(this)
					if (this.dragFirst) {
						this.dragSecond = true
					} else {
						this.dragFirst = true
						e.dataTransfer.dropEffect = 'copy'
						e.target.classList.add('dragging')
					}
				}}
				@dragover=${e => {
					e.stopPropagation()
					e.preventDefault()
				}}
				@dragleave=${e => {
					e.stopPropagation()
					e.preventDefault()
					if (this.dragSecond) {
						this.dragSecond = false
					} else {
						this.dragFirst = false
					}
					if (!this.dragFirst && !this.dragSecond) {
						for (const zone of this.renderRoot.querySelectorAll('.upload-zone'))
							zone.classList.remove('dragging')
					}
				}}
				@drop=${e => {
					e.stopPropagation()
					e.preventDefault()
					this.dragFirst = false
					this.dragSecond = false
					for (const zone of this.renderRoot.querySelectorAll('.upload-zone'))
						zone.classList.remove('dragging')
					this.uploadQueues = produce(uploadQueues, x => {
						for (const file of e.dataTransfer.files) {
							x[propname].push({ file })
							console.log(file)
						}
					})
				}}>
				Drag'n'drop or select <input type="file" multiple @change=${e => {
					this.uploadQueues = produce(uploadQueues, x => {
						for (const file of e.target.files) {
							x[propname].push({ file })
							console.log(file)
						}
					})
				}}>
				to upload.
				${uploadQueues[propname].length > 0 ? html`
					<div class="upload-queue">
						${uploadQueues[propname].map(({ file, progress }, idx) => html`
							<div class="upload-queue-file bar">
								<div class="stretchy">
									<div>${file.name}</div>
									${progress ? html`<progress max="100" value=${progress}>${progress}%</progress>` : ''}
								</div>
								<button @click=${_ =>
									this.uploadQueues = produce(uploadQueues, x => { x[propname].splice(idx, 1) })
								} title="Delete this file from the queue" class="icon-button">${iconCode(icons.minus)}</button>
							</div>
						`)}
					</div>
					<button @click=${async e => {
						for (const [idx, wrapper] of uploadQueues[propname].entries()) {
							try {
								const result = await upload(media, mediatoken, wrapper.file, e =>
									this.uploadQueues = produce(this.uploadQueues, x => {
										const idxx = x[propname].findIndex(y => y.file === wrapper.file)
										if (e.lengthComputable) {
											x[propname][idxx].progress = e.loaded / e.total * 100
										} else {
											x[propname][idxx].progress = 'ind'
										}
									}))
								this._modify(this.entry, draft => {
									draft.properties[propname].push(result)
								})
								this.uploadQueues = produce(this.uploadQueues, x => {
									x[propname].splice(x[propname].findIndex(y => y.file === wrapper.file), 1)
								})
							} catch (e) {
								reportError(e)
							}
						}
					}}>Upload!</button>
				` : ''}
				<div class="drag-overlay">
					Drop files here!
				</div>
			</div>
		`
	}

	addNewProp (e, entry) {
		if ('key' in e && e.key !== 'Enter') {
			return
		}
		const inp = this.renderRoot.getElementById('new-prop-inp')
		const propName = inp.value
		this._modify(entry, draft => {
			if (propName.length > 0 && !(propName in draft.properties)) {
				if (propName === 'photo' || propName === 'video' || propName === 'audio' || propName === 'location') {
					draft.properties[propName] = []
				} else if (propName === 'content') {
					draft.properties[propName] = [{ [this.defaultctype]: '' }]
				} else {
					draft.properties[propName] = ['']
				}
				if ('x-micro-panel-deleted-properties' in draft) {
					draft['x-micro-panel-deleted-properties'] = draft['x-micro-panel-deleted-properties'].filter(x => x !== propName)
				}
			}
		})
		inp.value = ''
	}

	_modify (entry, fn) {
		// NOTE: propagating the entry property assignment up to the top component
		// NOTE: eat return value here to avoid returning assignment results
		const [newEntry, patches, inversePatches] = produceWithPatches(entry, draft => { fn(draft) })
		this.setEntry(newEntry)
		this.undos.push([patches, inversePatches])
		this.redos = []
	}

	undo () {
		if (this.undos.length < 1)
			return
		const [patches, inversePatches] = this.undos.pop()
		this.setEntry(produce(this.entry, draft => { applyPatches(draft, inversePatches) }))
		this.redos.unshift(patches)
	}

	redo () {
		if (this.redos.length < 1)
			return
		const [newEntry, patches, inversePatches] = produceWithPatches(this.entry, draft => { applyPatches(draft, this.redos.shift()) })
		this.setEntry(newEntry)
		this.undos.push([patches, inversePatches])
	}

	get canUndo() {
		return this.undos.length > 0
	}

	get canRedo() {
		return this.redos.length > 0
	}
}

customElements.define('micro-panel-editor-entry', MicroPanelEditorEntry)
