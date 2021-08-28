const fs = require('fs');
const asyncLoop = require('./utils/asyncLoop');

require('yargs')
	.command(
		'backup [env] [account]',
		'run the backup',
		(yargs) => {
			yargs.positional('env', {
				type: 'string',
				default: '',
				describe: 'NodeJS environment file configuration',
			});

			yargs.positional('account', {
				type: 'string',
				default: 'default',
				describe: 'The selected Google Drive account',
			});
		},
		backup
	)
	.command(
		'auth [account]',
		'Create new profile and generate token',
		(yargs) => {
			yargs.positional('account', {
				type: 'string',
				default: 'default',
				describe: 'Google drive account',
			});
		},
		auth
	)
	.help().argv;

async function asyncForEach(array, callback) {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
}

async function backup(argv) {
	require('dotenv').config({ path: `${argv.env}.env` });
	const database = require('./utils/database');
	const Drive = require('./utils/google-drive');
	const gdrive = new Drive({
		account: argv.account,
	});

	console.log('Initializing Google Drive...');

	// Google Drive root database directory
	var rootDrive = await gdrive.createFolderRecursive(process.env.GDRIVE_FOLDER);

	var databases = [];

	if (process.env.DB_DATABASE) {
		console.log(`Database list loaded from env`);
		databases = process.env.DB_DATABASE.split(',');
	} else {
		console.log(`Database list will load from MySQL`);
		databases = await database.list();
	}

	console.log(`Databases:`, databases.join(', '));
	console.log(`\n`);

	await asyncForEach(databases, async (dbName) => {
		dbName = dbName.trim();
		console.log('DATABASE:', dbName);
		var folder = await gdrive.searchFile(dbName, rootDrive.id);
		if (!folder) {
			console.log(`   Creating gdrive folder...`);
			folder = await gdrive.createFolder(dbName, rootDrive.id);
		} else {
			console.log(`   Checking total backup items...`);
			var listFiles = await gdrive.listFiles(folder.id);

			var itemCount = 1;
			var keepItem = process.env.GDRIVE_KEEPITEM || 100;
			console.log(`   Keep item: ${keepItem}, total backup item: ${listFiles && listFiles.length} `);

			if (listFiles && listFiles.length >= keepItem) {
				await asyncLoop.foreach(listFiles, async (file) => {
					if (itemCount >= keepItem) {
						console.log('       Deleting old backup file:', file.name);

						await gdrive.delete(file.id);
						listFiles = listFiles.filter((item) => item.id !== file.id);
					}

					itemCount += 1;
				});
			}
		}

		console.log(`   Exporting...`);
		var dbFile = await database.export(dbName);

		console.log(`   Uploading...`);
		await gdrive.upload(dbFile, folder.id);

		if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);

		console.log(``);
	});

	console.log('Backup done 👌');

	process.exit();
}

async function auth(argv) {
	const Drive = require('./utils/google-drive');
	const gdrive = new Drive({
		account: argv.account,
	});

	var oauth = await gdrive.authenticate({ force: false });
	console.log('Done');
	process.exit();
}
