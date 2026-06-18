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
    const lastSeen = new Date(lastSeenString);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    // < 5 minutes ago → "Active now" (green)
    if (diffMinutes < 5) {
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
