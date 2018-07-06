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
			},
		}))
	})
	.post('/fake-micropub', (req, res) => {
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
