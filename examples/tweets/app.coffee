$ = require 'br-jquery'
bb = require 'backbone'
ko = require 'knockoutify'
backstage = require '../../'

bb.setDomLibrary $
backstage.inject knockout:ko, backbone:bb

ItemView = backstage.factory 'ItemView'
ListView = backstage.factory 'ListView'

####################################

class TweetView extends ItemView
	fields : [
		'created_at'
		'from_user'
		'text'
	]

	html : ->
		h = []
		for f in @fields
			h.push """<div>
			<strong>#{f}</strong>:
			<input type="text" data-bind="value:#{f}" />
			</div>"""
		h.push '<div><button data-bind="click:save">Save</button></div>'
		return h.join '\n'

	afterVmCreated :->
		@vm.save = =>
			@trigger 'save'

####################################

class TweetsCollection extends bb.Collection
	url    : -> "http://search.twitter.com/search.json?q=#{@query}&page=#{@page}&callback=?"
	parse  : (res, xhr)->res.results
	page   : 1
	query  : 'backbone'

####################################

class TweetsListView extends ListView
	fields : ['from_user', 'text']

	events :
		'click tbody tr' : 'onItemClick'

	onItemClick : (e)->
		item = e.currentTarget
		cid =  item.getAttribute 'data-cid'
		clickedModel = @collection.getByCid cid
		@trigger 'select', clickedModel

	# itemHtml : ->
	# 	"""
	# 	<div>
	# 		<strong data-bind="text:from_user">
	# 		</strong>
	# 		<span data-bind="text:text">
	# 		</span>
	# 	</div>
	# 	"""

####################################

class App
	run : ->
		@itemView          = new TweetView el:$('#selected-tweet')
		@listView          = new TweetsListView el:$('#tweets')
		@twitsCollection   = new TweetsCollection
		@currentTweetModel = new bb.Model

		@itemView.setModel @currentTweetModel
		@listView.setCollection @twitsCollection

		@listView.on 'select', @onItemSelect
		@itemView.on 'save', @onItemSave

		@itemView.render()
		@listView.render()
		@twitsCollection.fetch()

	onItemSelect : (model)=>
		@currentTweetModel.set model.toJSON()

	onItemSave : ()=>
		id = @currentTweetModel.id
		modelToUpdate = @twitsCollection.get id
		modelToUpdate.set @currentTweetModel.toJSON()


app = new App
app.run()