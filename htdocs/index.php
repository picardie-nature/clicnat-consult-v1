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

if (!defined('MONGO_DB_STR'))
	define('MONGO_DB_STR', "mongodb://localhost:27017");

class Consult extends clicnat_smarty {
	protected $db;

	const limite_nb_carres = 1000;

	private static function mongodb() {
		static $mdb;
		if (!isset($mdb)) {
			$mc = new MongoClient(MONGO_DB_STR);
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
				if (!$utilisateur->prop('agent') == 1) {
					$_SESSION['id_utilisateur'] = false;
					$this->ajoute_alerte('danger', "Accès réservé - demander l'activation de votre compte si nécessaire");
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
		$_SESSION['carres'] = [];
	}

	public function before_archives() {
	}

	private function sous_extraction($sel, $filtre) {
		$extraction = new bobs_extractions($this->db);
		$extraction->ajouter_condition(new bobs_ext_c_selection($sel->id_selection));
		switch ($filtre) {
			case 'znieff':
				$extraction->ajouter_condition(new bobs_ext_c_espece_det_znieff());
				break;
			case 'rare':
				$extraction->ajouter_condition(new bobs_ext_c_ref_rarete(['R','TR','E','D']));
				break;
			case 'menace':
				$extraction->ajouter_condition(new bobs_ext_c_ref_menace(['VU','EN','CR']));
				break;
			case 'toutes':
				break;
			default:
				throw new Exception("filtre invalide $filtre");
				break;
		}
		return $extraction;
	}

	private function sel() {
		return bobs_selection::par_nom_ou_creer($this->db, -1, "consult#{$_SESSION['id_utilisateur']}");
	}

	private function extraction_carres() {
		$extraction = new bobs_extractions($this->db);

		if (count($_SESSION['carres']) > self::limite_nb_carres)
			throw new Exception('trop de carrés dans la requête');

		foreach ($_SESSION['carres'] as $c) {
			$extraction->ajouter_condition(new bobs_ext_c_index_atlas(2154,1000,$c['lon'], $c['lat']));
		}

		$extraction->ajouter_condition(new bobs_ext_c_sans_tag_invalide());
		$extraction->ajouter_condition(new bobs_ext_c_indice_qualite([3,4]));
		$extraction->ajouter_condition(new bobs_ext_c_interval_date('01/01/2006',strftime("31/12/%Y",mktime())));
		$extraction->ajouter_condition(new bobs_ext_c_effectif_superieur(0));

		// limite départementale si prop agent_departement définit
		$u = get_utilisateur($this->db, $_SESSION['id_utilisateur']);
		$num_dept = $u->prop('agent_departement');
		if ($num_dept) {
			$dept = bobs_espace_departement::get_by_ref($this->db, $num_dept);
			$extraction->ajouter_condition(new bobs_ext_c_departement($dept->id_espace));
		}
		$sel = $this->sel();
		$sel->vider();
		$extraction->dans_selection($sel);

		$smax = new bobs_selection_filtre_superficie_max($this->db);
		$smax->set('id_selection', $sel->id_selection);
		$smax->set('smax', 1000*1000);
		$smax->prepare();
		$smax->execute();
		return $sel;
	}

	private function extraction_utilisateur($id) {
		$extr = $this->mongodb()->selections->findOne(array("_id" => new MongoId($id)));
		if ($_SESSION['id_utilisateur'] != $extr['id_utilisateur']) {
			throw new Exception('pas propriétaire de la liste');
		}
		return $extr;
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
					$sel = $this->extraction_carres();
					$_SESSION['ids'] = $sel->citations()->ids();
					$data['n_citation'] = $sel->n();

					$extraction = $this->sous_extraction($sel, 'rare');
					$data['n_espece_rare'] = $extraction->especes()->count();
					$data['sql'] = $extraction->apercu_sql();

					$extraction = $this->sous_extraction($sel, 'menace');
					$data['n_espece_menace'] = $extraction->especes()->count();

					$extraction = $this->sous_extraction($sel, 'znieff');
					$data['n_espece_znieff'] = $extraction->especes()->count();
					break;
				case 'enregistrer_selection':
					$sels = $this->mongodb()->selections;
					$data = [
						"id_utilisateur" => (int)$_SESSION['id_utilisateur'],
						"nom" => $_GET['nom'],
						"carres" => $_SESSION['carres'],
						"ids" => $_SESSION['ids'],
						"date_creation" => new MongoDate()
					];
					$sels->insert($data, ["fsync"=>true]);
					break;
				case 'liste_archives':
					$data['carres'] = array();
					$liste = $this->mongodb()->selections->find([
						"id_utilisateur" =>  (int)$_SESSION['id_utilisateur']
					]);
					foreach ($liste as $e) {
						$data['carres'][] = $e;
					}
					break;
				case 'liste_especes_extraction':
					$extr = $this->extraction_utilisateur($_GET['id']);
					$_SESSION['carres'] = $extr['carres'];
					$data['carres_requete'] = $extr['carres'];
					$sel = $this->sel();
					$sel->vider();
					$sel->ajouter_ids($extr['ids']);
					$extraction = $this->sous_extraction($sel, $_GET['mode_liste_especes']);
					$data['especes'] = [];
					foreach ($extraction->especes() as $esp) {
						try {
							$docs = $esp->documents_liste();
						} catch (Exception $e) {
							$docs = [];
						}
						$ref = $esp->get_referentiel_regional();
						$row = [
							'id_espece'=>$esp->id_espece,
							'nom_f' => $esp->nom_f,
							'nom_s' => $esp->nom_s,
							'classe' => $esp->classe,
							'docs' => $docs,
							'rarete' => isset($ref['indice_rar'])?$ref['indice_rar']:null,
							'menace' => isset($ref['categorie'])?$ref['categorie']:null,
							'determinant_znieff' => $esp->determinant_znieff,
							'invasif' => $esp->invasif,
							'carres' => $extraction->carres_espece(1000, 2154, $esp),
						];

						$data['n_citations_par_espece'] = $extraction->compte_citations_par_espece();
						$data['especes'][] = $row;
					}
					break;
				case 'espece_carres_extraction':
					// liste des carrés ou l'espece est présente
					$extr = $this->extraction_utilisateur($_GET['id_requete']);
					$_SESSION['carres'] = $extr['carres'];
					$sel = $this->sel();
					$sel->vider();
					$sel->ajouter_ids($extr['ids']);
					$extraction = $this->sous_extraction($sel, 'toutes');
					$extraction->ajouter_condition(new bobs_ext_c_espece($_GET['id_espece']));
					$data['carres'] = $extraction->carres(2154,1000);
					break;

			}
			echo json_encode($data);
		} catch (Exception $e) {
			echo json_encode(array("err" => 1, "msg" => $e->getMessage(), "file" => $e->getFile(), "line" => $e->getLine(), "trace" => $e->getTrace()));
		}
		exit();
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
