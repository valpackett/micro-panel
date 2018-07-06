<img src="https://unrelentingtech.s3.dualstack.eu-west-1.amazonaws.com/micro-panel-splash.png" alt="" width="512"/>

# micro-panel

micro-panel is a set of [Web Components] that provide an interface for editing [posts] on your website using the [Micropub] protocol from the [IndieWeb].

(Actually, it doesn't have to be just posts! The [Sweetroll] engine gets away with using micro-panel as its one and only admin interface, because everything -- site configuration, categories, etc. -- is shoehorned into micropub-editable objects.)

[Web Components]: https://developers.google.com/web/fundamentals/web-components/
[posts]: https://indieweb.org/posts
[Micropub]: https://micropub.net/
[IndieWeb]: https://indieweb.org/
[Sweetroll]: https://github.com/myfreeweb/sweetroll

## Requirements

To use micro-panel, your website needs to

- have a Micropub endpoint (duh) that
	- supports browser session (cookie) authentication, i.e. you can "just log in" on your website and send micropub requests, without going through OAuth/IndieAuth and stuff (which technically violates [the spec](https://www.w3.org/TR/micropub/#authentication-1) :D)
	- supports [source content queries with `?q=source`](https://www.w3.org/TR/micropub/#source-content)
	- accepts [JSON requests](https://www.w3.org/TR/micropub/#json-syntax)
	- supports update and delete (if you want to be able to do these things, which you probably do)

## Installation

(TODO publish to npm // for now, build with `npm run build`)

First of all, put the bundled script somewhere on your server.

Then edit the templates, like in the (hopefully obvious) pseudocode below:

### Script loading

Just do it!

```html
	...
	{{if logged-in-as-admin}}
	<script defer src="/some/where/micro-panel-all.bundle.min.js"></script>
	{{else}}
	<script defer src="/some/where/indie-action.min.js"></script>
	{{endif}}
</body>
```

Note that micro-panel includes an implementation of the `indie-action` tag from [webactions] to allow you to easily e.g. like your own posts -- or actually not just your own posts if your site acts as a [reader]!
So if you use a "guest" implementation to allow others to easily react to your posts -- such as the implementation from [indieweb-components] that uses [indie-config] -- load that one for non-admin users.

[webactions]: https://indieweb.org/webactions
[reader]: https://indieweb.org/reader
[indie-config]: https://indieweb.org/indie-config
[indieweb-components]: https://github.com/myfreeweb/indieweb-components

If you want to try to support browsers without native [Custom Elements](https://caniuse.com/#feat=custom-elementsv1) & [Shadow DOM](https://caniuse.com/#feat=shadowdomv1), also load the [Web Components Polyfill](https://www.npmjs.com/package/@webcomponents/webcomponentsjs) loader (make sure you use `-loader.js`, DO NOT load the `-bundle.js` you don't want the whole 100kb of polyfills on browser that don't need them):

```html
<head>
	...
	<script src="/whatever/webcomponentsjs/webcomponents-loader.js"></script>
```

But hey, it's an admin application, not a public application, so you only have to care about browsers *you* use.
If all your Firefoxes are Nightly, you're fine without polyfills.
(Actually, you might try enabling `about:config` flags on stable Firefox, that might work.)

### Editor and toolbar

Place the `micro-panel-editor` directly into the body.
Beginning, end, doesn't matter -- it's a full screen overlay.
Don't forget to provide your Micropub endpoint's URL!
There's no smart detection, it doesn't look up in various links for simplicity reasons.

The `micro-panel-toolbar` is what provides the New post button.
It's a normal block element.
You can write custom styles to make it `position:sticky` or whatever.

```html
<body>
	<micro-panel-editor hidden micropub="/your/micropub/endpoint"></micro-panel-editor>
	<micro-panel-toolbar></micro-panel-toolbar>
	...
```

#### Media Endpoint

You can provide a path to your [media endpoint](https://indieweb.org/micropub_media_endpoint) to enable file uploads:

```html
	<micro-panel-editor hidden micropub="/your/micropub/endpoint"
	  media="/your/media/endpoint"></micro-panel-editor>
```

If it's a cross-domain endpoint, you have two options:

- have a `Bearer` cookie accessible to JavaScript, it will be sent as `Authorization: Bearer COOKIE_CONTENT`
- provide a `mediatoken="TOKEN"` attribute as well, it will be sent as `Authorization: MediaToken TOKEN`

And of course, [CORS](https://enable-cors.org) should be configured in both cases:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Authorization
```

If the endpoint is on the same domain, you don't have to care about any of this :)

Also: if the endpoint returns a JSON body, it will be inserted verbatim.
Sweetroll uses this for rich photo upload.

#### Default Content Type

By default, newly created entries will be populated with `content: [{html: ''}]` to let you write HTML.
If your endpoint supports a more convenient markup language such as Markdown, you can specify it:

```html
	<micro-panel-editor hidden defaultctype="markdown" ...></micro-panel-editor>
```

### Posts

In the post template, add a button or link wrapped in a `micro-panel-action`.
The `with` attribute of the element will be used, without modification, for the `?q=source` Micropub request.
So make sure that e.g. if it's relative here, your Micropub endpoint also understands relative URLs.

And as already mentioned, `indie-action` is also handled.

```html
	...
	<footer class="post-footer">
		{{if logged-in-as-admin}}
		<micro-panel-action with="{{permalink}}">
			<button>Edit</button>
		</micro-panel-action>
		{{endif}}
		<indie-action do="reply" with="{{permalink}}">
			<button>Reply</button>
		</indie-action>
		...
	</footer>
```

## Usage

With the setup above, you should be ready to go!

Just log in to your website, click the New post or Edit buttons and enjoy.

## Contributing

Please feel free to submit pull requests!

By participating in this project you agree to follow the [Contributor Code of Conduct](https://contributor-covenant.org/version/1/4/) and to release your contributions under the Unlicense.

[The list of contributors is available on GitHub](https://github.com/myfreeweb/micro-panel/graphs/contributors).

## License

This is free and unencumbered software released into the public domain.  
For more information, please refer to the `UNLICENSE` file or [unlicense.org](https://unlicense.org).
