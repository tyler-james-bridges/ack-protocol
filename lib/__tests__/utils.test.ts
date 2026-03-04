import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatRelativeTime } from '../utils';

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const now = () => Math.floor(Date.now() / 1000);

  it('returns "just now" for less than 60 seconds ago', () => {
    expect(formatRelativeTime(now() - 0)).toBe('just now');
    expect(formatRelativeTime(now() - 30)).toBe('just now');
    expect(formatRelativeTime(now() - 59)).toBe('just now');
  });

  it('returns minutes ago for 60s-3599s', () => {
    expect(formatRelativeTime(now() - 60)).toBe('1m ago');
    expect(formatRelativeTime(now() - 120)).toBe('2m ago');
    expect(formatRelativeTime(now() - 3599)).toBe('59m ago');
  });

  it('returns hours ago for 3600s-86399s', () => {
    expect(formatRelativeTime(now() - 3600)).toBe('1h ago');
    expect(formatRelativeTime(now() - 7200)).toBe('2h ago');
    expect(formatRelativeTime(now() - 86399)).toBe('23h ago');
  });

  it('returns days ago for 86400s-604799s', () => {
    expect(formatRelativeTime(now() - 86400)).toBe('1d ago');
    expect(formatRelativeTime(now() - 172800)).toBe('2d ago');
    expect(formatRelativeTime(now() - 604799)).toBe('6d ago');
  });

  it('returns formatted date for 7+ days ago', () => {
    const sevenDaysAgo = now() - 604800;
    const result = formatRelativeTime(sevenDaysAgo);
    // Should be a short date like "Jun 8"
    expect(result).toMatch(/\w{3}\s+\d{1,2}/);
  });
});
