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

	private static function mongodb() {
		static $mdb;
		if (!isset($mdb)) {
			$mc = new MongoClient("mongodb://localhost:27017");
			$mdb = $mc->clicnat_instructeur;
		}
		return $mdb;
	}

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

	public function before_archives() {
	}

	private function extraction_carres($filtre="toutes") {
		$extraction = new bobs_extractions($this->db);
		foreach ($_SESSION['carres'] as $c) {
			$extraction->ajouter_condition(new bobs_ext_c_index_atlas(2154,1000,$c['lon'], $c['lat']));
		}
		switch ($filtre) {
			case 'znieff':
				$extraction->ajouter_condition(new bobs_ext_c_espece_det_znieff());
				break;
			case 'rare':
				$extraction->ajouter_condition(new bobs_ext_c_ref_rarete(array('R','TR','E','D')));
				break;
			case 'menace':
				$extraction->ajouter_condition(new bobs_ext_c_ref_menace(array('VU','EN','CR')));
				break;
			case 'toutes':
				break;
			default:
				throw new Exception('filtre invalide');
				break;
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

					$extraction = $this->extraction_carres('rare');
					$data['n_espece_rare'] = $extraction->especes()->count();

					$extraction = $this->extraction_carres('menace');
					$data['n_espece_menace'] = $extraction->especes()->count();

					$extraction = $this->extraction_carres('znieff');
					$data['n_espece_znieff'] = $extraction->especes()->count();
					break;
				case 'enregistrer_selection':
					$sels = $this->mongodb()->selections;
					$ele = array(
						"id_utilisateur" => (int)$_SESSION['id_utilisateur'],
						"nom" => $_GET['nom'],
						"carres" => $_SESSION['carres'],
						"date_creation" => new MongoDate()
					);
					$sels->insert($ele, array("fsync"=>true));
					$data = $ele;
					break;
				case 'liste_archives':
					$data['carres'] = array();
					$liste = $this->mongodb()->selections->find(array("id_utilisateur" =>  (int)$_SESSION['id_utilisateur']));
					foreach ($liste as $e) {
						$data['carres'][] = $e;
					}
					break;
				case 'liste_especes_extraction':
					$extr = $this->mongodb()->selections->findOne(array("_id" => new MongoId($_GET['id'] )));
					if ($_SESSION['id_utilisateur'] != $extr['id_utilisateur']) {
						throw new Exception('pas propriétaire de la liste');
					}
					$_SESSION['carres'] = $extr['carres'];
					$data['carres_requete'] = $extr['carres'];
					$extraction = $this->extraction_carres($_GET['mode_liste_especes']);
					$data['especes'] = array();
					foreach ($extraction->especes() as $esp) {
						try {
							$docs = $esp->documents_liste();
						} catch (Exception $e) {
							$docs = array();
						}
						$ref = $esp->get_referentiel_regional();
						$data['especes'][] = array(
							'id_espece'=>$esp->id_espece,
							'nom_f' => $esp->nom_f,
							'nom_s' => $esp->nom_s,
							'classe' => $esp->classe,
							'docs' => $docs,
							'rarete' => isset($ref['indice_rar'])?$ref['indice_rar']:null,
							'menace' => isset($ref['categorie'])?$ref['categorie']:null,
							'determinant_znieff' => $esp->determinant_znieff,
							'invasif' => $esp->invasif
						);
					}
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
			header("HTTP/1.0 404 Not Found");
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
