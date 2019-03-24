import { html, css, svg } from 'lit-element'

export function mpe () {
	return document.querySelector('micro-panel-editor')
}

export function reportError (e) {
	console.error(e)
	alert(e.toString())
}

export function upload (endpoint, token, file, onProgress) {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest()
		xhr.upload.addEventListener('progress', onProgress, false)
		xhr.addEventListener('load', e => {
			if (xhr.status >= 200 && xhr.status < 300) {
				const ctype = xhr.getResponseHeader('Content-Type')
				if (ctype && ctype.includes('application/json')) {
					resolve(JSON.parse(xhr.responseText))
				} else {
					resolve(xhr.getResponseHeader('Location'))
				}
			} else {
				reject(xhr.status)
			}
		})
		xhr.addEventListener('error', reject)
		xhr.addEventListener('abort', reject)
		xhr.addEventListener('timeout', reject)
		xhr.upload.addEventListener('error', reject)
		xhr.upload.addEventListener('abort', reject)
		xhr.upload.addEventListener('timeout', reject)
		xhr.open('post', endpoint)
		if (token) { // simple token for using a different domain
			xhr.setRequestHeader('Authorization', 'MediaToken ' + token)
		} else { // requires non-HttpOnly cookies
			const bearerCookie = document.cookie.split('; ').find(c => c.split('=')[0] === 'Bearer')
			if (bearerCookie) {
				xhr.setRequestHeader('Authorization', 'Bearer ' + bearerCookie)
			} else { // same origin
				xhr.withCredentials = true
			}
		}
		const form = new FormData()
		form.append('file', file)
		xhr.send(form)
	})
}

export async function geolocate () {
	const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject))
	return {
		'type': ['h-geo'],
		properties: {
			latitude: [pos.coords.latitude.toString()],
			longitude: [pos.coords.longitude.toString()],
		}
	}
}

