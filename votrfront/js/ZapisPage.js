
import { ZapisnyListSelector } from './ZapisnyListSelector';
import { CacheRequester, Loading, RequestCache, sendRpc } from './ajax';
import { coursesStats } from './coursesStats';
import { humanizeTypVyucby, plural } from './humanizeAISData';
import { FormItem, PageLayout, PageTitle } from './layout';
import { Link, navigate } from './router';
import { sortAs, sortTable } from './sorting';


export var ZapisZPlanuColumns = [
  ["Moje?", 'moje', null, true],
  [<abbr title="Typ výučby">Typ</abbr>, 'typ_vyucby'],
  ["Blok", null, (predmet) => parseInt(predmet.blok_index || 0) * 1000 + parseInt(predmet.v_bloku_index || 0)],
  ["Názov predmetu", 'nazov'],
  ["Skratka predmetu", 'skratka'],
  [<abbr title="Semester">Sem.</abbr>, 'semester', null, true],
  ["Rozsah výučby", 'rozsah_vyucby'],
  ["Kredit", 'kredit', sortAs.number],
  ["Prihlásení", 'pocet_prihlasenych', sortAs.number],
  [<abbr title="Odporúčaný ročník">Odp. ročník</abbr>, 'odporucany_rocnik'],
  ["Jazyk", 'jazyk']
];
ZapisZPlanuColumns.defaultOrder = 'a1a2a9a3';


export var ZapisZPonukyColumns = [
  ["Moje?", 'moje', null, true],
  [<abbr title="Typ výučby">Typ</abbr>, 'typ_vyucby'],
  ["Blok", 'blok_skratka'],
  ["Názov predmetu", 'nazov'],
  ["Skratka predmetu", 'skratka'],
  [<abbr title="Semester">Sem.</abbr>, 'semester', null, true],
  ["Rozsah výučby", 'rozsah_vyucby'],
  ["Kredit", 'kredit', sortAs.number],
  ["Prihlásení", 'pocet_prihlasenych', sortAs.number],
  ["Jazyk", 'jazyk']
];
ZapisZPonukyColumns.defaultOrder = 'a3';


export var ZapisVlastnostiColumns = [
  ["Skratka", 'skratka'],
  ["Názov", 'nazov'],
  ["Minimálny kredit", 'minimalny_kredit'],
  ["Poznámka", 'poznamka']
];


export var ZapisMenu = React.createClass({
  propTypes: {
    query: React.PropTypes.object.isRequired
  },

  renderLink(content, href, active) {
    return <Link className={"btn btn-default" + (active ? " active" : "")} href={href}>{content}</Link>;
  },

  render() {
    var {action, cast, zapisnyListKey} = this.props.query;
    return <div>
      <div className="header">
        <PageTitle>Zápis predmetov</PageTitle>
        <div className="pull-right">
          <div className="btn-group">
            {this.renderLink("Môj študijný plán",
              { action: 'zapisZPlanu', cast: 'SC', zapisnyListKey },
              action == 'zapisZPlanu' && cast != 'SS')}
            {this.renderLink("Predmety štátnej skúšky",
              { action: 'zapisZPlanu', cast: 'SS', zapisnyListKey },
              action == 'zapisZPlanu' && cast == 'SS')}
            {this.renderLink("Hľadať ďalšie predmety",
              { action: 'zapisZPonuky', zapisnyListKey },
              action == 'zapisZPonuky')}
          </div>
        </div>
      </div>
      <div>{this.props.children}</div>
    </div>;
  }
});


