import bcrypt from "bcryptjs";

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(plainText, hash);
}
