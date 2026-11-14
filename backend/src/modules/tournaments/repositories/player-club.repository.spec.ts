import { describe, expect, it } from 'vitest';
import { escapeLikePattern } from './player-club.repository';

describe('escapeLikePattern', () => {
    it('escapes LIKE wildcards in the search', () => {
        expect(escapeLikePattern('50%_a\\b')).toBe('50\\%\\_a\\\\b');
    });
});
