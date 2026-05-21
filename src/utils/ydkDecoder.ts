export interface ParsedDeck {
  main: number[];
  extra: number[];
  side: number[];
}

export function decodeYDK(encodedString: string): ParsedDeck {
  if (!encodedString) return { main: [], extra: [], side: [] };
  
  try {
    // Correct URL-safe Base64 replacements
    let d = encodedString.replace(/-/g, "+").replace(/_/g, "/");
    // Add correct padding
    d = d.padEnd(d.length + ((4 - (d.length % 4)) % 4), "=");
    
    // Decode Base64 to binary string
    const decodeStr = window.atob(d);
    
    // Convert string of bytes to big binary string
    let bitStr = "";
    for (let i = 0; i < decodeStr.length; i++) {
      bitStr += decodeStr.charCodeAt(i).toString(2).padStart(8, '0');
    }
    
    if (bitStr.length < 16) throw new Error("Invalid base64 string length");

    // Header values
    const mainCount = parseInt(bitStr.substring(0, 8), 2);
    const extraCount = parseInt(bitStr.substring(8, 12), 2);
    const sideCount = parseInt(bitStr.substring(12, 16), 2);

    let offset = 16;
    
    const extractCards = (uniqueBlocks: number): number[] => {
      const arr: number[] = [];
      for (let i = 0; i < uniqueBlocks; i++) {
        const chunk = bitStr.substring(offset, offset + 29);
        if (chunk.length === 29) {
          // Top 2 bits are the card count (amount of copies)
          const count = parseInt(chunk.substring(0, 2), 2);
          // Bottom 27 bits are the card passcode ID
          const code = parseInt(chunk.substring(2), 2);
          
          for(let c = 0; c < count; c++) {
            arr.push(code);
          }
        }
        offset += 29;
      }
      return arr;
    };

    const main = extractCards(mainCount);
    const extra = extractCards(extraCount);
    const side = extractCards(sideCount);

    return { main, extra, side };
  } catch (e) {
    console.error("YDK Decode Error:", e);
    return { main: [], extra: [], side: [] };
  }
}
