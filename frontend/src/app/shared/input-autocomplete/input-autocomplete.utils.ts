/** Next active option index when moving up or down; wraps around, -1 when there is no option. */
export function nextActiveIndex(current: number, count: number, direction: 1 | -1): number {
  if (count <= 0) {
    return -1;
  }
  if (current < 0 || current >= count) {
    return direction === 1 ? 0 : count - 1;
  }
  return (current + direction + count) % count;
}
