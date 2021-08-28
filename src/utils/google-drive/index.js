const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const Client = require('./client');
const asyncLoop = require('../asyncLoop');

class Drive extends Client {
	constructor(options) {
		super(options);

		this.baseFolderName = process.env.GDRIVE_FOLDER || 'mysql_backups';

		this.drive = this.google.drive({
			version: 'v3',
			auth: this.client.oAuth2Client,
		});
	}

	async init() {
		const self = this;
		var file = await self.searchFile(self.baseFolderName);
		if (!file) {
			file = await self.createFolderOnRoot(self.baseFolderName);
		}
	}

	async listFiles(folderId = null) {
		const self = this;

		try {
			var options = {
				q: `trashed=false`,
				fields: 'nextPageToken, files(id,name,modifiedTime,createdTime)',
				pageSize: 200,
				pageToken: pageToken,
				spaces: 'drive',
			};

			if (folderId) {
				options.q = `${options.q} and '${folderId}' in parents`;
			}

			var pageToken = null;
			var files = await self.drive.files.list(options);

			return files.data.files;
		} catch (error) {
			console.log(error);
		}

		return null;
	}

	async searchFiles(name, folderId = null) {
		const self = this;

		try {
			var options = {
				q: `name = '${name}' and trashed=false`,
				fields: 'nextPageToken, files(*)',
				spaces: 'drive',
				pageToken: pageToken,
			};

			if (folderId) {
				options.q += ` and '${folderId}' in parents`;
			}

			var pageToken = null;
			var files = await self.drive.files.list(options);

			return files.data.files;
		} catch (error) {
			console.log(error);
		}

		return null;
	}

	async searchFile(name, folderId) {
		const self = this;
		var files = await self.searchFiles(name, folderId);
		if (files.length > 0) return files[0];
		else return null;
	}

	/**
	 * Create google drive folder
	 */
	async createFolder(name, folderId) {
		const self = this;

		var fileMetadata = {
			name: name,
			mimeType: 'application/vnd.google-apps.folder',
		};

		if (folderId) {
			fileMetadata.parents = [folderId];
		}

		var result = await self.drive.files.create({
			resource: fileMetadata,
			fields: '*',
		});

		if (result.status == 200) return result.data;
		else return null;
	}

	/**
	 * Create google drive folder
	 */
	async createFolderRecursive(name, folderId = null) {
		const self = this;

		let folders = name.split('/');
		var lastFile = null;

		await asyncLoop.foreach(folders, async (folder) => {
			var file = await self.searchFile(folder, lastFile ? lastFile.id : null);

			if (!file) {
				lastFile = await self.createFolder(folder, lastFile ? lastFile.id : null);
			} else {
				lastFile = file;
			}
		});

		return lastFile;
	}

	/**
	 * Create google drive folder on the root
	 */
	async createFolderOnRoot(name) {
		const self = this;
		var fileMetadata = {
			name: name,
			mimeType: 'application/vnd.google-apps.folder',
		};

		var result = await self.drive.files.create({
			resource: fileMetadata,
			fields: '*',
		});

		if (result.status == 200) return result.data;
		else return null;
	}

	async upload(filename, folderId) {
		const self = this;
		var fileTitle = `${path.basename(filename)}`;

		var fileMetadata = {
			name: fileTitle,
			parents: [folderId],
		};
		var media = {
			mimeType: mime.lookup(fileTitle),
			body: fs.createReadStream(filename),
		};

		var res = await self.drive.files.create({
			resource: fileMetadata,
			media: media,
			fields: '*',
		});

		media.body.close();

		if (res.status == 200) return res.data;
		else return null;
	}

	async delete(fileId) {
		const self = this;
		return await self.drive.files.delete({
			fileId: fileId,
		});
	}
}

module.exports = Drive;
