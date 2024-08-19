import { randomBytes } from 'crypto';

type PredefinedCharacterSet = 'alphanumeric' | 'hex' | 'base64';
type CharacterSet = PredefinedCharacterSet | 'custom';

interface RandomStringOptions {
  length: number;
  characterSet: CharacterSet;
  customSet?: string;
}

export class RandomStringGenerator {
  private static readonly DEFAULT_OPTIONS: RandomStringOptions = {
    length: 32,
    characterSet: 'alphanumeric'
  };

  private static readonly CHARACTER_SETS: Record<PredefinedCharacterSet, string> = {
    alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    hex: '0123456789abcdef',
    base64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  };

  static generate(options: Partial<RandomStringOptions> = {}): string {
    const { length, characterSet, customSet } = { ...this.DEFAULT_OPTIONS, ...options };
    const chars = this.getCharacterSet(characterSet, customSet);
    
    const bytes = randomBytes(length);
    return Array.from(bytes, byte => chars[byte % chars.length]).join('');
  }

  private static getCharacterSet(characterSet: CharacterSet, customSet?: string): string {
    if (characterSet === 'custom') {
      if (!customSet) {
        throw new Error('Custom character set must be provided when using "custom" option');
      }
      return customSet;
    }
    return this.CHARACTER_SETS[characterSet];
  }
}

// Usage examples
/*
console.log(RandomStringGenerator.generate());  // Default: 32 characters, alphanumeric
console.log(RandomStringGenerator.generate({ length: 16, characterSet: 'hex' }));
console.log(RandomStringGenerator.generate({ length: 64, characterSet: 'base64' }));
console.log(RandomStringGenerator.generate({ 
  length: 20, 
  characterSet: 'custom', 
  customSet: '!@#$%^&*()_+' 
}));
*/