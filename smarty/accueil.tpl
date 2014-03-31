{include file="entete.tpl" titre="Consultation de Clicnat"}
{if !$utl}
<div class="login">
	<form class="form-signin" role="form" method="post" action="index.php">
		<h2 class="form-signin-heading">Consultation Clicnat</h2>
		<input name="clicnat_login" type="text" class="form-control" placeholder="Identifiant" required autofocus>
		<input name="clicnat_pwd" type="password" class="form-control" placeholder="Mot de passe" required>
		<button class="btn btn-lg btn-primary btn-block" type="submit">Se connecter</button>
	</form>
</div>
{/if}
{include file="pied.tpl"}
