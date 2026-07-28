import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function authEmail(phone: string): string { return `${phone.trim()}@schoolportal-ges.local`; }
function authPassword(pin: string): string { return `ges:${pin}`; }

function getUserIdFromToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  if (!token || token === "undefined") return null;
  try { const payload = JSON.parse(atob(token.split(".")[1])); return payload.sub || null; } catch { return null; }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const SUPERADMIN_ID = "00000000-0000-0000-0000-000000000001";
const OFFICE_ROLES = ["emis_officer","district_director","director_admin","director_hr","circuit_supervisor","district_education_officer"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL") as string;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    if (!url || !key) return json({ error: "Server not configured." }, 500);
    const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const body = await req.json();
    const action = body.action;
    const callerId = getUserIdFromToken(req.headers.get("Authorization"));

    async function callerProfile(): Promise<{ role: string; school_id: string | null; deleted: boolean; is_active: boolean; district_id: string | null } | null> {
      if (!callerId) return null;
      const { data } = await admin.from("users").select("role, school_id, deleted, is_active, district_id").eq("id", callerId).maybeSingle();
      return data;
    }

    switch (action) {
      case "create_user": {
        const { phone, pin, role, full_name, school_id, is_parent, office_designation, district_id } = body as { phone: string; pin: string; role: string; full_name: string; school_id?: string; is_parent?: boolean; office_designation?: string; district_id?: string };
        if (!phone || !pin) return json({ error: "Phone and PIN are required." }, 400);
        if (pin.length < 4) return json({ error: "PIN must be at least 4 characters." }, 400);
        const isOfficeRole = OFFICE_ROLES.includes(role);
        if (!is_parent && !isOfficeRole) {
          const p = await callerProfile();
          if (!p || p.deleted || !p.is_active) return json({ error: "Not authorized." }, 403);
          if (role === "headteacher" && p.role !== "super_admin") return json({ error: "Only Super Admin can register schools." }, 403);
          if (role === "staff" && !["headteacher", "assistant_headteacher"].includes(p.role)) return json({ error: "Only Headteacher or Assistant Headteacher can register staff." }, 403);
          if (role === "staff" && p.school_id !== school_id) return json({ error: "You can only register staff for your own school." }, 403);
        }
        if (isOfficeRole) {
          const p = await callerProfile();
          if (!p || p.deleted || !p.is_active) return json({ error: "Not authorized." }, 403);
          if (p.role !== "super_admin") return json({ error: "Only Super Admin can register Office users." }, 403);
        }
        const { data: existing } = await admin.from("users").select("id").eq("phone", phone).eq("deleted", false).maybeSingle();
        if (existing) return json({ error: "A user with this phone number already exists." }, 400);
        const { data: authList } = await admin.auth.admin.listUsers();
        const orphanAuth = authList.users.find((u) => u.email === authEmail(phone));
        if (orphanAuth) {
          const { data: pubUser } = await admin.from("users").select("id").eq("id", orphanAuth.id).maybeSingle();
          if (!pubUser) { await admin.auth.admin.deleteUser(orphanAuth.id); }
          else { return json({ error: "A user with this phone number already exists." }, 400); }
        }
        const { data, error } = await admin.auth.admin.createUser({ email: authEmail(phone), password: authPassword(pin), email_confirm: true, user_metadata: { full_name, phone, role, must_change_pin: !is_parent }, app_metadata: { role, school_id: school_id || null, platform: "schoolportal-ges", office_designation: office_designation || null, district_id: district_id || null } });
        if (error) return json({ error: error.message }, 500);
        return json({ id: data.user.id });
      }
      case "update_password": {
        const { user_id, new_pin } = body as { user_id: string; new_pin: string };
        if (!user_id || !new_pin) return json({ error: "User ID and new PIN are required." }, 400);
        if (new_pin.length < 4) return json({ error: "PIN must be at least 4 characters." }, 400);
        const p = await callerProfile();
        if (!p) return json({ error: "Not authenticated." }, 401);
        if (callerId !== user_id) {
          if (!["super_admin", "headteacher", "assistant_headteacher"].includes(p.role)) return json({ error: "Not authorized." }, 403);
          if (p.role !== "super_admin") {
            const { data: target } = await admin.from("users").select("school_id").eq("id", user_id).maybeSingle();
            if (!target || target.school_id !== p.school_id) return json({ error: "Not authorized." }, 403);
          }
        }
        const { error } = await admin.auth.admin.updateUserById(user_id, { password: authPassword(new_pin) });
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }
      case "complete_profile": {
        const { user_id, phone, new_pin, full_name } = body as { user_id: string; phone: string; new_pin: string; full_name: string };
        if (!user_id || !phone || !new_pin) return json({ error: "Missing required fields." }, 400);
        if (callerId !== user_id) return json({ error: "Not authorized." }, 403);
        const { error } = await admin.auth.admin.updateUserById(user_id, { email: authEmail(phone), password: authPassword(new_pin), user_metadata: { full_name, phone, must_change_pin: false } });
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }
      case "delete_user": {
        const { user_id } = body as { user_id: string };
        if (!user_id) return json({ error: "User ID required." }, 400);
        const p = await callerProfile();
        if (!p) return json({ error: "Not authenticated." }, 401);
        if (callerId !== user_id && !["super_admin", "headteacher", "assistant_headteacher"].includes(p.role)) return json({ error: "Not authorized." }, 403);
        const { error } = await admin.auth.admin.deleteUser(user_id);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }
      case "setup_superadmin": {
        const { error: updErr } = await admin.auth.admin.updateUserById(SUPERADMIN_ID, { password: authPassword("0000"), email_confirm: true, app_metadata: { role: "super_admin", school_id: null, platform: "schoolportal-ges" } });
        if (!updErr) return json({ success: true, action: "updated" });
        const { data, error: crtErr } = await admin.auth.admin.createUser({ id: SUPERADMIN_ID, email: authEmail("0000000000"), password: authPassword("0000"), email_confirm: true, user_metadata: { full_name: "Super Admin", phone: "0000000000", role: "super_admin" }, app_metadata: { role: "super_admin", school_id: null, platform: "schoolportal-ges" } });
        if (crtErr) return json({ error: crtErr.message }, 500);
        return json({ success: true, action: "created", id: data.user.id });
      }
      default: return json({ error: "Unknown action." }, 400);
    }
  } catch (err) { return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500); }
});
