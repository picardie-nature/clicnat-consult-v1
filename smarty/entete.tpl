<!DOCTYPE html>
<html lang="fr">
	<head>
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>{$titre} - Clicnat</title>
		<link rel="stylesheet" href="//netdna.bootstrapcdn.com/bootstrap/3.1.0/css/bootstrap.min.css">
		<link rel="stylesheet" href="//netdna.bootstrapcdn.com/bootstrap/3.1.0/css/bootstrap-theme.min.css">
		<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/openlayers/2.13.1/theme/default/style.css">
		<link rel="stylesheet" href="//ajax.googleapis.com/ajax/libs/jqueryui/1.10.4/themes/redmond/jquery-ui.css" />
		<link rel="stylesheet" href="style.css">
	</head>
	<body>
	<style>
		{literal}
		div.login {
			max-width: 330px;
			padding: 15px;
			margin: 0 auto;
		}
		{/literal}
	</style>
	{if $utl}
		<nav class="navbar navbar-default navbar-fixed-top" role="navigation">
		  <div class="container-fluid">
			<!-- Brand and toggle get grouped for better mobile display -->
			<div class="navbar-header">
			  <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#bs-example-navbar-collapse-1">
				<span class="sr-only">Toggle navigation</span>
				<span class="icon-bar"></span>
				<span class="icon-bar"></span>
				<span class="icon-bar"></span>
			  </button>
			  <a class="navbar-brand" href="?t=accueil">Accueil</a>
			</div>

			<!-- Collect the nav links, forms, and other content for toggling -->
			<div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
			  <ul class="nav navbar-nav">
				<li><a href="?t=nouvelle_recherche">Nouvelle recherche <span class="glyphicon glyphicon-search"></span></a></li>
				<li><a href="?t=archives">Requêtes archivées <span class="glyphicon glyphicon-search"></span></a></li>
			  </ul>

			  <ul class="nav navbar-nav navbar-right">
				<li class="dropdown">
				  <a href="#" class="dropdown-toggle" data-toggle="dropdown"><span class="glyphicon glyphicon-user"></span> {$utl}</a>
				  <ul class="dropdown-menu">
					<li><a href="#">Mes infos</a></li>
					<li class="divider"></li>
					<li><a href="?fermer=1">Deconnexion <span class="glyphicon glyphicon-off"></span></a></li>
				  </ul>
				</li>
			  </ul>
			</div><!-- /.navbar-collapse -->
		  </div><!-- /.container-fluid -->
		</nav>
	{/if}
	{foreach from=$alertes item=alerte}
	<div class="alert alert-{$alerte.classe}">
		{$alerte.message}
	</div>
	{/foreach}
