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
								"src": "https://unrelentingtech.s3.dualstack.eu-west-1.amazonaws.com/786ac297_x.mp4",
								"type": "video/mp4"
							},
							{
								"src": "https://unrelentingtech.s3.dualstack.eu-west-1.amazonaws.com/786ac297_x.webm",
								"type": "video/webm"
							},
							{
								"src": "https://unrelentingtech.s3.dualstack.eu-west-1.amazonaws.com/786ac297_x.poster.jpg",
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
						"palette": {
							"Vibrant": { "color": "#e47060", "population": 4 },
							"LightVibrant": { "color": "#f4ac9c", "population": 4 },
							"Muted": { "color": "#9fcc97", "population": 7 },
							"DarkVibrant": { "color": "#711e13", "population": 0 },
							"LightMuted": { "color": "#b0c6ad", "population": 21 }
						},
						"width": 1276,
						"source": [
							{
								"src": "https://unrelentingtech.s3.dualstack.eu-west-1.amazonaws.com/b18de0b9_wayland-screenshot-2018-07-05_16-33-27-fs8.png",
								"type": "image/png"
							},
							{
								"src": "https://unrelentingtech.s3.dualstack.eu-west-1.amazonaws.com/b18de0b9_wayland-screenshot-2018-07-05_16-33-27-fs8.webp",
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
	.then(_ => console.log('Running on localhost:3003'))
