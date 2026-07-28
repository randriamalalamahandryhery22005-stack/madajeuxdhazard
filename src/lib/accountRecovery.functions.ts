import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const identitySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  birthDate: z.string().trim().min(4).max(20),
  gender: z.enum(["male", "female"]),
  accountNumber: z.string().trim().min(6).max(25),
  country: z.string().trim().min(1).max(80),
  region: z.string().trim().min(1).max(120),
});

const resetSchema = identitySchema.extend({
  newPassword: z.string().min(6).max(72),
});

const norm = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

const normPhone = (v: unknown) => String(v ?? "").replace(/[^\d]/g, "");

type Identity = z.infer<typeof identitySchema>;

async function matchProfile(data: Identity) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("profiles")
    .select("user_id, email, birth_date, gender, phone, country_code, region")
    .eq("email", data.email)
    .limit(1);

  const p = rows?.[0] as Record<string, unknown> | undefined;
  if (!p) return null;

  const ok =
    norm(p.birth_date) === norm(data.birthDate) &&
    norm(p.gender) === norm(data.gender) &&
    normPhone(p.phone) !== "" &&
    normPhone(p.phone) === normPhone(data.accountNumber) &&
    norm(p.country_code) === norm(data.country) &&
    norm(p.region) === norm(data.region);

  return ok ? (p.user_id as string) : null;
}

export const verifyRecoveryIdentity = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => identitySchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await matchProfile(data);
    // Slow down brute force attempts.
    await new Promise((r) => setTimeout(r, 600));
    return { ok: Boolean(userId) };
  });

export const resetPasswordWithIdentity = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => resetSchema.parse(input))
  .handler(async ({ data }) => {
    const { newPassword, ...identity } = data;
    const userId = await matchProfile(identity);
    await new Promise((r) => setTimeout(r, 600));
    if (!userId) return { ok: false as const, error: "identity_mismatch" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (error) return { ok: false as const, error: "update_failed" };
    return { ok: true as const };
  });
