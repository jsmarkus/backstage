utils = require './utils'

module.exports = ({backbone, knockout})->

	bb = backbone
	ko = knockout

	class ListView extends bb.View

		fields : []

		setCollection : (collection)->
			if @collection then @unsubscribeFromCollection @collection
			@collection = collection
			@subscribeToCollection @collection

		subscribeToCollection : (collection)->
			collection.on 'add'   , @onCollectionAdd
			collection.on 'reset' , @onCollectionReset
			collection.on 'change', @onCollectionChange
			collection.on 'clear' , @onCollectionClear
			collection.on 'remove' , @onCollectionRemove
			@afterSubscribeToCollection?()

		unsubscribeFromCollection : (collection)->
			collection.off 'add'   , @onCollectionAdd
			collection.off 'reset' , @onCollectionReset
			collection.off 'change', @onCollectionChange
			collection.off 'clear' , @onCollectionClear
			collection.off 'remove' , @onCollectionRemove
			@afterUnsubscribeFromCollection?()

		modelToVm : (model)->
			item = {}
			raw = model.toJSON()

			for own field in @fields
				value = raw[field]
				item[field] = ko.observable(value)

			item.$id = ko.observable model.id
			item.$cid = ko.observable model.cid
			item

		collectionToVm : (collection)->
			@modelToVm m for m in collection.models

		onCollectionAdd:(model, collection)=>
			@vmInsert model

		onCollectionRemove:(model, collection)=>
			@vmRemove model

		onCollectionChange:(model)=>
			@vmUpdate model

		onCollectionReset:(collection)=>
			@vmReset collection

		onCollectionClear:(collection)=>
			@vmClear()

		vmInsert : (model)->
			@vm.items.push @modelToVm model
		vmClear : ->
			@vm.items []
		vmReset : (collection)->
			@vm.items @collectionToVm collection
		vmUpdate : (model)->
			item = ko.utils.arrayFirst @vm.items(), (item) -> item.$cid() is model.cid
			return unless item
			changes = model.changedAttributes()
			for own field, value of changes
				if field in @fields
					item[field]?(value)

		vmRemove : (model)->
			cid = model.cid
			@vm.items.remove (item)->
				item.$cid() is cid

		html: -> utils.standardListTemplate @fields

		render : ->
			@$el.html @html()
			ko.applyBindings @vm, @el

		afterVmCreated : ->

		initialize : ->
			@vm = {}
			@vm.items = ko.observableArray()
			@afterVmCreated()