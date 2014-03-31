		<script src="//ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js"></script> 
		<script src="//ajax.googleapis.com/ajax/libs/jqueryui/1.10.4/jquery-ui.min.js"></script>
		<script src="http://deco.picardie-nature.org/jquery/js/jquery.ui.datepicker-fr.js" language="javascript"></script>
		<script src="//netdna.bootstrapcdn.com/bootstrap/3.1.0/js/bootstrap.min.js"></script>
		<script src="proj4js-compressed.js"></script>
		<script>
			Proj4js.defs["EPSG:2154"] = "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"; 
		</script>
		<script type="text/javascript" src="//cdnjs.cloudflare.com/ajax/libs/openlayers/2.13.1/OpenLayers.js"></script>
		<script type="text/javascript" src="http://maps.picardie-nature.org/carto.js"></script>
		<script type="text/javascript" src="ol_commune_gml.js"></script>
		{if $js_init}
			<script>{$js_init}();</script>
		{/if}
	</body>

</html>
