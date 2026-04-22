"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";

type AuthResult = { success: boolean; error?: string };

export async function signInWithEmail({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  const supabase = createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function signUpWithEmail({
  email,
  password,
  name,
  consent,
}: {
  email: string;
  password: string;
  name: string;
  consent: boolean;
}): Promise<AuthResult> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        consent,
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const user = data.user;
  if (!user) {
    return { success: false, error: "Registrazione non riuscita. Riprova." };
  }

  try {
    const service = createServiceSupabase();
    await service.from("profiles").upsert({
      id: user.id,
      name,
      locale: "it",
      role: "user",
    });
  } catch (serviceError) {
    return {
      success: false,
      error:
        serviceError instanceof Error
          ? serviceError.message
          : "Impossibile creare il profilo. Contatta il supporto.",
    };
  }

  return { success: true };
}
