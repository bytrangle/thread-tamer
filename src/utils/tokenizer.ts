import { stemmer } from 'stemmer';
/**
 * Tokenizes a post title by:
 * - Converting to lowercase
 * - Removing punctuation
 * - Splitting on whitespace
 * - Filtering stop words
 *
 * @param title The post title to tokenize
 * @returns An array of tokens
 */
export function tokenizePostTitle(title: string): string[] {
  if (!title || typeof title !== 'string') {
    return [];
  }

  // Convert to lowercase
  let processedTitle = title.toLowerCase();

  // Remove punctuation
  processedTitle = processedTitle.replace(/[^\w\s]/g, ' ');

  // Split on whitespace
  const tokens = processedTitle.split(/\s+/).filter(token => token.trim().length > 0);

  // Define stop words
  const stopWords = new Set([
    // Question words
    'how', 'what', 'when', 'where', 'who', 'whom', 'whose', 'which', 'why',
    // Articles
    'a', 'an', 'the',
    // Prepositions
    'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'between',
    'among', 'under', 'over', 'up', 'down', 'out', 'off', 'again',
    'further', 'then', 'once',
    // Conjunctions
    'and', 'or', 'but', 'nor', 'so', 'yet', 'for',
    // Pronouns
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you',
    'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his',
    'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself',
    'they', 'them', 'their', 'theirs', 'themselves', 'this', 'that',
    'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'shall'
  ]);

  // Filter out stop words and return unique tokens
  const uniqueTokens = new Set(
    tokens
      .filter(token => token && !stopWords.has(token))
      .map(token => stemmer(token)) // stem each token
  );
  return Array.from(uniqueTokens);
}