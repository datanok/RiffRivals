// List of moderator usernames - in a real app this would come from Reddit API
const MODERATOR_USERNAMES = [
  'tanmayok', // Add your username here
  'mod1',
  'mod2',
  // Add more moderator usernames as needed
];

export function isModerator(username: string | null): boolean {
  if (!username) return false;
  return MODERATOR_USERNAMES.includes(username.toLowerCase());
}

export function getModeratorList(): string[] {
  return [...MODERATOR_USERNAMES];
}
