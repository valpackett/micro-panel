<img src="https://dl.unrelenting.technology/micro-panel-splash.png" alt="" width="512"/>

# micro-panel

micro-panel is a set of [Web Components] made with [Lit] that provide an interface for editing [posts] on your website using the [Micropub] protocol from the [IndieWeb].

[Web Components]: https://developers.google.com/web/fundamentals/web-components/
[Lit]: https://lit.dev/
[posts]: https://indieweb.org/posts
[Micropub]: https://micropub.net/
[IndieWeb]: https://indieweb.org/

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
[indieweb-components]: https://github.com/unrelentingtech/indieweb-components

### Editor and toolbar

Place the `micro-panel-editor` directly into the body.
Beginning, end, doesn't matter -- it's a full screen overlay.
Don't forget to provide your Micropub endpoint's URL!
There's no smart detection, it doesn't look up in various links for simplicity reasons.

The `micro-panel-toolbar` is what provides the Edit/New post buttons.
It's a normal block element.
You can write custom styles to make it `position:sticky` or whatever.

```html
<body>
	<micro-panel-editor hidden micropub="/your/micropub/endpoint" csrfheader="x-csrf-token" csrftoken="1A2B..random"></micro-panel-editor>
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

#### Media Objects

micro-panel supports JSON objects for photos like this one:

```json
{
  "aperture": 10,
  "focal_length": 27,
  "geo": null,
  "height": 2916,
  "iso": 100,
  "palette": [
    { "b": 106, "g": 89, "r": 58 },
    { "b": 198, "g": 201, "r": 201 },
    { "b": 140, "g": 143, "r": 146 },
    { "b": 25, "g": 23, "r": 2 },
    { "b": 41, "g": 47, "r": 52 },
    { "b": 181, "g": 149, "r": 101 },
    { "b": 191, "g": 183, "r": 159 },
    { "b": 153, "g": 141, "r": 113 },
    { "b": 128, "g": 140, "r": 172 }
  ],
  "shutter_speed": [ 1, 320 ],
  "source": [
    {
      "original": false,
      "srcset": [
        {
          "src": "https://dl.unrelenting.technology/4a0c45a0ed40_img-7081.3000.jpg",
          "width": 3000
        },
        {
          "src": "https://dl.unrelenting.technology/4a0c45a0ed40_img-7081.2000.jpg",
          "width": 2000
        },
        {
          "src": "https://dl.unrelenting.technology/4a0c45a0ed40_img-7081.1000.jpg",
          "width": 1000
        }
      ],
      "type": "image/jpeg"
    },
    {
      "original": false,
      "srcset": [
        {
          "src": "https://dl.unrelenting.technology/4a0c45a0ed40_img-7081.3000.webp",
          "width": 3000
        },
        {
          "src": "https://dl.unrelenting.technology/4a0c45a0ed40_img-7081.2000.webp",
          "width": 2000
        },
        {
          "src": "https://dl.unrelenting.technology/4a0c45a0ed40_img-7081.1000.webp",
          "width": 1000
        }
      ],
      "type": "image/webp"
    },
    {
      "original": true,
      "srcset": [
        {
          "src": "https://dl.unrelenting.technology/IMG-7081.jpg",
          "width": 5184
        }
      ],
      "type": "image/jpeg"
    }
  ],
  "tiny_preview": "data:image/webp;base64,UklGRnAAAABXRUJQVlA4IGQAAAAwBACdASowABoAP93k6Gy/urEptVv8A/A7iWpn5FtTI0FdNumdDYJBregA/QjOCu+Vax2w/NNsn1WlEoWM/p71MMMgguqBQEtfbHi8eOBhwhKVvNAzA0Rvwyv7z3kaGgxQoYAA",
  "width": 5184
}
```

##### Server-Side Media Processing

The above JSON can be generated on the server side, e.g. by [imgroll](https://github.com/unrelentingtech/imgroll).

So, if the media endpoint returns a JSON body, it will be inserted verbatim.
But that implies synchronous processing, which is slow.

micro-panel also supports Server-Sent Events for asynchronously replacing plain URLs
with objects that contain multiple sources, metadata, etc.:

```html
	<micro-panel-editor hidden micropub="/your/micropub/endpoint"
	  media="/your/media/endpoint"
	  mediafirehose="/your/media/firehose"></micro-panel-editor>
```

The SSE stream must stream JSON-encoded payloads that contain `url` and `object` keys
(every property value equal to `url` will be replaced with the `object`.

#### Default Content Type

By default, newly created entries will be populated with `content: [{html: ''}]` to let you write HTML.
If your endpoint supports a more convenient markup language such as Markdown, you can specify it:

```html
	<micro-panel-editor hidden defaultctype="markdown" ...></micro-panel-editor>
```

### Posts

The toolbar has an Edit button for the current page, but you can also add a button for quickly editing a particular post in a list (feed) of posts.

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

### Category Suggestions

To have the ability to conveniently add existing tags to the `category` property, mark up your tag list / tag cloud / whatever like so:

```html
<a href="/tag/demo" data-mf-category="demo">#demo</a>
<a href="/tag/test" data-mf-category="test">#test</a>
```

Everything with the `data-mf-category` will be used for the category suggestions.

### Quick Reaction URL

micro-panel will automatically pop up a new reply/like/repost/etc. from a URL constructed like:

```
https://your.site/?mp-reaction=in-reply-to&with=https://example.com/entry&content=Hello+world
```

Where `in-reply-to` is the property name (can be anything).
`content` is optional of course.

And even `with` is optional, so you can have a plain "share" action:

```
https://your.site/?mp-reaction=post&content=Hello+world
```

This can be used to [set up indie-config](https://indieweb.org/indie-config#How_to_publish), for example:

```html
<script>
(function() {
  if (window.parent !== window) {
    window.parent.postMessage(JSON.stringify({
      reply: 'https://YOUR.DOMAIN/?mp-reaction=in-reply-to&with={url}',
      like: 'https://YOUR.DOMAIN/?mp-reaction=like-of&with={url}',
      repost: 'https://YOUR.DOMAIN/?mp-reaction=repost-of&with={url}',
      bookmark: 'https://YOUR.DOMAIN/?mp-reaction=bookmark-of&with={url}',
      tag: 'https://YOUR.DOMAIN/?mp-reaction=tag-of&with={url}',
      quotation: 'https://YOUR.DOMAIN/?mp-reaction=quotation-of&with={url}',
    }), '*');
  }
}());
</script>
```

## Usage

With the setup above, you should be ready to go!

Just log in to your website, click the New post or Edit buttons and enjoy.

## Contributing

Please feel free to submit pull requests!

By participating in this project you agree to follow the [Contributor Code of Conduct](https://contributor-covenant.org/version/1/4/) and to release your contributions under the Unlicense.

[The list of contributors is available on GitHub](https://github.com/unrelentingtech/micro-panel/graphs/contributors).

## License

This is free and unencumbered software released into the public domain.  
For more information, please refer to the `UNLICENSE` file or [unlicense.org](https://unlicense.org).
