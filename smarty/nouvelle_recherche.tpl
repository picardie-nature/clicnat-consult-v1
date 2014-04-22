{include file="entete.tpl" titre="Nouvelle consultation"}
<div id="carte"></div>
<div id="zone_w">
	<input type="text" id="commune" placeholder="Nom d'une commune" class="w100" style="z-index: 20000;"/>
	<hr/>
	<p><span class="label label-info" id="n_carres">0</span> carrés sélectionnés</p>
	<p class="text-muted">En cliquant sur la carte vous sélectionnez des carrés et en cliquant sur un carré déjà sélectionné vous le retirez de la sélection</p>
	<hr/>
	<form method="post" action="index.php" id="form_selection_carres">
		<input type="hidden" name="t" value="json"/>
		<input type="hidden" name="a" value="selection_carres"/>
		<input type="hidden" name="carres" value="" id="txt_selection_carres"/>
		<button class="btn btn-info" type="submit">Aperçu des données</button>
	</form>
	<div id="zone_notif"></div>
	<div id="alerte_vide" style="display:none;">
		<div class="alert alert-warning alert-dismissable">
			<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>
			<b>Attention</b> vous devez placer des carrés sur la carte
		</div>
	</div>
	<div id="creer" class="bg-success" style="padding:15px; display:none;">
		<p>Enregistrer et consulter ces données</p>
		<form method="post" action="index.php" id="form_selection_enreg">
			<input type="hidden" name="t" value="json"/>
			<input type="hidden" name="a" value="enregistrer_selection"/>
			<input type="text" placeholder="Nom de votre sélection" required name="nom" value=""/>
			<button class="btn btn-info" type="submit">Enregistrer et consulter</button>
		</form>
	</div>
</div>
<script>
{literal}
function liste_carres_layer_formulaire(layer, id_champ_formulaire) {
	var champ = $('#'+id_champ_formulaire);
	champ.val('');
	for (var i=0;i<layer.features.length;i++) {
		var v = champ.val();
		var p = layer.features[i].clicnat_lonlat;
		champ.val(p.lon/1000+","+p.lat/1000+";"+v);
	}
}

function carre_2154_1km(map, m_lonlat) {
	var prj_gmap = new OpenLayers.Projection("EPSG:900913");
	var prj_l93 = new OpenLayers.Projection("EPSG:2154");
	var tr = m_lonlat.transform(prj_gmap, prj_l93);
	var p_orig = new OpenLayers.LonLat(parseInt(tr.lon/1000)*1000,parseInt(tr.lat/1000)*1000);
	var carre = new OpenLayers.Geometry.Polygon([
		new OpenLayers.Geometry.LinearRing([
			new OpenLayers.Geometry.Point(p_orig.lon,p_orig.lat),
			new OpenLayers.Geometry.Point(p_orig.lon+1000,p_orig.lat),
			new OpenLayers.Geometry.Point(p_orig.lon+1000,p_orig.lat+1000),
			new OpenLayers.Geometry.Point(p_orig.lon,p_orig.lat+1000)
		])
	]);
	carre.clicnat_lonlat = p_orig;
	carre.transform(prj_l93,prj_gmap);
	var feature = new OpenLayers.Feature.Vector(carre);
	feature.clicnat_lonlat = p_orig;
	return feature;
}

function init_new_cons() {
	carte = new Carto('carte');
	carte.layer_commune = new OpenLayers.Layer.Vector('Limite commune');
	carte.layer_carres = new OpenLayers.Layer.Vector('Carrés');
	carte.map.addLayer(carte.layer_commune);
	carte.map.addLayer(carte.layer_carres);
	carte.map.events.register('click', null, function (evt) {
		var ll = this.getLonLatFromViewPortPx(evt.xy);
		var pt2154 = carre_2154_1km(this, ll);
		var nouveau = true;
		for (var i=0; i<carte.layer_carres.features.length; i++) {
			if (carte.layer_carres.features[i].clicnat_lonlat.lon == pt2154.clicnat_lonlat.lon) {
				if (carte.layer_carres.features[i].clicnat_lonlat.lat == pt2154.clicnat_lonlat.lat) {
					nouveau = false;
					carte.layer_carres.removeFeatures(carte.layer_carres.features[i]);
					break;
				}
			}
		}
		if (nouveau) carte.layer_carres.addFeatures([pt2154]);
		$('#n_carres').html(carte.layer_carres.features.length);
	});
	for (var i=0;i<carte.map.controls.length;i++) {
		if (carte.map.controls[i].CLASS_NAME=="OpenLayers.Control.KeyboardDefaults") {
			carte.map.controls[i].deactivate();
			carte.map.removeControl(carte.map.controls[i]);
		}
	}
	$('#commune').autocomplete({source: '?t=autocomplete_commune',
		select: function (event,ui) {
			affiche_commune_gml('t', carte.layer_commune, ui.item.value);
			$("#commune").val('');
			return false;
		}
	});
	$('#form_selection_enreg').on('submit', function () {
		$.ajax({
			url: 'index.php?'+$(this).serialize(),
			success: function(data) {
				if (data.err == 1) {
					$('#zone_notif').html('<span class="label label-danger"><span class="glyphicon glyphicon-upload"></span> Erreur : '+data.msg+'</span></span>');
					return false;
				}
				// traitement ok
			}
		});
		return false;
	});
	$('#form_selection_carres').on('submit', function () {
		$('#zone_notif').html("");
		$('#creer').hide();
		if (carte.layer_carres.features.length == 0) {
			$('#zone_notif').append($('#alerte_vide').html());
			return false;
		}
		liste_carres_layer_formulaire(carte.layer_carres, 'txt_selection_carres');
		$('#zone_notif').append('<span class="label label-info"><span class="glyphicon glyphicon-upload"></span> Transfert en cours</span></span>');
		$.ajax({
			url: 'index.php?'+$(this).serialize(),
			success: function (data) {
				if (data.err == 1) {
					$('#zone_notif').html('<span class="label label-danger"><span class="glyphicon glyphicon-upload"></span> Erreur : '+data.msg+'</span></span>');
					return false;
				}
				$("#zone_notif").html(
					'<span class="label label-info">'+data.n_citation+'</span> citations trouvées<br/>'+
					'<span class="label label-info">'+data.n_espece_menace+'</span> espèces menacées<br/>'+
					'<span class="label label-info">'+data.n_espece_rare+'</span> espèces rares<br/>'+
					'<span class="label label-info">'+data.n_espece_znieff+'</span> espèces déterminantes ZNIEFF');
				$("#creer").show();
			},
			error: function () {
				alert('échec transfert');
			}
		});
		return false;
	});
}
{/literal}
</script>
{include file="pied.tpl" js_init="init_new_cons"}
