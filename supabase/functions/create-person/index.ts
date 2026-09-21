// Creates a new auth user (PT or şube sahibi) plus their profile/trainer row,
// in one call, without ever exposing the service-role key to the browser.
//
// Called from the app as: supabase.functions.invoke('create-person', { body: {...} })
// The caller's own session JWT is forwarded automatically; we re-check their
// role and organization server-side before doing anything privileged.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  email: string;
  password: string;
  fullName: string;
  phone: string | null;
  role: "owner" | "trainer";
  branchId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";

    // Client scoped to the CALLER's identity, only used to verify who is asking.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();

    if (!caller) {
      return json({ error: "Oturum bulunamadı." }, 401);
    }

    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("role, organization_id")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || (callerProfile.role !== "super_admin" && callerProfile.role !== "owner")) {
      return json({ error: "Bu işlem için yetkin yok." }, 403);
    }

    const body = (await req.json()) as RequestBody;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: targetBranch } = await adminClient.from("branches").select("organization_id").eq("id", body.branchId).single();
    if (!targetBranch || targetBranch.organization_id !== callerProfile.organization_id) {
      return json({ error: "Bu şube senin organizasyonuna ait değil." }, 403);
    }
    if (callerProfile.role === "owner" && body.role !== "trainer") {
      return json({ error: "Şube sahibi sadece PT ekleyebilir." }, 403);
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      return json({ error: createError?.message ?? "Kullanıcı oluşturulamadı." }, 400);
    }

    const { error: profileError } = await adminClient.from("profiles").insert({
      id: created.user.id,
      organization_id: callerProfile.organization_id,
      branch_id: body.branchId,
      role: body.role,
      full_name: body.fullName,
      phone: body.phone,
    });
    if (profileError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return json({ error: profileError.message }, 400);
    }

    if (body.role === "trainer") {
      const badgeColors = ["#B0704A", "#6F7D4F", "#556478", "#7A5C74", "#6B6458"];
      const badgeColor = badgeColors[Math.floor(Math.random() * badgeColors.length)];
      const { error: trainerError } = await adminClient
        .from("trainers")
        .insert({ id: created.user.id, branch_id: body.branchId, badge_color: badgeColor });
      if (trainerError) {
        await adminClient.auth.admin.deleteUser(created.user.id);
        return json({ error: trainerError.message }, 400);
      }
    }

    return json({ id: created.user.id }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Beklenmeyen hata." }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
