import { Param, ParseUUIDPipe } from '@nestjs/common';

// Raccourci pour un paramètre de route qui doit être un UUID : @UuidParam('matchId') équivaut à
// @Param('matchId', ParseUUIDPipe), en un seul endroit à faire évoluer si la validation change.
export const UuidParam = (property: string) => Param(property, ParseUUIDPipe);
