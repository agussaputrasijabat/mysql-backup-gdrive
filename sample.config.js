module.exports = {
	name: 'default',
	keepItem: 100,
	database: {
		host: '127.0.0.1',
		port: 3306,
		user: 'root',
		password: 'root',
		databases: [], // leave it empty to backup all databases on the current user
	},

	gdrive: {
		folder: 'mysql_backups',
	},
};
