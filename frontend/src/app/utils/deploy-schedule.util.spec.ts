import { delayUntilNextDeployCheck } from './deploy-schedule.util';

const MINUTE = 60_000;

function at(hours: number, minutes: number, seconds = 0): Date {
  return new Date(2026, 10, 15, hours, minutes, seconds);
}

describe('delayUntilNextDeployCheck', () => {
  it('waits until 5 minutes past the hour', () => {
    expect(delayUntilNextDeployCheck(at(14, 0))).toBe(5 * MINUTE);
    expect(delayUntilNextDeployCheck(at(14, 4, 30))).toBe(30_000);
  });

  it('then until 5 minutes past the half hour', () => {
    expect(delayUntilNextDeployCheck(at(14, 5))).toBe(30 * MINUTE);
    expect(delayUntilNextDeployCheck(at(14, 20))).toBe(15 * MINUTE);
  });

  it('then until 5 minutes past the next hour, across midnight too', () => {
    expect(delayUntilNextDeployCheck(at(14, 35))).toBe(30 * MINUTE);
    expect(delayUntilNextDeployCheck(at(14, 50))).toBe(15 * MINUTE);
    expect(delayUntilNextDeployCheck(at(23, 50))).toBe(15 * MINUTE);
  });
});
