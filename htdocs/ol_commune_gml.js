function affiche_commune_gml(page_arg, layer, id_espace_commune) {
	var args = {
		id: id_espace_commune,
		dataType: 'xml'
	};
	args[page_arg] = 'commune_gml';
	new $.ajax({
		url: '?'+$.param(args),
		success: function (data, s, xhr) {
			layer.removeFeatures(layer.features);
			var format = new OpenLayers.Format.GML({
				'internalProjection': layer.map.projection,
				'externalProjection': layer.map.displayProjection
			});
			var feature = format.parseFeature(data);
			feature.style = {
				fillOpacity: 0,
				strokeWidth: 4,
				strokeOpacity: 1,
				strokeDashstyle: 'longdash',
				strokeColor: '#ff0000'
			};
			layer.addFeatures([feature]);
			layer.map.zoomToExtent(layer.getDataExtent());
		}
	});
}
