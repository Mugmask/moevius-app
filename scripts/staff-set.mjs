// Da de alta o actualiza una cuenta de staff: la crea en Supabase Auth si no existe,
// le pone la contraseña y el rol. El staff no se registra solo ni recupera la
// contraseña por mail: todo pasa por acá.
//
// Uso:
//   pnpm staff:set <email> <admin|door> <contraseña>   crea o actualiza
//   pnpm staff:set <email> remove                      le saca el acceso al staff
//
// Usa las credenciales de .env.local, o sea la DB a la que apunta ese archivo.

import { createClient } from "@supabase/supabase-js";

const [rawEmail, role, password] = process.argv.slice(2);
const email = rawEmail?.trim().toLowerCase();
const ROLES = ["admin", "door"];

if (!email || !(ROLES.includes(role) || role === "remove") || (role !== "remove" && !password)) {
  console.error(
    "Uso: pnpm staff:set <email> <admin|door> <contraseña>\n     pnpm staff:set <email> remove",
  );
  process.exit(1);
}
if (password && password.length < 8) {
  console.error("La contraseña tiene que tener al menos 8 caracteres.");
  process.exit(1);
}

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SECRET_KEY: secret } = process.env;
if (!url || !secret) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  process.exit(1);
}
const supabase = createClient(url, secret, { auth: { persistSession: false } });

async function findUser() {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email === email);
    if (user || data.users.length < 200) return user;
  }
}

let user = await findUser();

if (role === "remove") {
  if (!user) {
    console.log(`${email} no existe.`);
    process.exit(0);
  }
  const { error } = await supabase.from("staff").delete().eq("user_id", user.id);
  if (error) throw error;
  console.log(`${email}: ya no tiene acceso al staff.`);
  process.exit(0);
}

if (user) {
  const { error } = await supabase.auth.admin.updateUserById(user.id, { password });
  if (error) throw error;
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  user = data.user;
}

const { error } = await supabase.from("staff").upsert({ user_id: user.id, role });
if (error) throw error;
console.log(`${email}: rol ${role}, contraseña actualizada.`);
