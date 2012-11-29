bb = require 'backbone'
model = require './TodoModel'


module.exports = class TodoCollection extends bb.Collection
	model : model
