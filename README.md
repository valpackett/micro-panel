<img src="https://unrelentingtech.s3.dualstack.eu-west-1.amazonaws.com/micro-panel-splash.png" alt="" width="512"/>

[![Screenshot](https://unrelentingtech.s3.dualstack.eu-west-1.amazonaws.com/micro-panel-2017-05-21.png)](https://unrelentingtech.s3.dualstack.eu-west-1.amazonaws.com/micro-panel-2017-05-21.png)

# micro-panel

A client-side admin panel for your [IndieWeb](https://indieweb.org) website!

- your website is the best interface to your website, and micro-panel just shows it in a frame, making entries editable
  - instead of using a frame it's possible to embed micro-panel into your site's templates and have it show when you're logged in
- creates/updates/deletes [Microformats 2](http://microformats.org/wiki/microformats2) entries using [Micropub](http://micropub.net/draft/)
- supports media endpoint file uploads
- authenticates using [IndieAuth](https://indieweb.org/IndieAuth)
- built with [Polymer](https://www.polymer-project.org/)

(Created because I didn't want to make an admin interface specific to [Sweetroll](https://github.com/myfreeweb/sweetroll)… Also check out [indieweb-components](https://github.com/myfreeweb/indieweb-components) for components to put on your website.)

## Installation

Make sure your website engine implements the Micropub spec! In particular, micro-panel will send JSON requests with the access token in an `Authorization` header.
For update requests, micro-panel uses the `replace` property.
The endpoint also should support `?q=source` requests, which allow micro-panel to always show all existing properties of an entry in the editing interface.

### From [a release](https://github.com/myfreeweb/micro-panel/releases) (recommended) (TODO)

Unpack the archive, put on your server (same domain as the website!).

### From git

Clone the repo (or use GitHub's ZIP download feature), `npm install`, `npm run deps`, put on your server (same domain as the website!).

## Developing

Clone the repo, run `bower install`, done.
You can work on micro-panel (in modern browsers such as current Firefox and Chrome) without running the build step!

However, if you `npm install`, you get two commands:

- `npm run lint` to check JS style (and catch some mistakes) with [ESLint](http://eslint.org/) and HTML style with [Polylint](https://github.com/PolymerLabs/polylint)
- `npm run build` to make a production build with [Broccoli](https://github.com/broccolijs/broccoli)

The production build reduces the number of files (so, HTTP requests) to make loading faster. 

## Contributing

Please feel free to submit pull requests!

By participating in this project you agree to follow the [Contributor Code of Conduct](http://contributor-covenant.org/version/1/4/) and to release your contributions under the Unlicense.

[The list of contributors is available on GitHub](https://github.com/myfreeweb/micro-panel/graphs/contributors).

## License

This is free and unencumbered software released into the public domain.  
For more information, please refer to the `UNLICENSE` file or [unlicense.org](http://unlicense.org).
