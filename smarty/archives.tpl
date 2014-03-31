{include file="entete.tpl" titre="Requêtes archivées"}
<div style="min-height:70px;"></div>
<div class="container-fluid">
	<div class="row">
		<div class="col-sm-8">
			<div id="carte2"></div>
		</div>
		<div class="col-sm-4">
			<div class="tscroll">
				<table class="table" id="t_requetes">
					<thead>
						<tr>
							<th>Date de création</th>
							<th>Nom</th>
							<th>Carrés</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						<tr><td colspan="3">Chargement en cours</td></tr>
					</tbody>
				</table>
				<div id="t_especes" style="display:none;">
					<form method="post" action="index.php" id="form_liste_especes">
						<input type="text" name="id" value="" id="extraction_id"/>
						Affichage
						<select name="mode_liste_especes">
							<option value="toutes">Afficher toutes les espèces</option>
							<option value="menace">Menacées VU,EN,CR</option>
							<option value="rare">Rares PC,R,TR,E</option>
							<option value="znieff">Déterminantes ZNIEFF</option>
						</select>
						<input type="hidden" name="t" value="json">
						<input type="hidden" name="a" value="liste_especes_extraction">
						<button type="submit" class="btn btn-info">Afficher la liste</button>
					</form>
					<div>
						<div class="list-group" id="liste_especes"></div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
<script>
	//{literal}
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
				console.log('ok');
				$('.ouvre_archive').click(function () {
					$('#extraction_id').val($(this).attr('mongo_id'));
					$('#t_requetes').hide();
					$('#t_especes').show();
				});

			}
		});
	}

	function init_archives() {
		charge_liste_requetes();

		var carte = new Carto("carte2");

		$('#form_liste_especes').on('submit', function () {
			$.ajax({
				url: 'index.php?'+$(this).serialize(),
				success: function (data) {
					if (data.err == 1) {
						alert(data.msg);
						return;
					}
					var le = $('#liste_especes');
					le.html("");
					for (var i=0; i<data.especes.length;i++) {
						var e = data.especes[i];
						le.append(
							"<a href='#' id_espece='' class='list-group-item item-espece'><h4>"+e['nom_f']+"</h4>"+
							"<p>"+e['nom_s']+"</p></a>"
						);
					}
					$('.item-espece').click(function () {
						alert("une fois terminé la répartition de l'espèce apparaîtra sur la carte");
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
	//{/literal}
</script>
{include file="pied.tpl" js_init="init_archives"}