export var ZapisTableFooter = React.createClass({
  propTypes: {
    predmety: React.PropTypes.object.isRequired,
    moje: React.PropTypes.object.isRequired
  },

  render() {
    var bloky = {}, nazvy = {}, semestre = {};
    _.forEach(this.props.predmety, (predmet) => {
      semestre[predmet.semestre] = true;
      nazvy[predmet.blok_skratka] = predmet.blok_nazov;
    });

    _.forEach(_.sortBy(_.keys(nazvy)), (skratka) => bloky[skratka] = []);
    bloky[''] = [];

    _.forEach(this.props.predmety, (predmet) => {
      if (!this.props.moje[predmet.predmet_key]) return;
      if (predmet.blok_skratka) bloky[predmet.blok_skratka].push(predmet);
      bloky[''].push(predmet);
    });

    var jedinySemester = _.keys(semestre).length <= 1;

    return <tfoot>
      {_.map(bloky, (blok, skratka) => {
        var stats = coursesStats(blok);
        return <tr key={skratka}>
          <td colSpan="2">{skratka ? "Súčet bloku" : "Dokopy"}</td>
          <td>{nazvy[skratka] ? <abbr title={nazvy[skratka]}>{skratka}</abbr> : skratka}</td>
          <td colSpan="4">
            {stats.spolu.count} {plural(stats.spolu.count, "predmet", "predmety", "predmetov")}
            {!jedinySemester && " ("+stats.zima.count+" v zime, "+stats.leto.count+" v lete)"}
          </td>
          <td>
            {stats.spolu.creditsCount}
            {!jedinySemester && " ("+stats.zima.creditsCount+"+"+stats.leto.creditsCount+")"}
          </td>
          <td colSpan="3"></td>
        </tr>;
      })}
    </tfoot>;
  }
});


export var ZapisTable = React.createClass({
  propTypes: {
    query: React.PropTypes.object.isRequired,
    predmety: React.PropTypes.object,
    akademickyRok: React.PropTypes.string,
    message: React.PropTypes.node,
    columns: React.PropTypes.array.isRequired,
    showFooter: React.PropTypes.bool,
    odoberPredmety: React.PropTypes.func.isRequired,
    pridajPredmety: React.PropTypes.func.isRequired
  },

  getInitialState() {
    return { odoberanePredmety: {}, pridavanePredmety: {} };
  },

  handleChange(event) {
    var predmetKey = event.target.name;
    var predmet = this.props.predmety[predmetKey];

    delete this.state.odoberanePredmety[predmetKey];
    delete this.state.pridavanePredmety[predmetKey];
    if (predmet.moje && !event.target.checked) this.state.odoberanePredmety[predmetKey] = true;
    if (!predmet.moje && event.target.checked) this.state.pridavanePredmety[predmetKey] = true;

    this.forceUpdate();
  },

  handleSave(event) {
    event.preventDefault();

    if (this.state.saving) return;

    var predmety = this.props.predmety;

    var odoberanePredmety = [], pridavanePredmety = [];
    for (var predmet_key in predmety) {
      if (this.state.odoberanePredmety[predmet_key] && predmety[predmet_key].moje) {
        odoberanePredmety.push(predmety[predmet_key]);
      }
      if (this.state.pridavanePredmety[predmet_key] && !predmety[predmet_key].moje) {
        pridavanePredmety.push(predmety[predmet_key]);
      }
    }

    this.setState({ saving: true });

    var koniec = (odobral, pridal) => {
      if (odobral) {
        odoberanePredmety.forEach((predmet) => {
          RequestCache['pocet_prihlasenych_je_stary' + predmet.predmet_key] = true;
        });
        this.setState({ odoberanePredmety: {} });
      }

      if (pridal) {
        pridavanePredmety.forEach((predmet) => {
          RequestCache['pocet_prihlasenych_je_stary' + predmet.predmet_key] = true;
        });
        this.setState({ pridavanePredmety: {} });
      }

      // Aj ked skoncime neuspechom, je mozne, ze niektore predmety sa zapisali.
      RequestCache.invalidate('get_hodnotenia');
      RequestCache.invalidate('get_predmety');
      RequestCache.invalidate('get_prehlad_kreditov');
      RequestCache.invalidate('get_studenti_zapisani_na_predmet');
      RequestCache.invalidate('zapis_get_zapisane_predmety');
    };

    this.props.odoberPredmety(odoberanePredmety, (message) => {
      if (message) {
        this.setState({ saving: false });
        alert(message);
        koniec(false, false);
      } else {
        this.props.pridajPredmety(pridavanePredmety, (message) => {
          this.setState({ saving: false });
          if (message) {
            alert(message);
            koniec(true, false);
          } else {
            koniec(true, true);
          }
        });
      }
    });
  },

  render() {
    // Chceme, aby sa pre ZapisTable zachoval this.state aj vtedy, ked tabulku
    // nevidno, lebo sme prave zapisali predmety a obnovujeme zoznam predmetov.
    // Takze komponent ZapisTable sa bude renderovat vzdy, aby nikdy nezanikol
    // a neprisiel o state. Niekedy proste nedostane this.props.predmety.
    if (!this.props.predmety || !this.props.akademickyRok) {
      return <span />;
    }

    var {predmety, columns, query, message} = this.props;

    var classes = {}, checked = {};
    for (var predmet_key in predmety) {
      checked[predmet_key] = predmety[predmet_key].moje;
      if (this.state.odoberanePredmety[predmet_key] && predmety[predmet_key].moje) {
        classes[predmet_key] = 'danger';
        checked[predmet_key] = false;
      }
      if (this.state.pridavanePredmety[predmet_key] && !predmety[predmet_key].moje) {
        classes[predmet_key] = 'success';
        checked[predmet_key] = true;
      }
    }

    var saveButton = <div className="section">
      <button type="submit" className="btn btn-primary" disabled={_.isEmpty(classes)}>
        {this.state.saving ? <Loading /> : "Uložiť zmeny"}
      </button>
    </div>;

    var [predmety, header] = sortTable(_.values(predmety), columns, query, 'predmetySort');

    return <form onSubmit={this.handleSave}>
      {saveButton}
      <table className="table table-condensed table-bordered table-striped table-hover with-buttons-table">
        <thead>{header}</thead>
        <tbody>
          {predmety.map((predmet) => {
            var predmet_key = predmet.predmet_key;
            var href = { ...this.props.query, modal: 'detailPredmetu', modalPredmetKey: predmet.predmet_key, modalAkademickyRok: this.props.akademickyRok };
            var nazov = <Link href={href}>{predmet.nazov}</Link>;
            if (predmet.moje) nazov = <strong>{nazov}</strong>;
            if (predmet.aktualnost) nazov = <span><del>{nazov}</del> (nekoná sa)</span>;
            var blok = predmet.blok_skratka;
            if (predmet.blok_nazov) blok = <abbr title={predmet.blok_nazov}>{blok}</abbr>;

            return <tr key={predmet_key} className={classes[predmet_key]}>
              <td className="text-center">
                <input type="checkbox" name={predmet_key} checked={checked[predmet_key]} onChange={this.handleChange} />
              </td>
              <td><abbr title={humanizeTypVyucby(predmet.typ_vyucby)}>{predmet.typ_vyucby}</abbr></td>
              <td>{blok}</td>
              <td>{nazov}</td>
              <td>{predmet.skratka}</td>
              <td>{predmet.semester}</td>
              <td>{predmet.rozsah_vyucby}</td>
              <td>{predmet.kredit}</td>
              <td>{RequestCache['pocet_prihlasenych_je_stary' + predmet_key] ?
                      <del>{predmet.pocet_prihlasenych}</del> : predmet.pocet_prihlasenych}
                  {predmet.maximalne_prihlasenych && "/" + predmet.maximalne_prihlasenych}</td>
              {columns == ZapisZPlanuColumns && <td>{predmet.odporucany_rocnik}</td>}
              <td>{predmet.jazyk.replace(/ ,/g, ', ')}</td>
            </tr>;
          })}
        </tbody>
        {this.props.showFooter && <ZapisTableFooter predmety={this.props.predmety} moje={checked} />}
        {message && <tfoot><tr><td colSpan={columns.length}>{message}</td></tr></tfoot>}
      </table>
      {saveButton}
    </form>;
  }
});


