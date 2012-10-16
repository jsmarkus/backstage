module.exports =
	standardItemTemplate:(fields)->
		h = []
		for f in fields
			h.push """<div>
			<strong>#{f}</strong>:
			<span data-bind="text:#{f}"></span>
			</div>"""
		h.join '\n'

	standardListTemplate : (fields)->
		itemHtml = (fields)->
			cells = []
			for field in fields
				cells.push """<td data-bind="text:#{field}"></td>"""
			cells.join ''

		headHtml = (fields)->
			cells = []
			for field in fields
				cells.push """<th>#{field}</th>"""
			cells.join ''

		itemRow = itemHtml fields
		headerRow = headHtml fields
		"""
			<table border="1" width="100%">
				<thead>
					<tr>#{headerRow}</tr>
				</thead>
				<tbody data-bind="foreach:items">
					<tr data-bind="attr:{'data-cid':$cid}">#{itemRow}</tr>
				</tbody>
			</table>
		"""
