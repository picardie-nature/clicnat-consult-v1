<?php
$start_time = microtime(true);
$context = 'consult';

if (file_exists('config.php')) 
	require_once('config.php');
else
	require_once('/etc/baseobs/config.php');

define('LOCALE', 'fr_FR.UTF-8');

require_once(SMARTY_DIR.'Smarty.class.php');
require_once(OBS_DIR.'element.php');
require_once(OBS_DIR.'espece.php');
require_once(OBS_DIR.'smarty.php');


class Consult extends clicnat_smarty {
	protected $db;

	public function __construct($db) {
		setlocale(LC_ALL, LOCALE);
		parent::__construct($db, SMARTY_TEMPLATE_CONSULT, SMARTY_COMPILE_CONSULT, null, SMARTY_CACHEDIR_CONSULT);
		
	}

	public function template() {
		return isset($_GET['t'])?trim($_GET['t']):'accueil';
	}

	public function before_accueil() {
		if (isset($_POST['clicnat_login']) && isset($_POST['clicnat_pwd'])) {
			$utilisateur = bobs_utilisateur::by_login($this->db, trim($_POST['clicnat_login']));
			if (!$utilisateur) {
				$_SESSION['id_utilisateur'] = false;
				$this->ajoute_alerte('danger', "Nom d'utilisateur ou mot de passe incorrect");
			} else {
				if (!$utilisateur->acces_chiros) {
					$_SESSION['id_utilisateur'] = false;
					$this->ajoute_alerte('danger', "Accès réservé aux membres du réseau Chiros");
				} else {
					if (!$utilisateur->auth_ok(trim($_POST['clicnat_pwd']))) {
						$_SESSION['id_utilisateur'] = false;
						$this->ajoute_alerte('danger', "Nom d'utilisateur ou mot de passe incorrect");
					} else {
						$_SESSION['id_utilisateur'] = $utilisateur->id_utilisateur;
						$this->ajoute_alerte('success', "Connexion réussie");
					}
				}
			}
			$this->redirect('?t=accueil');
		} else {
			if (isset($_GET['fermer'])) {
				$_SESSION['id_utilisateur'] = false;
				$this->ajoute_alerte('info', 'Vous êtes maintenant déconnecté');
				$this->redirect('?t=accueil');
			}
		}
	}

	public function before_nouvelle_recherche() {
	}

	private function extraction_carres() {
		$extraction = new bobs_extractions($this->db);
		foreach ($_SESSION['carres'] as $c) {
			$extraction->ajouter_condition(new bobs_ext_c_index_atlas(2154,1000,$c['lon'], $c['lat']));
		}
		return $extraction;
	}

	public function before_json() {
		header('Cache-Control: no-cache, must-revalidate');
		header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
		header('Content-type: application/json');
		try {
			$data = array();
			switch ($_GET['a']) {
				default:
					throw new Exception('pas d\'action connue');
				case 'selection_carres':
					$data['carres'] = array();
					foreach (explode(";",$_GET['carres']) as $c) {
						if (empty($c)) continue;
						list($lon,$lat) = explode(",",$c);
						$data['carres'][] = array("lon"=>(int)$lon,"lat"=>(int)$lat);
					}
					$_SESSION['carres'] = $data['carres'];
					$extraction = $this->extraction_carres();
					$data['n_citation'] = $extraction->compte();

					$extraction->ajouter_condition(new bobs_ext_c_ref_rarete(array('R','TR','E','D')));
					$data['n_espece_rare'] = $extraction->especes()->count();

					$extraction = $this->extraction_carres();
					$extraction->ajouter_condition(new bobs_ext_c_ref_menace(array('VU','EN','CR')));
					$data['n_espece_menace'] = $extraction->especes()->count();

					$extraction = $this->extraction_carres();
					$extraction->ajouter_condition(new bobs_ext_c_espece_det_znieff());
					$data['n_espece_znieff'] = $extraction->especes()->count();
					break;
			}
			echo json_encode($data);
		} catch (Exception $e) {
			echo json_encode(array("err" => 1, "msg" => $e->getMessage()));
		}
	}

	public function display() {
		global $start_time;

		session_start();

		if (!isset($_SESSION['id_utilisateur']))
			$_SESSION['id_utilisateur'] = false;

		$this->assign('page', $this->template());
		$before_func = 'before_'.$this->template();
		if (method_exists($this, $before_func)) {
			if ($this->template() != 'accueil') {
				if ($_SESSION['id_utilisateur'] == false) {
					throw new Exception('vous devez être identifié');
				}
			}

			if ($_SESSION['id_utilisateur']) 
				$this->assign('utl', get_utilisateur($this->db, $_SESSION['id_utilisateur']));
			else
				$this->assign('utl', false);

			$this->$before_func();
		} else {
			throw new Exception('404 Page introuvable');
		}
		parent::display($this->template().".tpl");
	}
}

require_once(DB_INC_PHP);
get_db($db);
$c = new Consult($db);
$c->display();
?>
