import bcrypt from "bcryptjs";

// Auditoría de seguridad (Fase 2.19, hallazgo #8): 10 -> 12. No afecta a
// contraseñas ya guardadas — bcrypt.compare() usa el coste que lleva
// embebido el propio hash almacenado, nunca esta constante — así que los
// hashes existentes (coste 10) se siguen verificando exactamente igual;
// solo las contraseñas que se fijen a partir de ahora usan el coste nuevo.
const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
