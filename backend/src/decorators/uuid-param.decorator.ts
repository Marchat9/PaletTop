import { Param, ParseUUIDPipe } from '@nestjs/common';

// Shortcut for a route param that must be a UUID: @UuidParam('matchId') is the same as
// @Param('matchId', ParseUUIDPipe), in a single place to change if the validation evolves.
export const UuidParam = (property: string) => Param(property, ParseUUIDPipe);
