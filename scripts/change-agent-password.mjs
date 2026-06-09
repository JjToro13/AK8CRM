import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({
  path: ".env.local",
  quiet: true,
});

const USER_ID = "7637ab6e-698f-4032-b35a-23e2f876da1d";
const EXPECTED_EMAIL = "luisa.agent@light.ak8crm.com";

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL;

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const newPassword =
  process.env.AGENT_NEW_PASSWORD ??
  process.env.NEW_PASSWORD;

if (!supabaseUrl) {
  console.error(
    "Falta VITE_SUPABASE_URL, SUPABASE_URL o NEXT_PUBLIC_SUPABASE_URL en .env.local",
  );
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error(
    "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local",
  );
  process.exit(1);
}

if (!newPassword) {
  console.error(
    "Falta NEW_PASSWORD o AGENT_NEW_PASSWORD en .env.local",
  );
  process.exit(1);
}

if (newPassword.length < 8) {
  console.error(
    "La contraseña nueva debe tener al menos 8 caracteres.",
  );
  process.exit(1);
}

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  },
);

async function changeAgentPassword() {
  console.log("Verificando el usuario...");

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.admin.getUserById(USER_ID);

  if (userError) {
    throw new Error(
      `No se pudo consultar el usuario: ${userError.message}`,
    );
  }

  const currentEmail =
    userData.user?.email?.trim().toLowerCase();

  if (!currentEmail) {
    throw new Error(
      "El usuario encontrado no tiene un correo asociado.",
    );
  }

  if (currentEmail !== EXPECTED_EMAIL.toLowerCase()) {
    throw new Error(
      `El UID corresponde a ${currentEmail}, no a ${EXPECTED_EMAIL}. La contraseña no fue modificada.`,
    );
  }

  console.log(`Usuario confirmado: ${currentEmail}`);
  console.log("Cambiando la contraseña...");

  const { data: updatedData, error: updateError } =
    await supabaseAdmin.auth.admin.updateUserById(
      USER_ID,
      {
        password: newPassword,
      },
    );

  if (updateError) {
    throw new Error(
      `No se pudo cambiar la contraseña: ${updateError.message}`,
    );
  }

  console.log("");
  console.log("Contraseña cambiada correctamente.");
  console.log(`Usuario: ${updatedData.user.email}`);
  console.log(`UID: ${updatedData.user.id}`);
}

changeAgentPassword().catch((error) => {
  console.error("");
  console.error(
    error instanceof Error
      ? error.message
      : "Ocurrió un error desconocido.",
  );

  process.exit(1);
});