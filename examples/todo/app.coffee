bb             = require 'backbone'
$              = require 'br-jquery'
bb.setDomLibrary $

#---------------------------------------------------------------------

TodoModel      = require './models/TodoModel'
TodoCollection = require './models/TodoCollection'

#---------------------------------------------------------------------

class App extends bb.View
	my : (obj)->
		obj.app = @

	initViewModel : ->
		@vm = {}

	initialize : ->
		@collections =
			todos : @my new TodoCollection
		@models =
			currentTodo : @my new TodoModel

	render : ->
		@$el.html do require './templates/app'
		console.log 'rendered'

#---------------------------------------------------------------------
(new App).setElement(document.getElementById('app')).render()
#---------------------------------------------------------------------
