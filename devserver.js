const fs = require('fs')
const polka = require('polka')
const esModuleDevserver = require('es-module-devserver')

polka()
	.use(esModuleDevserver.middleware(__dirname))
	.get('/', (req, res) => {
		const content = fs.readFileSync('demo.html')
		return res.end(content)
	})
	.listen(3003)
	.then(_ => console.log('Running on localhost:3003'))
