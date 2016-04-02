# micro-panel

A client-side admin panel for your [IndieWeb](https://indiewebcamp.com) website!

- your website is the best interface to your website, and micro-panel just shows it in a frame, making entries editable
- creates(TODO)/updates/deletes [Microformats 2](http://microformats.org/wiki/microformats2) entries using [Micropub](http://micropub.net/draft/)
- authenticates using [IndieAuth](https://indiewebcamp.com/IndieAuth)
- (TODO) saves drafts of posts
- (TODO) allows working on drafts offline
- (TODO) undo/redo
- built with [Polymer](https://www.polymer-project.org/1.0/)

(Created because I didn't want to make an admin interface specific to [Sweetroll](https://github.com/myfreeweb/sweetroll)… Also check out [indieweb-components](https://github.com/myfreeweb/indieweb-components) for components to put on your website.)

## Installation

Make sure your website engine implements the Micropub spec! In particular, micro-panel will send JSON requests with the access token in an `Authorization` header.
For update requests, micro-panel uses the `replace` property.
The endpoint also should support `?q=source` requests, which allow micro-panel to always show all existing properties of an entry in the editing interface.

### From git

Clone the repo (or use GitHub's ZIP download feature), run [bower](http://bower.io/) install, put on your server (same domain as the website!).

## Contributing

Please feel free to submit pull requests!

By participating in this project you agree to follow the [Contributor Code of Conduct](http://contributor-covenant.org/version/1/4/).

## License

This is free and unencumbered software released into the public domain.  
For more information, please refer to the `UNLICENSE` file or [unlicense.org](http://unlicense.org).
