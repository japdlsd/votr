(function () {


Votr.ZoznamPrihlasenychNaTerminColumns = [
  ["Meno", 'plne_meno', Votr.sortAs.personName],
  ["Študijný program", 'sp_skratka'],
  ["Ročník", 'rocnik', Votr.sortAs.number],
  ["E-mail", 'email'],
  ["Dátum prihlásenia", 'datum_prihlasenia', Votr.sortAs.date]
];


Votr.ZoznamPrihlasenychNaTerminModal = React.createClass({
  propTypes: {
    query: React.PropTypes.object.isRequired
  },

  renderContent: function () {
    var cache = new Votr.CacheRequester();
    var {modalStudiumKey, modalZapisnyListKey, modalPredmetKey, modalTerminKey} = this.props.query;

    if (!(modalPredmetKey && modalTerminKey && modalStudiumKey && modalZapisnyListKey)) return null;
    var studenti = cache.get('get_prihlaseni_studenti', modalStudiumKey, modalZapisnyListKey, modalPredmetKey, modalTerminKey);

    if (!studenti) {
      return <Votr.Loading requests={cache.missing} />;
    }

    var [studenti, header] = Votr.sortTable(
      studenti, Votr.ZoznamPrihlasenychNaTerminColumns,
      this.props.query, 'modalStudentiSort');

    return <table className="table table-condensed table-bordered table-striped table-hover">
      <thead>{header}</thead>
      <tbody>
        {studenti.map((student, index) =>
          <tr key={index}>
            <td>{student.plne_meno}</td>
            <td>{student.sp_skratka}</td>
            <td>{student.rocnik}</td>
            <td>{student.email}</td>
            <td>{student.datum_prihlasenia}</td>
          </tr>
        )}
      </tbody>
    </table>;
  },

  render: function () {
    return <Votr.Modal title="Zoznam prihlásených na termín">
      {this.renderContent()}
    </Votr.Modal>;
  }
});


})();