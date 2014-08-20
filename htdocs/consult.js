// globals
var carte_archives = null;
var requetes = null;

function liste_carres_layer_formulaire(layer, id_champ_formulaire) {
	var champ = $('#'+id_champ_formulaire);
	champ.val('');
	for (var i=0;i<layer.features.length;i++) {
		var v = champ.val();
		var p = layer.features[i].clicnat_lonlat;
		champ.val(p.lon/1000+","+p.lat/1000+";"+v);
	}
}

/**
 * @brief point 900913 => carree L93
 * @return OpenLayers.Feature.Vector
 */
function carre_2154_1km(m_lonlat) {
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

function carre_1km(p_lonlat_2154) {
	var prj_gmap = new OpenLayers.Projection("EPSG:900913");
	var prj_l93 = new OpenLayers.Projection("EPSG:2154");
	var carre = new OpenLayers.Geometry.Polygon([
		new OpenLayers.Geometry.LinearRing([
			new OpenLayers.Geometry.Point(p_lonlat_2154.lon,p_lonlat_2154.lat),
			new OpenLayers.Geometry.Point(p_lonlat_2154.lon+1000,p_lonlat_2154.lat),
			new OpenLayers.Geometry.Point(p_lonlat_2154.lon+1000,p_lonlat_2154.lat+1000),
			new OpenLayers.Geometry.Point(p_lonlat_2154.lon,p_lonlat_2154.lat+1000)
		])
	]);
	carre.transform(prj_l93,prj_gmap);
	return new OpenLayers.Feature.Vector(carre);
}

function mongo_aff_date(d) {
	var _d = new Date(d.sec*1000);
	return _d.toLocaleString();
}

function charge_liste_requetes() {
	var tb = $('#t_requetes > tbody');
	tb.html("<tr><td colspan=3>Chargement en cours</td></tr>");
	$.ajax({
		url: '?'+$.param({
			t: "json",
			a: "liste_archives"
		}),
		success: function (data) {
			requetes = data;
			tb.html("");
			for (var i=0;i<data.carres.length;i++) {
				var c = data.carres[i];
				tb.append(
					"<tr class='mongo_"+c._id['$id']+"'>"+
					"	<td>"+mongo_aff_date(c.date_creation)+"</td>"+
					"	<td>"+c.nom+"</td>"+
					"	<td>"+c.carres.length+"</td>"+
					"	<td><button class='btn btn-default btn-sm btn-primary ouvre_archive' type='button' mongo_id='"+c._id['$id']+"'><span class='glyphicon glyphicon-folder-open'></span></button></td>"+
					"</tr>"
				);
			}
			$('.ouvre_archive').click(function () {
				$('#extraction_id').val($(this).attr('mongo_id'));
				$('#t_requetes').hide();
				$('#t_especes').show();
				affiche_carre_requete($(this).attr('mongo_id'), carte_archives.layer_requete);
			});

		}
	});
}

function affiche_carre_requete(id_requete,layer) {
	var req = null;
	for (var i=0; i<requetes.carres.length; i++) {
		var c = requetes.carres[i];
		if (c._id['$id'] == id_requete) {
			req = c;
			break;
		}
	}
	if (!req) {
		console.log('pas trouvé la requête ('+id_requete+') !');
		return false;
	}
	
	for (var i=0; i<req.carres.length; i++) {
		var f = carre_1km(new OpenLayers.LonLat(req.carres[i].lon*1000, req.carres[i].lat*1000));
		layer.addFeatures([f]);
	}

	layer.map.zoomToExtent(layer.getDataExtent());
}

function init_new_cons() {
	carte = new Carto('carte');
	carte.layer_commune = new OpenLayers.Layer.Vector('Limite commune');
	carte.layer_carres = new OpenLayers.Layer.Vector('Carrés');
	carte.map.addLayer(carte.layer_commune);
	carte.map.addLayer(carte.layer_carres);
	carte.map.events.register('click', null, function (evt) {
		var ll = this.getLonLatFromViewPortPx(evt.xy);
		var pt2154 = carre_2154_1km(ll);
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


function init_archives() {
	charge_liste_requetes();

	carte_archives = new Carto("carte2");
	carte_archives.layer_requete = new OpenLayers.Layer.Vector('Emprise requête');
	carte_archives.map.addLayers([carte_archives.layer_requete]);
	$('#form_liste_especes').on('submit', function () {
		var form_data = $(this).serializeArray();
		var id_requete = false;
		for (var i=0;i<form_data.length;i++) {
			if (form_data[i].name == "id")
				id_requete = form_data[i].value;
		}
		if (!id_requete) {
			alert('pas trouvé id dans le formulaire');
			return false;
		}
		$.ajax({
			url: 'index.php?'+$(this).serialize(),
			beforeSend: function (xhr, settings) {
				var le = $('#liste_especes');
				le.html("Chargement des résultats...");
			},
			success: function (data) {
				if (data.err == 1) {
					alert(data.msg);
					return;
				}
				var le = $('#liste_especes');
				le.html("");
				for (var i=0; i<data.especes.length;i++) {
					var e = data.especes[i];
					var nom_1 = e['nom_f'];
					var nom_2 = e['nom_s'];
			
					if (nom_1 == null) {
						nom_1 = nom_2;
						nom_2 = '';
					}
					var rarete = "";
					if (e['rarete'] != null) {
						rarete = "<span class='label label-info'>Rareté : "+e['rarete']+"</span>";
					}
					var menace = "";
					if (e['menace'] != null) {
						menace = "<span class='label label-info'>Menace : "+e['menace']+"</span>";
					}
					var znieff = "";
					if (e['determinant_znieff']) {
						znieff = "<span class='label label-info'>Déterminant ZNIEFF</span>";
					}
					le.append(
						"<a href='#' id_espece='"+e['id_espece']+"' class='list-group-item item-espece'><h4>"+nom_1+"</h4>"+
						"<p>"+nom_2+"</p>"+
						"<p>"+rarete+" "+menace+" "+znieff+"</p>"+
						"</a>"

					);

				}
				$('.item-espece').click(function () {
					alert("une fois terminé la répartition de l'espèce apparaîtra sur la carte");
					alert($(this).attr('id_espece'));
					return false;
				});
			},
			error: function () {
				alert('pas de liste');
			}
		});
		return false;
	});
}

