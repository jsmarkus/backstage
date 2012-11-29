utils = require './utils'

module.exports = ({backbone, knockout})->

	bb = backbone
	ko = knockout

	class ItemView extends bb.View

		fields : []

		setModel : (model)->
			if @model then @unsubscribeFromModel @model
			@model = model
			@subscribeToModel @model
			@updateVmSpecialFields @model
			@afterSubscribeToModel?()

		subscribeToModel : (model)->
			model.on 'change', @onModelChange

		onModelChange : (model)=>
			@updateVm model, model.changedAttributes()

		unsubscribeFromModel : (model)->
			model.off 'change', @onModelChange
			@afterUnsubscribeFromModel?()

		updateVm : (model, fieldValues)->
			for field in @fields when fieldValues.hasOwnProperty field
				@vm[field] fieldValues[field]
			@updateVmSpecialFields model

		updateVmSpecialFields : (model)->
			@vm.$isNew model.isNew()

		onVmChange : (field, value)=>
			@model.set field, value

		html : -> utils.standardItemTemplate @fields

		render : ->
			@$el.html @html()
			ko.applyBindings @vm, @el

		afterVmCreated : ->

		initialize : ->
			@vm = {}
			for f in @fields
				observable = ko.observable()
				@vm[f] = observable
				observable.subscribe ((f)=>(newValue)=>@onVmChange f, newValue)(f)
			@vm.$isNew = ko.observable()
			@afterVmCreated()