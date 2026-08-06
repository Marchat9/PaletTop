export const environment = {
  appName: 'Palet Top',
  limitMobileSizePx: 768,
  backBaseApiUrl: 'http://localhost:3000',
  githubRepoUrl: 'https://github.com/Marchat9/PaletTop',

  apiConfiguration: {
    delayToUpdateScore: 500, // ms
  },

  tournamentConfiguration: {
    admin: {
      hiddenFields: ['adminPassword'],
      readonlyFields: [],
    },
    maxTeamCapacity: {
      min: 2,
      max: 256,
    },
    teamImport: {
      fileName: 'PaletTop-modele-equipes',
      maxPlayersPerTeam: 12,
      maxTeamsPerImport: 256,
    },
    pointsPerGame: {
      min: 10,
      max: 15,
    },
    numberOfQualifyingRounds: {
      min: 1,
      max: 10,
      default: 4,
    },
    numberOfPools: {
      min: 0,
      max: 32,
      default: undefined,
    },
    principalBracketSize: {
      default: 16,
      options: [4, 8, 16, 32, 64, 128],
    },
  },
};
