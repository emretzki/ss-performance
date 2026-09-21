// Self-serve signup: creates a brand-new, fully independent gym (organization)
// in one call — auth user, organization row, owner profile, a first branch,
// and a default workout type — so the new owner lands in a working calendar
// immediately instead of waiting on email confirmation or manual setup.
//
// Called anonymously (no session yet) from the signup screen:
// supabase.functions.invoke('create-organization', { body: {...} })

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  email: string;
  password: string;
  fullName: string;
  orgName: string;
  logoBase64: string | null;
  logoContentType: string | null;
  accentColor: string;
  branchAddress: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = (await req.json()) as RequestBody;

    if (!body.email || !body.password || !body.orgName || !body.fullName) {
      return json({ error: "E-posta, şifre, ad soyad ve salon adı gerekli." }, 400);
    }
    if (body.password.length < 6) {
      return json({ error: "Şifre en az 6 karakter olmalı." }, 400);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      return json({ error: createError?.message ?? "Hesap oluşturulamadı." }, 400);
    }
    const userId = created.user.id;

    let logoUrl: string | null = null;
    if (body.logoBase64 && body.logoContentType) {
      const ext = body.logoContentType.split("/")[1] ?? "png";
      const path = `${userId}/logo.${ext}`;
      const bytes = Uint8Array.from(atob(body.logoBase64), (c) => c.charCodeAt(0));
      const { error: uploadError } = await admin.storage.from("org-logos").upload(path, bytes, {
        contentType: body.logoContentType,
        upsert: true,
      });
      if (!uploadError) {
        const { data: pub } = admin.storage.from("org-logos").getPublicUrl(path);
        logoUrl = pub.publicUrl;
      }
    }

    const baseSlug = slugify(body.orgName) || "salon";
    let org: { id: string; slug: string } | null = null;
    let orgError: { message: string; code?: string } | null = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
      const { data, error } = await admin
        .from("organizations")
        .insert({
          name: body.orgName,
          slug: candidate,
          logo_url: logoUrl,
          accent_color: body.accentColor,
          owner_auth_id: userId,
        })
        .select()
        .single();
      if (!error) {
        org = data;
        orgError = null;
        break;
      }
      orgError = error;
      if (error.code !== "23505") break; // not a "slug already taken" conflict, stop retrying
    }
    if (!org) {
      await admin.auth.admin.deleteUser(userId);
      return json({ error: orgError?.message ?? "Salon oluşturulamadı." }, 400);
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: userId,
      organization_id: org.id,
      role: "owner",
      full_name: body.fullName,
      phone: null,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      return json({ error: profileError.message }, 400);
    }

    const { data: branch, error: branchError } = await admin
      .from("branches")
      .insert({ organization_id: org.id, name: body.orgName, address: body.branchAddress })
      .select()
      .single();
    if (branchError) {
      await admin.auth.admin.deleteUser(userId);
      return json({ error: branchError.message }, 400);
    }

    const { error: workoutTypeError } = await admin
      .from("workout_types")
      .insert({ organization_id: org.id, name: "Bire bir PT", color: body.accentColor });
    if (workoutTypeError) {
      await admin.auth.admin.deleteUser(userId);
      return json({ error: workoutTypeError.message }, 400);
    }

    return json({ userId, organizationId: org.id, slug: org.slug, branchId: branch.id }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Beklenmeyen hata." }, 500);
  }
});

function slugify(input: string): string {
  const map: Record<string, string> = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" };
  return input
    .toLowerCase()
    .replace(/[çğıöşü]/g, (c) => map[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
