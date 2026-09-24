/**
 * Smart Text Splitter for Long TTS Scripts
 * Splits text into natural segments under maxChars (default 2900, strictly <= 3000).
 * Splits at paragraph breaks, sentence boundaries (., !, ?, ...), and never cuts words in half.
 */
export function splitTextIntoSmartSegments(text: string, maxChars: number = 2900): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= maxChars) return [trimmed];

  const segments: string[] = [];
  const paragraphs = trimmed.split(/\n\s*\n/);
  let currentSegment = '';

  for (const para of paragraphs) {
    const cleanPara = para.trim();
    if (!cleanPara) continue;

    if (!currentSegment) {
      if (cleanPara.length <= maxChars) {
        currentSegment = cleanPara;
        continue;
      }
    } else {
      const combined = currentSegment + '\n\n' + cleanPara;
      if (combined.length <= maxChars) {
        currentSegment = combined;
        continue;
      } else {
        segments.push(currentSegment.trim());
        currentSegment = '';
        if (cleanPara.length <= maxChars) {
          currentSegment = cleanPara;
          continue;
        }
      }
    }

    // Paragraph is longer than maxChars, split by sentences
    const sentenceRegex = /[^.!?…\n]+(?:[.!?…]+|\n|$)/g;
    const sentences = cleanPara.match(sentenceRegex) || [cleanPara];

    for (const rawSent of sentences) {
      const sent = rawSent.trim();
      if (!sent) continue;

      if (!currentSegment) {
        if (sent.length <= maxChars) {
          currentSegment = sent;
          continue;
        }
      } else {
        const combined = currentSegment + ' ' + sent;
        if (combined.length <= maxChars) {
          currentSegment = combined;
          continue;
        } else {
          segments.push(currentSegment.trim());
          currentSegment = '';
          if (sent.length <= maxChars) {
            currentSegment = sent;
            continue;
          }
        }
      }

      // Sentence is still longer than maxChars, split by clauses/commas
      const clauseRegex = /[^,;:—\n]+(?:[,;:—]+|\n|$)/g;
      const clauses = sent.match(clauseRegex) || [sent];

      for (const rawClause of clauses) {
        const clause = rawClause.trim();
        if (!clause) continue;

        if (!currentSegment) {
          if (clause.length <= maxChars) {
            currentSegment = clause;
            continue;
          }
        } else {
          const combined = currentSegment + ' ' + clause;
          if (combined.length <= maxChars) {
            currentSegment = combined;
            continue;
          } else {
            segments.push(currentSegment.trim());
            currentSegment = '';
            if (clause.length <= maxChars) {
              currentSegment = clause;
              continue;
            }
          }
        }

        // Hard split clause by words if still longer than maxChars
        const words = clause.split(/\s+/);
        for (const word of words) {
          if (!currentSegment) {
            currentSegment = word;
          } else if ((currentSegment + ' ' + word).length <= maxChars) {
            currentSegment += ' ' + word;
          } else {
            segments.push(currentSegment.trim());
            currentSegment = word;
          }
        }
      }
    }
  }

  if (currentSegment.trim()) {
    segments.push(currentSegment.trim());
  }

  return segments;
}
