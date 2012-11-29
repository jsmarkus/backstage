backstage = require '../../../'

ItemView = backstage.factory 'ItemView'

module.exports = class TodoList extends ItemView
	fields : [
		'id'
		'title'
		'text'
		'done'
		'priority'
	]