export var ZapisVlastnostiTable = React.createClass({
  propTypes: {
    query: React.PropTypes.object.isRequired
  },

  render() {
    var cache = new CacheRequester();
    var {zapisnyListKey} = this.props.query;

    var [vlastnosti, message] = cache.get('zapis_get_vlastnosti_programu', zapisnyListKey) || [];

    if (!vlastnosti) {
      return <Loading requests={cache.missing} />;
    }

    if (!message && !vlastnosti.length) {
      message = "Študijný plán nemá žiadne poznámky.";
    }

    var [vlastnosti, header] = sortTable(
      vlastnosti, ZapisVlastnostiColumns, this.props.query, 'vlastnostiSort');

    return <table className="table table-condensed table-bordered table-striped table-hover">
      <thead>{header}</thead>
      <tbody>
        {vlastnosti.map((vlastnost, index) =>
          <tr key={index}>
            <td>{vlastnost.skratka}</td>
            <td>{vlastnost.nazov}</td>
            <td>{vlastnost.minimalny_kredit}</td>
            <td>{vlastnost.poznamka}</td>
          </tr>
        )}
      </tbody>
      {message && <tfoot><tr><td colSpan={ZapisVlastnostiColumns.length}>{message}</td></tr></tfoot>}
    </table>;
  }
});


