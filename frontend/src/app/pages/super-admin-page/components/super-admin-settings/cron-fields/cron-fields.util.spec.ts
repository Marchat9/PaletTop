import { explainCron, hasCronFieldCount } from './cron-fields.util';

describe('explainCron', () => {
  it('explains each of the 5 positions', () => {
    expect(explainCron('0 3 * * *')).toEqual([
      { label: 'Minute', value: '0', meaning: '0 min' },
      { label: 'Heure', value: '3', meaning: '3h' },
      { label: 'Jour du mois', value: '*', meaning: 'chaque jour' },
      { label: 'Mois', value: '*', meaning: 'chaque mois' },
      { label: 'Jour de la semaine', value: '*', meaning: 'tous les jours' },
    ]);
  });

  it('reads steps, ranges, lists, month and weekday names', () => {
    expect(explainCron('*/2 8-18 1,15 12 1').map((field) => field.meaning)).toEqual([
      'toutes les 2 minutes',
      'de 8h à 18h',
      'le 1, le 15',
      'décembre',
      'lundi',
    ]);
    expect(explainCron('0 6 * * 0')[4].meaning).toBe('dimanche');
    expect(explainCron('0 6 * * 7')[4].meaning).toBe('dimanche');
  });

  it('puts the seconds first with 6 positions', () => {
    expect(explainCron('30 0 3 * * *').map((field) => field.label)).toEqual([
      'Seconde',
      'Minute',
      'Heure',
      'Jour du mois',
      'Mois',
      'Jour de la semaine',
    ]);
  });

  it('marks the missing positions', () => {
    const fields = explainCron('0 3');

    expect(fields).toHaveLength(5);
    expect(fields[2]).toEqual({ label: 'Jour du mois', value: '—', meaning: 'manquant' });
    expect(hasCronFieldCount('0 3')).toBe(false);
    expect(hasCronFieldCount(' 0  3 * * * ')).toBe(true);
  });
});
