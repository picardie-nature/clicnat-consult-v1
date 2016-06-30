// globals
var carte_archives = null;
var requetes = null;

function exportToCsv(filename, rows) {
	var processRow = function (row) {
		var finalVal = '';
		for (var j = 0; j < row.length; j++) {
			var innerValue = row[j] === null ? '' : row[j].toString();
			if (row[j] instanceof Date) {
				innerValue = row[j].toLocaleString();
			};
			var result = innerValue.replace(/"/g, '""');
			if (result.search(/("|,|\n)/g) >= 0) result = '"' + result + '"';
			if (j > 0) finalVal += ',';
			finalVal += result;
		}
		return finalVal + '\n';
	};

	var csvFile = '';
	for (var i = 0; i < rows.length; i++) {
		csvFile += processRow(rows[i]);
	}

	var blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
	if (navigator.msSaveBlob) {
		// IE 10+
		navigator.msSaveBlob(blob, filename);
	} else {
		var link = document.createElement("a");
		if (link.download !== undefined) {
			// feature detection
			// Browsers that support HTML5 download attribute
			var url = URL.createObjectURL(blob);
			link.setAttribute("href", url);
			link.setAttribute("download", filename);
			link.style.visibility = 'hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	}
}
function liste_carres_layer_formulaire(layer, id_champ_formulaire) {
	var champ = $('#' + id_champ_formulaire);
	champ.val('');
	for (var i = 0; i < layer.features.length; i++) {
		var v = champ.val();
		var p = layer.features[i].clicnat_lonlat;
		champ.val(p.lon / 1000 + "," + p.lat / 1000 + ";" + v);
	}
}

/**
 * @brief point 900913 => carré L93
 * @return OpenLayers.Feature.Vector
 */
function carre_2154_1km(m_lonlat) {
	var prj_gmap = new OpenLayers.Projection("EPSG:900913");
	var prj_l93 = new OpenLayers.Projection("EPSG:2154");
	var tr = m_lonlat.transform(prj_gmap, prj_l93);
	var p_orig = new OpenLayers.LonLat(parseInt(tr.lon / 1000) * 1000, parseInt(tr.lat / 1000) * 1000);
	var carre = new OpenLayers.Geometry.Polygon([new OpenLayers.Geometry.LinearRing([new OpenLayers.Geometry.Point(p_orig.lon, p_orig.lat), new OpenLayers.Geometry.Point(p_orig.lon + 1000, p_orig.lat), new OpenLayers.Geometry.Point(p_orig.lon + 1000, p_orig.lat + 1000), new OpenLayers.Geometry.Point(p_orig.lon, p_orig.lat + 1000)])]);
	carre.clicnat_lonlat = p_orig;
	carre.transform(prj_l93, prj_gmap);
	var feature = new OpenLayers.Feature.Vector(carre);
	feature.clicnat_lonlat = p_orig;
	return feature;
}

function carre_1km(p_lonlat_2154) {
	var prj_gmap = new OpenLayers.Projection("EPSG:900913");
	var prj_l93 = new OpenLayers.Projection("EPSG:2154");
	var carre = new OpenLayers.Geometry.Polygon([new OpenLayers.Geometry.LinearRing([new OpenLayers.Geometry.Point(p_lonlat_2154.lon, p_lonlat_2154.lat), new OpenLayers.Geometry.Point(p_lonlat_2154.lon + 1000, p_lonlat_2154.lat), new OpenLayers.Geometry.Point(p_lonlat_2154.lon + 1000, p_lonlat_2154.lat + 1000), new OpenLayers.Geometry.Point(p_lonlat_2154.lon, p_lonlat_2154.lat + 1000)])]);
	carre.transform(prj_l93, prj_gmap);
	return new OpenLayers.Feature.Vector(carre);
}

function mongo_aff_date(d) {
	var _d = new Date(d.sec * 1000);
	return _d.toLocaleString();
}

var EspeceRow = React.createClass({
	render: function () {
		var nom_1 = this.props.e.nom_f;
		var nom_2 = this.props.e.nom_s;
		if (nom_1 == null) {
			nom_1 = nom_2;
			nom_2 = '';
		}
		var rarete_style = this.props.e.rarete == null ? { display: 'none' } : { display: 'inline' };
		var menace_style = this.props.e.menace == null ? { display: 'none' } : { display: 'inline' };
		var determ_style = this.props.e.determinant_znieff ? { display: 'none' } : { display: 'inline' };
		var invasi_style = this.props.e.invasif ? {} : { display: 'none' };
		var lib_citation = this.props.n_citations > 1 ? 'citations' : 'citation';
		return React.createElement(
			'a',
			{ className: 'list-group-item' },
			React.createElement(
				'h4',
				null,
				nom_1
			),
			React.createElement(
				'p',
				null,
				nom_2,
				' ',
				React.createElement(
					'span',
					{ className: 'pull-right' },
					this.props.n_citations,
					' ',
					lib_citation
				)
			),
			React.createElement(
				'span',
				{ className: 'label label-info', style: rarete_style },
				'Rareté : ',
				this.props.e.rarete
			),
			React.createElement(
				'span',
				{ className: 'label label-info', style: menace_style },
				'Menace : ',
				this.props.e.menace
			),
			React.createElement(
				'span',
				{ className: 'label label-info', style: determ_style },
				'Déterminant ZNIEFF'
			),
			React.createElement(
				'span',
				{ className: 'label label-info', style: invasi_style },
				'Invasif'
			)
		);
	}
});
var ListeEspeces = React.createClass({
	getInitialState: function () {
		return { visible: true, liste: [], en_cours: false };
	},
	retour: function () {
		this.props.listerequetes.setState({ visible: true });
	},
	downloadListe: function (event) {
		var rows = [['id_espece', 'classe', 'nom_f', 'nom_s', 'rarete', 'menace', 'determinant_znieff', 'invasif', 'n_carres']];
		for (var i = 0; i < this.state.liste.length; i++) {
			var e = this.state.liste[i];
			rows.push([e.id_espece, e.classe, e.nom_f, e.nom_s, e.rarete, e.menace, e.determinant_znieff, e.invasif, e.carres.length]);
		}
		exportToCsv("liste-espece.csv", rows);
	},
	afficheListe: function (event) {
		var liste = this;
		var layer = this.props.layer;
		layer.removeAllFeatures();
		liste.setState({ liste: [], en_cours: true });
		this.serverRequest = $.get("?t=json&a=liste_especes_extraction&id=" + this.props.req + "&mode_liste_especes=" + event.target.value, function (req) {
			for (var i = 0; i < req.carres_requete.length; i++) {
				var f = carre_1km(new OpenLayers.LonLat(req.carres_requete[i].lon * 1000, req.carres_requete[i].lat * 1000));
				layer.addFeatures([f]);
			}
			layer.map.zoomToExtent(layer.getDataExtent());
			liste.setState({ liste: req.especes, n_citations_par_espece: req.n_citations_par_espece, en_cours: false });
		});
	},
	render: function () {
		if (!this.props.req) return null;
		var especes = [];
		for (var i = 0; i < this.state.liste.length; i++) {
			especes.push(React.createElement(EspeceRow, { e: this.state.liste[i], n_citations: this.state.n_citations_par_espece[this.state.liste[i].id_espece] }));
		}
		var pas_visible_en_cours = this.state.en_cours ? { display: "none" } : {};
		var visible_en_cours = this.state.en_cours ? {} : { display: "none" };
		return React.createElement(
			'div',
			null,
			React.createElement(
				'button',
				{ className: 'btn btn-info', onClick: this.props.close_cb },
				React.createElement('span', { className: 'glyphicon glyphicon-arrow-left' })
			),
			React.createElement(
				'select',
				{ name: 'mode_liste_especes', onChange: this.afficheListe },
				React.createElement(
					'option',
					{ value: 'toutes' },
					'Afficher toutes les espèces'
				),
				React.createElement(
					'option',
					{ value: 'menace' },
					'Menacées VU,EN,CR'
				),
				React.createElement(
					'option',
					{ value: 'rare' },
					'Rares PC,R,TR,E'
				),
				React.createElement(
					'option',
					{ value: 'znieff' },
					'Déterminantes ZNIEFF'
				)
			),
			React.createElement(
				'button',
				{ className: 'btn btn-info', onClick: this.downloadListe },
				'Télécharger CSV'
			),
			React.createElement(
				'span',
				{ style: pas_visible_en_cours },
				' Nombre d\'espèces : ',
				this.state.liste.length
			),
			React.createElement(
				'div',
				{ style: visible_en_cours },
				'Chargement de la liste...'
			),
			especes
		);
	}
});

var RequeteRow = React.createClass({
	render: function () {
		return React.createElement(
			'tr',
			{ className: 'mongo' },
			React.createElement(
				'td',
				null,
				mongo_aff_date(this.props.c.date_creation)
			),
			React.createElement(
				'td',
				null,
				this.props.c.nom
			),
			React.createElement(
				'td',
				null,
				this.props.c.carres.length
			),
			React.createElement(
				'td',
				null,
				React.createElement(
					'button',
					{ className: 'btn btn-default btn-sm btn-primary ouvre_archive', 'data-id': this.props.id, onClick: this.props.open },
					React.createElement('span', { 'data-id': this.props.id, className: 'glyphicon glyphicon-folder-open' })
				)
			)
		);
	}
});

var InterfaceArchive = React.createClass({
	getInitialState: function () {
		var id = false;
		var a = document.createElement('a');
		a.href = document.location.href;
		var args = a.search.replace(/^\?/, '').split('&');
		for (var i = 0; i < args.length; i++) {
			if (args[i].split('=')[0] == 'id') {
				id = args[i].split('=')[1];
				break;
			}
		}
		return { archive: id };
	},
	render: function () {
		console.log("render ia()");
		return React.createElement(
			'div',
			null,
			React.createElement(
				'p',
				null,
				'archive = ',
				this.state.archive
			),
			React.createElement(ListeRequete, { open_cb: this.openArchive, req: this.state.archive }),
			React.createElement(ListeEspeces, { close_cb: this.closeArchive, listerequetes: this, layer: this.props.carto.layer_requete, req: this.state.archive })
		);
	},
	openArchive: function (event) {
		var id = event.target.getAttribute('data-id');
		this.setState({ archive: id });
	},
	closeArchive: function (event) {
		console.log("close archive");
		this.setState({ archive: false });
	}
});

var ListeRequete = React.createClass({
	getInitialState: function () {
		return { carres: [], loaded: false };
	},
	load: function () {
		var lr = this;
		$.ajax({
			url: '?' + $.param({
				t: "json",
				a: "liste_archives"
			}),
			success: function (data) {
				lr.setState({
					carres: data.carres,
					loaded: true
				});
			}
		});
	},
	render: function () {
		if (this.props.req != false) return null;

		if (!this.state.loaded) {
			this.load();
			return React.createElement(
				'span',
				null,
				'chargement en cours'
			);
		}
		var rows = [];
		var cb = this.props.open_cb;

		this.state.carres.forEach(function (c) {
			var k = c['_id']['$id'];
			var d = mongo_aff_date(c.date_creation);
			var obj = React.createElement(RequeteRow, { key: k, id: k, c: c, open: cb });
			rows.push(obj);
		});

		return React.createElement(
			'div',
			null,
			React.createElement(
				'table',
				{ className: 'table' },
				React.createElement(
					'thead',
					null,
					React.createElement(
						'tr',
						null,
						React.createElement(
							'th',
							null,
							'Date de création'
						),
						React.createElement(
							'th',
							null,
							'Nom'
						),
						React.createElement(
							'th',
							null,
							'Carrés'
						),
						React.createElement('th', null)
					)
				),
				React.createElement(
					'tbody',
					null,
					rows
				)
			)
		);
	}

});

function affiche_carre_requete(id_requete, layer) {
	var req = null;
	for (var i = 0; i < requetes.carres.length; i++) {
		var c = requetes.carres[i];
		if (c._id['$id'] == id_requete) {
			req = c;
			break;
		}
	}
	if (!req) {
		console.log('pas trouvé la requête (' + id_requete + ') !');
		return false;
	}

	for (var i = 0; i < req.carres.length; i++) {
		var f = carre_1km(new OpenLayers.LonLat(req.carres[i].lon * 1000, req.carres[i].lat * 1000));
		layer.addFeatures([f]);
	}

	layer.map.zoomToExtent(layer.getDataExtent());
}

function affiche_carre_espece_requete(id_requete, id_espece, layer) {
	var args = {
		t: 'json',
		a: 'espece_carres_extraction',
		id_requete: id_requete,
		id_espece: id_espece
	};
	$.ajax({
		url: 'index.php?' + $.param(args),
		success: function (data) {
			for (var i = 0; i < data.carres.length; i++) {
				var f = carre_1km(new OpenLayers.LonLat(data.carres[i]['x0'] * 1000, data.carres[i]['y0'] * 1000));
				layer.addFeatures([f]);
			}
		}
	});
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
		for (var i = 0; i < carte.layer_carres.features.length; i++) {
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
	for (var i = 0; i < carte.map.controls.length; i++) {
		if (carte.map.controls[i].CLASS_NAME == "OpenLayers.Control.KeyboardDefaults") {
			carte.map.controls[i].deactivate();
			carte.map.removeControl(carte.map.controls[i]);
		}
	}
	$('#commune').autocomplete({ source: '?t=autocomplete_commune',
		select: function (event, ui) {
			affiche_commune_gml('t', carte.layer_commune, ui.item.value);
			$("#commune").val('');
			return false;
		}
	});
	$('#form_selection_enreg').on('submit', function () {
		$.ajax({
			url: 'index.php?' + $(this).serialize(),
			success: function (data) {
				if (data.err == 1) {
					$('#zone_notif').html('<span class="label label-danger"><span class="glyphicon glyphicon-upload"></span> Erreur : ' + data.msg + '</span></span>');
					return false;
				}
				// traitement ok
				document.location.href = '?t=archives&id=' + data['_id']['$id'];
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
			url: 'index.php?' + $(this).serialize(),
			success: function (data) {
				if (data.err == 1) {
					$('#zone_notif').html('<span class="label label-danger"><span class="glyphicon glyphicon-upload"></span> Erreur : ' + data.msg + '</span></span>');
					return false;
				}
				$("#zone_notif").html('<span class="label label-info">' + data.n_citation + '</span> citations trouvées<br/>' + '<span class="label label-info">' + data.n_espece_menace + '</span> espèces menacées<br/>' + '<span class="label label-info">' + data.n_espece_rare + '</span> espèces rares<br/>' + '<span class="label label-info">' + data.n_espece_znieff + '</span> espèces déterminantes ZNIEFF');
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
	//charge_liste_requetes();
	carte_archives = new Carto("carte2");
	carte_archives.layer_requete = new OpenLayers.Layer.Vector('Emprise requête');
	carte_archives.map.addLayers([carte_archives.layer_requete]);
	ReactDOM.render(React.createElement(InterfaceArchive, { carto: carte_archives }), document.getElementById("t_requetes"));
	return;
	$('#form_liste_especes').on('submit', function () {
		var form_data = $(this).serializeArray();
		var id_requete = false;
		for (var i = 0; i < form_data.length; i++) {
			if (form_data[i].name == "id") id_requete = form_data[i].value;
		}
		if (!id_requete) {
			alert('pas trouvé id dans le formulaire');
			return false;
		}
		$.ajax({
			url: 'index.php?' + $(this).serialize(),
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
				for (var i = 0; i < data.especes.length; i++) {
					var e = data.especes[i];
					var nom_1 = e['nom_f'];
					var nom_2 = e['nom_s'];

					if (nom_1 == null) {
						nom_1 = nom_2;
						nom_2 = '';
					}
					var rarete = "";
					if (e['rarete'] != null) {
						rarete = "<span class='label label-info'>Rareté : " + e['rarete'] + "</span>";
					}
					var menace = "";
					if (e['menace'] != null) {
						menace = "<span class='label label-info'>Menace : " + e['menace'] + "</span>";
					}
					var znieff = "";
					if (e['determinant_znieff']) {
						znieff = "<span class='label label-info'>Déterminant ZNIEFF</span>";
					}
					le.append("<a href='#' lbl='" + nom_1 + " " + nom_2 + "' id_requete='" + id_requete + "' id_espece='" + e['id_espece'] + "' class='list-group-item item-espece'><h4>" + nom_1 + "</h4>" + "<p>" + nom_2 + "</p>" + "<p>" + rarete + " " + menace + " " + znieff + "</p>" + "</a>");
				}
				$('.item-espece').click(function () {
					var id_espece = $(this).attr('id_espece');
					var id_requete = $(this).attr('id_requete');
					var r = Math.round(Math.random() * 255);
					var g = Math.round(Math.random() * 255);
					var b = Math.round(Math.random() * 255);
					var layer = new OpenLayers.Layer.Vector($(this).attr('lbl'), {
						style: {
							strokeColor: 'rgb(' + r + ',' + g + ',' + b + ')',
							fillColor: 'rgb(' + r + ',' + g + ',' + b + ')'
						}
					});
					carte_archives.map.addLayers([layer]);
					affiche_carre_espece_requete(id_requete, id_espece, layer);
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