export var ZapisZPlanuPageContent = React.createClass({
  getQuery() {
    var {zapisnyListKey, cast} = this.props.query;
    cast = (cast == 'SS' ? 'SS' : 'SC');
    return {zapisnyListKey, cast};
  },

  render() {
    var cache = new CacheRequester();
    var {zapisnyListKey, cast} = this.getQuery();

    var [zapisanePredmety, zapisaneMessage] = cache.get('zapis_get_zapisane_predmety', zapisnyListKey, cast) || [];
    var [ponukanePredmety, ponukaneMessage] = cache.get('zapis_plan_vyhladaj', zapisnyListKey, cast) || [];
    var akademickyRok = cache.get('zapisny_list_key_to_akademicky_rok', zapisnyListKey);

    var outerMessage, tableMessage, predmety;

    if (zapisaneMessage || ponukaneMessage) {
      outerMessage = <p>{zapisaneMessage || ponukaneMessage}</p>;
    } else if (!cache.loadedAll) {
      outerMessage = <Loading requests={cache.missing} />;
    } else {
      var vidnoZimne = false;

      predmety = {};
      ponukanePredmety.forEach((predmet) => {
        predmety[predmet.predmet_key] = { moje: false, ...predmet };
        if (predmet.semester == 'Z') vidnoZimne = true;
      });
      zapisanePredmety.forEach((predmet) => {
        var predmet_key = predmet.predmet_key;
        if (!predmety[predmet_key]) {
          if (predmet.semester == 'Z' && !vidnoZimne) return;
          predmety[predmet_key] = { moje: true, ...predmet };
        } else {
          for (var property in predmet) {
            if (predmet[property] !== null && predmet[property] !== undefined) {
              predmety[predmet_key][property] = predmet[property];
            }
          }
          predmety[predmet_key].moje = true;
        }
      });

      if (_.isEmpty(predmety)) {
        tableMessage = "Zoznam ponúkaných predmetov je prázdny.";
      }
    }

    return <ZapisMenu query={this.props.query}>
      {outerMessage}
      <ZapisTable
          query={this.props.query} predmety={predmety} message={tableMessage}
          akademickyRok={akademickyRok}
          odoberPredmety={this.odoberPredmety}
          pridajPredmety={this.pridajPredmety}
          columns={ZapisZPlanuColumns} showFooter={true} />
      <h2>Poznámky k študijnému plánu</h2>
      <ZapisVlastnostiTable query={this.props.query} />
    </ZapisMenu>;
  },

  pridajPredmety(predmety, callback) {
    if (!predmety.length) return callback(null);

    var {zapisnyListKey, cast} = this.getQuery();
    var dvojice = predmety.map((predmet) => [predmet.typ_vyucby, predmet.skratka]);
    sendRpc('zapis_plan_pridaj_predmety', [zapisnyListKey, cast, dvojice], callback);
  },

  odoberPredmety(predmety, callback) {
    if (!predmety.length) return callback(null);

    var {zapisnyListKey, cast} = this.getQuery();
    var kluce = predmety.map((predmet) => predmet.predmet_key);
    sendRpc('zapis_odstran_predmety', [zapisnyListKey, cast, kluce], callback);
  }
});


export var ZapisZPlanuPage = React.createClass({
  propTypes: {
    query: React.PropTypes.object.isRequired
  },

  render() {
    return <PageLayout query={this.props.query}>
      <ZapisnyListSelector query={this.props.query} component={ZapisZPlanuPageContent} />
    </PageLayout>;
  }
});