export async function reverseGeocode ({ latitude, longitude }) {
	const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude[0])}&lon=${encodeURIComponent(longitude[0])}`)
	const { address } = await resp.json()
	const result = {
		latitude, longitude,
		'street-address': [address.road],
		'extended-address': [address.suburb],
		locality: [address.hamlet || address.village || address.town || address.city],
		region: [(address.county && address.state) ? (address.county + ', ' + address.state) : (address.state || address.county)],
		'postal-code': [address.postcode],
		'country-name': [address.country],
		'country-code': [address.country_code && address.country_code.toUpperCase()],
	}
	for (const k of Object.keys(result)) {
		if (!result[k][0]) {
			delete result[k]
		}
	}
	return result
}

export const sharedStyles = css`
		:host {
			line-height: 1.15;
			-webkit-text-size-adjust: 100%;
			--major-padding: var(--micro-panel-major-padding, 0.5rem);
			--roundness: var(--micro-panel-roundness, 4px);
			--neutral: var(--micro-panel-neutral, #fefefe);
			--neutral-hover: var(--micro-panel-neutral, #ebebeb);
			--accent: var(--micro-panel-accent, rgb(0, 137, 123));
			--accent-hover: var(--micro-panel-accent-hover, rgb(0, 107, 103));
			--light-accent: var(--micro-panel-light-accent, rgba(0, 137, 123, 0.55));
			--text: var(--micro-panel-text, #333);
			color: var(--text);
		}
		:host([hidden]) { display: none !important; }
		* { box-sizing: border-box; }

		input, textarea, button {
			text-transform: none;
			border-radius: var(--roundness);
			padding: 0.4rem;
			outline: none;
			border: 1px solid var(--accent);
			vertical-align: baseline;
		}
		::-moz-focus-inner {
			border-style: none;
			padding: 0;
		}
		input:-moz-focusring, textarea:-moz-focusring, button:-moz-focusring {
			outline: 1px dotted ButtonText;
		}
		button {
			padding: 0.4rem 0.8rem;
			overflow: visible;
			-webkit-appearance: button;
			background: var(--accent);
			color: var(--neutral);
			transition: 0.15s ease-in transform;
		}
		button:focus {
			transform: scale(1.1);
		}
		button:not([disabled]):active {
			transform: scale(0.9);
		}
		button:hover {
			background: var(--accent-hover);
		}
		button[disabled] {
			opacity: 0.5;
		}

		a {
			color: var(--accent);
		}
		a:hover {
			color: var(--accent-hover);
		}

		.icon, .icon-button {
			vertical-align: middle;
		}
		.icon-button {
			padding: 0.2rem;
			border-radius: 100rem;
			background: transparent;
			color: inherit;
			border: none;
		}
		.icon-button:hover {
			background: rgba(10, 10, 10, 0.2);
		}

		.inverted {
			background: var(--accent);
			color: var(--neutral);
		}
		.inverted button {
			background: var(--neutral);
			color: var(--accent);
			border-color: var(--neutral);
		}
		.inverted button:hover {
			background: var(--neutral-hover);
		}

		.header-bar {
			padding: var(--major-padding);
		}
		.bar {
			margin: 0;
			display: flex;
			align-items: baseline;
		}
		.bar label, .bar h1, .bar .stretchy {
			flex: 1;
		}
		.bar > * {
			margin: 0 0.4rem;
		}
		.bar > *:first-child {
			margin-left: 0;
		}
		.bar > * + * {
			margin-right: 0;
		}
		.bar h1 {
			margin: 0;
			font-size: 1.1rem;
		}
		.bar button {
			font-size: 1rem;
		}
`

/* https://materialdesignicons.com */
export const icons = {
	/* by Google | Apache 2 licensed: */
	plus: svg`
		<path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
	`,
	minus: svg`
		<path fill="currentColor" d="M19,13H5V11H19V13Z" />
	`,
	chevronUp: svg`
		<path fill="currentColor" d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z" />
	`,
	chevronDown: svg`
		<path fill="currentColor" d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
	`,
	leadPencil: svg`
		<path fill="currentColor" d="M16.84,2.73C16.45,2.73 16.07,2.88 15.77,3.17L13.65,5.29L18.95,10.6L21.07,8.5C21.67,7.89 21.67,6.94 21.07,6.36L17.9,3.17C17.6,2.88 17.22,2.73 16.84,2.73M12.94,6L4.84,14.11L7.4,14.39L7.58,16.68L9.86,16.85L10.15,19.41L18.25,11.3M4.25,15.04L2.5,21.73L9.2,19.94L8.96,17.78L6.65,17.61L6.47,15.29" />
	`,
	close: svg`
		<path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
	`,
	cloudUpload: svg`
		<path fill="currentColor" d="M14,13V17H10V13H7L12,8L17,13M19.35,10.03C18.67,6.59 15.64,4 12,4C9.11,4 6.6,5.64 5.35,8.03C2.34,8.36 0,10.9 0,14A6,6 0 0,0 6,20H19A5,5 0 0,0 24,15C24,12.36 21.95,10.22 19.35,10.03Z" />
	`,
	/* by Austin Andrews @Templarian | OFL licensed: */
	json: svg`
		<path fill="currentColor" d="M5,3H7V5H5V10A2,2 0 0,1 3,12A2,2 0 0,1 5,14V19H7V21H5C3.93,20.73 3,20.1 3,19V15A2,2 0 0,0 1,13H0V11H1A2,2 0 0,0 3,9V5A2,2 0 0,1 5,3M19,3A2,2 0 0,1 21,5V9A2,2 0 0,0 23,11H24V13H23A2,2 0 0,0 21,15V19A2,2 0 0,1 19,21H17V19H19V14A2,2 0 0,1 21,12A2,2 0 0,1 19,10V5H17V3H19M12,15A1,1 0 0,1 13,16A1,1 0 0,1 12,17A1,1 0 0,1 11,16A1,1 0 0,1 12,15M8,15A1,1 0 0,1 9,16A1,1 0 0,1 8,17A1,1 0 0,1 7,16A1,1 0 0,1 8,15M16,15A1,1 0 0,1 17,16A1,1 0 0,1 16,17A1,1 0 0,1 15,16A1,1 0 0,1 16,15Z" />
	`,
	/* by Cody @XT3000 | OFL licensed: */
	mapMarkerPlus: svg`
		<path fill="currentColor" d="M9,11.5A2.5,2.5 0 0,0 11.5,9A2.5,2.5 0 0,0 9,6.5A2.5,2.5 0 0,0 6.5,9A2.5,2.5 0 0,0 9,11.5M9,2C12.86,2 16,5.13 16,9C16,14.25 9,22 9,22C9,22 2,14.25 2,9A7,7 0 0,1 9,2M15,17H18V14H20V17H23V19H20V22H18V19H15V17Z" />
	`,
}

export function iconCode (icon, title = null) {
	return html`<svg class="icon" width="24" height="24" viewBox="0 0 24 24" role="img" ?aria-hidden=${title} title=${title || ''}>
		${icon}
		${title ? html`<title>${title}</title>` : ''}
	</svg>`
}
