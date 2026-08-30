


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."credential_verification_label"("p_credential_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'verification'
    AS $$
  select
    case
      when v.status_key = 'verified'
        and pc.status_key = 'active'
        and pc.public_visible = true
        and c.lifecycle_status = 'active'
        and c.publication_status = 'published'
        and v.checked_at is not null
      then
        'Credential verified by BCMC · ' ||
        to_char(v.checked_at at time zone 'UTC', 'Mon DD, YYYY')
      else null
    end
  from public.professional_credentials pc
  join public.counsellors c
    on c.id = pc.counsellor_id
  left join verification.v_current_credential_verification v
    on v.credential_id = pc.id
  where pc.id = p_credential_id;
$$;


ALTER FUNCTION "public"."credential_verification_label"("p_credential_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_public_credential_verification"() RETURNS TABLE("counsellor_id" "uuid", "credential_id" "uuid", "credential_type_key" "text", "credential_label" "text", "issuer_name" "text", "credential_status" "text", "verification_status" "text", "verified_checked_at" timestamp with time zone, "currently_verified" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'verification'
    AS $$
  select
    c.id as counsellor_id,
    pc.id as credential_id,
    pc.credential_type_key,
    ct.label as credential_label,
    pc.issuer_name,
    pc.status_key as credential_status,
    v.status_key as verification_status,
    v.checked_at as verified_checked_at,
    (
      v.status_key = 'verified'
      and pc.status_key = 'active'
    ) as currently_verified
  from public.professional_credentials pc
  join public.counsellors c
    on c.id = pc.counsellor_id
  join public.credential_types ct
    on ct.key = pc.credential_type_key
  left join verification.v_current_credential_verification v
    on v.credential_id = pc.id
  where
    pc.public_visible = true
    and c.lifecycle_status = 'active'
    and c.publication_status = 'published';
$$;


ALTER FUNCTION "public"."get_public_credential_verification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_counsellor_availability"("p_counsellor_id" "uuid", "p_status_key" "text", "p_status_note" "text" DEFAULT NULL::"text", "p_confirmed_at" timestamp with time zone DEFAULT "now"(), "p_confirmation_source_key" "text" DEFAULT 'counsellor'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private', 'auth'
    AS $$
begin
  if not (
    private.is_counsellor_user(p_counsellor_id)
    or private.is_bcmc_staff()
  ) then
    raise exception 'Not authorized to update availability for this counsellor';
  end if;

  if p_status_key not in (
    'accepting','limited','waitlist','not_accepting','unknown'
  ) then
    raise exception 'Invalid availability status';
  end if;

  if p_confirmation_source_key not in (
    'counsellor','practice','bcmc_staff','research_fixture','other'
  ) then
    raise exception 'Invalid confirmation source';
  end if;

  insert into public.counsellor_availability (
    counsellor_id,
    status_key,
    status_note,
    confirmed_at,
    confirmation_source_key
  )
  values (
    p_counsellor_id,
    p_status_key,
    p_status_note,
    p_confirmed_at,
    p_confirmation_source_key
  )
  on conflict (counsellor_id) do update
  set
    status_key = excluded.status_key,
    status_note = excluded.status_note,
    confirmed_at = excluded.confirmed_at,
    confirmation_source_key = excluded.confirmation_source_key,
    updated_at = now();

  insert into public.counsellor_availability_history (
    counsellor_id,
    status_key,
    status_note,
    confirmed_at,
    confirmation_source_key,
    recorded_by
  )
  values (
    p_counsellor_id,
    p_status_key,
    p_status_note,
    p_confirmed_at,
    p_confirmation_source_key,
    auth.uid()
  );
end;
$$;


ALTER FUNCTION "public"."set_counsellor_availability"("p_counsellor_id" "uuid", "p_status_key" "text", "p_status_note" "text", "p_confirmed_at" timestamp with time zone, "p_confirmation_source_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_appointment_window_service"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if new.service_offering_id is not null
     and not exists (
       select 1
       from public.service_offerings s
       where s.id = new.service_offering_id
         and s.counsellor_id = new.counsellor_id
     ) then
    raise exception
      'Appointment window service offering must belong to the same counsellor';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_appointment_window_service"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_contact_route_practice"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if new.practice_id is not null
     and not exists (
       select 1
       from public.counsellor_practice_affiliations a
       where a.counsellor_id = new.counsellor_id
         and a.practice_id = new.practice_id
         and a.ended_on is null
     ) then
    raise exception
      'Contact route practice must be an active affiliation for the same counsellor';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_contact_route_practice"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_service_location_practice"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if new.practice_id is not null
     and not exists (
       select 1
       from public.counsellor_practice_affiliations a
       where a.counsellor_id = new.counsellor_id
         and a.practice_id = new.practice_id
         and a.ended_on is null
     ) then
    raise exception
      'Service location practice must be an active affiliation of the counsellor';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_service_location_practice"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_service_offering_relations"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if new.location_id is not null
     and not exists (
       select 1
       from public.service_locations l
       where l.id = new.location_id
         and l.counsellor_id = new.counsellor_id
     ) then
    raise exception
      'Service offering location must belong to the same counsellor';
  end if;

  if new.practice_id is not null
     and not exists (
       select 1
       from public.counsellor_practice_affiliations a
       where a.counsellor_id = new.counsellor_id
         and a.practice_id = new.practice_id
         and a.ended_on is null
     ) then
    raise exception
      'Service offering practice must be an active affiliation of the counsellor';
  end if;

  if new.delivery_mode_key = 'in_person'
     and new.location_id is null then
    raise exception 'In-person service offering requires a service location';
  end if;

  if new.delivery_mode_key = 'virtual'
     and new.location_id is not null then
    raise exception 'Virtual-only service offering must not have an in-person location';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_service_offering_relations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_virtual_region_service"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if not exists (
    select 1
    from public.service_offerings s
    where s.id = new.service_offering_id
      and s.delivery_mode_key in ('virtual','hybrid')
  ) then
    raise exception
      'Virtual regions may only be attached to virtual or hybrid service offerings';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_virtual_region_service"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."accessibility_features" (
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "definition" "text",
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."accessibility_features" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."appointment_windows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "counsellor_id" "uuid" NOT NULL,
    "service_offering_id" "uuid",
    "day_of_week" smallint,
    "daypart_key" "text" NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "note" "text",
    "public_visible" boolean DEFAULT true NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "day_scope_key" "text" DEFAULT 'specific_day'::"text" NOT NULL,
    "weekly_occurrence_count" smallint,
    CONSTRAINT "appointment_windows_check" CHECK (((("start_time" IS NULL) AND ("end_time" IS NULL)) OR (("start_time" IS NOT NULL) AND ("end_time" IS NOT NULL) AND ("end_time" > "start_time")))),
    CONSTRAINT "appointment_windows_day_of_week_check" CHECK ((("day_of_week" >= 1) AND ("day_of_week" <= 7))),
    CONSTRAINT "appointment_windows_day_scope_consistency_check" CHECK (((("day_scope_key" = 'specific_day'::"text") AND ("day_of_week" IS NOT NULL) AND ("weekly_occurrence_count" IS NULL)) OR (("day_scope_key" = ANY (ARRAY['weekday'::"text", 'weekend'::"text"])) AND ("day_of_week" IS NULL) AND ("weekly_occurrence_count" IS NULL)) OR (("day_scope_key" = 'varies'::"text") AND ("day_of_week" IS NULL)))),
    CONSTRAINT "appointment_windows_day_scope_key_check" CHECK (("day_scope_key" = ANY (ARRAY['specific_day'::"text", 'weekday'::"text", 'weekend'::"text", 'varies'::"text"]))),
    CONSTRAINT "appointment_windows_daypart_key_check" CHECK (("daypart_key" = ANY (ARRAY['morning'::"text", 'daytime'::"text", 'afternoon'::"text", 'evening'::"text", 'weekend'::"text", 'varies'::"text"]))),
    CONSTRAINT "appointment_windows_weekly_occurrence_count_check" CHECK ((("weekly_occurrence_count" IS NULL) OR (("weekly_occurrence_count" >= 1) AND ("weekly_occurrence_count" <= 7))))
);


ALTER TABLE "public"."appointment_windows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_groups" (
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "definition" "text",
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."client_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_processes" (
    "counsellor_id" "uuid" NOT NULL,
    "consultation_offered" boolean DEFAULT false NOT NULL,
    "consultation_mode_key" "text",
    "response_time_note" "text",
    "process_note" "text",
    "public_visible" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contact_processes_check" CHECK ((("consultation_offered" = true) OR ("consultation_mode_key" IS NULL))),
    CONSTRAINT "contact_processes_consultation_mode_key_check" CHECK ((("consultation_mode_key" IS NULL) OR ("consultation_mode_key" = ANY (ARRAY['phone'::"text", 'video'::"text", 'phone_or_video'::"text", 'other'::"text"]))))
);


ALTER TABLE "public"."contact_processes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_routes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "counsellor_id" "uuid" NOT NULL,
    "practice_id" "uuid",
    "route_type_key" "text" NOT NULL,
    "route_value" "text" NOT NULL,
    "display_label" "text",
    "is_primary" boolean DEFAULT false NOT NULL,
    "handoff_key" "text" DEFAULT 'external'::"text" NOT NULL,
    "confirmed_at" timestamp with time zone,
    "public_visible" boolean DEFAULT true NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contact_routes_handoff_key_check" CHECK (("handoff_key" = ANY (ARRAY['external'::"text", 'direct'::"text", 'practice_managed'::"text", 'other'::"text"]))),
    CONSTRAINT "contact_routes_route_type_key_check" CHECK (("route_type_key" = ANY (ARRAY['secure_form'::"text", 'email'::"text", 'phone'::"text", 'text'::"text", 'website'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."contact_routes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."counsellor_availability" (
    "counsellor_id" "uuid" NOT NULL,
    "status_key" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "status_note" "text",
    "confirmed_at" timestamp with time zone,
    "confirmation_source_key" "text" DEFAULT 'counsellor'::"text" NOT NULL,
    "public_visible" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "counsellor_availability_confirmation_source_key_check" CHECK (("confirmation_source_key" = ANY (ARRAY['counsellor'::"text", 'practice'::"text", 'bcmc_staff'::"text", 'research_fixture'::"text", 'other'::"text"]))),
    CONSTRAINT "counsellor_availability_status_key_check" CHECK (("status_key" = ANY (ARRAY['accepting'::"text", 'limited'::"text", 'waitlist'::"text", 'not_accepting'::"text", 'unknown'::"text"])))
);


ALTER TABLE "public"."counsellor_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."counsellor_availability_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "counsellor_id" "uuid" NOT NULL,
    "status_key" "text" NOT NULL,
    "status_note" "text",
    "confirmed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "confirmation_source_key" "text" DEFAULT 'counsellor'::"text" NOT NULL,
    "recorded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "counsellor_availability_history_confirmation_source_key_check" CHECK (("confirmation_source_key" = ANY (ARRAY['counsellor'::"text", 'practice'::"text", 'bcmc_staff'::"text", 'research_fixture'::"text", 'other'::"text"]))),
    CONSTRAINT "counsellor_availability_history_status_key_check" CHECK (("status_key" = ANY (ARRAY['accepting'::"text", 'limited'::"text", 'waitlist'::"text", 'not_accepting'::"text", 'unknown'::"text"])))
);


ALTER TABLE "public"."counsellor_availability_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."counsellor_cultural_familiarity" (
    "counsellor_id" "uuid" NOT NULL,
    "familiarity_key" "text" NOT NULL,
    "note" "text",
    "public_visible" boolean DEFAULT true NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."counsellor_cultural_familiarity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."counsellor_language_capabilities" (
    "counsellor_id" "uuid" NOT NULL,
    "language_key" "text" NOT NULL,
    "capability_key" "text" NOT NULL,
    "proficiency_key" "text",
    "note" "text",
    "public_visible" boolean DEFAULT true NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "counsellor_language_capabilities_capability_key_check" CHECK (("capability_key" = ANY (ARRAY['therapy'::"text", 'conversational'::"text"]))),
    CONSTRAINT "counsellor_language_capabilities_proficiency_key_check" CHECK ((("proficiency_key" IS NULL) OR ("proficiency_key" = ANY (ARRAY['native_or_bilingual'::"text", 'fluent'::"text", 'professional_working'::"text", 'conversational'::"text", 'basic'::"text"]))))
);


ALTER TABLE "public"."counsellor_language_capabilities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."counsellor_practice_affiliations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "counsellor_id" "uuid" NOT NULL,
    "practice_id" "uuid" NOT NULL,
    "affiliation_type_key" "text" DEFAULT 'associate'::"text" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "public_visible" boolean DEFAULT true NOT NULL,
    "started_on" "date",
    "ended_on" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "counsellor_practice_affiliations_affiliation_type_key_check" CHECK (("affiliation_type_key" = ANY (ARRAY['owner'::"text", 'independent'::"text", 'employee'::"text", 'associate'::"text", 'contractor'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."counsellor_practice_affiliations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."counsellor_practice_areas" (
    "counsellor_id" "uuid" NOT NULL,
    "practice_area_key" "text" NOT NULL,
    "emphasis_key" "text" NOT NULL,
    "counsellor_note" "text",
    "public_visible" boolean DEFAULT true NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "counsellor_practice_areas_emphasis_key_check" CHECK (("emphasis_key" = ANY (ARRAY['primary'::"text", 'additional'::"text"])))
);


ALTER TABLE "public"."counsellor_practice_areas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."counsellor_profile_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "counsellor_id" "uuid" NOT NULL,
    "storage_path" "text" NOT NULL,
    "alt_text" "text",
    "focal_x" numeric(5,4),
    "focal_y" numeric(5,4),
    "moderation_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "is_current" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "counsellor_profile_images_current_requires_approved" CHECK ((("is_current" = false) OR ("moderation_status" = 'approved'::"text"))),
    CONSTRAINT "counsellor_profile_images_focal_x_check" CHECK ((("focal_x" IS NULL) OR (("focal_x" >= (0)::numeric) AND ("focal_x" <= (1)::numeric)))),
    CONSTRAINT "counsellor_profile_images_focal_y_check" CHECK ((("focal_y" IS NULL) OR (("focal_y" >= (0)::numeric) AND ("focal_y" <= (1)::numeric)))),
    CONSTRAINT "counsellor_profile_images_moderation_status_check" CHECK (("moderation_status" = ANY (ARRAY['draft'::"text", 'needs_changes'::"text", 'approved'::"text", 'archived'::"text"]))),
    CONSTRAINT "counsellor_profile_images_storage_path_not_blank" CHECK (("btrim"("storage_path") <> ''::"text"))
);


ALTER TABLE "public"."counsellor_profile_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."counsellor_profile_voice" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "counsellor_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "about" "text",
    "people_often_come_to_me_when" "text",
    "something_to_know_before_we_meet" "text",
    "first_meeting_expectation" "text",
    "faith_culture_note" "text",
    "moderation_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "counsellor_approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "superseded_at" timestamp with time zone,
    CONSTRAINT "counsellor_profile_voice_moderation_status_check" CHECK (("moderation_status" = ANY (ARRAY['draft'::"text", 'approved'::"text", 'needs_changes'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."counsellor_profile_voice" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."counsellor_therapeutic_approaches" (
    "counsellor_id" "uuid" NOT NULL,
    "approach_key" "text" NOT NULL,
    "usage_note" "text",
    "public_visible" boolean DEFAULT true NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."counsellor_therapeutic_approaches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."counsellors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "preferred_name" "text",
    "pronouns" "text",
    "gender_key" "text",
    "lifecycle_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "publication_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "published_at" timestamp with time zone,
    CONSTRAINT "counsellors_lifecycle_status_check" CHECK (("lifecycle_status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'paused'::"text", 'archived'::"text"]))),
    CONSTRAINT "counsellors_publication_status_check" CHECK (("publication_status" = ANY (ARRAY['draft'::"text", 'review'::"text", 'published'::"text", 'paused'::"text"])))
);


ALTER TABLE "public"."counsellors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credential_types" (
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "issuer_name" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."credential_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cultural_familiarity_taxonomy" (
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "short_description" "text",
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cultural_familiarity_taxonomy" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."education_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "counsellor_id" "uuid" NOT NULL,
    "degree_title" "text" NOT NULL,
    "field_of_study" "text",
    "institution_name" "text" NOT NULL,
    "completion_year" integer,
    "country_code" "text",
    "public_visible" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "education_records_completion_year_check" CHECK ((("completion_year" IS NULL) OR (("completion_year" >= 1950) AND ("completion_year" <= 2100)))),
    CONSTRAINT "education_records_country_code_check" CHECK ((("country_code" IS NULL) OR ("char_length"("country_code") = 2)))
);


ALTER TABLE "public"."education_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."faith_practice_profiles" (
    "counsellor_id" "uuid" NOT NULL,
    "discussion_comfort_key" "text" DEFAULT 'depends'::"text" NOT NULL,
    "discussion_comfort_note" "text",
    "initiation_key" "text" DEFAULT 'depends'::"text" NOT NULL,
    "initiation_note" "text",
    "integration_key" "text" DEFAULT 'depends'::"text" NOT NULL,
    "integration_note" "text",
    "claims_islamic_counselling" boolean DEFAULT false NOT NULL,
    "islamic_counselling_definition" "text",
    "specialist_islamic_training" boolean DEFAULT false NOT NULL,
    "specialist_training_context" "text",
    "additional_context" "text",
    "public_visible" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "faith_practice_profiles_discussion_comfort_key_check" CHECK (("discussion_comfort_key" = ANY (ARRAY['yes'::"text", 'no'::"text", 'depends'::"text"]))),
    CONSTRAINT "faith_practice_profiles_initiation_key_check" CHECK (("initiation_key" = ANY (ARRAY['waits_for_client'::"text", 'may_ask_without_assuming_inclusion'::"text", 'depends'::"text", 'other'::"text"]))),
    CONSTRAINT "faith_practice_profiles_integration_key_check" CHECK (("integration_key" = ANY (ARRAY['yes'::"text", 'no'::"text", 'depends'::"text"])))
);


ALTER TABLE "public"."faith_practice_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."languages" (
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "iso_639_1" "text",
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."languages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."location_accessibility" (
    "location_id" "uuid" NOT NULL,
    "feature_key" "text" NOT NULL,
    "status_key" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "note" "text",
    "confirmed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "location_accessibility_status_key_check" CHECK (("status_key" = ANY (ARRAY['available'::"text", 'not_available'::"text", 'unknown'::"text", 'ask'::"text"])))
);


ALTER TABLE "public"."location_accessibility" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practice_area_taxonomy" (
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "short_description" "text",
    "parent_key" "text",
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."practice_area_taxonomy" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."practices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text",
    "practice_type_key" "text" DEFAULT 'private_practice'::"text" NOT NULL,
    "website_url" "text",
    "city" "text",
    "province" "text" DEFAULT 'BC'::"text",
    "active" boolean DEFAULT true NOT NULL,
    "public_visible" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "practices_practice_type_key_check" CHECK (("practice_type_key" = ANY (ARRAY['private_practice'::"text", 'group_practice'::"text", 'clinic'::"text", 'community_organization'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."practices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professional_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "counsellor_id" "uuid" NOT NULL,
    "credential_type_key" "text" NOT NULL,
    "issuer_name" "text" NOT NULL,
    "status_key" "text" DEFAULT 'unknown'::"text" NOT NULL,
    "is_primary" boolean DEFAULT true NOT NULL,
    "public_visible" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "professional_credentials_status_key_check" CHECK (("status_key" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'suspended'::"text", 'unknown'::"text"])))
);


ALTER TABLE "public"."professional_credentials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."professional_experience" (
    "counsellor_id" "uuid" NOT NULL,
    "post_masters_years" numeric(4,1),
    "experience_note" "text",
    "public_visible" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "as_of_date" "date",
    CONSTRAINT "professional_experience_post_masters_years_check" CHECK ((("post_masters_years" IS NULL) OR (("post_masters_years" >= (0)::numeric) AND ("post_masters_years" <= (80)::numeric))))
);


ALTER TABLE "public"."professional_experience" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profile_publications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "counsellor_id" "uuid" NOT NULL,
    "profile_version" integer NOT NULL,
    "status_key" "text" NOT NULL,
    "counsellor_approved_at" timestamp with time zone,
    "bcmc_approved_at" timestamp with time zone,
    "published_at" timestamp with time zone,
    "superseded_at" timestamp with time zone,
    "last_overall_reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "profile_publications_status_key_check" CHECK (("status_key" = ANY (ARRAY['draft'::"text", 'review'::"text", 'published'::"text", 'superseded'::"text", 'paused'::"text"])))
);


ALTER TABLE "public"."profile_publications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_fee_policies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_offering_id" "uuid" NOT NULL,
    "fee_cents" integer NOT NULL,
    "currency_code" "text" DEFAULT 'CAD'::"text" NOT NULL,
    "session_minutes" integer NOT NULL,
    "fee_note" "text",
    "sliding_scale_key" "text" DEFAULT 'not_offered'::"text" NOT NULL,
    "rcc_receipts_available" boolean,
    "direct_billing_key" "text" DEFAULT 'ask'::"text" NOT NULL,
    "consultation_fee_cents" integer,
    "consultation_minutes" integer,
    "public_visible" boolean DEFAULT true NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "service_fee_policies_consultation_fee_cents_check" CHECK ((("consultation_fee_cents" IS NULL) OR ("consultation_fee_cents" >= 0))),
    CONSTRAINT "service_fee_policies_consultation_minutes_check" CHECK ((("consultation_minutes" IS NULL) OR (("consultation_minutes" > 0) AND ("consultation_minutes" <= 120)))),
    CONSTRAINT "service_fee_policies_currency_code_check" CHECK (("char_length"("currency_code") = 3)),
    CONSTRAINT "service_fee_policies_direct_billing_key_check" CHECK (("direct_billing_key" = ANY (ARRAY['yes'::"text", 'no'::"text", 'ask'::"text"]))),
    CONSTRAINT "service_fee_policies_fee_cents_check" CHECK (("fee_cents" >= 0)),
    CONSTRAINT "service_fee_policies_session_minutes_check" CHECK ((("session_minutes" > 0) AND ("session_minutes" <= 240))),
    CONSTRAINT "service_fee_policies_sliding_scale_key_check" CHECK (("sliding_scale_key" = ANY (ARRAY['available'::"text", 'limited'::"text", 'currently_full'::"text", 'not_offered'::"text", 'ask'::"text"])))
);


ALTER TABLE "public"."service_fee_policies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "counsellor_id" "uuid" NOT NULL,
    "practice_id" "uuid",
    "label" "text",
    "city" "text" NOT NULL,
    "province" "text" DEFAULT 'BC'::"text" NOT NULL,
    "country_code" "text" DEFAULT 'CA'::"text" NOT NULL,
    "neighbourhood_or_area" "text",
    "public_address_level" "text" DEFAULT 'area'::"text" NOT NULL,
    "public_visible" boolean DEFAULT true NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "service_locations_public_address_level_check" CHECK (("public_address_level" = ANY (ARRAY['hidden'::"text", 'city'::"text", 'area'::"text", 'full'::"text"])))
);


ALTER TABLE "public"."service_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_offering_client_groups" (
    "service_offering_id" "uuid" NOT NULL,
    "client_group_key" "text" NOT NULL
);


ALTER TABLE "public"."service_offering_client_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_offering_virtual_regions" (
    "service_offering_id" "uuid" NOT NULL,
    "region_key" "text" NOT NULL
);


ALTER TABLE "public"."service_offering_virtual_regions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_offerings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "counsellor_id" "uuid" NOT NULL,
    "practice_id" "uuid",
    "location_id" "uuid",
    "service_type_key" "text" NOT NULL,
    "delivery_mode_key" "text" NOT NULL,
    "scope_note" "text",
    "active" boolean DEFAULT true NOT NULL,
    "public_visible" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "service_offerings_delivery_mode_key_check" CHECK (("delivery_mode_key" = ANY (ARRAY['in_person'::"text", 'virtual'::"text", 'hybrid'::"text"])))
);


ALTER TABLE "public"."service_offerings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_regions" (
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "region_type_key" "text" DEFAULT 'province'::"text" NOT NULL,
    "country_code" "text" DEFAULT 'CA'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "service_regions_region_type_key_check" CHECK (("region_type_key" = ANY (ARRAY['province'::"text", 'territory'::"text", 'country'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."service_regions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_types" (
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "definition" "text",
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."service_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."therapeutic_approach_taxonomy" (
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "short_description" "text",
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."therapeutic_approach_taxonomy" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."training_certifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "counsellor_id" "uuid" NOT NULL,
    "record_type_key" "text" NOT NULL,
    "title" "text" NOT NULL,
    "provider_name" "text",
    "completion_year" integer,
    "expiry_date" "date",
    "evidence_status_key" "text" DEFAULT 'not_reviewed'::"text" NOT NULL,
    "evidence_note" "text",
    "public_visible" boolean DEFAULT true NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "training_certifications_completion_year_check" CHECK ((("completion_year" IS NULL) OR (("completion_year" >= 1950) AND ("completion_year" <= 2100)))),
    CONSTRAINT "training_certifications_evidence_status_key_check" CHECK (("evidence_status_key" = ANY (ARRAY['not_reviewed'::"text", 'submitted'::"text", 'reviewed'::"text", 'verified'::"text", 'not_verifiable'::"text"]))),
    CONSTRAINT "training_certifications_record_type_key_check" CHECK (("record_type_key" = ANY (ARRAY['certification'::"text", 'certificate_program'::"text", 'formal_training'::"text", 'continuing_education'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."training_certifications" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_public_credential_verification" WITH ("security_invoker"='true') AS
 SELECT "counsellor_id",
    "credential_id",
    "credential_type_key",
    "credential_label",
    "issuer_name",
    "credential_status",
    "verification_status",
    "verified_checked_at",
    "currently_verified"
   FROM "public"."get_public_credential_verification"() "get_public_credential_verification"("counsellor_id", "credential_id", "credential_type_key", "credential_label", "issuer_name", "credential_status", "verification_status", "verified_checked_at", "currently_verified");


ALTER VIEW "public"."v_public_credential_verification" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_counsellor_cards" WITH ("security_invoker"='true') AS
 SELECT "c"."id" AS "counsellor_id",
    "c"."slug",
    "c"."display_name",
    "c"."preferred_name",
    "c"."pronouns",
    "c"."gender_key",
    "cred"."credential_label" AS "primary_credential_label",
    "cred"."issuer_name" AS "primary_credential_issuer",
    "cred"."verification_status" AS "primary_credential_verification_status",
    "cred"."verified_checked_at" AS "primary_credential_checked_at",
    "cred"."currently_verified" AS "primary_credential_currently_verified",
    "av"."status_key" AS "availability_status_key",
    "av"."status_note" AS "availability_status_note",
    "av"."confirmed_at" AS "availability_confirmed_at",
    COALESCE("loc"."locations", '[]'::"jsonb") AS "locations",
    COALESCE("svc"."delivery_modes", '[]'::"jsonb") AS "delivery_modes",
    COALESCE("svc"."service_types", '[]'::"jsonb") AS "service_types",
    COALESCE("svc"."client_groups", '[]'::"jsonb") AS "client_groups",
    COALESCE("lang"."therapy_languages", '[]'::"jsonb") AS "therapy_languages",
    COALESCE("pa"."primary_practice_areas", '[]'::"jsonb") AS "primary_practice_areas",
    "fee"."minimum_fee_cents",
    "fee"."currency_code" AS "fee_currency_code",
    "fee"."session_minutes" AS "fee_session_minutes",
    "fee"."sliding_scale_key",
    "fee"."rcc_receipts_available",
    "fee"."direct_billing_key",
    "cr"."primary_contact_route_type",
    "cr"."primary_contact_route_value",
    "cr"."primary_contact_display_label",
    "c"."updated_at" AS "counsellor_updated_at"
   FROM (((((((("public"."counsellors" "c"
     LEFT JOIN LATERAL ( SELECT "v"."credential_label",
            "v"."issuer_name",
            "v"."verification_status",
            "v"."verified_checked_at",
            "v"."currently_verified"
           FROM ("public"."v_public_credential_verification" "v"
             JOIN "public"."professional_credentials" "pc" ON (("pc"."id" = "v"."credential_id")))
          WHERE ("v"."counsellor_id" = "c"."id")
          ORDER BY "pc"."is_primary" DESC, "v"."verified_checked_at" DESC NULLS LAST, "v"."credential_id"
         LIMIT 1) "cred" ON (true))
     LEFT JOIN "public"."counsellor_availability" "av" ON ((("av"."counsellor_id" = "c"."id") AND ("av"."public_visible" = true))))
     LEFT JOIN LATERAL ( SELECT "jsonb_agg"("q"."x" ORDER BY ("q"."x" ->> 'city'::"text"), ("q"."x" ->> 'label'::"text")) AS "locations"
           FROM ( SELECT DISTINCT "jsonb_build_object"('location_id', "sl"."id", 'label', "sl"."label", 'city', "sl"."city", 'province', "sl"."province", 'area', "sl"."neighbourhood_or_area", 'public_address_level', "sl"."public_address_level") AS "x"
                   FROM "public"."service_locations" "sl"
                  WHERE (("sl"."counsellor_id" = "c"."id") AND ("sl"."public_visible" = true) AND ("sl"."active" = true))) "q") "loc" ON (true))
     LEFT JOIN LATERAL ( SELECT ( SELECT "jsonb_agg"("to_jsonb"("dm".*) ORDER BY "dm"."delivery_mode_key") AS "jsonb_agg"
                   FROM ( SELECT DISTINCT "so"."delivery_mode_key"
                           FROM "public"."service_offerings" "so"
                          WHERE (("so"."counsellor_id" = "c"."id") AND ("so"."public_visible" = true) AND ("so"."active" = true))) "dm") AS "delivery_modes",
            ( SELECT "jsonb_agg"("to_jsonb"("st".*) ORDER BY "st"."label") AS "jsonb_agg"
                   FROM ( SELECT DISTINCT "so"."service_type_key" AS "key",
                            "t"."label"
                           FROM ("public"."service_offerings" "so"
                             JOIN "public"."service_types" "t" ON (("t"."key" = "so"."service_type_key")))
                          WHERE (("so"."counsellor_id" = "c"."id") AND ("so"."public_visible" = true) AND ("so"."active" = true) AND ("t"."active" = true))) "st") AS "service_types",
            ( SELECT "jsonb_agg"("to_jsonb"("cg".*) ORDER BY "cg"."label") AS "jsonb_agg"
                   FROM ( SELECT DISTINCT "g"."client_group_key" AS "key",
                            "t"."label"
                           FROM (("public"."service_offerings" "so"
                             JOIN "public"."service_offering_client_groups" "g" ON (("g"."service_offering_id" = "so"."id")))
                             JOIN "public"."client_groups" "t" ON (("t"."key" = "g"."client_group_key")))
                          WHERE (("so"."counsellor_id" = "c"."id") AND ("so"."public_visible" = true) AND ("so"."active" = true) AND ("t"."active" = true))) "cg") AS "client_groups") "svc" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_agg"("jsonb_build_object"('key', "l"."key", 'label', "l"."label", 'proficiency_key', "cl"."proficiency_key") ORDER BY "l"."sort_order", "l"."label") AS "therapy_languages"
           FROM ("public"."counsellor_language_capabilities" "cl"
             JOIN "public"."languages" "l" ON (("l"."key" = "cl"."language_key")))
          WHERE (("cl"."counsellor_id" = "c"."id") AND ("cl"."capability_key" = 'therapy'::"text") AND ("cl"."public_visible" = true) AND ("cl"."active" = true) AND ("l"."active" = true))) "lang" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_agg"("jsonb_build_object"('key', "t"."key", 'label', "t"."label", 'short_description', "t"."short_description") ORDER BY "t"."sort_order", "t"."label") AS "primary_practice_areas"
           FROM ("public"."counsellor_practice_areas" "ca"
             JOIN "public"."practice_area_taxonomy" "t" ON (("t"."key" = "ca"."practice_area_key")))
          WHERE (("ca"."counsellor_id" = "c"."id") AND ("ca"."emphasis_key" = 'primary'::"text") AND ("ca"."public_visible" = true) AND ("ca"."active" = true) AND ("t"."active" = true))) "pa" ON (true))
     LEFT JOIN LATERAL ( SELECT "sf"."fee_cents" AS "minimum_fee_cents",
            "sf"."currency_code",
            "sf"."session_minutes",
            "sf"."sliding_scale_key",
            "sf"."rcc_receipts_available",
            "sf"."direct_billing_key"
           FROM ("public"."service_fee_policies" "sf"
             JOIN "public"."service_offerings" "so" ON (("so"."id" = "sf"."service_offering_id")))
          WHERE (("so"."counsellor_id" = "c"."id") AND ("so"."public_visible" = true) AND ("so"."active" = true) AND ("sf"."public_visible" = true) AND ("sf"."active" = true))
          ORDER BY "sf"."fee_cents", "sf"."session_minutes", "sf"."id"
         LIMIT 1) "fee" ON (true))
     LEFT JOIN LATERAL ( SELECT "r"."route_type_key" AS "primary_contact_route_type",
            "r"."route_value" AS "primary_contact_route_value",
            "r"."display_label" AS "primary_contact_display_label"
           FROM "public"."contact_routes" "r"
          WHERE (("r"."counsellor_id" = "c"."id") AND ("r"."public_visible" = true) AND ("r"."active" = true))
          ORDER BY "r"."is_primary" DESC, "r"."id"
         LIMIT 1) "cr" ON (true))
  WHERE (("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"));


ALTER VIEW "public"."v_counsellor_cards" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_counsellor_cards_app" WITH ("security_invoker"='true') AS
 SELECT "r"."slug",
    "r"."display_name",
    "r"."preferred_name",
    "r"."pronouns",
    "r"."gender_key",
    "img"."profile_image",
    "jsonb_build_object"('label', "r"."primary_credential_label", 'issuer', "r"."primary_credential_issuer", 'verification_status', "r"."primary_credential_verification_status", 'checked_at', "r"."primary_credential_checked_at", 'currently_verified', "r"."primary_credential_currently_verified") AS "primary_credential",
    "jsonb_build_object"('status_key', "r"."availability_status_key", 'status_note', "r"."availability_status_note", 'confirmed_at', "r"."availability_confirmed_at") AS "availability",
    COALESCE(( SELECT "jsonb_agg"(("e"."value" - ARRAY['location_id'::"text"])) AS "jsonb_agg"
           FROM "jsonb_array_elements"("r"."locations") "e"("value")), '[]'::"jsonb") AS "locations",
    "r"."delivery_modes",
    "r"."service_types",
    "r"."client_groups",
    "r"."therapy_languages",
    "r"."primary_practice_areas",
        CASE
            WHEN ("r"."minimum_fee_cents" IS NULL) THEN NULL::"jsonb"
            ELSE "jsonb_build_object"('fee_cents', "r"."minimum_fee_cents", 'currency_code', "r"."fee_currency_code", 'session_minutes', "r"."fee_session_minutes", 'sliding_scale_key', "r"."sliding_scale_key", 'rcc_receipts_available', "r"."rcc_receipts_available", 'direct_billing_key', "r"."direct_billing_key")
        END AS "fee_summary",
        CASE
            WHEN ("r"."primary_contact_route_type" IS NULL) THEN NULL::"jsonb"
            ELSE "jsonb_build_object"('route_type_key', "r"."primary_contact_route_type", 'route_value', "r"."primary_contact_route_value", 'display_label', "r"."primary_contact_display_label")
        END AS "primary_contact"
   FROM ("public"."v_counsellor_cards" "r"
     LEFT JOIN LATERAL ( SELECT "jsonb_build_object"('storage_path', "i"."storage_path", 'alt_text', "i"."alt_text", 'focal_x', "i"."focal_x", 'focal_y', "i"."focal_y") AS "profile_image"
           FROM "public"."counsellor_profile_images" "i"
          WHERE (("i"."counsellor_id" = "r"."counsellor_id") AND ("i"."moderation_status" = 'approved'::"text") AND ("i"."is_current" = true))
         LIMIT 1) "img" ON (true));


ALTER VIEW "public"."v_counsellor_cards_app" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_current_counsellor_profile_voice" WITH ("security_invoker"='true') AS
 SELECT "v"."id",
    "v"."counsellor_id",
    "v"."version",
    "v"."about",
    "v"."people_often_come_to_me_when",
    "v"."something_to_know_before_we_meet",
    "v"."first_meeting_expectation",
    "v"."faith_culture_note",
    "v"."counsellor_approved_at",
    "v"."created_at"
   FROM ("public"."counsellor_profile_voice" "v"
     JOIN "public"."counsellors" "c" ON (("c"."id" = "v"."counsellor_id")))
  WHERE (("v"."moderation_status" = 'approved'::"text") AND ("v"."superseded_at" IS NULL) AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"));


ALTER VIEW "public"."v_current_counsellor_profile_voice" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."working_style_definitions" (
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "prompt_text" "text" NOT NULL,
    "help_text" "text",
    "research_status_key" "text" DEFAULT 'candidate'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "working_style_definitions_research_status_key_check" CHECK (("research_status_key" = ANY (ARRAY['candidate'::"text", 'approved'::"text", 'deprecated'::"text"])))
);


ALTER TABLE "public"."working_style_definitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."working_style_options" (
    "definition_key" "text" NOT NULL,
    "option_key" "text" NOT NULL,
    "public_label" "text" NOT NULL,
    "counsellor_prompt_label" "text",
    "sort_order" integer DEFAULT 100 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."working_style_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."working_style_responses" (
    "counsellor_id" "uuid" NOT NULL,
    "definition_key" "text" NOT NULL,
    "option_key" "text" NOT NULL,
    "note" "text",
    "public_visible" boolean DEFAULT true NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."working_style_responses" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_counsellor_profiles" WITH ("security_invoker"='true') AS
 SELECT "c"."id" AS "counsellor_id",
    "c"."slug",
    "c"."display_name",
    "c"."preferred_name",
    "c"."pronouns",
    "c"."gender_key",
    "voice"."profile_voice",
    COALESCE("credentials"."credentials", '[]'::"jsonb") AS "credentials",
    COALESCE("practices"."practice_affiliations", '[]'::"jsonb") AS "practice_affiliations",
    COALESCE("locations"."locations", '[]'::"jsonb") AS "locations",
    COALESCE("services"."service_offerings", '[]'::"jsonb") AS "service_offerings",
        CASE
            WHEN ("av"."counsellor_id" IS NULL) THEN NULL::"jsonb"
            ELSE "jsonb_build_object"('status_key', "av"."status_key", 'status_note', "av"."status_note", 'confirmed_at', "av"."confirmed_at", 'confirmation_source_key', "av"."confirmation_source_key")
        END AS "availability",
    COALESCE("windows"."appointment_windows", '[]'::"jsonb") AS "appointment_windows",
    COALESCE("fees"."fee_policies", '[]'::"jsonb") AS "fee_policies",
    COALESCE("languages"."language_capabilities", '[]'::"jsonb") AS "language_capabilities",
    COALESCE("practice_areas"."practice_areas", '[]'::"jsonb") AS "practice_areas",
    COALESCE("working_style"."working_style", '[]'::"jsonb") AS "working_style",
    "faith"."faith_practice_profile",
    COALESCE("culture"."cultural_familiarity", '[]'::"jsonb") AS "cultural_familiarity",
    COALESCE("education"."education_records", '[]'::"jsonb") AS "education_records",
    "experience"."professional_experience",
    COALESCE("training"."training_certifications", '[]'::"jsonb") AS "training_certifications",
    COALESCE("approaches"."therapeutic_approaches", '[]'::"jsonb") AS "therapeutic_approaches",
    "contact"."contact_process",
    COALESCE("routes"."contact_routes", '[]'::"jsonb") AS "contact_routes",
    "c"."updated_at" AS "counsellor_updated_at"
   FROM ((((((((((((((((((("public"."counsellors" "c"
     LEFT JOIN LATERAL ( SELECT "to_jsonb"("v".*) AS "profile_voice"
           FROM "public"."v_current_counsellor_profile_voice" "v"
          WHERE ("v"."counsellor_id" = "c"."id")
         LIMIT 1) "voice" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_agg"("jsonb_build_object"('credential_id', "v"."credential_id", 'credential_type_key', "v"."credential_type_key", 'credential_label', "v"."credential_label", 'issuer_name', "v"."issuer_name", 'credential_status', "v"."credential_status", 'verification_status', "v"."verification_status", 'verified_checked_at', "v"."verified_checked_at", 'currently_verified', "v"."currently_verified") ORDER BY "pc"."is_primary" DESC, "v"."credential_label", "v"."credential_id") AS "credentials"
           FROM ("public"."v_public_credential_verification" "v"
             JOIN "public"."professional_credentials" "pc" ON (("pc"."id" = "v"."credential_id")))
          WHERE ("v"."counsellor_id" = "c"."id")) "credentials" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_agg"("jsonb_build_object"('affiliation_id', "a"."id", 'practice_id', "p"."id", 'practice_name', "p"."name", 'practice_slug', "p"."slug", 'practice_type_key', "p"."practice_type_key", 'website_url', "p"."website_url", 'city', "p"."city", 'province', "p"."province", 'affiliation_type_key', "a"."affiliation_type_key", 'is_primary', "a"."is_primary") ORDER BY "a"."is_primary" DESC, "p"."name") AS "practice_affiliations"
           FROM ("public"."counsellor_practice_affiliations" "a"
             JOIN "public"."practices" "p" ON (("p"."id" = "a"."practice_id")))
          WHERE (("a"."counsellor_id" = "c"."id") AND ("a"."public_visible" = true) AND ("a"."ended_on" IS NULL) AND ("p"."public_visible" = true) AND ("p"."active" = true))) "practices" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_agg"("jsonb_build_object"('location_id', "sl"."id", 'practice_id', "sl"."practice_id", 'label', "sl"."label", 'city', "sl"."city", 'province', "sl"."province", 'country_code', "sl"."country_code", 'area', "sl"."neighbourhood_or_area", 'public_address_level', "sl"."public_address_level", 'accessibility', COALESCE(( SELECT "jsonb_agg"("jsonb_build_object"('feature_key', "af"."key", 'label', "af"."label", 'status_key', "la"."status_key", 'note', "la"."note", 'confirmed_at', "la"."confirmed_at") ORDER BY "af"."sort_order", "af"."label") AS "jsonb_agg"
                   FROM ("public"."location_accessibility" "la"
                     JOIN "public"."accessibility_features" "af" ON (("af"."key" = "la"."feature_key")))
                  WHERE (("la"."location_id" = "sl"."id") AND ("af"."active" = true))), '[]'::"jsonb")) ORDER BY "sl"."city", "sl"."label") AS "locations"
           FROM "public"."service_locations" "sl"
          WHERE (("sl"."counsellor_id" = "c"."id") AND ("sl"."public_visible" = true) AND ("sl"."active" = true))) "locations" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_agg"("jsonb_build_object"('service_offering_id', "so"."id", 'practice_id', "so"."practice_id", 'location_id', "so"."location_id", 'service_type_key', "so"."service_type_key", 'service_type_label', "st"."label", 'delivery_mode_key', "so"."delivery_mode_key", 'scope_note', "so"."scope_note", 'client_groups', COALESCE(( SELECT "jsonb_agg"("jsonb_build_object"('key', "cg"."key", 'label', "cg"."label") ORDER BY "cg"."sort_order", "cg"."label") AS "jsonb_agg"
                   FROM ("public"."service_offering_client_groups" "socg"
                     JOIN "public"."client_groups" "cg" ON (("cg"."key" = "socg"."client_group_key")))
                  WHERE (("socg"."service_offering_id" = "so"."id") AND ("cg"."active" = true))), '[]'::"jsonb"), 'virtual_regions', COALESCE(( SELECT "jsonb_agg"("jsonb_build_object"('key', "sr"."key", 'label', "sr"."label", 'region_type_key', "sr"."region_type_key", 'country_code', "sr"."country_code") ORDER BY "sr"."label") AS "jsonb_agg"
                   FROM ("public"."service_offering_virtual_regions" "sovr"
                     JOIN "public"."service_regions" "sr" ON (("sr"."key" = "sovr"."region_key")))
                  WHERE (("sovr"."service_offering_id" = "so"."id") AND ("sr"."active" = true))), '[]'::"jsonb")) ORDER BY "st"."sort_order", "so"."delivery_mode_key", "so"."id") AS "service_offerings"
           FROM ("public"."service_offerings" "so"
             JOIN "public"."service_types" "st" ON (("st"."key" = "so"."service_type_key")))
          WHERE (("so"."counsellor_id" = "c"."id") AND ("so"."public_visible" = true) AND ("so"."active" = true) AND ("st"."active" = true))) "services" ON (true))
     LEFT JOIN "public"."counsellor_availability" "av" ON ((("av"."counsellor_id" = "c"."id") AND ("av"."public_visible" = true))))
     LEFT JOIN LATERAL ( SELECT "jsonb_agg"("jsonb_build_object"('appointment_window_id', "aw"."id", 'service_offering_id', "aw"."service_offering_id", 'day_of_week', "aw"."day_of_week", 'day_scope_key', "aw"."day_scope_key", 'weekly_occurrence_count', "aw"."weekly_occurrence_count", 'daypart_key', "aw"."daypart_key", 'start_time', "aw"."start_time", 'end_time', "aw"."end_time", 'note', "aw"."note") ORDER BY "aw"."day_of_week", "aw"."start_time", "aw"."daypart_key") AS "appointment_windows"
           FROM "public"."appointment_windows" "aw"
          WHERE (("aw"."counsellor_id" = "c"."id") AND ("aw"."public_visible" = true) AND ("aw"."active" = true))) "windows" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_agg"("jsonb_build_object"('fee_policy_id', "sf"."id", 'service_offering_id', "sf"."service_offering_id", 'fee_cents', "sf"."fee_cents", 'currency_code', "sf"."currency_code", 'session_minutes', "sf"."session_minutes", 'fee_note', "sf"."fee_note", 'sliding_scale_key', "sf"."sliding_scale_key", 'rcc_receipts_available', "sf"."rcc_receipts_available", 'direct_billing_key', "sf"."direct_billing_key", 'consultation_fee_cents', "sf"."consultation_fee_cents", 'consultation_minutes', "sf"."consultation_minutes") ORDER BY "sf"."fee_cents", "sf"."session_minutes", "sf"."id") AS "fee_policies"
           FROM ("public"."service_fee_policies" "sf"
             JOIN "public"."service_offerings" "so" ON (("so"."id" = "sf"."service_offering_id")))
          WHERE (("so"."counsellor_id" = "c"."id") AND ("so"."public_visible" = true) AND ("so"."active" = true) AND ("sf"."public_visible" = true) AND ("sf"."active" = true))) "fees" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_agg"("jsonb_build_object"('language_key', "l"."key", 'language_label', "l"."label", 'capability_key', "cl"."capability_key", 'proficiency_key', "cl"."proficiency_key", 'note', "cl"."note") ORDER BY
                CASE "cl"."capability_key"
                    WHEN 'therapy'::"text" THEN 1
                    ELSE 2
                END, "l"."sort_order", "l"."label") AS "language_capabilities"
           FROM ("public"."counsellor_language_capabilities" "cl"
             JOIN "public"."languages" "l" ON (("l"."key" = "cl"."language_key")))
          WHERE (("cl"."counsellor_id" = "c"."id") AND ("cl"."public_visible" = true) AND ("cl"."active" = true) AND ("l"."active" = true))) "languages" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_agg"("jsonb_build_object"('practice_area_key', "t"."key", 'label', "t"."label", 'short_description', "t"."short_description", 'emphasis_key', "ca"."emphasis_key", 'counsellor_note', "ca"."counsellor_note") ORDER BY
                CASE "ca"."emphasis_key"
                    WHEN 'primary'::"text" THEN 1
                    ELSE 2
                END, "t"."sort_order", "t"."label") AS "practice_areas"
           FROM ("public"."counsellor_practice_areas" "ca"
             JOIN "public"."practice_area_taxonomy" "t" ON (("t"."key" = "ca"."practice_area_key")))
          WHERE (("ca"."counsellor_id" = "c"."id") AND ("ca"."public_visible" = true) AND ("ca"."active" = true) AND ("t"."active" = true))) "practice_areas" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_agg"("jsonb_build_object"('definition_key', "d"."key", 'definition_label', "d"."label", 'option_key', "o"."option_key", 'public_label', "o"."public_label", 'note', "r"."note", 'research_status_key', "d"."research_status_key") ORDER BY "d"."sort_order", "d"."label") AS "working_style"
           FROM (("public"."working_style_responses" "r"
             JOIN "public"."working_style_definitions" "d" ON (("d"."key" = "r"."definition_key")))
             JOIN "public"."working_style_options" "o" ON ((("o"."definition_key" = "r"."definition_key") AND ("o"."option_key" = "r"."option_key"))))
          WHERE (("r"."counsellor_id" = "c"."id") AND ("r"."public_visible" = true) AND ("r"."active" = true) AND ("d"."active" = true) AND ("d"."research_status_key" <> 'deprecated'::"text") AND ("o"."active" = true))) "working_style" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_build_object"('discussion_comfort_key', "f"."discussion_comfort_key", 'discussion_comfort_note', "f"."discussion_comfort_note", 'initiation_key', "f"."initiation_key", 'initiation_note', "f"."initiation_note", 'integration_key', "f"."integration_key", 'integration_note', "f"."integration_note", 'claims_islamic_counselling', "f"."claims_islamic_counselling", 'islamic_counselling_definition', "f"."islamic_counselling_definition", 'specialist_islamic_training', "f"."specialist_islamic_training", 'specialist_training_context', "f"."specialist_training_context", 'additional_context', "f"."additional_context") AS "faith_practice_profile"
           FROM "public"."faith_practice_profiles" "f"
          WHERE (("f"."counsellor_id" = "c"."id") AND ("f"."public_visible" = true))
         LIMIT 1) "faith" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_agg"("jsonb_build_object"('familiarity_key', "t"."key", 'label', "t"."label", 'short_description', "t"."short_description", 'note', "cf"."note") ORDER BY "t"."sort_order", "t"."label") AS "cultural_familiarity"
           FROM ("public"."counsellor_cultural_familiarity" "cf"
             JOIN "public"."cultural_familiarity_taxonomy" "t" ON (("t"."key" = "cf"."familiarity_key")))
          WHERE (("cf"."counsellor_id" = "c"."id") AND ("cf"."public_visible" = true) AND ("cf"."active" = true) AND ("t"."active" = true))) "culture" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_agg"("jsonb_build_object"('education_record_id', "e"."id", 'degree_title', "e"."degree_title", 'field_of_study', "e"."field_of_study", 'institution_name', "e"."institution_name", 'completion_year', "e"."completion_year", 'country_code', "e"."country_code") ORDER BY "e"."sort_order", "e"."completion_year" DESC NULLS LAST, "e"."id") AS "education_records"
           FROM "public"."education_records" "e"
          WHERE (("e"."counsellor_id" = "c"."id") AND ("e"."public_visible" = true))) "education" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_build_object"('post_masters_years', "pe"."post_masters_years", 'as_of_date', "pe"."as_of_date", 'experience_note', "pe"."experience_note") AS "professional_experience"
           FROM "public"."professional_experience" "pe"
          WHERE (("pe"."counsellor_id" = "c"."id") AND ("pe"."public_visible" = true))
         LIMIT 1) "experience" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_agg"("jsonb_build_object"('training_certification_id', "t"."id", 'record_type_key', "t"."record_type_key", 'title', "t"."title", 'provider_name', "t"."provider_name", 'completion_year', "t"."completion_year", 'expiry_date', "t"."expiry_date", 'evidence_status_key', "t"."evidence_status_key") ORDER BY "t"."sort_order", "t"."completion_year" DESC NULLS LAST, "t"."id") AS "training_certifications"
           FROM "public"."training_certifications" "t"
          WHERE (("t"."counsellor_id" = "c"."id") AND ("t"."public_visible" = true) AND ("t"."active" = true))) "training" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_agg"("jsonb_build_object"('approach_key', "ta"."key", 'label', "ta"."label", 'short_description', "ta"."short_description", 'usage_note', "ca"."usage_note") ORDER BY "ta"."sort_order", "ta"."label") AS "therapeutic_approaches"
           FROM ("public"."counsellor_therapeutic_approaches" "ca"
             JOIN "public"."therapeutic_approach_taxonomy" "ta" ON (("ta"."key" = "ca"."approach_key")))
          WHERE (("ca"."counsellor_id" = "c"."id") AND ("ca"."public_visible" = true) AND ("ca"."active" = true) AND ("ta"."active" = true))) "approaches" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_build_object"('consultation_offered', "cp"."consultation_offered", 'consultation_mode_key', "cp"."consultation_mode_key", 'response_time_note', "cp"."response_time_note", 'process_note', "cp"."process_note") AS "contact_process"
           FROM "public"."contact_processes" "cp"
          WHERE (("cp"."counsellor_id" = "c"."id") AND ("cp"."public_visible" = true))
         LIMIT 1) "contact" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_agg"("jsonb_build_object"('contact_route_id', "r"."id", 'practice_id', "r"."practice_id", 'route_type_key', "r"."route_type_key", 'route_value', "r"."route_value", 'display_label', "r"."display_label", 'is_primary', "r"."is_primary", 'handoff_key', "r"."handoff_key", 'confirmed_at', "r"."confirmed_at") ORDER BY "r"."is_primary" DESC, "r"."id") AS "contact_routes"
           FROM "public"."contact_routes" "r"
          WHERE (("r"."counsellor_id" = "c"."id") AND ("r"."public_visible" = true) AND ("r"."active" = true))) "routes" ON (true))
  WHERE (("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"));


ALTER VIEW "public"."v_counsellor_profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_counsellor_profiles_app" WITH ("security_invoker"='true') AS
 SELECT "r"."slug",
    "r"."display_name",
    "r"."preferred_name",
    "r"."pronouns",
    "r"."gender_key",
    "img"."profile_image",
        CASE
            WHEN ("r"."profile_voice" IS NULL) THEN NULL::"jsonb"
            ELSE ("r"."profile_voice" - ARRAY['id'::"text", 'version'::"text", 'created_at'::"text", 'counsellor_id'::"text", 'counsellor_approved_at'::"text"])
        END AS "profile_voice",
    COALESCE(( SELECT "jsonb_agg"(("e"."value" - ARRAY['credential_id'::"text"])) AS "jsonb_agg"
           FROM "jsonb_array_elements"("r"."credentials") "e"("value")), '[]'::"jsonb") AS "credentials",
    COALESCE(( SELECT "jsonb_agg"(("e"."value" - ARRAY['practice_id'::"text", 'practice_slug'::"text", 'affiliation_id'::"text"])) AS "jsonb_agg"
           FROM "jsonb_array_elements"("r"."practice_affiliations") "e"("value")), '[]'::"jsonb") AS "practice_affiliations",
    COALESCE(( SELECT "jsonb_agg"("jsonb_set"(("e"."value" - ARRAY['location_id'::"text", 'practice_id'::"text"]), '{accessibility}'::"text"[], COALESCE(("e"."value" -> 'accessibility'::"text"), '[]'::"jsonb"), true)) AS "jsonb_agg"
           FROM "jsonb_array_elements"("r"."locations") "e"("value")), '[]'::"jsonb") AS "locations",
    COALESCE(( SELECT "jsonb_agg"(("e"."value" - ARRAY['service_offering_id'::"text", 'practice_id'::"text", 'location_id'::"text"])) AS "jsonb_agg"
           FROM "jsonb_array_elements"("r"."service_offerings") "e"("value")), '[]'::"jsonb") AS "service_offerings",
        CASE
            WHEN ("r"."availability" IS NULL) THEN NULL::"jsonb"
            ELSE ("r"."availability" - ARRAY['confirmation_source_key'::"text"])
        END AS "availability",
    COALESCE(( SELECT "jsonb_agg"(("e"."value" - ARRAY['appointment_window_id'::"text", 'service_offering_id'::"text"])) AS "jsonb_agg"
           FROM "jsonb_array_elements"("r"."appointment_windows") "e"("value")), '[]'::"jsonb") AS "appointment_windows",
    COALESCE(( SELECT "jsonb_agg"("jsonb_build_object"('delivery_mode_key', ("matched"."so" ->> 'delivery_mode_key'::"text"), 'service_type_key', ("matched"."so" ->> 'service_type_key'::"text"), 'service_type_label', ("matched"."so" ->> 'service_type_label'::"text"), 'fee_cents', ("fp"."value" -> 'fee_cents'::"text"), 'currency_code', ("fp"."value" -> 'currency_code'::"text"), 'session_minutes', ("fp"."value" -> 'session_minutes'::"text"), 'fee_note', ("fp"."value" -> 'fee_note'::"text"), 'sliding_scale_key', ("fp"."value" -> 'sliding_scale_key'::"text"), 'direct_billing_key', ("fp"."value" -> 'direct_billing_key'::"text"), 'rcc_receipts_available', ("fp"."value" -> 'rcc_receipts_available'::"text"), 'consultation_fee_cents', ("fp"."value" -> 'consultation_fee_cents'::"text"), 'consultation_minutes', ("fp"."value" -> 'consultation_minutes'::"text")) ORDER BY ("matched"."so" ->> 'delivery_mode_key'::"text")) AS "jsonb_agg"
           FROM ("jsonb_array_elements"("r"."fee_policies") "fp"("value")
             LEFT JOIN LATERAL ( SELECT "so_elem"."value" AS "so"
                   FROM "jsonb_array_elements"("r"."service_offerings") "so_elem"("value")
                  WHERE (("so_elem"."value" ->> 'service_offering_id'::"text") = ("fp"."value" ->> 'service_offering_id'::"text"))
                 LIMIT 1) "matched" ON (true))), '[]'::"jsonb") AS "fee_policies",
    "r"."language_capabilities",
    "r"."practice_areas",
    COALESCE(( SELECT "jsonb_agg"(("e"."value" - ARRAY['research_status_key'::"text"])) AS "jsonb_agg"
           FROM "jsonb_array_elements"("r"."working_style") "e"("value")), '[]'::"jsonb") AS "working_style",
    "r"."faith_practice_profile",
    "r"."cultural_familiarity",
    COALESCE(( SELECT "jsonb_agg"(("e"."value" - ARRAY['education_record_id'::"text"])) AS "jsonb_agg"
           FROM "jsonb_array_elements"("r"."education_records") "e"("value")), '[]'::"jsonb") AS "education_records",
    "r"."professional_experience",
    COALESCE(( SELECT "jsonb_agg"(("e"."value" - ARRAY['training_certification_id'::"text"])) AS "jsonb_agg"
           FROM "jsonb_array_elements"("r"."training_certifications") "e"("value")), '[]'::"jsonb") AS "training_certifications",
    "r"."therapeutic_approaches",
    "r"."contact_process",
    COALESCE(( SELECT "jsonb_agg"(("e"."value" - ARRAY['contact_route_id'::"text", 'practice_id'::"text"])) AS "jsonb_agg"
           FROM "jsonb_array_elements"("r"."contact_routes") "e"("value")), '[]'::"jsonb") AS "contact_routes"
   FROM ("public"."v_counsellor_profiles" "r"
     LEFT JOIN LATERAL ( SELECT "jsonb_build_object"('storage_path', "i"."storage_path", 'alt_text', "i"."alt_text", 'focal_x', "i"."focal_x", 'focal_y', "i"."focal_y") AS "profile_image"
           FROM "public"."counsellor_profile_images" "i"
          WHERE (("i"."counsellor_id" = "r"."counsellor_id") AND ("i"."moderation_status" = 'approved'::"text") AND ("i"."is_current" = true))
         LIMIT 1) "img" ON (true));


ALTER VIEW "public"."v_counsellor_profiles_app" OWNER TO "postgres";


ALTER TABLE ONLY "public"."accessibility_features"
    ADD CONSTRAINT "accessibility_features_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."appointment_windows"
    ADD CONSTRAINT "appointment_windows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_groups"
    ADD CONSTRAINT "client_groups_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."contact_processes"
    ADD CONSTRAINT "contact_processes_pkey" PRIMARY KEY ("counsellor_id");



ALTER TABLE ONLY "public"."contact_routes"
    ADD CONSTRAINT "contact_routes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."counsellor_availability_history"
    ADD CONSTRAINT "counsellor_availability_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."counsellor_availability"
    ADD CONSTRAINT "counsellor_availability_pkey" PRIMARY KEY ("counsellor_id");



ALTER TABLE ONLY "public"."counsellor_cultural_familiarity"
    ADD CONSTRAINT "counsellor_cultural_familiarity_pkey" PRIMARY KEY ("counsellor_id", "familiarity_key");



ALTER TABLE ONLY "public"."counsellor_language_capabilities"
    ADD CONSTRAINT "counsellor_language_capabilities_pkey" PRIMARY KEY ("counsellor_id", "language_key", "capability_key");



ALTER TABLE ONLY "public"."counsellor_practice_affiliations"
    ADD CONSTRAINT "counsellor_practice_affiliations_counsellor_id_practice_id_key" UNIQUE ("counsellor_id", "practice_id");



ALTER TABLE ONLY "public"."counsellor_practice_affiliations"
    ADD CONSTRAINT "counsellor_practice_affiliations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."counsellor_practice_areas"
    ADD CONSTRAINT "counsellor_practice_areas_pkey" PRIMARY KEY ("counsellor_id", "practice_area_key");



ALTER TABLE ONLY "public"."counsellor_profile_images"
    ADD CONSTRAINT "counsellor_profile_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."counsellor_profile_voice"
    ADD CONSTRAINT "counsellor_profile_voice_counsellor_id_version_key" UNIQUE ("counsellor_id", "version");



ALTER TABLE ONLY "public"."counsellor_profile_voice"
    ADD CONSTRAINT "counsellor_profile_voice_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."counsellor_therapeutic_approaches"
    ADD CONSTRAINT "counsellor_therapeutic_approaches_pkey" PRIMARY KEY ("counsellor_id", "approach_key");



ALTER TABLE ONLY "public"."counsellors"
    ADD CONSTRAINT "counsellors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."counsellors"
    ADD CONSTRAINT "counsellors_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."credential_types"
    ADD CONSTRAINT "credential_types_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."cultural_familiarity_taxonomy"
    ADD CONSTRAINT "cultural_familiarity_taxonomy_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."education_records"
    ADD CONSTRAINT "education_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."faith_practice_profiles"
    ADD CONSTRAINT "faith_practice_profiles_pkey" PRIMARY KEY ("counsellor_id");



ALTER TABLE ONLY "public"."languages"
    ADD CONSTRAINT "languages_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."location_accessibility"
    ADD CONSTRAINT "location_accessibility_pkey" PRIMARY KEY ("location_id", "feature_key");



ALTER TABLE ONLY "public"."practice_area_taxonomy"
    ADD CONSTRAINT "practice_area_taxonomy_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."practices"
    ADD CONSTRAINT "practices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."practices"
    ADD CONSTRAINT "practices_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."professional_credentials"
    ADD CONSTRAINT "professional_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."professional_experience"
    ADD CONSTRAINT "professional_experience_pkey" PRIMARY KEY ("counsellor_id");



ALTER TABLE ONLY "public"."profile_publications"
    ADD CONSTRAINT "profile_publications_counsellor_id_profile_version_key" UNIQUE ("counsellor_id", "profile_version");



ALTER TABLE ONLY "public"."profile_publications"
    ADD CONSTRAINT "profile_publications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_fee_policies"
    ADD CONSTRAINT "service_fee_policies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_fee_policies"
    ADD CONSTRAINT "service_fee_policies_service_offering_id_session_minutes_key" UNIQUE ("service_offering_id", "session_minutes");



ALTER TABLE ONLY "public"."service_locations"
    ADD CONSTRAINT "service_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_offering_client_groups"
    ADD CONSTRAINT "service_offering_client_groups_pkey" PRIMARY KEY ("service_offering_id", "client_group_key");



ALTER TABLE ONLY "public"."service_offering_virtual_regions"
    ADD CONSTRAINT "service_offering_virtual_regions_pkey" PRIMARY KEY ("service_offering_id", "region_key");



ALTER TABLE ONLY "public"."service_offerings"
    ADD CONSTRAINT "service_offerings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_regions"
    ADD CONSTRAINT "service_regions_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."service_types"
    ADD CONSTRAINT "service_types_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."therapeutic_approach_taxonomy"
    ADD CONSTRAINT "therapeutic_approach_taxonomy_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."training_certifications"
    ADD CONSTRAINT "training_certifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."working_style_definitions"
    ADD CONSTRAINT "working_style_definitions_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."working_style_options"
    ADD CONSTRAINT "working_style_options_pkey" PRIMARY KEY ("definition_key", "option_key");



ALTER TABLE ONLY "public"."working_style_responses"
    ADD CONSTRAINT "working_style_responses_pkey" PRIMARY KEY ("counsellor_id", "definition_key");



CREATE UNIQUE INDEX "counsellor_profile_images_one_current" ON "public"."counsellor_profile_images" USING "btree" ("counsellor_id") WHERE ("is_current" = true);



CREATE INDEX "idx_affiliations_counsellor" ON "public"."counsellor_practice_affiliations" USING "btree" ("counsellor_id");



CREATE INDEX "idx_affiliations_practice" ON "public"."counsellor_practice_affiliations" USING "btree" ("practice_id");



CREATE INDEX "idx_appointment_windows_counsellor" ON "public"."appointment_windows" USING "btree" ("counsellor_id");



CREATE INDEX "idx_appointment_windows_daypart" ON "public"."appointment_windows" USING "btree" ("day_of_week", "daypart_key");



CREATE INDEX "idx_appointment_windows_service" ON "public"."appointment_windows" USING "btree" ("service_offering_id");



CREATE INDEX "idx_availability_history_counsellor_confirmed" ON "public"."counsellor_availability_history" USING "btree" ("counsellor_id", "confirmed_at" DESC);



CREATE INDEX "idx_contact_routes_counsellor" ON "public"."contact_routes" USING "btree" ("counsellor_id", "active", "is_primary" DESC);



CREATE INDEX "idx_counsellor_approaches_approach" ON "public"."counsellor_therapeutic_approaches" USING "btree" ("approach_key");



CREATE INDEX "idx_counsellor_availability_confirmed_at" ON "public"."counsellor_availability" USING "btree" ("confirmed_at" DESC);



CREATE INDEX "idx_counsellor_availability_status" ON "public"."counsellor_availability" USING "btree" ("status_key");



CREATE INDEX "idx_counsellor_practice_areas_area" ON "public"."counsellor_practice_areas" USING "btree" ("practice_area_key", "emphasis_key");



CREATE INDEX "idx_counsellor_practice_areas_counsellor" ON "public"."counsellor_practice_areas" USING "btree" ("counsellor_id", "emphasis_key");



CREATE INDEX "idx_counsellors_lifecycle_publication" ON "public"."counsellors" USING "btree" ("lifecycle_status", "publication_status");



CREATE INDEX "idx_counsellors_publication_status" ON "public"."counsellors" USING "btree" ("publication_status");



CREATE INDEX "idx_cultural_familiarity_key" ON "public"."counsellor_cultural_familiarity" USING "btree" ("familiarity_key");



CREATE INDEX "idx_education_records_counsellor" ON "public"."education_records" USING "btree" ("counsellor_id", "sort_order");



CREATE INDEX "idx_language_capabilities_counsellor" ON "public"."counsellor_language_capabilities" USING "btree" ("counsellor_id");



CREATE INDEX "idx_language_capabilities_language" ON "public"."counsellor_language_capabilities" USING "btree" ("language_key", "capability_key");



CREATE INDEX "idx_location_accessibility_feature" ON "public"."location_accessibility" USING "btree" ("feature_key", "status_key");



CREATE INDEX "idx_practice_area_active_sort" ON "public"."practice_area_taxonomy" USING "btree" ("active", "sort_order");



CREATE INDEX "idx_practice_area_parent" ON "public"."practice_area_taxonomy" USING "btree" ("parent_key");



CREATE INDEX "idx_practices_active_visible" ON "public"."practices" USING "btree" ("active", "public_visible");



CREATE INDEX "idx_practices_name" ON "public"."practices" USING "btree" ("name");



CREATE INDEX "idx_professional_credentials_counsellor" ON "public"."professional_credentials" USING "btree" ("counsellor_id");



CREATE INDEX "idx_professional_credentials_type" ON "public"."professional_credentials" USING "btree" ("credential_type_key");



CREATE INDEX "idx_profile_publications_counsellor_status" ON "public"."profile_publications" USING "btree" ("counsellor_id", "status_key");



CREATE INDEX "idx_profile_voice_counsellor_status" ON "public"."counsellor_profile_voice" USING "btree" ("counsellor_id", "moderation_status");



CREATE INDEX "idx_profile_voice_current" ON "public"."counsellor_profile_voice" USING "btree" ("counsellor_id", "superseded_at");



CREATE INDEX "idx_service_fee_policies_fee" ON "public"."service_fee_policies" USING "btree" ("fee_cents");



CREATE INDEX "idx_service_fee_policies_offering" ON "public"."service_fee_policies" USING "btree" ("service_offering_id");



CREATE INDEX "idx_service_fee_policies_sliding_scale" ON "public"."service_fee_policies" USING "btree" ("sliding_scale_key");



CREATE INDEX "idx_service_locations_active_visible" ON "public"."service_locations" USING "btree" ("active", "public_visible");



CREATE INDEX "idx_service_locations_city" ON "public"."service_locations" USING "btree" ("city");



CREATE INDEX "idx_service_locations_counsellor" ON "public"."service_locations" USING "btree" ("counsellor_id");



CREATE INDEX "idx_service_offering_client_groups_group" ON "public"."service_offering_client_groups" USING "btree" ("client_group_key");



CREATE INDEX "idx_service_offering_virtual_regions_region" ON "public"."service_offering_virtual_regions" USING "btree" ("region_key");



CREATE INDEX "idx_service_offerings_counsellor" ON "public"."service_offerings" USING "btree" ("counsellor_id");



CREATE INDEX "idx_service_offerings_delivery" ON "public"."service_offerings" USING "btree" ("delivery_mode_key", "active", "public_visible");



CREATE INDEX "idx_service_offerings_service_type" ON "public"."service_offerings" USING "btree" ("service_type_key");



CREATE INDEX "idx_training_certifications_counsellor" ON "public"."training_certifications" USING "btree" ("counsellor_id", "sort_order");



CREATE INDEX "idx_training_certifications_evidence" ON "public"."training_certifications" USING "btree" ("evidence_status_key");



CREATE INDEX "idx_working_style_responses_definition" ON "public"."working_style_responses" USING "btree" ("definition_key", "option_key");



CREATE UNIQUE INDEX "uq_contact_routes_one_primary" ON "public"."contact_routes" USING "btree" ("counsellor_id") WHERE (("is_primary" = true) AND ("active" = true));



CREATE UNIQUE INDEX "uq_counsellor_one_primary_practice" ON "public"."counsellor_practice_affiliations" USING "btree" ("counsellor_id") WHERE (("is_primary" = true) AND ("ended_on" IS NULL));



CREATE UNIQUE INDEX "uq_professional_credentials_primary" ON "public"."professional_credentials" USING "btree" ("counsellor_id") WHERE ("is_primary" = true);



CREATE UNIQUE INDEX "uq_profile_publications_one_current_published" ON "public"."profile_publications" USING "btree" ("counsellor_id") WHERE (("status_key" = 'published'::"text") AND ("superseded_at" IS NULL));



CREATE OR REPLACE TRIGGER "appointment_window_validate_service" BEFORE INSERT OR UPDATE OF "counsellor_id", "service_offering_id" ON "public"."appointment_windows" FOR EACH ROW EXECUTE FUNCTION "public"."validate_appointment_window_service"();



CREATE OR REPLACE TRIGGER "appointment_windows_set_updated_at" BEFORE UPDATE ON "public"."appointment_windows" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "contact_processes_set_updated_at" BEFORE UPDATE ON "public"."contact_processes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "contact_route_validate_practice" BEFORE INSERT OR UPDATE OF "counsellor_id", "practice_id" ON "public"."contact_routes" FOR EACH ROW EXECUTE FUNCTION "public"."validate_contact_route_practice"();



CREATE OR REPLACE TRIGGER "contact_routes_set_updated_at" BEFORE UPDATE ON "public"."contact_routes" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "counsellor_availability_set_updated_at" BEFORE UPDATE ON "public"."counsellor_availability" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "counsellor_cultural_familiarity_set_updated_at" BEFORE UPDATE ON "public"."counsellor_cultural_familiarity" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "counsellor_language_capabilities_set_updated_at" BEFORE UPDATE ON "public"."counsellor_language_capabilities" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "counsellor_practice_affiliations_set_updated_at" BEFORE UPDATE ON "public"."counsellor_practice_affiliations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "counsellor_practice_areas_set_updated_at" BEFORE UPDATE ON "public"."counsellor_practice_areas" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "counsellor_profile_images_set_updated_at" BEFORE UPDATE ON "public"."counsellor_profile_images" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "counsellor_therapeutic_approaches_set_updated_at" BEFORE UPDATE ON "public"."counsellor_therapeutic_approaches" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "counsellors_set_updated_at" BEFORE UPDATE ON "public"."counsellors" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "education_records_set_updated_at" BEFORE UPDATE ON "public"."education_records" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "faith_practice_profiles_set_updated_at" BEFORE UPDATE ON "public"."faith_practice_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "location_accessibility_set_updated_at" BEFORE UPDATE ON "public"."location_accessibility" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "practices_set_updated_at" BEFORE UPDATE ON "public"."practices" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "professional_credentials_set_updated_at" BEFORE UPDATE ON "public"."professional_credentials" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "professional_experience_set_updated_at" BEFORE UPDATE ON "public"."professional_experience" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "service_fee_policies_set_updated_at" BEFORE UPDATE ON "public"."service_fee_policies" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "service_location_validate_practice" BEFORE INSERT OR UPDATE OF "counsellor_id", "practice_id" ON "public"."service_locations" FOR EACH ROW EXECUTE FUNCTION "public"."validate_service_location_practice"();



CREATE OR REPLACE TRIGGER "service_locations_set_updated_at" BEFORE UPDATE ON "public"."service_locations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "service_offering_validate_relations" BEFORE INSERT OR UPDATE OF "counsellor_id", "practice_id", "location_id", "delivery_mode_key" ON "public"."service_offerings" FOR EACH ROW EXECUTE FUNCTION "public"."validate_service_offering_relations"();



CREATE OR REPLACE TRIGGER "service_offerings_set_updated_at" BEFORE UPDATE ON "public"."service_offerings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "service_virtual_region_validate" BEFORE INSERT OR UPDATE ON "public"."service_offering_virtual_regions" FOR EACH ROW EXECUTE FUNCTION "public"."validate_virtual_region_service"();



CREATE OR REPLACE TRIGGER "training_certifications_set_updated_at" BEFORE UPDATE ON "public"."training_certifications" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "working_style_responses_set_updated_at" BEFORE UPDATE ON "public"."working_style_responses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."appointment_windows"
    ADD CONSTRAINT "appointment_windows_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."appointment_windows"
    ADD CONSTRAINT "appointment_windows_service_offering_id_fkey" FOREIGN KEY ("service_offering_id") REFERENCES "public"."service_offerings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_processes"
    ADD CONSTRAINT "contact_processes_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_routes"
    ADD CONSTRAINT "contact_routes_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact_routes"
    ADD CONSTRAINT "contact_routes_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."counsellor_availability"
    ADD CONSTRAINT "counsellor_availability_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."counsellor_availability_history"
    ADD CONSTRAINT "counsellor_availability_history_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."counsellor_availability_history"
    ADD CONSTRAINT "counsellor_availability_history_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."counsellor_cultural_familiarity"
    ADD CONSTRAINT "counsellor_cultural_familiarity_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."counsellor_cultural_familiarity"
    ADD CONSTRAINT "counsellor_cultural_familiarity_familiarity_key_fkey" FOREIGN KEY ("familiarity_key") REFERENCES "public"."cultural_familiarity_taxonomy"("key") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."counsellor_language_capabilities"
    ADD CONSTRAINT "counsellor_language_capabilities_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."counsellor_language_capabilities"
    ADD CONSTRAINT "counsellor_language_capabilities_language_key_fkey" FOREIGN KEY ("language_key") REFERENCES "public"."languages"("key") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."counsellor_practice_affiliations"
    ADD CONSTRAINT "counsellor_practice_affiliations_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."counsellor_practice_affiliations"
    ADD CONSTRAINT "counsellor_practice_affiliations_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."counsellor_practice_areas"
    ADD CONSTRAINT "counsellor_practice_areas_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."counsellor_practice_areas"
    ADD CONSTRAINT "counsellor_practice_areas_practice_area_key_fkey" FOREIGN KEY ("practice_area_key") REFERENCES "public"."practice_area_taxonomy"("key") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."counsellor_profile_images"
    ADD CONSTRAINT "counsellor_profile_images_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."counsellor_profile_voice"
    ADD CONSTRAINT "counsellor_profile_voice_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."counsellor_therapeutic_approaches"
    ADD CONSTRAINT "counsellor_therapeutic_approaches_approach_key_fkey" FOREIGN KEY ("approach_key") REFERENCES "public"."therapeutic_approach_taxonomy"("key") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."counsellor_therapeutic_approaches"
    ADD CONSTRAINT "counsellor_therapeutic_approaches_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."education_records"
    ADD CONSTRAINT "education_records_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."faith_practice_profiles"
    ADD CONSTRAINT "faith_practice_profiles_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."location_accessibility"
    ADD CONSTRAINT "location_accessibility_feature_key_fkey" FOREIGN KEY ("feature_key") REFERENCES "public"."accessibility_features"("key") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."location_accessibility"
    ADD CONSTRAINT "location_accessibility_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."service_locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."practice_area_taxonomy"
    ADD CONSTRAINT "practice_area_taxonomy_parent_key_fkey" FOREIGN KEY ("parent_key") REFERENCES "public"."practice_area_taxonomy"("key") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."professional_credentials"
    ADD CONSTRAINT "professional_credentials_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."professional_credentials"
    ADD CONSTRAINT "professional_credentials_credential_type_key_fkey" FOREIGN KEY ("credential_type_key") REFERENCES "public"."credential_types"("key");



ALTER TABLE ONLY "public"."professional_experience"
    ADD CONSTRAINT "professional_experience_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_publications"
    ADD CONSTRAINT "profile_publications_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_fee_policies"
    ADD CONSTRAINT "service_fee_policies_service_offering_id_fkey" FOREIGN KEY ("service_offering_id") REFERENCES "public"."service_offerings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_locations"
    ADD CONSTRAINT "service_locations_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_locations"
    ADD CONSTRAINT "service_locations_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."service_offering_client_groups"
    ADD CONSTRAINT "service_offering_client_groups_client_group_key_fkey" FOREIGN KEY ("client_group_key") REFERENCES "public"."client_groups"("key") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."service_offering_client_groups"
    ADD CONSTRAINT "service_offering_client_groups_service_offering_id_fkey" FOREIGN KEY ("service_offering_id") REFERENCES "public"."service_offerings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_offering_virtual_regions"
    ADD CONSTRAINT "service_offering_virtual_regions_region_key_fkey" FOREIGN KEY ("region_key") REFERENCES "public"."service_regions"("key") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."service_offering_virtual_regions"
    ADD CONSTRAINT "service_offering_virtual_regions_service_offering_id_fkey" FOREIGN KEY ("service_offering_id") REFERENCES "public"."service_offerings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_offerings"
    ADD CONSTRAINT "service_offerings_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."service_offerings"
    ADD CONSTRAINT "service_offerings_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."service_locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."service_offerings"
    ADD CONSTRAINT "service_offerings_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "public"."practices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."service_offerings"
    ADD CONSTRAINT "service_offerings_service_type_key_fkey" FOREIGN KEY ("service_type_key") REFERENCES "public"."service_types"("key") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."training_certifications"
    ADD CONSTRAINT "training_certifications_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."working_style_options"
    ADD CONSTRAINT "working_style_options_definition_key_fkey" FOREIGN KEY ("definition_key") REFERENCES "public"."working_style_definitions"("key") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."working_style_responses"
    ADD CONSTRAINT "working_style_responses_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."working_style_responses"
    ADD CONSTRAINT "working_style_responses_definition_key_option_key_fkey" FOREIGN KEY ("definition_key", "option_key") REFERENCES "public"."working_style_options"("definition_key", "option_key") ON DELETE RESTRICT;



ALTER TABLE "public"."accessibility_features" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "accessibility_features_public_read" ON "public"."accessibility_features" FOR SELECT TO "authenticated", "anon" USING (("active" = true));



CREATE POLICY "accessibility_features_staff_read" ON "public"."accessibility_features" FOR SELECT TO "authenticated" USING ("private"."is_bcmc_staff"());



CREATE POLICY "affiliations_own_insert" ON "public"."counsellor_practice_affiliations" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "affiliations_own_read" ON "public"."counsellor_practice_affiliations" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "affiliations_own_update" ON "public"."counsellor_practice_affiliations" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "affiliations_public_read" ON "public"."counsellor_practice_affiliations" FOR SELECT TO "authenticated", "anon" USING ((("public_visible" = true) AND ("ended_on" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."counsellors" "c"
  WHERE (("c"."id" = "counsellor_practice_affiliations"."counsellor_id") AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"))))));



ALTER TABLE "public"."appointment_windows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "appointment_windows_own_delete" ON "public"."appointment_windows" FOR DELETE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "appointment_windows_own_insert" ON "public"."appointment_windows" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "appointment_windows_own_read" ON "public"."appointment_windows" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "appointment_windows_own_update" ON "public"."appointment_windows" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "appointment_windows_public_read" ON "public"."appointment_windows" FOR SELECT TO "authenticated", "anon" USING ((("public_visible" = true) AND ("active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."counsellors" "c"
  WHERE (("c"."id" = "appointment_windows"."counsellor_id") AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"))))));



CREATE POLICY "availability_history_own_read" ON "public"."counsellor_availability_history" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



ALTER TABLE "public"."client_groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_groups_public_read" ON "public"."client_groups" FOR SELECT TO "authenticated", "anon" USING (("active" = true));



CREATE POLICY "client_groups_staff_read" ON "public"."client_groups" FOR SELECT TO "authenticated" USING ("private"."is_bcmc_staff"());



ALTER TABLE "public"."contact_processes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contact_processes_own_insert" ON "public"."contact_processes" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "contact_processes_own_read" ON "public"."contact_processes" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "contact_processes_own_update" ON "public"."contact_processes" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "contact_processes_public_read" ON "public"."contact_processes" FOR SELECT TO "authenticated", "anon" USING ((("public_visible" = true) AND (EXISTS ( SELECT 1
   FROM "public"."counsellors" "c"
  WHERE (("c"."id" = "contact_processes"."counsellor_id") AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"))))));



ALTER TABLE "public"."contact_routes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contact_routes_own_delete" ON "public"."contact_routes" FOR DELETE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "contact_routes_own_insert" ON "public"."contact_routes" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "contact_routes_own_read" ON "public"."contact_routes" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "contact_routes_own_update" ON "public"."contact_routes" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "contact_routes_public_read" ON "public"."contact_routes" FOR SELECT TO "authenticated", "anon" USING ((("public_visible" = true) AND ("active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."counsellors" "c"
  WHERE (("c"."id" = "contact_routes"."counsellor_id") AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"))))));



CREATE POLICY "counsellor_approaches_own_delete" ON "public"."counsellor_therapeutic_approaches" FOR DELETE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_approaches_own_insert" ON "public"."counsellor_therapeutic_approaches" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_approaches_own_read" ON "public"."counsellor_therapeutic_approaches" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_approaches_own_update" ON "public"."counsellor_therapeutic_approaches" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_approaches_public_read" ON "public"."counsellor_therapeutic_approaches" FOR SELECT TO "authenticated", "anon" USING ((("public_visible" = true) AND ("active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."counsellors" "c"
  WHERE (("c"."id" = "counsellor_therapeutic_approaches"."counsellor_id") AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"))))));



ALTER TABLE "public"."counsellor_availability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."counsellor_availability_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "counsellor_availability_own_read" ON "public"."counsellor_availability" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_availability_public_read" ON "public"."counsellor_availability" FOR SELECT TO "authenticated", "anon" USING ((("public_visible" = true) AND (EXISTS ( SELECT 1
   FROM "public"."counsellors" "c"
  WHERE (("c"."id" = "counsellor_availability"."counsellor_id") AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"))))));



ALTER TABLE "public"."counsellor_cultural_familiarity" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "counsellor_cultural_familiarity_own_delete" ON "public"."counsellor_cultural_familiarity" FOR DELETE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_cultural_familiarity_own_insert" ON "public"."counsellor_cultural_familiarity" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_cultural_familiarity_own_read" ON "public"."counsellor_cultural_familiarity" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_cultural_familiarity_own_update" ON "public"."counsellor_cultural_familiarity" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_cultural_familiarity_public_read" ON "public"."counsellor_cultural_familiarity" FOR SELECT TO "authenticated", "anon" USING ((("public_visible" = true) AND ("active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."counsellors" "c"
  WHERE (("c"."id" = "counsellor_cultural_familiarity"."counsellor_id") AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"))))));



ALTER TABLE "public"."counsellor_language_capabilities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."counsellor_practice_affiliations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."counsellor_practice_areas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "counsellor_practice_areas_own_delete" ON "public"."counsellor_practice_areas" FOR DELETE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_practice_areas_own_insert" ON "public"."counsellor_practice_areas" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_practice_areas_own_read" ON "public"."counsellor_practice_areas" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_practice_areas_own_update" ON "public"."counsellor_practice_areas" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_practice_areas_public_read" ON "public"."counsellor_practice_areas" FOR SELECT TO "authenticated", "anon" USING ((("public_visible" = true) AND ("active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."counsellors" "c"
  WHERE (("c"."id" = "counsellor_practice_areas"."counsellor_id") AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"))))));



ALTER TABLE "public"."counsellor_profile_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "counsellor_profile_images_own_delete" ON "public"."counsellor_profile_images" FOR DELETE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") AND ("moderation_status" = ANY (ARRAY['draft'::"text", 'needs_changes'::"text"]))));



CREATE POLICY "counsellor_profile_images_own_insert" ON "public"."counsellor_profile_images" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") AND ("moderation_status" = 'draft'::"text") AND ("is_current" = false)));



CREATE POLICY "counsellor_profile_images_own_read" ON "public"."counsellor_profile_images" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_profile_images_own_update" ON "public"."counsellor_profile_images" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") AND ("moderation_status" = ANY (ARRAY['draft'::"text", 'needs_changes'::"text"])))) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") AND ("moderation_status" = ANY (ARRAY['draft'::"text", 'needs_changes'::"text"])) AND ("is_current" = false)));



CREATE POLICY "counsellor_profile_images_public_read" ON "public"."counsellor_profile_images" FOR SELECT TO "authenticated", "anon" USING ((("moderation_status" = 'approved'::"text") AND ("is_current" = true) AND (EXISTS ( SELECT 1
   FROM "public"."counsellors" "c"
  WHERE (("c"."id" = "counsellor_profile_images"."counsellor_id") AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"))))));



ALTER TABLE "public"."counsellor_profile_voice" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."counsellor_therapeutic_approaches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."counsellors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "counsellors_own_read" ON "public"."counsellors" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellors_own_update" ON "public"."counsellors" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellors_public_read" ON "public"."counsellors" FOR SELECT TO "authenticated", "anon" USING ((("publication_status" = 'published'::"text") AND ("lifecycle_status" = 'active'::"text")));



CREATE POLICY "counsellors_staff_insert" ON "public"."counsellors" FOR INSERT TO "authenticated" WITH CHECK ("private"."is_bcmc_staff"());



ALTER TABLE "public"."credential_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "credential_types_public_read" ON "public"."credential_types" FOR SELECT TO "authenticated", "anon" USING (("active" = true));



CREATE POLICY "credential_types_staff_read" ON "public"."credential_types" FOR SELECT TO "authenticated" USING ("private"."is_bcmc_staff"());



ALTER TABLE "public"."cultural_familiarity_taxonomy" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cultural_familiarity_taxonomy_public_read" ON "public"."cultural_familiarity_taxonomy" FOR SELECT TO "authenticated", "anon" USING (("active" = true));



CREATE POLICY "cultural_familiarity_taxonomy_staff_read" ON "public"."cultural_familiarity_taxonomy" FOR SELECT TO "authenticated" USING ("private"."is_bcmc_staff"());



ALTER TABLE "public"."education_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "education_records_own_delete" ON "public"."education_records" FOR DELETE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "education_records_own_insert" ON "public"."education_records" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "education_records_own_read" ON "public"."education_records" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "education_records_own_update" ON "public"."education_records" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "education_records_public_read" ON "public"."education_records" FOR SELECT TO "authenticated", "anon" USING ((("public_visible" = true) AND (EXISTS ( SELECT 1
   FROM "public"."counsellors" "c"
  WHERE (("c"."id" = "education_records"."counsellor_id") AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"))))));



ALTER TABLE "public"."faith_practice_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "faith_practice_profiles_own_insert" ON "public"."faith_practice_profiles" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "faith_practice_profiles_own_read" ON "public"."faith_practice_profiles" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "faith_practice_profiles_own_update" ON "public"."faith_practice_profiles" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "faith_practice_profiles_public_read" ON "public"."faith_practice_profiles" FOR SELECT TO "authenticated", "anon" USING ((("public_visible" = true) AND (EXISTS ( SELECT 1
   FROM "public"."counsellors" "c"
  WHERE (("c"."id" = "faith_practice_profiles"."counsellor_id") AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"))))));



CREATE POLICY "language_capabilities_own_delete" ON "public"."counsellor_language_capabilities" FOR DELETE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "language_capabilities_own_insert" ON "public"."counsellor_language_capabilities" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "language_capabilities_own_read" ON "public"."counsellor_language_capabilities" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "language_capabilities_own_update" ON "public"."counsellor_language_capabilities" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "language_capabilities_public_read" ON "public"."counsellor_language_capabilities" FOR SELECT TO "authenticated", "anon" USING ((("public_visible" = true) AND ("active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."counsellors" "c"
  WHERE (("c"."id" = "counsellor_language_capabilities"."counsellor_id") AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"))))));



ALTER TABLE "public"."languages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "languages_public_read" ON "public"."languages" FOR SELECT TO "authenticated", "anon" USING (("active" = true));



CREATE POLICY "languages_staff_read" ON "public"."languages" FOR SELECT TO "authenticated" USING ("private"."is_bcmc_staff"());



ALTER TABLE "public"."location_accessibility" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "location_accessibility_own_delete" ON "public"."location_accessibility" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."service_locations" "l"
  WHERE (("l"."id" = "location_accessibility"."location_id") AND ("private"."is_counsellor_user"("l"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "location_accessibility_own_insert" ON "public"."location_accessibility" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."service_locations" "l"
  WHERE (("l"."id" = "location_accessibility"."location_id") AND ("private"."is_counsellor_user"("l"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "location_accessibility_own_read" ON "public"."location_accessibility" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."service_locations" "l"
  WHERE (("l"."id" = "location_accessibility"."location_id") AND ("private"."is_counsellor_user"("l"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "location_accessibility_own_update" ON "public"."location_accessibility" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."service_locations" "l"
  WHERE (("l"."id" = "location_accessibility"."location_id") AND ("private"."is_counsellor_user"("l"."counsellor_id") OR "private"."is_bcmc_staff"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."service_locations" "l"
  WHERE (("l"."id" = "location_accessibility"."location_id") AND ("private"."is_counsellor_user"("l"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "location_accessibility_public_read" ON "public"."location_accessibility" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM ("public"."service_locations" "l"
     JOIN "public"."counsellors" "c" ON (("c"."id" = "l"."counsellor_id")))
  WHERE (("l"."id" = "location_accessibility"."location_id") AND ("l"."public_visible" = true) AND ("l"."active" = true) AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text")))));



ALTER TABLE "public"."practice_area_taxonomy" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "practice_area_taxonomy_public_read" ON "public"."practice_area_taxonomy" FOR SELECT TO "authenticated", "anon" USING (("active" = true));



CREATE POLICY "practice_area_taxonomy_staff_read" ON "public"."practice_area_taxonomy" FOR SELECT TO "authenticated" USING ("private"."is_bcmc_staff"());



ALTER TABLE "public"."practices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "practices_public_read" ON "public"."practices" FOR SELECT TO "authenticated", "anon" USING ((("public_visible" = true) AND ("active" = true)));



CREATE POLICY "practices_staff_read" ON "public"."practices" FOR SELECT TO "authenticated" USING ("private"."is_bcmc_staff"());



ALTER TABLE "public"."professional_credentials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "professional_credentials_own_insert" ON "public"."professional_credentials" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "professional_credentials_own_read" ON "public"."professional_credentials" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "professional_credentials_own_update" ON "public"."professional_credentials" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "professional_credentials_public_read" ON "public"."professional_credentials" FOR SELECT TO "authenticated", "anon" USING ((("public_visible" = true) AND (EXISTS ( SELECT 1
   FROM "public"."counsellors" "c"
  WHERE (("c"."id" = "professional_credentials"."counsellor_id") AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"))))));



ALTER TABLE "public"."professional_experience" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "professional_experience_own_insert" ON "public"."professional_experience" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "professional_experience_own_read" ON "public"."professional_experience" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "professional_experience_own_update" ON "public"."professional_experience" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "professional_experience_public_read" ON "public"."professional_experience" FOR SELECT TO "authenticated", "anon" USING ((("public_visible" = true) AND (EXISTS ( SELECT 1
   FROM "public"."counsellors" "c"
  WHERE (("c"."id" = "professional_experience"."counsellor_id") AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"))))));



ALTER TABLE "public"."profile_publications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profile_voice_own_insert" ON "public"."counsellor_profile_voice" FOR INSERT TO "authenticated" WITH CHECK ((("private"."is_counsellor_user"("counsellor_id") AND ("moderation_status" = ANY (ARRAY['draft'::"text", 'needs_changes'::"text"])) AND ("superseded_at" IS NULL)) OR "private"."is_bcmc_staff"()));



CREATE POLICY "profile_voice_own_read" ON "public"."counsellor_profile_voice" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "profile_voice_own_update" ON "public"."counsellor_profile_voice" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK ((("private"."is_counsellor_user"("counsellor_id") AND ("moderation_status" = ANY (ARRAY['draft'::"text", 'needs_changes'::"text"]))) OR "private"."is_bcmc_staff"()));



CREATE POLICY "profile_voice_public_read" ON "public"."counsellor_profile_voice" FOR SELECT TO "authenticated", "anon" USING ((("moderation_status" = 'approved'::"text") AND ("superseded_at" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."counsellors" "c"
  WHERE (("c"."id" = "counsellor_profile_voice"."counsellor_id") AND ("c"."publication_status" = 'published'::"text") AND ("c"."lifecycle_status" = 'active'::"text"))))));



CREATE POLICY "publications_own_insert" ON "public"."profile_publications" FOR INSERT TO "authenticated" WITH CHECK ((("private"."is_counsellor_user"("counsellor_id") AND ("status_key" = ANY (ARRAY['draft'::"text", 'review'::"text"])) AND ("bcmc_approved_at" IS NULL) AND ("published_at" IS NULL)) OR "private"."is_bcmc_staff"()));



CREATE POLICY "publications_own_read" ON "public"."profile_publications" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "publications_own_update" ON "public"."profile_publications" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK ((("private"."is_counsellor_user"("counsellor_id") AND ("status_key" = ANY (ARRAY['draft'::"text", 'review'::"text"])) AND ("bcmc_approved_at" IS NULL) AND ("published_at" IS NULL)) OR "private"."is_bcmc_staff"()));



CREATE POLICY "publications_public_read" ON "public"."profile_publications" FOR SELECT TO "authenticated", "anon" USING ((("status_key" = 'published'::"text") AND ("superseded_at" IS NULL)));



CREATE POLICY "service_client_groups_own_delete" ON "public"."service_offering_client_groups" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."service_offerings" "s"
  WHERE (("s"."id" = "service_offering_client_groups"."service_offering_id") AND ("private"."is_counsellor_user"("s"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "service_client_groups_own_insert" ON "public"."service_offering_client_groups" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."service_offerings" "s"
  WHERE (("s"."id" = "service_offering_client_groups"."service_offering_id") AND ("private"."is_counsellor_user"("s"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "service_client_groups_own_read" ON "public"."service_offering_client_groups" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."service_offerings" "s"
  WHERE (("s"."id" = "service_offering_client_groups"."service_offering_id") AND ("private"."is_counsellor_user"("s"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "service_client_groups_public_read" ON "public"."service_offering_client_groups" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM ("public"."service_offerings" "s"
     JOIN "public"."counsellors" "c" ON (("c"."id" = "s"."counsellor_id")))
  WHERE (("s"."id" = "service_offering_client_groups"."service_offering_id") AND ("s"."public_visible" = true) AND ("s"."active" = true) AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text")))));



ALTER TABLE "public"."service_fee_policies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_fee_policies_own_delete" ON "public"."service_fee_policies" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."service_offerings" "s"
  WHERE (("s"."id" = "service_fee_policies"."service_offering_id") AND ("private"."is_counsellor_user"("s"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "service_fee_policies_own_insert" ON "public"."service_fee_policies" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."service_offerings" "s"
  WHERE (("s"."id" = "service_fee_policies"."service_offering_id") AND ("private"."is_counsellor_user"("s"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "service_fee_policies_own_read" ON "public"."service_fee_policies" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."service_offerings" "s"
  WHERE (("s"."id" = "service_fee_policies"."service_offering_id") AND ("private"."is_counsellor_user"("s"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "service_fee_policies_own_update" ON "public"."service_fee_policies" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."service_offerings" "s"
  WHERE (("s"."id" = "service_fee_policies"."service_offering_id") AND ("private"."is_counsellor_user"("s"."counsellor_id") OR "private"."is_bcmc_staff"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."service_offerings" "s"
  WHERE (("s"."id" = "service_fee_policies"."service_offering_id") AND ("private"."is_counsellor_user"("s"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "service_fee_policies_public_read" ON "public"."service_fee_policies" FOR SELECT TO "authenticated", "anon" USING ((("public_visible" = true) AND ("active" = true) AND (EXISTS ( SELECT 1
   FROM ("public"."service_offerings" "s"
     JOIN "public"."counsellors" "c" ON (("c"."id" = "s"."counsellor_id")))
  WHERE (("s"."id" = "service_fee_policies"."service_offering_id") AND ("s"."public_visible" = true) AND ("s"."active" = true) AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"))))));



ALTER TABLE "public"."service_locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_locations_own_insert" ON "public"."service_locations" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "service_locations_own_read" ON "public"."service_locations" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "service_locations_own_update" ON "public"."service_locations" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "service_locations_public_read" ON "public"."service_locations" FOR SELECT TO "authenticated", "anon" USING ((("public_visible" = true) AND ("active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."counsellors" "c"
  WHERE (("c"."id" = "service_locations"."counsellor_id") AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"))))));



ALTER TABLE "public"."service_offering_client_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_offering_virtual_regions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."service_offerings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_offerings_own_insert" ON "public"."service_offerings" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "service_offerings_own_read" ON "public"."service_offerings" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "service_offerings_own_update" ON "public"."service_offerings" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "service_offerings_public_read" ON "public"."service_offerings" FOR SELECT TO "authenticated", "anon" USING ((("public_visible" = true) AND ("active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."counsellors" "c"
  WHERE (("c"."id" = "service_offerings"."counsellor_id") AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"))))));



ALTER TABLE "public"."service_regions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_regions_public_read" ON "public"."service_regions" FOR SELECT TO "authenticated", "anon" USING (("active" = true));



CREATE POLICY "service_regions_staff_read" ON "public"."service_regions" FOR SELECT TO "authenticated" USING ("private"."is_bcmc_staff"());



ALTER TABLE "public"."service_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_types_public_read" ON "public"."service_types" FOR SELECT TO "authenticated", "anon" USING (("active" = true));



CREATE POLICY "service_types_staff_read" ON "public"."service_types" FOR SELECT TO "authenticated" USING ("private"."is_bcmc_staff"());



CREATE POLICY "service_virtual_regions_own_delete" ON "public"."service_offering_virtual_regions" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."service_offerings" "s"
  WHERE (("s"."id" = "service_offering_virtual_regions"."service_offering_id") AND ("private"."is_counsellor_user"("s"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "service_virtual_regions_own_insert" ON "public"."service_offering_virtual_regions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."service_offerings" "s"
  WHERE (("s"."id" = "service_offering_virtual_regions"."service_offering_id") AND ("private"."is_counsellor_user"("s"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "service_virtual_regions_own_read" ON "public"."service_offering_virtual_regions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."service_offerings" "s"
  WHERE (("s"."id" = "service_offering_virtual_regions"."service_offering_id") AND ("private"."is_counsellor_user"("s"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "service_virtual_regions_public_read" ON "public"."service_offering_virtual_regions" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM ("public"."service_offerings" "s"
     JOIN "public"."counsellors" "c" ON (("c"."id" = "s"."counsellor_id")))
  WHERE (("s"."id" = "service_offering_virtual_regions"."service_offering_id") AND ("s"."public_visible" = true) AND ("s"."active" = true) AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text")))));



ALTER TABLE "public"."therapeutic_approach_taxonomy" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "therapeutic_approach_taxonomy_public_read" ON "public"."therapeutic_approach_taxonomy" FOR SELECT TO "authenticated", "anon" USING (("active" = true));



CREATE POLICY "therapeutic_approach_taxonomy_staff_read" ON "public"."therapeutic_approach_taxonomy" FOR SELECT TO "authenticated" USING ("private"."is_bcmc_staff"());



ALTER TABLE "public"."training_certifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "training_certifications_own_delete" ON "public"."training_certifications" FOR DELETE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "training_certifications_own_insert" ON "public"."training_certifications" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "training_certifications_own_read" ON "public"."training_certifications" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "training_certifications_own_update" ON "public"."training_certifications" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "training_certifications_public_read" ON "public"."training_certifications" FOR SELECT TO "authenticated", "anon" USING ((("public_visible" = true) AND ("active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."counsellors" "c"
  WHERE (("c"."id" = "training_certifications"."counsellor_id") AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"))))));



ALTER TABLE "public"."working_style_definitions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "working_style_definitions_public_read" ON "public"."working_style_definitions" FOR SELECT TO "authenticated", "anon" USING ((("active" = true) AND ("research_status_key" <> 'deprecated'::"text")));



CREATE POLICY "working_style_definitions_staff_read" ON "public"."working_style_definitions" FOR SELECT TO "authenticated" USING ("private"."is_bcmc_staff"());



ALTER TABLE "public"."working_style_options" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "working_style_options_public_read" ON "public"."working_style_options" FOR SELECT TO "authenticated", "anon" USING ((("active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."working_style_definitions" "d"
  WHERE (("d"."key" = "working_style_options"."definition_key") AND ("d"."active" = true) AND ("d"."research_status_key" <> 'deprecated'::"text"))))));



CREATE POLICY "working_style_options_staff_read" ON "public"."working_style_options" FOR SELECT TO "authenticated" USING ("private"."is_bcmc_staff"());



ALTER TABLE "public"."working_style_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "working_style_responses_own_delete" ON "public"."working_style_responses" FOR DELETE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "working_style_responses_own_insert" ON "public"."working_style_responses" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "working_style_responses_own_read" ON "public"."working_style_responses" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "working_style_responses_own_update" ON "public"."working_style_responses" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "working_style_responses_public_read" ON "public"."working_style_responses" FOR SELECT TO "authenticated", "anon" USING ((("public_visible" = true) AND ("active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."counsellors" "c"
  WHERE (("c"."id" = "working_style_responses"."counsellor_id") AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"))))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."credential_verification_label"("p_credential_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."credential_verification_label"("p_credential_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."credential_verification_label"("p_credential_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."credential_verification_label"("p_credential_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_public_credential_verification"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_credential_verification"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_credential_verification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_credential_verification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_counsellor_availability"("p_counsellor_id" "uuid", "p_status_key" "text", "p_status_note" "text", "p_confirmed_at" timestamp with time zone, "p_confirmation_source_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_counsellor_availability"("p_counsellor_id" "uuid", "p_status_key" "text", "p_status_note" "text", "p_confirmed_at" timestamp with time zone, "p_confirmation_source_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_counsellor_availability"("p_counsellor_id" "uuid", "p_status_key" "text", "p_status_note" "text", "p_confirmed_at" timestamp with time zone, "p_confirmation_source_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_counsellor_availability"("p_counsellor_id" "uuid", "p_status_key" "text", "p_status_note" "text", "p_confirmed_at" timestamp with time zone, "p_confirmation_source_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_appointment_window_service"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_appointment_window_service"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_appointment_window_service"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_contact_route_practice"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_contact_route_practice"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_contact_route_practice"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_service_location_practice"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_service_location_practice"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_service_location_practice"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_service_offering_relations"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_service_offering_relations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_service_offering_relations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_virtual_region_service"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_virtual_region_service"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_virtual_region_service"() TO "service_role";



GRANT ALL ON TABLE "public"."accessibility_features" TO "anon";
GRANT ALL ON TABLE "public"."accessibility_features" TO "authenticated";
GRANT ALL ON TABLE "public"."accessibility_features" TO "service_role";



GRANT ALL ON TABLE "public"."appointment_windows" TO "service_role";
GRANT SELECT ON TABLE "public"."appointment_windows" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."appointment_windows" TO "authenticated";



GRANT ALL ON TABLE "public"."client_groups" TO "anon";
GRANT ALL ON TABLE "public"."client_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."client_groups" TO "service_role";



GRANT ALL ON TABLE "public"."contact_processes" TO "service_role";
GRANT SELECT ON TABLE "public"."contact_processes" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."contact_processes" TO "authenticated";



GRANT ALL ON TABLE "public"."contact_routes" TO "service_role";
GRANT SELECT ON TABLE "public"."contact_routes" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."contact_routes" TO "authenticated";



GRANT ALL ON TABLE "public"."counsellor_availability" TO "service_role";
GRANT SELECT ON TABLE "public"."counsellor_availability" TO "anon";
GRANT SELECT ON TABLE "public"."counsellor_availability" TO "authenticated";



GRANT ALL ON TABLE "public"."counsellor_availability_history" TO "service_role";
GRANT SELECT ON TABLE "public"."counsellor_availability_history" TO "authenticated";



GRANT ALL ON TABLE "public"."counsellor_cultural_familiarity" TO "service_role";
GRANT SELECT ON TABLE "public"."counsellor_cultural_familiarity" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."counsellor_cultural_familiarity" TO "authenticated";



GRANT ALL ON TABLE "public"."counsellor_language_capabilities" TO "service_role";
GRANT SELECT ON TABLE "public"."counsellor_language_capabilities" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."counsellor_language_capabilities" TO "authenticated";



GRANT ALL ON TABLE "public"."counsellor_practice_affiliations" TO "service_role";
GRANT SELECT ON TABLE "public"."counsellor_practice_affiliations" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."counsellor_practice_affiliations" TO "authenticated";



GRANT ALL ON TABLE "public"."counsellor_practice_areas" TO "service_role";
GRANT SELECT ON TABLE "public"."counsellor_practice_areas" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."counsellor_practice_areas" TO "authenticated";



GRANT ALL ON TABLE "public"."counsellor_profile_images" TO "service_role";
GRANT SELECT ON TABLE "public"."counsellor_profile_images" TO "anon";
GRANT SELECT,DELETE ON TABLE "public"."counsellor_profile_images" TO "authenticated";



GRANT INSERT("counsellor_id") ON TABLE "public"."counsellor_profile_images" TO "authenticated";



GRANT INSERT("storage_path"),UPDATE("storage_path") ON TABLE "public"."counsellor_profile_images" TO "authenticated";



GRANT INSERT("alt_text"),UPDATE("alt_text") ON TABLE "public"."counsellor_profile_images" TO "authenticated";



GRANT INSERT("focal_x"),UPDATE("focal_x") ON TABLE "public"."counsellor_profile_images" TO "authenticated";



GRANT INSERT("focal_y"),UPDATE("focal_y") ON TABLE "public"."counsellor_profile_images" TO "authenticated";



GRANT ALL ON TABLE "public"."counsellor_profile_voice" TO "service_role";
GRANT SELECT ON TABLE "public"."counsellor_profile_voice" TO "anon";
GRANT SELECT,INSERT ON TABLE "public"."counsellor_profile_voice" TO "authenticated";



GRANT UPDATE("about") ON TABLE "public"."counsellor_profile_voice" TO "authenticated";



GRANT UPDATE("people_often_come_to_me_when") ON TABLE "public"."counsellor_profile_voice" TO "authenticated";



GRANT UPDATE("something_to_know_before_we_meet") ON TABLE "public"."counsellor_profile_voice" TO "authenticated";



GRANT UPDATE("first_meeting_expectation") ON TABLE "public"."counsellor_profile_voice" TO "authenticated";



GRANT UPDATE("faith_culture_note") ON TABLE "public"."counsellor_profile_voice" TO "authenticated";



GRANT UPDATE("counsellor_approved_at") ON TABLE "public"."counsellor_profile_voice" TO "authenticated";



GRANT ALL ON TABLE "public"."counsellor_therapeutic_approaches" TO "service_role";
GRANT SELECT ON TABLE "public"."counsellor_therapeutic_approaches" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."counsellor_therapeutic_approaches" TO "authenticated";



GRANT ALL ON TABLE "public"."counsellors" TO "service_role";
GRANT SELECT ON TABLE "public"."counsellors" TO "anon";
GRANT SELECT,INSERT ON TABLE "public"."counsellors" TO "authenticated";



GRANT UPDATE("slug") ON TABLE "public"."counsellors" TO "authenticated";



GRANT UPDATE("display_name") ON TABLE "public"."counsellors" TO "authenticated";



GRANT UPDATE("preferred_name") ON TABLE "public"."counsellors" TO "authenticated";



GRANT UPDATE("pronouns") ON TABLE "public"."counsellors" TO "authenticated";



GRANT UPDATE("gender_key") ON TABLE "public"."counsellors" TO "authenticated";



GRANT ALL ON TABLE "public"."credential_types" TO "anon";
GRANT ALL ON TABLE "public"."credential_types" TO "authenticated";
GRANT ALL ON TABLE "public"."credential_types" TO "service_role";



GRANT ALL ON TABLE "public"."cultural_familiarity_taxonomy" TO "service_role";
GRANT SELECT ON TABLE "public"."cultural_familiarity_taxonomy" TO "anon";
GRANT SELECT ON TABLE "public"."cultural_familiarity_taxonomy" TO "authenticated";



GRANT ALL ON TABLE "public"."education_records" TO "service_role";
GRANT SELECT ON TABLE "public"."education_records" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."education_records" TO "authenticated";



GRANT ALL ON TABLE "public"."faith_practice_profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."faith_practice_profiles" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."faith_practice_profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."languages" TO "service_role";
GRANT SELECT ON TABLE "public"."languages" TO "anon";
GRANT SELECT ON TABLE "public"."languages" TO "authenticated";



GRANT ALL ON TABLE "public"."location_accessibility" TO "service_role";
GRANT SELECT ON TABLE "public"."location_accessibility" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."location_accessibility" TO "authenticated";



GRANT ALL ON TABLE "public"."practice_area_taxonomy" TO "service_role";
GRANT SELECT ON TABLE "public"."practice_area_taxonomy" TO "anon";
GRANT SELECT ON TABLE "public"."practice_area_taxonomy" TO "authenticated";



GRANT ALL ON TABLE "public"."practices" TO "service_role";
GRANT SELECT ON TABLE "public"."practices" TO "anon";
GRANT SELECT ON TABLE "public"."practices" TO "authenticated";



GRANT ALL ON TABLE "public"."professional_credentials" TO "service_role";
GRANT SELECT ON TABLE "public"."professional_credentials" TO "anon";
GRANT SELECT,INSERT ON TABLE "public"."professional_credentials" TO "authenticated";



GRANT UPDATE("credential_type_key") ON TABLE "public"."professional_credentials" TO "authenticated";



GRANT UPDATE("issuer_name") ON TABLE "public"."professional_credentials" TO "authenticated";



GRANT UPDATE("is_primary") ON TABLE "public"."professional_credentials" TO "authenticated";



GRANT UPDATE("public_visible") ON TABLE "public"."professional_credentials" TO "authenticated";



GRANT ALL ON TABLE "public"."professional_experience" TO "service_role";
GRANT SELECT ON TABLE "public"."professional_experience" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."professional_experience" TO "authenticated";



GRANT ALL ON TABLE "public"."profile_publications" TO "service_role";
GRANT SELECT ON TABLE "public"."profile_publications" TO "anon";
GRANT SELECT,INSERT ON TABLE "public"."profile_publications" TO "authenticated";



GRANT UPDATE("counsellor_approved_at") ON TABLE "public"."profile_publications" TO "authenticated";



GRANT ALL ON TABLE "public"."service_fee_policies" TO "service_role";
GRANT SELECT ON TABLE "public"."service_fee_policies" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."service_fee_policies" TO "authenticated";



GRANT ALL ON TABLE "public"."service_locations" TO "service_role";
GRANT SELECT ON TABLE "public"."service_locations" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."service_locations" TO "authenticated";



GRANT ALL ON TABLE "public"."service_offering_client_groups" TO "service_role";
GRANT SELECT ON TABLE "public"."service_offering_client_groups" TO "anon";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."service_offering_client_groups" TO "authenticated";



GRANT ALL ON TABLE "public"."service_offering_virtual_regions" TO "service_role";
GRANT SELECT ON TABLE "public"."service_offering_virtual_regions" TO "anon";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."service_offering_virtual_regions" TO "authenticated";



GRANT ALL ON TABLE "public"."service_offerings" TO "service_role";
GRANT SELECT ON TABLE "public"."service_offerings" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."service_offerings" TO "authenticated";



GRANT ALL ON TABLE "public"."service_regions" TO "anon";
GRANT ALL ON TABLE "public"."service_regions" TO "authenticated";
GRANT ALL ON TABLE "public"."service_regions" TO "service_role";



GRANT ALL ON TABLE "public"."service_types" TO "anon";
GRANT ALL ON TABLE "public"."service_types" TO "authenticated";
GRANT ALL ON TABLE "public"."service_types" TO "service_role";



GRANT ALL ON TABLE "public"."therapeutic_approach_taxonomy" TO "service_role";
GRANT SELECT ON TABLE "public"."therapeutic_approach_taxonomy" TO "anon";
GRANT SELECT ON TABLE "public"."therapeutic_approach_taxonomy" TO "authenticated";



GRANT ALL ON TABLE "public"."training_certifications" TO "service_role";
GRANT SELECT ON TABLE "public"."training_certifications" TO "anon";
GRANT SELECT,DELETE ON TABLE "public"."training_certifications" TO "authenticated";



GRANT INSERT("counsellor_id") ON TABLE "public"."training_certifications" TO "authenticated";



GRANT INSERT("record_type_key"),UPDATE("record_type_key") ON TABLE "public"."training_certifications" TO "authenticated";



GRANT INSERT("title"),UPDATE("title") ON TABLE "public"."training_certifications" TO "authenticated";



GRANT INSERT("provider_name"),UPDATE("provider_name") ON TABLE "public"."training_certifications" TO "authenticated";



GRANT INSERT("completion_year"),UPDATE("completion_year") ON TABLE "public"."training_certifications" TO "authenticated";



GRANT INSERT("expiry_date"),UPDATE("expiry_date") ON TABLE "public"."training_certifications" TO "authenticated";



GRANT INSERT("public_visible"),UPDATE("public_visible") ON TABLE "public"."training_certifications" TO "authenticated";



GRANT INSERT("active"),UPDATE("active") ON TABLE "public"."training_certifications" TO "authenticated";



GRANT INSERT("sort_order"),UPDATE("sort_order") ON TABLE "public"."training_certifications" TO "authenticated";



GRANT ALL ON TABLE "public"."v_public_credential_verification" TO "anon";
GRANT ALL ON TABLE "public"."v_public_credential_verification" TO "authenticated";
GRANT ALL ON TABLE "public"."v_public_credential_verification" TO "service_role";



GRANT ALL ON TABLE "public"."v_counsellor_cards" TO "anon";
GRANT ALL ON TABLE "public"."v_counsellor_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."v_counsellor_cards" TO "service_role";



GRANT ALL ON TABLE "public"."v_counsellor_cards_app" TO "anon";
GRANT ALL ON TABLE "public"."v_counsellor_cards_app" TO "authenticated";
GRANT ALL ON TABLE "public"."v_counsellor_cards_app" TO "service_role";



GRANT ALL ON TABLE "public"."v_current_counsellor_profile_voice" TO "anon";
GRANT ALL ON TABLE "public"."v_current_counsellor_profile_voice" TO "authenticated";
GRANT ALL ON TABLE "public"."v_current_counsellor_profile_voice" TO "service_role";



GRANT ALL ON TABLE "public"."working_style_definitions" TO "service_role";
GRANT SELECT ON TABLE "public"."working_style_definitions" TO "anon";
GRANT SELECT ON TABLE "public"."working_style_definitions" TO "authenticated";



GRANT ALL ON TABLE "public"."working_style_options" TO "service_role";
GRANT SELECT ON TABLE "public"."working_style_options" TO "anon";
GRANT SELECT ON TABLE "public"."working_style_options" TO "authenticated";



GRANT ALL ON TABLE "public"."working_style_responses" TO "service_role";
GRANT SELECT ON TABLE "public"."working_style_responses" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."working_style_responses" TO "authenticated";



GRANT ALL ON TABLE "public"."v_counsellor_profiles" TO "anon";
GRANT ALL ON TABLE "public"."v_counsellor_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."v_counsellor_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."v_counsellor_profiles_app" TO "anon";
GRANT ALL ON TABLE "public"."v_counsellor_profiles_app" TO "authenticated";
GRANT ALL ON TABLE "public"."v_counsellor_profiles_app" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







