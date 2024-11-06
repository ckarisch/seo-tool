import { verificationSuffix } from "@/config/config";
import { RandomStringGenerator } from "./stringGenerator";

export class VerificationCodeGenerator {
  static generate(): string {
    return verificationSuffix + RandomStringGenerator.generate({ length: 16 }) +
      '-' +
      RandomStringGenerator.generate({ length: 16 });
  }
}

// Usage examples
/*
console.log(VerificationCodeGenerator.generate());  // Default: start string + 32 characters, alphanumeric
*/