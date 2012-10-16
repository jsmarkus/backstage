utils = require './utils'

classes =
	ItemView : require './ItemView'
	ListView : require './ListView'

injectedClasses = {}

deps = {}

inject = ({backbone, knockout})->
	deps.backbone = backbone
	deps.knockout = knockout

factory = (classname)->
	unless injectedClasses[classname]? 
		injectedClasses[classname] = classes[classname] deps
	return injectedClasses[classname]


module.exports = {factory, inject, utils}