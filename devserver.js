const fs = require('fs')
const polka = require('polka')
const Busboy = require('busboy')
const esModuleDevserver = require('es-module-devserver')

polka()
	.use(esModuleDevserver.middleware(__dirname))
	.get('/', (req, res) => {
		const content = fs.readFileSync('demo.html')
		return res.end(content)
	})
	.get('/fake-micropub', (req, res) => {
		res.setHeader('Content-Type', 'application/json')
		return res.end(JSON.stringify({
			type: ['h-entry'],
			properties: {
				name: ['Welcome to micro-panel'],
				content: [
					{
						markdown: `This is a set of Web Components for editing IndieWeb sites.
Look, the post source is **different**! This is a *demo*, so the micropub endpoint is fake :)`
					}
				],
				url: [`https://${req.headers.host}/fake/post`],
				category: ['test'],
				['like-of']: [
					{
						type: ['h-entry'],
						properties: {
							name: ['Nested entry test!'],
							url: [`https://${req.headers.host}/fake/other-post`],
						},
						content: [
							{
								html: `<strong>This works!</strong>`
							}
						],
					},
				],
				video: [
					{
						"height": 640,
						"width": 800,
						"source": [
							{
								"src": "https://dl.unrelenting.technology/786ac297_x.mp4",
								"type": "video/mp4"
							},
							{
								"src": "https://dl.unrelenting.technology/786ac297_x.webm",
								"type": "video/webm"
							},
							{
								"src": "https://dl.unrelenting.technology/786ac297_x.poster.jpg",
								"type": "image/jpeg"
							}
						],
						"meta": {
							"major_brand": "isom",
							"encoder": "Lavf57.46.100",
							"minor_version": "512",
							"compatible_brands": "isomiso2avc1mp41"
						}
					}
				],
				photo: [
					{
						"height": 380,
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
						"width": 1276,
						"source": [
							{
								"src": "https://dl.unrelenting.technology/b18de0b9_wayland-screenshot-2018-07-05_16-33-27-fs8.png",
								"type": "image/png"
							},
							{
								"src": "https://dl.unrelenting.technology/b18de0b9_wayland-screenshot-2018-07-05_16-33-27-fs8.webp",
								"type": "image/webp"
							}
						],
						"id": "snap"
					}
				],
			},
		}))
	})
	.post('/fake-micropub', (req, res) => {
		req.pipe(process.stdout);
		res.setHeader('Location', req.headers.referer || `http://${req.headers.host}`)
		res.statusCode = 201
		res.end()
	})
	.post('/fake-media', (req, res) => {
		let filename = null
		const bb = new Busboy({ headers: req.headers })
		bb.on('file', (_fld, file, fname, _enc, _mt) => {
			file.on('data', _ => {}) // needs these
			file.on('end', () => {})
			filename = fname
		})
		bb.on('finish', () => {
			console.log(filename)
			res.setHeader('Location', `https://example.com/fake/media/${filename}`)
			res.statusCode = 201
			res.end()
		})
		setTimeout(() => req.pipe(bb), 500) // simulate processing time
	})
	.listen(3003)
