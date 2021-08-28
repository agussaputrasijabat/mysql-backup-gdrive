const fs = require('fs');
const path = require('path');
const moment = require('moment');

class Database {
	constructor() {
		this.knex = require('knex').default({
			client: 'mysql',
			connection: {
				host: process.env.DB_HOST,
				user: process.env.DB_USER,
				password: process.env.DB_PASS || '',
			},
		});
	}

	async list() {
		const self = this;
		let results = [];
		let records = await self.knex.raw(`SHOW DATABASES`);
		if (records.length > 0 && records[0].length > 0) {
			records[0].map((x) => {
				if (x.Database != 'information_schema' && x.Database != 'mysql' && x.Database != 'performance_schema') {
					results.push(x.Database);
				}
			});
		}
		return results;
	}

	async export(dbName) {
		let tempFolder = path.resolve(process.cwd(), 'temp');
		if (!fs.existsSync(tempFolder)) {
			fs.mkdirSync(tempFolder);
		}

		var filename = path.resolve(tempFolder, `${dbName}_${moment().format('YYYY_MM_DD_HH_mm_ss')}.sql.gz`);
		var command = `${process.env.MYSQLDUMP} -h ${process.env.DB_HOST} -u ${process.env.DB_USER} --password="${process.env.DB_PASSWORD}" ${dbName} --single-transaction=TRUE --lock-tables=false --opt | gzip > "${filename}"`;
		const execSync = require('child_process').execSync;
		var code = execSync(command);

		if (fs.existsSync(filename)) return filename;
		else return null;
	}
}

module.exports = new Database();
