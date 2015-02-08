
from collections import namedtuple
from .helpers import keyed_namedtuple


Studium = keyed_namedtuple('Studium', [
    'sp_skratka', 'sp_popis', 'sp_doplnujuce_udaje', 'zaciatok', 'koniec',
    'sp_dlzka', 'sp_cislo', 'rok_studia', 'studium_key'],
    studium_key=['sp_skratka', 'zaciatok'])

ZapisnyList = keyed_namedtuple('ZapisnyList', [
    'akademicky_rok', 'rocnik', 'sp_skratka', 'sp_popis', 'datum_zapisu',
    'studium_key', 'zapisny_list_key'],
    zapisny_list_key=['studium_key', 'akademicky_rok'])

Predmet = keyed_namedtuple('Predmet', [
    'skratka', 'nazov', 'typ_vyucby', 'semester', 'kredit', 'predmet_key'],
    predmet_key=['skratka'])

RegPredmet = keyed_namedtuple('RegPredmet', [
    'skratka', 'nazov', 'konanie', 'stredisko', 'fakulta', 'cudzi_nazov',
    'rozsah_vyucby', 'semester', 'kredit', 'predmet_key'],
    predmet_key=['skratka'])

Hodnotenie = keyed_namedtuple('Hodnotenie', [
    'akademicky_rok', 'skratka', 'nazov', 'typ_vyucby', 'semester', 'kredit',
    'hodn_znamka', 'hodn_termin', 'hodn_datum', 'hodn_znamka_popis',
    'zapisny_list_key', 'predmet_key', 'hodn_key'],
    predmet_key=['skratka'],
    hodn_key=['zapisny_list_key', 'skratka'])

Priemer = namedtuple('Priemer', [
    'akademicky_rok', 'nazov', 'semester', 'ziskany_kredit', 'predmetov',
    'neabsolvovanych', 'studijny_priemer', 'vazeny_priemer', 'pokusy_priemer',
    'datum_vypoctu'])

Termin = keyed_namedtuple('Termin', [
    'datum', 'cas', 'miestnost', 'pocet_prihlasenych',
    'maximalne_prihlasenych', 'hodnotiaci', 'prihlasovanie', 'odhlasovanie',
    'poznamka', 'akademicky_rok', 'nazov_predmetu', 'skratka_predmetu',
    'moznost_prihlasit', 'datum_prihlasenia', 'datum_odhlasenia',
    'hodnotenie_terminu', 'hodnotenie_predmetu', 'zapisny_list_key',
    'predmet_key', 'termin_key'],
    predmet_key=['skratka_predmetu'],
    termin_key=['zapisny_list_key', 'predmet_key', 'datum', 'cas', 'miestnost',
        'poznamka'])

PrihlasenyStudent = namedtuple('PrihlasenyStudent', [
    'sp_skratka', 'datum_prihlasenia', 'plne_meno', 'rocnik', 'email'])

Obdobie = namedtuple('Obdobie', ['obdobie_od', 'obdobie_do', 'id_akcie'])

RegUcitelPredmetu = namedtuple('RegUcitelPredmetu', ['plne_meno', 'typ'])

RegOsoba = namedtuple('RegOsoba', ['meno', 'priezvisko', 'plne_meno', 'email'])
