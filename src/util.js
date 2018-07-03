import { html } from '@polymer/lit-element'

export function mpe () {
	return document.querySelector('micro-panel-editor')
}

export const sharedStyles = html`
	<style>
		:host {
			line-height: 1.15;
			-webkit-text-size-adjust: 100%;
			--major-padding: var(--micro-panel-major-padding, 0.5rem);
			--roundness: var(--micro-panel-roundness, 4px);
			--neutral: var(--micro-panel-neutral, #fefefe);
			--accent: var(--micro-panel-accent, rgb(0, 137, 123));
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

		.header-bar {
			padding: var(--major-padding);
		}
		.bar {
			margin: 0;
			display: flex;
			align-items: baseline;
		}
		.bar label, .bar h1 {
			flex: 1;
		}
		.bar button {
			margin: 0 0.2rem;
		}
		.bar button:first-child {
			margin-left: 0;
		}
		.bar button:last-child {
			margin-right: 0;
		}
	</style>
`
