
export interface VttParseResult {
  header: string;
  cues: string[];
}

/**
 * Splits a VTT file content into its header and an array of individual cue blocks.
 * @param vttContent The raw string content of the .vtt file.
 * @returns An object containing the header and an array of cue strings.
 */
export const splitVttIntoCues = (vttContent: string): VttParseResult => {
  const normalizedContent = vttContent.replace(/\r\n/g, '\n');
  const lines = normalizedContent.split('\n');

  let firstCueLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('-->')) {
      // The line before the timestamp is the cue identifier (if it exists)
      // The cue block effectively starts before the identifier.
      // We find the start of this block by looking for the preceding blank line.
      let blockStartIndex = i;
      while (blockStartIndex > 0 && lines[blockStartIndex - 1].trim() !== '') {
        blockStartIndex--;
      }
      firstCueLineIndex = blockStartIndex;
      break;
    }
  }

  if (firstCueLineIndex === -1) {
    // No cues found, treat the whole file as a header.
    return { header: vttContent.trim(), cues: [] };
  }
  
  const header = lines.slice(0, firstCueLineIndex).join('\n').trim();
  
  // The rest of the content contains the cues. Split by double newlines.
  const cuesContent = lines.slice(firstCueLineIndex).join('\n');
  const cues = cuesContent.split(/\n\n+/).filter(cue => cue.trim() !== '');

  return { header, cues };
};


/**
 * Groups an array of cue strings into larger chunks.
 * @param cues Array of cue strings.
 * @param chunkSize The desired number of cues per chunk.
 * @returns An array of strings, where each string is a block of multiple cues.
 */
export const groupCuesIntoChunks = (cues: string[], chunkSize: number): string[] => {
  if (chunkSize <= 0) {
    throw new Error('chunkSize must be a positive number.');
  }
  
  const chunks: string[] = [];
  for (let i = 0; i < cues.length; i += chunkSize) {
    const chunkCues = cues.slice(i, i + chunkSize);
    chunks.push(chunkCues.join('\n\n'));
  }
  return chunks;
};

/**
 * Counts the number of subtitle cues (timestamp lines) in a VTT string.
 * @param vttContent The string content of the VTT file.
 * @returns The number of cues found.
 */
export const countCues = (vttContent: string): number => {
  if (!vttContent) return 0;
  // A simple regex to count occurrences of the timestamp arrow is reliable.
  const matches = vttContent.match(/-->/g);
  return matches ? matches.length : 0;
};
