bb = require 'backbone'

priority =
	LOW : -1
	NORMAL : 0
	HIGH : 1

module.exports = class TodoModel extends bb.Model
	defaults :
		id       : null
		title    : ''
		text     : ''
		done     : no
		priority : priority.NORMAL

TodoModel.priority = priority