export var ZapisZPonukyForm = React.createClass({
  getInitialState() {
    var query = this.props.query;
    return {
      fakulta: query.fakulta,
      stredisko: query.stredisko,
      skratkaPredmetu: query.skratkaPredmetu,
      nazovPredmetu: query.nazovPredmetu
    };
  },

  handleFieldChange(event) {
    this.setState({ [event.target.name]: event.target.value });
  },

  handleSubmit(event) {
    event.preventDefault();
    var {zapisnyListKey} = this.props.query;
    navigate({ action: 'zapisZPonuky', zapisnyListKey, ...this.state });
  },

  renderTextInput(label, name, focus) {
    return <FormItem label={label}>
      <input className="form-item-control" name={name} autoFocus={focus}
             value={this.state[name]} type="text" onChange={this.handleFieldChange} />
    </FormItem>;
  },

  renderSelect(label, name, items, cache) {
    return <FormItem label={label}>
      {items ?
        <select className="form-item-control" name={name} value={this.state[name]} onChange={this.handleFieldChange}>
          {items.map((item) =>
            <option key={item.id} value={item.id}>{item.title}</option>
          )}
        </select> : <Loading requests={cache.missing} />}
    </FormItem>;
  },

  render() {
    var cache = new CacheRequester();
    var [fakulty, message] = cache.get('zapis_ponuka_options', this.props.query.zapisnyListKey) || [];

    if (!fakulty) {
      return <Loading requests={cache.missing} />;
    }

    if (message) {
      return <p>{message}</p>;
    }

    return <form onSubmit={this.handleSubmit}>
      {this.renderTextInput("Názov predmetu: ", "nazovPredmetu", true)}
      {this.renderTextInput("Skratka predmetu: ", "skratkaPredmetu", false)}
      {this.renderSelect("Fakulta: ", "fakulta", fakulty, cache)}
      {this.renderTextInput("Stredisko: ", "stredisko", false)}
      <FormItem>
        <button className="btn btn-primary" type="submit">Vyhľadaj</button>
      </FormItem>
    </form>;
  }
});


export var ZapisZPonukyPageContent = React.createClass({
  render() {
    var cache = new CacheRequester();
    var query = this.props.query;

    var outerMessage, tableMessage, predmety, akademickyRok;

    if (query.fakulta ||
        query.stredisko ||
        query.skratkaPredmetu ||
        query.nazovPredmetu) {
      var [zapisanePredmety, zapisaneMessage] = cache.get('zapis_get_zapisane_predmety', query.zapisnyListKey, 'SC') || [];
      var [ponukanePredmety, ponukaneMessage] = cache.get('zapis_ponuka_vyhladaj', query.zapisnyListKey,
          query.fakulta || null,
          query.stredisko || null,
          query.skratkaPredmetu || null,
          query.nazovPredmetu || null) || [];
      akademickyRok = cache.get('zapisny_list_key_to_akademicky_rok', query.zapisnyListKey);

      if (zapisaneMessage) {
        outerMessage = <p>{zapisaneMessage}</p>;
      } else if (!cache.loadedAll) {
        outerMessage = <Loading requests={cache.missing} />;
      } else {
        var predmety = {};
        ponukanePredmety.forEach((predmet) => {
          predmety[predmet.predmet_key] = { moje: false, ...predmet };
        });
        zapisanePredmety.forEach((predmet) => {
          if (predmety[predmet.predmet_key]) {
            predmety[predmet.predmet_key].moje = true;
          }
        });

        tableMessage = ponukaneMessage;
        if (_.isEmpty(predmety) && !tableMessage) {
          tableMessage = "Podmienkam nevyhovuje žiadny záznam.";
        }
      }
    }

    return <ZapisMenu query={this.props.query}>
      <ZapisZPonukyForm query={this.props.query} />
      {outerMessage}
      {predmety && <h2>Výsledky</h2>}
      <ZapisTable
          query={this.props.query} predmety={predmety} message={tableMessage}
          akademickyRok={akademickyRok}
          odoberPredmety={this.odoberPredmety}
          pridajPredmety={this.pridajPredmety}
          columns={ZapisZPonukyColumns} />
    </ZapisMenu>;
  },

  pridajPredmety(predmety, callback) {
    if (!predmety.length) return callback(null);

    var query = this.props.query;
    var skratky = predmety.map((predmet) => predmet.skratka);
    sendRpc('zapis_ponuka_pridaj_predmety', [query.zapisnyListKey,
        query.fakulta || null,
        query.stredisko || null,
        query.skratkaPredmetu || null,
        query.nazovPredmetu || null,
        skratky], callback);
  },

  odoberPredmety(predmety, callback) {
    if (!predmety.length) return callback(null);

    var query = this.props.query;
    var kluce = predmety.map((predmet) => predmet.predmet_key);
    sendRpc('zapis_odstran_predmety', [query.zapisnyListKey, 'SC', kluce], callback);
  }
});


export var ZapisZPonukyPage = React.createClass({
  propTypes: {
    query: React.PropTypes.object.isRequired
  },

  render() {
    return <PageLayout query={this.props.query}>
      <ZapisnyListSelector query={this.props.query} component={ZapisZPonukyPageContent} />
    </PageLayout>;
  }
});
