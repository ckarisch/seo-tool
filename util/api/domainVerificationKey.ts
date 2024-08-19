import { RandomStringGenerator } from "./stringGenerator";

export class VerificationCodeGenerator {
  static generate(): string {
    return 'fuz-seo-tool-' + RandomStringGenerator.generate();
  }
}

// Usage examples
/*
console.log(VerificationCodeGenerator.generate());  // Default: start string + 32 characters, alphanumeric
*/