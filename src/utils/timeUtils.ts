/**
 * Format a last_seen timestamp into human-readable text
 * Returns status like "Active now", "5 minutes ago", "2 hours ago", etc.
 */
export function formatLastSeen(lastSeenString: string | null | undefined): {
  text: string;
  color: string; // Dot color: green, yellow, or gray
} {
  if (!lastSeenString) {
    return { text: 'Never', color: '#9CA3AF' }; // Gray
  }

  try {
    // Fix: Backend sends UTC time without "Z" marker
    // JavaScript interprets strings without "Z" as local time, causing timezone issues
    // Solution: Add "Z" if the string doesn't already have a timezone marker
    let normalizedString = lastSeenString;
    if (!lastSeenString.endsWith('Z') && !lastSeenString.includes('+') && !lastSeenString.includes('-', 10)) {
      normalizedString = lastSeenString.replace(/(\.\d+)?$/, '') + 'Z';
    }

    const lastSeen = new Date(normalizedString);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    // < 2 minutes ago → "Active now" (green)
    if (diffMinutes < 2) {
      return { text: 'Active now', color: '#10B981' }; // Green
    }

    // < 1 hour → "X minutes ago" (yellow)
    if (diffMinutes < 60) {
      return { text: `${diffMinutes} min ago`, color: '#F59E0B' }; // Yellow/Orange
    }

    // < 24 hours → "X hours ago" (gray)
    if (diffHours < 24) {
      const hoursText = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
      return { text: hoursText, color: '#6B7280' }; // Gray
    }

    // < 7 days → "X days ago" (gray)
    if (diffDays < 7) {
      const daysText = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
      return { text: daysText, color: '#6B7280' }; // Gray
    }

    // Older → "Last seen: [date]" (gray)
    const dateStr = lastSeen.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    return { text: `Last seen: ${dateStr}`, color: '#9CA3AF' }; // Light gray

  } catch (error) {
    console.error('Error parsing last_seen:', error);
    return { text: 'Unknown', color: '#9CA3AF' };
  }
}
