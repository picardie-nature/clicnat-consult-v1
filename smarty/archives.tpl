{include file="entete.tpl" titre="Requêtes archivées"}
<div style="min-height:70px;"></div>
<div class="container-fluid">
	<div class="row">
		<div class="col-sm-8">
			<div id="carte2"></div>
		</div>
		<div class="col-sm-4">
			<div class="tscroll">
				<div id="t_requetes"></div>
				<div id="t_especes"></div>
				<div class="list-group" id="liste_especes"></div>
			</div>
		</div>
	</div>
</div>
{include file="pied.tpl" js_init="init_archives"}
