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
						<input type="hidden" name="id" value="" id="extraction_id"/>
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
{include file="pied.tpl" js_init="init_archives"}
