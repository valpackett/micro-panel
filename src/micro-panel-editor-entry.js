import 'codeflask-element'
import 'prismjs/components/prism-markdown.min.js'
import 'prismjs/components/prism-json.min.js'
import { LitElement, html } from '@polymer/lit-element'
import { reportError, upload, geolocate, reverseGeocode, sharedStyles, icons, iconCode } from './util.js'
import produce from 'immer'

export default class MicroPanelEditorEntry extends LitElement {
	static get properties () {
		return {
			defaultctype: String,
			entry: Object, entryIsNew: Boolean, setEntry: Function,
			hiddenProps: Object,
			openUploaders: Object, uploadQueues: Object,
			openJsonEditors: Object, jsonParseError: Object,
			media: /* endpoint */ String, mediatoken: String,
			cats: /* suggestions */ Array,
		}
	}

	constructor () {
		super()
		this.hiddenProps = {}
		this.openUploaders = { photo: true, video: true, audio: true }
		this.uploadQueues = { photo: [], video: [], audio: [] }
		this.openJsonEditors = { filter: true, unfilter: true, 'feed-settings': true, 'site-settings': true, 'site-web-push-subscriptions': true, }
		this.jsonParseError = {}
	}

	_render ({
		defaultctype, entry, entryIsNew, hiddenProps, openUploaders, uploadQueues,
		openJsonEditors, jsonParseError, media, mediatoken, cats
	}) {
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
				.input-row input, .input-row textarea, .input-row code-flask,
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
				textarea, code-flask {
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

				#upload-zone {
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
				.palette-color {
					border-right: 1px solid #999;
					padding-right: 0.5rem;
					margin-right: 0.5rem;
				}
				.palette-color:first-of-type {
					margin-left: 0.5rem;
				}
				.palette-color:last-of-type {
					border-right: 0;
				}

				@media screen and (min-width: 700px) {
					:host(.root-editor) fieldset { width: 70%; }
				}
			</style>

			${(entry && entry.type) ? html`
				<fieldset>
					${entry.type.map((tval, idx) => html`
						<div class="input-row">
							<input type="text" value=${tval} on-change=${e =>
								this._modify(entry, draft => draft.type[idx] = e.target.value)
							} disabled?=${!entryIsNew}>
							${(idx === 0 || !entryIsNew) ? '' : html`
								<button on-click=${_ =>
									this._modify(entry, draft => draft.type.splice(idx, 1))
								} title="Delete this type" class="icon-button">${iconCode(icons.minus)}</button>
							`}
							${!entryIsNew ? '' : html`
								<button on-click=${_ =>
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
						<button on-click=${_ => {
							this.hiddenProps = produce(hiddenProps, x => { x[propname] = !(x[propname] || false) })
						}} title="Toggle display of this property" class="icon-button">${iconCode(hiddenProps[propname] ? icons.chevronDown : icons.chevronUp)}</button>
						<label>${propname}</label>
						<button on-click=${_ =>
							this._modify(entry, draft => {
								delete draft.properties[propname]
								if (!('x-micro-panel-deleted-properties' in draft)) {
									draft['x-micro-panel-deleted-properties'] = []
								}
								draft['x-micro-panel-deleted-properties'].push(propname)
							})
						} title="Delete this property" class="icon-button">${iconCode(icons.minus)}</button>
						<button on-click=${_ => {
							this.openJsonEditors = produce(openJsonEditors, x => { x[propname] = !(x[propname] || false) })
							this.jsonParseError = produce(jsonParseError, pes => { pes[propname] = null })
						}} title="Edit this property as JSON" class="icon-button">${iconCode(icons.json)}</button>
						${'geolocation' in navigator ? html`
							<button on-click=${_ =>
								geolocate()
									.then(loc => this._modify(entry, draft => draft.properties[propname].push(loc)))
									.catch(reportError)
							} title="Add geolocation" class="icon-button">${iconCode(icons.mapMarkerPlus)}</button>
						` : ''}
						${media && !openUploaders[propname] ? html`
							<button on-click=${_ => {
								this.uploadQueues = produce(uploadQueues, x => { x[propname] = [] })
								this.openUploaders = produce(openUploaders, x => { x[propname] = true })
							}} title="Upload media files" class="icon-button">${iconCode(icons.cloudUpload)}</button>
						` : ''}
						<button on-click=${_ =>
							this._modify(entry, draft => draft.properties[propname].push(''))
						} title="Add new value to this property" class="icon-button">${iconCode(icons.plus)}</button>
					</header>
					${hiddenProps[propname] ? ''
						: openJsonEditors[propname] ? this._jsonEditor(entry, propname, jsonParseError)
						: (entry.properties[propname] && entry.properties[propname].map((propval, idx) => html`
						<div class="input-row input-row-labeled">
							${this._rowEditor(entry, propname, propval, idx, media, mediatoken, cats, defaultctype)}
							<button on-click=${_ =>
								this._modify(entry, draft => draft.properties[propname].splice(idx, 1))
							} title="Delete this value" class="icon-button">${iconCode(icons.minus)}</button>
						</div>
					`))}
					${(!hiddenProps[propname] && propname === 'category') ? html`
						<div class="cat-suggest">
							${[...cats].map(cat => entry.properties.category.includes(cat) ? '' : html`
								<button on-click=${_ => this._modify(entry, draft => draft.properties.category.push(cat))}>${cat}</button>
							`)}
						</div>
					` : ''}
					${(!hiddenProps[propname] && openUploaders[propname]) ? this._mediaUploader(entry, propname, media, mediatoken, uploadQueues) : ''}
				</fieldset>
			`)}

		${(entry && entry.type && entry.type.length > 0 && entry.type[0] === 'h-geo') ? html`
			<fieldset class="input-row">
				<button on-click=${_ => reverseGeocode(entry.properties).then(props =>
					this._modify(entry, draft => {
						draft.type[0] = 'h-adr'
						draft.properties = props
					})).catch(reportError)
				}>Find street address via Nominatim</button>
			</fieldset>
		` : ''}

		${(entry && entry.acl) ? html`
			<fieldset>
				<header class="bar">
					<label>Access Control List</label>
					<button on-click=${_ =>
						this._modify(entry, draft => draft.acl.push(''))
					} title="Add new ACL entry" class="icon-button">${iconCode(icons.plus)}</button>
				</header>
				${entry.acl.map((tval, idx) => html`
					<div class="input-row">
						<input type="text" value=${tval} on-change=${e =>
							this._modify(entry, draft => draft.acl[idx] = e.target.value)
						}>
						<button on-click=${_ =>
							this._modify(entry, draft => draft.acl.splice(idx, 1))
						} title="Delete this ACL entry" class="icon-button">${iconCode(icons.minus)}</button>
					</div>
				`)}
			</fieldset>
		` : html`
			<fieldset class="input-row">
				<button on-click=${_ => this._modify(entry, draft => draft.acl = ['*'])}>Add Access Control List</button>
			</fieldset>
		`}

		<fieldset class="input-row">
			<input type="text" placeholder="Add property..." id="new-prop-inp" on-keydown=${e => this.addNewProp(e, entry)}/>
			<button on-click=${e => this.addNewProp(e, entry)} class="icon-button">${iconCode(icons.plus)}</button>
		</fieldset>
		`
	}

	_rowEditor (entry, propname, propval, idx, media, mediatoken, cats, defaultctype) {
		if (propname === 'site-css' && typeof propval === 'string') {
			return html`
				<code-flask word-wrap language="css" value=${propval} on-value-changed=${e =>
					this._modify(entry, draft => draft.properties[propname][idx] = e.target.value)
				}></code-flask>
			`
		}
		if (typeof propval === 'string') {
			return html`
				<input type="text" value=${propval} on-change=${e =>
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
				Feed&nbsp;<input type="url" value=${propval.feed} on-value-changed=${e =>
					this._modify(entry, draft => draft.properties[propname][idx].feed = e.target.value)
				}>&nbsp;entries: ${(propval.entries || []).length}
			`
		}
		if ('type' in propval) {
			return html`
				<micro-panel-editor-entry
					media=${media} mediatoken=${mediatoken} cats=${cats} defaultctype=${defaultctype}
					entry=${propval}
					setEntry=${nentry => this._modify(entry, draft => draft.properties[propname][idx] = nentry)}>
				</micro-panel-editor-entry>
			`
		}
		if ('html' in propval) {
			return html`
				<code-flask word-wrap language="markup" value=${propval.html} on-value-changed=${e =>
					this._modify(entry, draft => draft.properties[propname][idx].html = e.target.value)
				}></code-flask>
			`
		}
		if ('markdown' in propval) {
			return html`
				<code-flask word-wrap language="markdown" value=${propval.markdown} on-value-changed=${e =>
					this._modify(entry, draft => draft.properties[propname][idx].markdown = e.target.value)
				}></code-flask>
			`
		}
		if ('source' in propval) {
			return html`
				<div class="media-editor">
					${(propval.width || propval.height) ? html`
						<div class="input-row">[${propval.width}x${propval.height}]</div>` : ''}
					<div class="input-row">
					${propval.source.map(src => html`
						<figure>
							${src.type && src.type.startsWith('image') ? html`
								<img src=${src.src} alt=""/>
							` : ''}
							${src.type && src.type.startsWith('audio') ? html`
								<audio src=${src.src} controls></audio>
							` : ''}
							${src.type && src.type.startsWith('video') ? html`
								<video src=${src.src} controls></video>
							` : ''}
							<figcaption>
								<a href=${src.src}>${src.type}</a>
							</figcaption>
						</figure>
					`)}
					</div>
					${propval.palette ? html`
						<div class="input-row input-row-labeled palette-row">
							Palette
							${Object.keys(propval.palette).map(clr => html`
								<label class="palette-color">
									<input type="color" value=${propval.palette[clr].color} on-change=${e =>
										this._modify(entry, draft => draft.properties[propname][idx].palette[clr].color = e.target.value)
									}/>
									${clr} (${propval.palette[clr].population})
								</label>
							`)}
						</div>` : ''}
					<label class="input-row input-row-labeled">
						Alt text&nbsp;
						<input type="text" value=${propval.alt} on-change=${e =>
							this._modify(entry, draft => draft.properties[propname][idx].alt = e.target.value)
						}/>
					</label>
					<div class="input-row input-row-labeled">
						<label for$=${`id-${propval}`}>
							ID&nbsp;
						</label>
						<input type="text" id$=${`id-${propval}`} value=${propval.id} on-change=${e =>
							this._modify(entry, draft => draft.properties[propname][idx].id = e.target.value)
						}/>&nbsp;
						<code on-click=${e => window.getSelection().selectAllChildren(e.target)}>
							&lt;${propname}-here id="${propval.id}"&gt;&lt;/${propname}-here&gt;
						</code>
					</label>
				</div>
			`
		}
		return html`<div class="error-value">Unsupported object with keys: ${Object.keys(propval).join(', ')}</div>`
	}

	_jsonEditor (entry, propname, jsonParseError) {
		return html`
			<code-flask word-wrap language="json" value=${JSON.stringify(entry.properties[propname], null, 2)} on-value-changed=${e =>
				this._modify(entry, draft => {
					try {
						draft.properties[propname] = JSON.parse(e.target.value)
						this.jsonParseError = produce(jsonParseError, pes => { pes[propname] = null })
					} catch (e) {
						this.jsonParseError = produce(jsonParseError, pes => { pes[propname] = e.toString() })
					}
				})
			}></code-flask>
			${jsonParseError[propname] ? html`<div class="json-error">
				<p><strong>JSON parsing error!</strong> The changes are not saved when this error is present. Please fix the syntax in the editor above. The error is:</p>
				<p><code>${jsonParseError[propname]}</code></p>
			</div>` : ''}
		`
	}

	_mediaUploader (entry, propname, media, mediatoken, uploadQueues) {
		return html`
			<div id="upload-zone"
				on-dragenter=${e => {
					e.stopPropagation()
					e.preventDefault()
					console.log(this)
					if (this.dragFirst) {
						this.dragSecond = true
					} else {
						this.dragFirst = true
						e.dataTransfer.dropEffect = 'copy'
						this.shadowRoot.getElementById('upload-zone').classList.add('dragging')
					}
				}}
				on-dragover=${e => {
					e.stopPropagation()
					e.preventDefault()
				}}
				on-dragleave=${e => {
					e.stopPropagation()
					e.preventDefault()
					if (this.dragSecond) {
						this.dragSecond = false
					} else {
						this.dragFirst = false
					}
					if (!this.dragFirst && !this.dragSecond) {
						this.shadowRoot.getElementById('upload-zone').classList.remove('dragging')
					}
				}}
				on-drop=${e => {
					e.stopPropagation()
					e.preventDefault()
					this.dragFirst = false
					this.dragSecond = false
					this.shadowRoot.getElementById('upload-zone').classList.remove('dragging')
					this.uploadQueues = produce(uploadQueues, x => {
						for (const file of e.dataTransfer.files) {
							x[propname].push({ file })
							console.log(file)
						}
					})
				}}>
				Drag'n'drop or select <input type="file" multiple on-change=${e => {
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
								<button on-click=${_ =>
									this.uploadQueues = produce(uploadQueues, x => { x[propname].splice(idx, 1) })
								} title="Delete this file from the queue" class="icon-button">${iconCode(icons.minus)}</button>
							</div>
						`)}
					</div>
					<button on-click=${async e => {
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
		const inp = this.shadowRoot.getElementById('new-prop-inp')
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
		this.setEntry(produce(entry, draft => { fn(draft) }))
	}
}

customElements.define('micro-panel-editor-entry', MicroPanelEditorEntry)
