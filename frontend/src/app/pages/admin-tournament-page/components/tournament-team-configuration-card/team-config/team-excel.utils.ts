import type { Column, Fill } from 'exceljs';

export interface ParsedTeamRow {
  rowIndex: number;
  name?: string;
  players: { name: string; club?: string }[];
  errors: string[];
  warnings: string[];
}

export interface ParseTeamsResult {
  rows: ParsedTeamRow[];
  globalError?: string;
}

export interface TeamImportLimits {
  maxPlayersPerTeam: number;
  maxTeamsPerImport: number;
}

const TEAM_NAME_COLUMN_INDEX = 0;
const PLAYER_NAME_HEADER_REGEX = /^nom joueur\s*(\d+)$/i;
const CLUB_HEADER_REGEX = /^club\s*(\d+)$/i;
const HEADER_FILL: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE9C349' },
};

interface PlayerColumnMap {
  nameCol: number;
  clubCol?: number;
}

export async function generateTeamsExcelTemplate(maxPlayers: number): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Équipes');

  const columns: Partial<Column>[] = [{ header: 'Nom Equipe (optionnel)', key: 'team', width: 26 }];
  for (let i = 1; i <= maxPlayers; i++) {
    columns.push({ header: `Nom Joueur ${i}`, key: `playerName${i}`, width: 22 });
    columns.push({ header: `Nom Club ${i}`, key: `playerClub${i}`, width: 20 });
  }
  worksheet.columns = columns;

  worksheet.getRow(1).eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = { bold: true, color: { argb: 'FF1A1A1A' } };
  });

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  worksheet.addRow({
    team: 'Équipe Exemple 1',
    playerName1: 'Jean Dupont (exemple)',
    playerClub1: 'Club des Exemples',
    ...(maxPlayers >= 2 ? { playerName2: 'Marie Martin (exemple)' } : {}),
  });
  worksheet.addRow({
    team: 'Équipe Exemple 2',
    playerName1: 'Paul Petit (exemple)',
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function parseTeamsExcelFile(
  file: File,
  limits: TeamImportLimits,
): Promise<ParseTeamsResult> {
  const { read, utils } = await import('xlsx');
  const workbook = read(await file.arrayBuffer(), { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  const worksheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!worksheet) {
    return { rows: [], globalError: 'Le fichier ne contient aucune feuille.' };
  }

  const sheetRows: string[][] = utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: '',
  });

  const headerRow = sheetRows[0] ?? [];
  const playerColumns = new Map<number, PlayerColumnMap>();
  headerRow.forEach((headerText, colIndex) => {
    const header = (headerText ?? '').trim();

    const nameMatch = header.match(PLAYER_NAME_HEADER_REGEX);
    if (nameMatch) {
      const playerNumber = Number(nameMatch[1]);
      playerColumns.set(playerNumber, { ...playerColumns.get(playerNumber), nameCol: colIndex });
      return;
    }

    const clubMatch = header.match(CLUB_HEADER_REGEX);
    if (clubMatch) {
      const playerNumber = Number(clubMatch[1]);
      playerColumns.set(playerNumber, {
        nameCol: -1,
        ...playerColumns.get(playerNumber),
        clubCol: colIndex,
      });
    }
  });

  if (playerColumns.size === 0) {
    return {
      rows: [],
      globalError:
        'Aucune colonne "Nom Joueur N" détectée. Vérifiez que vous utilisez le modèle fourni.',
    };
  }

  const dataRows = sheetRows.slice(1);
  if (dataRows.length > limits.maxTeamsPerImport) {
    return {
      rows: [],
      globalError: `Le fichier contient plus de ${limits.maxTeamsPerImport} équipes, ce qui dépasse la limite d'import en une fois.`,
    };
  }

  const sortedPlayerNumbers = [...playerColumns.keys()].sort((a, b) => a - b);
  const rows: ParsedTeamRow[] = [];

  dataRows.forEach((rowValues, index) => {
    const rowIndex = index + 2; // +1 pour l'en-tête, +1 car les lignes Excel sont 1-based
    const name = (rowValues[TEAM_NAME_COLUMN_INDEX] ?? '').trim() || undefined;
    const errors: string[] = [];
    const warnings: string[] = [];
    const players: { name: string; club?: string }[] = [];

    for (const playerNumber of sortedPlayerNumbers) {
      const columnMap = playerColumns.get(playerNumber)!;
      const playerName = columnMap.nameCol >= 0 ? (rowValues[columnMap.nameCol] ?? '').trim() : '';
      const club =
        columnMap.clubCol !== undefined ? (rowValues[columnMap.clubCol] ?? '').trim() : '';

      if (!playerName && !club) {
        continue;
      }
      if (!playerName) {
        warnings.push(`Club "${club}" ignoré (nom du joueur ${playerNumber} manquant).`);
        continue;
      }
      players.push({ name: playerName, club: club || undefined });
    }

    if (!name && players.length === 0 && warnings.length === 0) {
      return;
    }

    if (players.length === 0) {
      errors.push('Aucun joueur valide sur cette ligne.');
    } else if (players.length > limits.maxPlayersPerTeam) {
      errors.push(
        `Cette équipe a ${players.length} joueurs, ce qui dépasse la limite de ${limits.maxPlayersPerTeam}.`,
      );
    }

    rows.push({ rowIndex, name, players, errors, warnings });
  });

  return { rows };
}
