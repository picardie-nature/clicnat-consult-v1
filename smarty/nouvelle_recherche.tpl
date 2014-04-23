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
{include file="pied.tpl" js_init="init_new_cons"}
