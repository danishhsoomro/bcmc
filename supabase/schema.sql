


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


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "verification";


ALTER SCHEMA "verification" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."has_staff_role"("required_role" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
  select exists (
    select 1
    from private.staff_users s
    where s.auth_user_id = auth.uid()
      and s.active = true
      and s.role = required_role
  );
$$;


ALTER FUNCTION "private"."has_staff_role"("required_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."invalidate_practical_details_from_service_scope"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_counsellor_id uuid;
begin

  v_counsellor_id :=
    case
      when tg_op = 'DELETE' then old.counsellor_id
      else new.counsellor_id
    end;

  update private.counsellor_onboarding_sections section_state
  set
    status_key = 'in_progress',
    completed_at = null,
    updated_at = now()
  from private.counsellor_onboarding_state onboarding
  where onboarding.counsellor_id = v_counsellor_id
    and section_state.counsellor_id = v_counsellor_id
    and section_state.intake_version = onboarding.intake_version
    and section_state.section_key = 'practical_details'
    and section_state.status_key in (
      'complete',
      'needs_attention'
    );

  return case
    when tg_op = 'DELETE' then old
    else new
  end;

end;
$$;


ALTER FUNCTION "private"."invalidate_practical_details_from_service_scope"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_bcmc_staff"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
  select exists (
    select 1
    from private.staff_users s
    where s.auth_user_id = auth.uid()
      and s.active = true
  );
$$;


ALTER FUNCTION "private"."is_bcmc_staff"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_counsellor_user"("target_counsellor_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
  select exists (
    select 1
    from private.counsellor_users cu
    where cu.auth_user_id = auth.uid()
      and cu.counsellor_id = target_counsellor_id
      and cu.active = true
  );
$$;


ALTER FUNCTION "private"."is_counsellor_user"("target_counsellor_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_my_contact_enquiries"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_result jsonb;
  v_status text;
begin

  v_result :=
    public.get_my_contact_enquiries_completion();

  v_status :=
    v_result ->> 'status';

  if v_status not in (
    'complete',
    'in_progress',
    'needs_attention'
  ) then
    raise exception
      'Unexpected Contact & enquiries completion status.'
      using errcode = '22023';
  end if;


  perform public.update_my_counsellor_onboarding_section(
    'availability_contact',
    v_status
  );


  return v_result;

end;
$$;


ALTER FUNCTION "public"."complete_my_contact_enquiries"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_my_practical_details"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_result jsonb;
  v_status text;
begin

  v_result :=
    public.get_my_practical_details_completion();

  v_status :=
    v_result ->> 'status';


  if v_status not in (
    'complete',
    'in_progress',
    'needs_attention'
  ) then
    raise exception
      'Unexpected Practical Details completion status.'
      using errcode = '22023';
  end if;


  perform public.update_my_counsellor_onboarding_section(
    'practical_details',
    v_status
  );


  return v_result;

end;
$$;


ALTER FUNCTION "public"."complete_my_practical_details"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_my_professional_background"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_result jsonb;
  v_status text;
begin
  v_result :=
    public.get_my_professional_background_completion();

  v_status := v_result ->> 'status';

  if v_status not in (
    'complete',
    'in_progress',
    'needs_attention'
  ) then
    raise exception
      'Unexpected Professional background completion status.'
      using errcode = '22023';
  end if;

  perform public.update_my_counsellor_onboarding_section(
    'professional_background',
    v_status
  );

  return v_result;
end;
$$;


ALTER FUNCTION "public"."complete_my_professional_background"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_my_profile_voice"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'private', 'pg_temp'
    AS $$
declare
  v_result jsonb;
begin
  v_result := public.get_my_profile_voice_completion();

  if coalesce((v_result ->> 'complete')::boolean, false) then
    perform public.update_my_counsellor_onboarding_section(
      'your_profile',
      'complete'
    );
  elsif v_result ->> 'status' = 'needs_attention' then
    perform public.update_my_counsellor_onboarding_section(
      'your_profile',
      'needs_attention'
    );
  else
    perform public.update_my_counsellor_onboarding_section(
      'your_profile',
      'in_progress'
    );
  end if;

  return v_result;
end;
$$;


ALTER FUNCTION "public"."complete_my_profile_voice"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."delete_my_professional_education"("p_education_record_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_counsellor_id uuid;
  v_account_count integer;
begin
  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count <> 1 then
    raise exception
      'Exactly one linked counsellor account is required.'
      using errcode = '42501';
  end if;

  select account.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() account;

  if p_education_record_id is null then
    raise exception
      'Education record is required.'
      using errcode = '22023';
  end if;

  delete from public.education_records e
  where e.id = p_education_record_id
    and e.counsellor_id = v_counsellor_id;

  if not found then
    raise exception
      'Education record does not belong to the counsellor.'
      using errcode = '22023';
  end if;

  perform public.update_my_counsellor_onboarding_section(
    'professional_background',
    'in_progress'
  );
end;
$$;


ALTER FUNCTION "public"."delete_my_professional_education"("p_education_record_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_contact_enquiries_completion"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $_$
declare
  v_counsellor_id uuid;
  v_account_count integer;

  v_missing jsonb := '[]'::jsonb;
  v_attention jsonb := '[]'::jsonb;

  v_active_public_count integer := 0;
  v_primary_count integer := 0;

  v_primary record;

  v_status text;
begin

  -- ----------------------------------------------------------
  -- Resolve caller.
  -- ----------------------------------------------------------

  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count <> 1 then
    raise exception
      'Exactly one linked counsellor account is required.'
      using errcode = '42501';
  end if;

  select account.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() account;


  -- ----------------------------------------------------------
  -- Count active/public seeker routes.
  -- ----------------------------------------------------------

  select count(*)::integer
  into v_active_public_count
  from public.contact_routes cr
  where cr.counsellor_id = v_counsellor_id
    and cr.active = true
    and cr.public_visible = true;


  if v_active_public_count = 0 then
    v_missing :=
      v_missing || jsonb_build_array(
        jsonb_build_object(
          'code',
          'contact_route_missing'
        )
      );
  end if;


  -- ----------------------------------------------------------
  -- Exactly one active/public primary.
  -- ----------------------------------------------------------

  select count(*)::integer
  into v_primary_count
  from public.contact_routes cr
  where cr.counsellor_id = v_counsellor_id
    and cr.active = true
    and cr.public_visible = true
    and cr.is_primary = true;


  if v_active_public_count > 0
     and v_primary_count = 0
  then
    v_missing :=
      v_missing || jsonb_build_array(
        jsonb_build_object(
          'code',
          'preferred_contact_route_missing'
        )
      );

  elsif v_primary_count > 1 then

    v_attention :=
      v_attention || jsonb_build_array(
        jsonb_build_object(
          'code',
          'multiple_preferred_contact_routes'
        )
      );

  end if;


  -- ----------------------------------------------------------
  -- Validate the preferred route.
  -- ----------------------------------------------------------

  if v_primary_count = 1 then

    select
      cr.id,
      cr.practice_id,
      cr.route_type_key,
      cr.route_value,
      cr.handoff_key,
      cr.confirmed_at,
      cr.active,
      cr.public_visible
    into strict v_primary
    from public.contact_routes cr
    where cr.counsellor_id = v_counsellor_id
      and cr.active = true
      and cr.public_visible = true
      and cr.is_primary = true;


    -- Route type supported by current public/contact intake.
    if v_primary.route_type_key not in (
      'secure_form',
      'website',
      'email',
      'phone'
    ) then
      v_attention :=
        v_attention || jsonb_build_array(
          jsonb_build_object(
            'code',
            'unsupported_contact_route_type',
            'route_id',
            v_primary.id
          )
        );
    end if;


    -- Destination format must match route type.
    if (
      v_primary.route_type_key in (
        'secure_form',
        'website'
      )
      and v_primary.route_value !~*
        '^https?://[^[:space:]]+$'
    )
    or (
      v_primary.route_type_key = 'email'
      and v_primary.route_value !~*
        '^mailto:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    )
    or (
      v_primary.route_type_key = 'phone'
      and v_primary.route_value !~
        '^tel:\+?[0-9]{7,15}$'
    )
    then
      v_attention :=
        v_attention || jsonb_build_array(
          jsonb_build_object(
            'code',
            'contact_route_invalid',
            'route_id',
            v_primary.id
          )
        );
    end if;


    -- Practice-managed must have valid active affiliation.
    if v_primary.handoff_key = 'practice_managed' then

      if v_primary.practice_id is null
         or not exists (
           select 1
           from public.counsellor_practice_affiliations cpa
           where cpa.counsellor_id = v_counsellor_id
             and cpa.practice_id = v_primary.practice_id
             and (
               cpa.ended_on is null
               or cpa.ended_on >= current_date
             )
         )
      then
        v_attention :=
          v_attention || jsonb_build_array(
            jsonb_build_object(
              'code',
              'contact_practice_invalid',
              'route_id',
              v_primary.id
            )
          );
      end if;

    end if;


    -- Confirmation/freshness.
    if v_primary.confirmed_at is null then

      v_missing :=
        v_missing || jsonb_build_array(
          jsonb_build_object(
            'code',
            'contact_confirmation_required',
            'route_id',
            v_primary.id
          )
        );

    elsif v_primary.confirmed_at <
      now() - interval '90 days'
    then

      v_missing :=
        v_missing || jsonb_build_array(
          jsonb_build_object(
            'code',
            'contact_confirmation_stale',
            'route_id',
            v_primary.id
          )
        );

    end if;

  end if;


  -- ----------------------------------------------------------
  -- Result.
  -- ----------------------------------------------------------

  if jsonb_array_length(v_attention) > 0 then
    v_status := 'needs_attention';

  elsif jsonb_array_length(v_missing) > 0 then
    v_status := 'in_progress';

  else
    v_status := 'complete';

  end if;


  return jsonb_build_object(
    'status',
    v_status,

    'complete',
    v_status = 'complete',

    'missing',
    v_missing,

    'needs_attention',
    v_attention,

    'counts',
    jsonb_build_object(
      'active_public_routes',
      v_active_public_count,
      'preferred_routes',
      v_primary_count
    )
  );

end;
$_$;


ALTER FUNCTION "public"."get_my_contact_enquiries_completion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_counsellor_accounts"() RETURNS TABLE("counsellor_id" "uuid", "display_name" "text", "preferred_name" "text", "slug" "text", "link_role" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
  select
    c.id as counsellor_id,
    c.display_name,
    c.preferred_name,
    c.slug,
    cu.role as link_role
  from private.counsellor_users cu
  join public.counsellors c
    on c.id = cu.counsellor_id
  where cu.auth_user_id = auth.uid()
    and cu.active = true
  order by c.display_name, c.id;
$$;


ALTER FUNCTION "public"."get_my_counsellor_accounts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_counsellor_onboarding"() RETURNS TABLE("counsellor_id" "uuid", "intake_version" integer, "overall_status_key" "text", "current_section_key" "text", "section_key" "text", "section_status_key" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_account_count integer;
  v_counsellor_id uuid;
  v_intake_version integer;
begin

  -- Resolve exactly one counsellor account.
  -- Do NOT use min(uuid).
  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count <> 1 then
    raise exception
      'Exactly one active counsellor account is required.'
      using errcode = '42501';
  end if;

  select a.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() a;


  -- Use current onboarding version where available.
  select s.intake_version
  into v_intake_version
  from private.counsellor_onboarding_state s
  where s.counsellor_id = v_counsellor_id;

  v_intake_version := coalesce(v_intake_version, 1);


  -- Return one controlled row per canonical V1 intake section.
  return query
  with controlled_sections(section_key, sort_order) as (
    values
      ('practice'::text, 10),
      ('who_you_work_with'::text, 20),
      ('what_you_help_with'::text, 30),
      ('how_you_work'::text, 40),
      ('faith'::text, 50),
      ('cultural_familiarity'::text, 60),
      ('practical_details'::text, 70),
      ('availability_contact'::text, 80),
      ('professional_background'::text, 90),
      ('your_profile'::text, 100)
  )
  select
    v_counsellor_id,
    v_intake_version,
    coalesce(os.status_key, 'not_started') as overall_status_key,
    os.current_section_key,
    cs.section_key,
    coalesce(ss.status_key, 'not_started') as section_status_key
  from controlled_sections cs
  left join private.counsellor_onboarding_state os
    on os.counsellor_id = v_counsellor_id
   and os.intake_version = v_intake_version
  left join private.counsellor_onboarding_sections ss
    on ss.counsellor_id = v_counsellor_id
   and ss.intake_version = v_intake_version
   and ss.section_key = cs.section_key
  order by cs.sort_order;

end;
$$;


ALTER FUNCTION "public"."get_my_counsellor_onboarding"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_practical_details_completion"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_counsellor_id uuid;
  v_account_count integer;
  v_intake_version integer := 1;

  v_missing jsonb := '[]'::jsonb;
  v_attention jsonb := '[]'::jsonb;

  v_declaration_count integer := 0;
  v_offering_count integer := 0;
  v_location_count integer := 0;

  v_declaration record;
  v_offering record;

  v_fee_count integer;
  v_consultation_offered boolean;
  v_consultation_mode_key text;

  v_result_status text;
begin

  -- ----------------------------------------------------------
  -- Resolve caller.
  -- ----------------------------------------------------------

  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count <> 1 then
    raise exception
      'Exactly one linked counsellor account is required.'
      using errcode = '42501';
  end if;

  select account.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() account;


  select onboarding.intake_version
  into v_intake_version
  from private.counsellor_onboarding_state onboarding
  where onboarding.counsellor_id = v_counsellor_id;

  v_intake_version :=
    coalesce(v_intake_version, 1);


  -- ----------------------------------------------------------
  -- Counts.
  -- ----------------------------------------------------------

  select count(*)::integer
  into v_declaration_count
  from public.counsellor_service_declarations d
  where d.counsellor_id = v_counsellor_id;


  select count(*)::integer
  into v_offering_count
  from public.service_offerings so
  join public.counsellor_service_declarations d
    on d.counsellor_id = so.counsellor_id
   and d.service_type_key = so.service_type_key
  where so.counsellor_id = v_counsellor_id
    and so.active = true
    and so.delivery_mode_key in (
      'in_person',
      'virtual'
    );


  select count(distinct so.location_id)::integer
  into v_location_count
  from public.service_offerings so
  join public.counsellor_service_declarations d
    on d.counsellor_id = so.counsellor_id
   and d.service_type_key = so.service_type_key
  where so.counsellor_id = v_counsellor_id
    and so.active = true
    and so.delivery_mode_key = 'in_person'
    and so.location_id is not null;


  -- ----------------------------------------------------------
  -- SERVICE CONFIGURATION
  -- Every declaration needs >=1 active V0.1 offering.
  -- ----------------------------------------------------------

  if v_declaration_count = 0 then
    v_missing :=
      v_missing || jsonb_build_array(
        jsonb_build_object(
          'code', 'service_declarations_missing'
        )
      );
  end if;


  for v_declaration in
    select
      d.counsellor_id,
      d.service_type_key
    from public.counsellor_service_declarations d
    where d.counsellor_id = v_counsellor_id
  loop

    if not exists (
      select 1
      from public.service_offerings so
      where so.counsellor_id = v_counsellor_id
        and so.service_type_key =
          v_declaration.service_type_key
        and so.active = true
        and so.delivery_mode_key in (
          'in_person',
          'virtual'
        )
    ) then
      v_missing :=
        v_missing || jsonb_build_array(
          jsonb_build_object(
            'code',
            'service_configuration_missing',
            'service_type_key',
            v_declaration.service_type_key
          )
        );
    end if;

  end loop;


  -- ----------------------------------------------------------
  -- OFFERING-LEVEL VALIDATION
  -- ----------------------------------------------------------

  for v_offering in
    select
      so.id,
      so.service_type_key,
      so.delivery_mode_key,
      so.location_id,
      so.client_gender_scope_key,
      so.client_gender_scope_note,
      d.client_gender_scope_key
        as declaration_gender_scope_key,
      d.client_gender_scope_note
        as declaration_gender_scope_note
    from public.service_offerings so
    join public.counsellor_service_declarations d
      on d.counsellor_id = so.counsellor_id
     and d.service_type_key = so.service_type_key
    where so.counsellor_id = v_counsellor_id
      and so.active = true
      and so.delivery_mode_key in (
        'in_person',
        'virtual'
      )
  loop

    -- Gender eligibility drift.
    if v_offering.client_gender_scope_key
         is distinct from
       v_offering.declaration_gender_scope_key
       or
       v_offering.client_gender_scope_note
         is distinct from
       v_offering.declaration_gender_scope_note
    then
      v_attention :=
        v_attention || jsonb_build_array(
          jsonb_build_object(
            'code',
            'offering_declaration_gender_mismatch',
            'offering_id',
            v_offering.id
          )
        );
    end if;


    -- Client-group compatibility drift.
    if exists (
      (
        select dcg.client_group_key
        from public.counsellor_service_declaration_client_groups dcg
        where dcg.counsellor_id = v_counsellor_id
          and dcg.service_type_key =
            v_offering.service_type_key
      )
      except
      (
        select ocg.client_group_key
        from public.service_offering_client_groups ocg
        where ocg.service_offering_id =
          v_offering.id
      )
    )
    or exists (
      (
        select ocg.client_group_key
        from public.service_offering_client_groups ocg
        where ocg.service_offering_id =
          v_offering.id
      )
      except
      (
        select dcg.client_group_key
        from public.counsellor_service_declaration_client_groups dcg
        where dcg.counsellor_id = v_counsellor_id
          and dcg.service_type_key =
            v_offering.service_type_key
      )
    )
    then
      v_attention :=
        v_attention || jsonb_build_array(
          jsonb_build_object(
            'code',
            'offering_declaration_client_groups_mismatch',
            'offering_id',
            v_offering.id
          )
        );
    end if;


    -- --------------------------------------------------------
    -- IN-PERSON LOCATION
    -- --------------------------------------------------------

    if v_offering.delivery_mode_key = 'in_person'
    then

      if v_offering.location_id is null
         or not exists (
           select 1
           from public.service_locations sl
           where sl.id = v_offering.location_id
             and sl.counsellor_id = v_counsellor_id
             and sl.active = true
             and nullif(btrim(sl.city), '') is not null
             and sl.province = 'BC'
             and sl.country_code = 'CA'
             and sl.public_address_level in (
               'hidden',
               'city',
               'area',
               'full'
             )
         )
      then
        v_missing :=
          v_missing || jsonb_build_array(
            jsonb_build_object(
              'code',
              'in_person_location_incomplete',
              'offering_id',
              v_offering.id
            )
          );
      end if;

    end if;


    -- --------------------------------------------------------
    -- VIRTUAL BC COVERAGE
    -- --------------------------------------------------------

    if v_offering.delivery_mode_key = 'virtual'
    then

      if not exists (
        select 1
        from public.service_offering_virtual_regions sovr
        join public.service_regions sr
          on sr.key = sovr.region_key
        where sovr.service_offering_id =
          v_offering.id
          and sr.key = 'bc'
          and sr.active = true
      ) then
        v_missing :=
          v_missing || jsonb_build_array(
            jsonb_build_object(
              'code',
              'virtual_bc_coverage_missing',
              'offering_id',
              v_offering.id
            )
          );
      end if;

    end if;


    -- --------------------------------------------------------
    -- FEE POLICY
    -- --------------------------------------------------------

    select count(*)::integer
    into v_fee_count
    from public.service_fee_policies sfp
    where sfp.service_offering_id =
      v_offering.id
      and sfp.active = true;


    if v_fee_count = 0 then

      v_missing :=
        v_missing || jsonb_build_array(
          jsonb_build_object(
            'code',
            'fee_policy_missing',
            'offering_id',
            v_offering.id
          )
        );

    elsif v_fee_count > 1 then

      v_attention :=
        v_attention || jsonb_build_array(
          jsonb_build_object(
            'code',
            'multiple_active_fee_policies',
            'offering_id',
            v_offering.id
          )
        );

    else

      if exists (
        select 1
        from public.service_fee_policies sfp
        where sfp.service_offering_id =
          v_offering.id
          and sfp.active = true
          and (
            sfp.public_visible is distinct from true
            or sfp.fee_cents < 0
            or sfp.currency_code <> 'CAD'
            or sfp.session_minutes not between 1 and 240
            or sfp.sliding_scale_key not in (
              'available',
              'limited',
              'currently_full',
              'not_offered',
              'ask'
            )
            or sfp.rcc_receipts_available is null
            or sfp.direct_billing_key not in (
              'yes',
              'no',
              'ask'
            )
          )
      ) then
        v_missing :=
          v_missing || jsonb_build_array(
            jsonb_build_object(
              'code',
              'fee_policy_incomplete',
              'offering_id',
              v_offering.id
            )
          );
      end if;


      if exists (
        select 1
        from public.service_fee_policies sfp
        where sfp.service_offering_id =
          v_offering.id
          and sfp.active = true
          and (
            sfp.confirmed_at is null
            or sfp.confirmation_source_key is null
            or sfp.confirmation_source_key not in (
              'counsellor',
              'practice',
              'bcmc_staff'
            )
          )
      ) then
        v_missing :=
          v_missing || jsonb_build_array(
            jsonb_build_object(
              'code',
              'fee_confirmation_required',
              'offering_id',
              v_offering.id
            )
          );
      elsif exists (
        select 1
        from public.service_fee_policies sfp
        where sfp.service_offering_id =
          v_offering.id
          and sfp.active = true
          and sfp.confirmed_at <
            now() - interval '90 days'
      ) then
        v_missing :=
          v_missing || jsonb_build_array(
            jsonb_build_object(
              'code',
              'fee_confirmation_stale',
              'offering_id',
              v_offering.id
            )
          );
      end if;

    end if;

  end loop;


  -- ----------------------------------------------------------
  -- CONSULTATION
  --
  -- No row = unanswered.
  -- Row + false = explicit No.
  -- ----------------------------------------------------------

  select
    cp.consultation_offered,
    cp.consultation_mode_key
  into
    v_consultation_offered,
    v_consultation_mode_key
  from public.contact_processes cp
  where cp.counsellor_id =
    v_counsellor_id;


  if not found then

    v_missing :=
      v_missing || jsonb_build_array(
        jsonb_build_object(
          'code',
          'consultation_unanswered'
        )
      );

  elsif v_consultation_offered = true then

    if v_consultation_mode_key is null
       or v_consultation_mode_key not in (
         'phone',
         'video',
         'phone_or_video',
         'other'
       )
    then
      v_missing :=
        v_missing || jsonb_build_array(
          jsonb_build_object(
            'code',
            'consultation_mode_missing'
          )
        );
    end if;


    if exists (
      select 1
      from public.service_offerings so
      join public.counsellor_service_declarations d
        on d.counsellor_id = so.counsellor_id
       and d.service_type_key = so.service_type_key
      where so.counsellor_id =
        v_counsellor_id
        and so.active = true
        and so.delivery_mode_key in (
          'in_person',
          'virtual'
        )
        and not exists (
          select 1
          from public.service_fee_policies sfp
          where sfp.service_offering_id = so.id
            and sfp.active = true
            and sfp.consultation_fee_cents is not null
            and sfp.consultation_fee_cents >= 0
            and sfp.consultation_minutes is not null
            and sfp.consultation_minutes
              between 1 and 120
        )
    ) then
      v_missing :=
        v_missing || jsonb_build_array(
          jsonb_build_object(
            'code',
            'consultation_terms_missing'
          )
        );
    end if;


    if (
      select count(*)
      from (
        select distinct
          sfp.consultation_fee_cents,
          sfp.consultation_minutes
        from public.service_fee_policies sfp
        join public.service_offerings so
          on so.id = sfp.service_offering_id
        join public.counsellor_service_declarations d
          on d.counsellor_id = so.counsellor_id
         and d.service_type_key =
           so.service_type_key
        where so.counsellor_id =
          v_counsellor_id
          and so.active = true
          and so.delivery_mode_key in (
            'in_person',
            'virtual'
          )
          and sfp.active = true
          and sfp.consultation_fee_cents
            is not null
          and sfp.consultation_minutes
            is not null
      ) consultation_values
    ) > 1
    then
      v_attention :=
        v_attention || jsonb_build_array(
          jsonb_build_object(
            'code',
            'consultation_terms_mismatch'
          )
        );
    end if;


  else

    -- Explicitly no consultation:
    -- compatibility fields should be null.
    if exists (
      select 1
      from public.service_fee_policies sfp
      join public.service_offerings so
        on so.id = sfp.service_offering_id
      join public.counsellor_service_declarations d
        on d.counsellor_id = so.counsellor_id
       and d.service_type_key = so.service_type_key
      where so.counsellor_id =
        v_counsellor_id
        and so.active = true
        and so.delivery_mode_key in (
          'in_person',
          'virtual'
        )
        and sfp.active = true
        and (
          sfp.consultation_fee_cents is not null
          or sfp.consultation_minutes is not null
        )
    ) then
      v_attention :=
        v_attention || jsonb_build_array(
          jsonb_build_object(
            'code',
            'consultation_not_offered_but_terms_present'
          )
        );
    end if;

  end if;


  -- ----------------------------------------------------------
  -- AVAILABILITY
  --
  -- <= 60 days satisfies completion.
  -- > 60 days requires reconfirmation.
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from public.counsellor_availability ca
    where ca.counsellor_id =
      v_counsellor_id
      and ca.public_visible = true
      and ca.status_key in (
        'accepting',
        'limited',
        'waitlist',
        'not_accepting'
      )
      and ca.confirmed_at is not null
      and ca.confirmation_source_key in (
        'counsellor',
        'practice',
        'bcmc_staff'
      )
  ) then

    v_missing :=
      v_missing || jsonb_build_array(
        jsonb_build_object(
          'code',
          'availability_confirmation_required'
        )
      );

  elsif exists (
    select 1
    from public.counsellor_availability ca
    where ca.counsellor_id =
      v_counsellor_id
      and ca.confirmed_at <
        now() - interval '60 days'
  ) then

    v_missing :=
      v_missing || jsonb_build_array(
        jsonb_build_object(
          'code',
          'availability_confirmation_stale'
        )
      );

  end if;


  -- ----------------------------------------------------------
  -- ACCESSIBILITY REVIEW
  --
  -- Every distinct CURRENT in-person location must have been
  -- explicitly reviewed.
  --
  -- Zero positive features remains valid.
  -- ----------------------------------------------------------

  for v_offering in
    select distinct
      so.location_id
    from public.service_offerings so
    join public.counsellor_service_declarations d
      on d.counsellor_id = so.counsellor_id
     and d.service_type_key = so.service_type_key
    where so.counsellor_id =
      v_counsellor_id
      and so.active = true
      and so.delivery_mode_key =
        'in_person'
      and so.location_id is not null
  loop

    if not exists (
      select 1
      from private.counsellor_location_accessibility_reviews review
      where review.counsellor_id =
        v_counsellor_id
        and review.intake_version =
          v_intake_version
        and review.location_id =
          v_offering.location_id
    ) then
      v_missing :=
        v_missing || jsonb_build_array(
          jsonb_build_object(
            'code',
            'accessibility_review_required',
            'location_id',
            v_offering.location_id
          )
        );
    end if;

  end loop;


  -- ----------------------------------------------------------
  -- FINAL EVALUATION
  -- ----------------------------------------------------------

  if jsonb_array_length(v_attention) > 0 then
    v_result_status := 'needs_attention';

  elsif jsonb_array_length(v_missing) > 0 then
    v_result_status := 'in_progress';

  else
    v_result_status := 'complete';

  end if;


  return jsonb_build_object(
    'status',
    v_result_status,

    'complete',
    v_result_status = 'complete',

    'missing',
    v_missing,

    'needs_attention',
    v_attention,

    'counts',
    jsonb_build_object(
      'declarations',
      v_declaration_count,

      'authored_offerings',
      v_offering_count,

      'in_person_locations',
      v_location_count
    )
  );

end;
$$;


ALTER FUNCTION "public"."get_my_practical_details_completion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_professional_background_completion"() RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private', 'verification'
    AS $$
declare
  v_counsellor_id uuid;
  v_account_count integer;

  v_missing jsonb := '[]'::jsonb;
  v_attention jsonb := '[]'::jsonb;

  v_education_count integer := 0;
  v_rcc_count integer := 0;

  v_start_year integer;
  v_experience_reviewed_at timestamptz;
  v_approaches_reviewed_at timestamptz;

  v_status text;
begin
  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count <> 1 then
    raise exception
      'Exactly one linked counsellor account is required.'
      using errcode = '42501';
  end if;

  select account.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() account;


  -- ----------------------------------------------------------
  -- RCC / verification
  --
  -- Counsellor cannot repair these facts themselves.
  -- Therefore evaluator uses needs_attention, not ordinary
  -- missing-form state.
  -- ----------------------------------------------------------

  select count(*)::integer
  into v_rcc_count
  from public.v_public_credential_verification v
  where v.counsellor_id = v_counsellor_id
    and v.credential_type_key = 'rcc'
    and v.credential_status = 'active'
    and v.currently_verified = true;

  if v_rcc_count = 0 then
    v_attention :=
      v_attention ||
      jsonb_build_array(
        jsonb_build_object(
          'code',
          'rcc_verification_requires_bcmc_review'
        )
      );
  elsif v_rcc_count > 1 then
    v_attention :=
      v_attention ||
      jsonb_build_array(
        jsonb_build_object(
          'code',
          'multiple_verified_rcc_credentials'
        )
      );
  end if;


  -- ----------------------------------------------------------
  -- Education
  -- ----------------------------------------------------------

  select count(*)::integer
  into v_education_count
  from public.education_records e
  where e.counsellor_id = v_counsellor_id
    and e.public_visible = true
    and nullif(btrim(e.degree_title), '') is not null
    and nullif(btrim(e.institution_name), '') is not null;

  if v_education_count = 0 then
    v_missing :=
      v_missing ||
      jsonb_build_array(
        jsonb_build_object(
          'code',
          'education_required'
        )
      );
  end if;


  -- ----------------------------------------------------------
  -- Experience
  -- ----------------------------------------------------------

  select pe.post_masters_practice_start_year
  into v_start_year
  from public.professional_experience pe
  where pe.counsellor_id = v_counsellor_id;

  select
    r.experience_reviewed_at,
    r.approaches_reviewed_at
  into
    v_experience_reviewed_at,
    v_approaches_reviewed_at
  from private.counsellor_professional_background_reviews r
  where r.counsellor_id = v_counsellor_id
    and r.intake_version = 1;

  if v_start_year is null then
    v_missing :=
      v_missing ||
      jsonb_build_array(
        jsonb_build_object(
          'code',
          'practice_start_year_required'
        )
      );

  elsif v_start_year < 1950
     or v_start_year > extract(year from current_date)::integer
  then
    v_attention :=
      v_attention ||
      jsonb_build_array(
        jsonb_build_object(
          'code',
          'practice_start_year_invalid'
        )
      );
  end if;

  if v_experience_reviewed_at is null then
    v_missing :=
      v_missing ||
      jsonb_build_array(
        jsonb_build_object(
          'code',
          'experience_review_required'
        )
      );
  end if;


  -- ----------------------------------------------------------
  -- Approaches explicit review
  -- ----------------------------------------------------------

  if v_approaches_reviewed_at is null then
    v_missing :=
      v_missing ||
      jsonb_build_array(
        jsonb_build_object(
          'code',
          'approaches_review_required'
        )
      );
  end if;

  if exists (
    select 1
    from public.counsellor_therapeutic_approaches ca
    left join public.therapeutic_approach_taxonomy ta
      on ta.key = ca.approach_key
    where ca.counsellor_id = v_counsellor_id
      and ca.active = true
      and ca.public_visible = true
      and (
        ta.key is null
        or ta.active = false
        or ca.relationship_key not in ('uses', 'informed_by')
      )
  ) then
    v_attention :=
      v_attention ||
      jsonb_build_array(
        jsonb_build_object(
          'code',
          'therapeutic_approaches_require_review'
        )
      );
  end if;


  -- ----------------------------------------------------------
  -- Final state
  -- ----------------------------------------------------------

  if jsonb_array_length(v_attention) > 0 then
    v_status := 'needs_attention';

  elsif jsonb_array_length(v_missing) > 0 then
    v_status := 'in_progress';

  else
    v_status := 'complete';
  end if;

  return jsonb_build_object(
    'status', v_status,
    'complete', v_status = 'complete',
    'missing', v_missing,
    'needs_attention', v_attention,
    'counts', jsonb_build_object(
      'education_records', v_education_count,
      'verified_rcc_credentials', v_rcc_count
    ),
    'review', jsonb_build_object(
      'experience_reviewed_at',
        v_experience_reviewed_at,
      'approaches_reviewed_at',
        v_approaches_reviewed_at
    )
  );
end;
$$;


ALTER FUNCTION "public"."get_my_professional_background_completion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_profile_voice_completion"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'private', 'pg_temp'
    AS $$
declare
  v_counsellor_id uuid;
  v_account_count integer;
  v_editable_count integer;
  v_people text;
  v_first_meeting_reviewed_at timestamptz;
  v_missing jsonb := '[]'::jsonb;
  v_attention jsonb := '[]'::jsonb;
  v_complete boolean := false;
  v_status text;
begin
  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count = 0 then
    raise exception 'No linked counsellor account found.';
  elsif v_account_count > 1 then
    raise exception 'Multiple linked counsellor accounts found.';
  end if;

  select a.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() a;

  select count(*)::integer
  into v_editable_count
  from public.counsellor_profile_voice v
  where v.counsellor_id = v_counsellor_id
    and v.superseded_at is null
    and v.moderation_status in ('draft', 'needs_changes');

  if v_editable_count > 1 then
    v_attention := v_attention || jsonb_build_array(
      'multiple_editable_profile_voice_drafts'
    );
  elsif v_editable_count = 1 then
    select v.people_often_come_to_me_when
    into strict v_people
    from public.counsellor_profile_voice v
    where v.counsellor_id = v_counsellor_id
      and v.superseded_at is null
      and v.moderation_status in ('draft', 'needs_changes');
  else
    -- For seeded/pre-existing approved fixtures such as Amina,
    -- allow the current approved source to satisfy intake readiness
    -- without forcing a meaningless new draft.
    select v.people_often_come_to_me_when
    into v_people
    from public.counsellor_profile_voice v
    where v.counsellor_id = v_counsellor_id
      and v.superseded_at is null
      and v.moderation_status = 'approved'
    order by v.version desc
    limit 1;
  end if;

  if v_people is null or btrim(v_people) = '' then
    v_missing := v_missing || jsonb_build_array(
      'people_often_come_to_me_when'
    );
  elsif char_length(btrim(v_people)) < 250
     or char_length(btrim(v_people)) > 700 then
    v_attention := v_attention || jsonb_build_array(
      'people_often_come_to_me_when_length'
    );
  end if;

  select r.first_meeting_reviewed_at
  into v_first_meeting_reviewed_at
  from private.counsellor_profile_voice_reviews r
  where r.counsellor_id = v_counsellor_id
    and r.intake_version = 1;

  -- The optional field must still be explicitly reviewed.
  if v_first_meeting_reviewed_at is null then
    v_missing := v_missing || jsonb_build_array(
      'first_meeting_review'
    );
  end if;

  v_complete :=
    jsonb_array_length(v_missing) = 0
    and jsonb_array_length(v_attention) = 0;

  if jsonb_array_length(v_attention) > 0 then
    v_status := 'needs_attention';
  elsif v_complete then
    v_status := 'complete';
  else
    v_status := 'in_progress';
  end if;

  return jsonb_build_object(
    'status', v_status,
    'complete', v_complete,
    'missing', v_missing,
    'needs_attention', v_attention,
    'editable_draft_count', v_editable_count,
    'first_meeting_reviewed_at', v_first_meeting_reviewed_at
  );
end;
$$;


ALTER FUNCTION "public"."get_my_profile_voice_completion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_profile_voice_intake"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'private', 'pg_temp'
    AS $$
declare
  v_counsellor_id uuid;
  v_account_count integer;
  v_editable_count integer;
  v_row public.counsellor_profile_voice%rowtype;
  v_source_kind text;
  v_first_meeting_reviewed_at timestamptz;
begin
  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count = 0 then
    raise exception 'No linked counsellor account found.';
  elsif v_account_count > 1 then
    raise exception 'Multiple linked counsellor accounts found.';
  end if;

  select a.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() a;

  select count(*)::integer
  into v_editable_count
  from public.counsellor_profile_voice v
  where v.counsellor_id = v_counsellor_id
    and v.superseded_at is null
    and v.moderation_status in ('draft', 'needs_changes');

  if v_editable_count > 1 then
    raise exception 'Multiple editable profile voice drafts exist. BCMC review is required.';
  end if;

  if v_editable_count = 1 then
    select v.*
    into strict v_row
    from public.counsellor_profile_voice v
    where v.counsellor_id = v_counsellor_id
      and v.superseded_at is null
      and v.moderation_status in ('draft', 'needs_changes');

    v_source_kind := 'editable_draft';
  else
    select v.*
    into v_row
    from public.counsellor_profile_voice v
    where v.counsellor_id = v_counsellor_id
      and v.superseded_at is null
      and v.moderation_status = 'approved'
    order by v.version desc
    limit 1;

    if found then
      v_source_kind := 'approved_source';
    else
      v_source_kind := 'empty';
    end if;
  end if;

  select r.first_meeting_reviewed_at
  into v_first_meeting_reviewed_at
  from private.counsellor_profile_voice_reviews r
  where r.counsellor_id = v_counsellor_id
    and r.intake_version = 1;

  return jsonb_build_object(
    'source_kind', v_source_kind,
    'voice_id',
      case when v_source_kind = 'empty' then null else v_row.id end,
    'version',
      case when v_source_kind = 'empty' then null else v_row.version end,
    'moderation_status',
      case when v_source_kind = 'empty' then null else v_row.moderation_status end,
    'people_often_come_to_me_when',
      case when v_source_kind = 'empty' then null else v_row.people_often_come_to_me_when end,
    'first_meeting_expectation',
      case when v_source_kind = 'empty' then null else v_row.first_meeting_expectation end,
    'first_meeting_reviewed_at', v_first_meeting_reviewed_at
  );
end;
$$;


ALTER FUNCTION "public"."get_my_profile_voice_intake"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."initialize_my_counsellor_onboarding"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_counsellor_id uuid;
  v_account_count integer;
begin

  -- Resolve authenticated caller.
  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count = 0 then
    raise exception 'No linked counsellor account found.'
      using errcode = '28000';
  end if;

  if v_account_count <> 1 then
    raise exception 'A single linked counsellor account is required.'
      using errcode = '28000';
  end if;

  select a.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() a;


  -- Initialize overall onboarding state.
  insert into private.counsellor_onboarding_state (
    counsellor_id,
    intake_version,
    current_section_key,
    status_key
  )
  values (
    v_counsellor_id,
    1,
    null,
    'not_started'
  )
  on conflict (counsellor_id) do nothing;


  -- Initialize controlled V1 sections.
  insert into private.counsellor_onboarding_sections (
    counsellor_id,
    intake_version,
    section_key,
    status_key
  )
  select
    v_counsellor_id,
    1,
    section_key,
    'not_started'
  from (
    values
      ('practice'::text),
      ('who_you_work_with'::text),
      ('what_you_help_with'::text),
      ('how_you_work'::text),
      ('faith'::text),
      ('cultural_familiarity'::text),
      ('practical_details'::text),
      ('availability_contact'::text),
      ('professional_background'::text),
      ('your_profile'::text)
  ) sections(section_key)
  on conflict (
    counsellor_id,
    intake_version,
    section_key
  ) do nothing;

end;
$$;


ALTER FUNCTION "public"."initialize_my_counsellor_onboarding"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."save_my_availability"("p_payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_counsellor_id uuid;
  v_account_count integer;

  v_status_key text;
  v_status_note text;
  v_confirmed_at timestamptz;
begin

  -- ----------------------------------------------------------
  -- Resolve exactly one linked counsellor.
  -- NEVER use min(uuid).
  -- ----------------------------------------------------------

  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count <> 1 then
    raise exception
      'Exactly one linked counsellor account is required.'
      using errcode = '42501';
  end if;

  select account.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() as account;


  -- ----------------------------------------------------------
  -- Validate payload envelope.
  -- ----------------------------------------------------------

  if p_payload is null
     or jsonb_typeof(p_payload) <> 'object'
  then
    raise exception
      'Availability payload must be a JSON object.'
      using errcode = '22023';
  end if;


  if (p_payload - array[
        'status_key',
        'status_note'
      ]) <> '{}'::jsonb
  then
    raise exception
      'Availability payload contains unsupported fields.'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Status
  --
  -- Deliberately excludes "unknown" from counsellor authoring.
  -- ----------------------------------------------------------

  v_status_key :=
    nullif(
      btrim(p_payload ->> 'status_key'),
      ''
    );

  if v_status_key not in (
    'accepting',
    'limited',
    'waitlist',
    'not_accepting'
  ) then
    raise exception
      'Invalid availability status.'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Optional short context.
  -- ----------------------------------------------------------

  v_status_note :=
    nullif(
      btrim(p_payload ->> 'status_note'),
      ''
    );

  if v_status_note is not null
     and char_length(v_status_note) > 280
  then
    raise exception
      'Availability note cannot exceed 280 characters.'
      using errcode = '22023';
  end if;


  -- One timestamp is used for both current state and history
  -- so the reconfirmation snapshot is exact.
  v_confirmed_at := now();


  -- ==========================================================
  -- UPSERT CURRENT AVAILABILITY
  -- ==========================================================

  insert into public.counsellor_availability (
    counsellor_id,
    status_key,
    status_note,
    confirmed_at,
    confirmation_source_key,
    public_visible
  )
  values (
    v_counsellor_id,
    v_status_key,
    v_status_note,
    v_confirmed_at,
    'counsellor',
    true
  )
  on conflict (counsellor_id)
  do update
  set
    status_key = excluded.status_key,
    status_note = excluded.status_note,
    confirmed_at = excluded.confirmed_at,
    confirmation_source_key = excluded.confirmation_source_key,
    public_visible = true,
    updated_at = now();


  -- ==========================================================
  -- APPEND CONFIRMATION HISTORY
  --
  -- This happens even when status/note have not changed.
  -- A no-change save is still a meaningful reconfirmation.
  -- ==========================================================

  insert into public.counsellor_availability_history (
    counsellor_id,
    status_key,
    status_note,
    confirmed_at,
    confirmation_source_key,
    recorded_by
  )
  values (
    v_counsellor_id,
    v_status_key,
    v_status_note,
    v_confirmed_at,
    'counsellor',
    auth.uid()
  );


  -- Availability alone does not complete Practical Details.
  perform public.update_my_counsellor_onboarding_section(
    'practical_details',
    'in_progress'
  );

end;
$$;


ALTER FUNCTION "public"."save_my_availability"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_my_consultation_preferences"("p_payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_counsellor_id uuid;
  v_account_count integer;

  v_consultation_offered boolean;
  v_consultation_mode_key text;
  v_consultation_fee_cents integer;
  v_consultation_minutes integer;

  v_active_offering_count integer;
  v_active_fee_policy_count integer;
begin

  -- ----------------------------------------------------------
  -- Resolve caller.
  -- NEVER use min(uuid).
  -- ----------------------------------------------------------

  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count <> 1 then
    raise exception
      'Exactly one linked counsellor account is required.'
      using errcode = '42501';
  end if;

  select a.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() a;


  -- ----------------------------------------------------------
  -- Envelope.
  -- ----------------------------------------------------------

  if p_payload is null
     or jsonb_typeof(p_payload) <> 'object'
  then
    raise exception
      'Consultation payload must be a JSON object.'
      using errcode = '22023';
  end if;


  if not (p_payload ? 'consultation_offered')
     or jsonb_typeof(p_payload -> 'consultation_offered') <> 'boolean'
  then
    raise exception
      'consultation_offered must be explicitly true or false.'
      using errcode = '22023';
  end if;

  v_consultation_offered :=
    (p_payload ->> 'consultation_offered')::boolean;


  -- ==========================================================
  -- NO CONSULTATION
  -- ==========================================================

  if v_consultation_offered = false then

    if (p_payload - array[
          'consultation_offered'
        ]) <> '{}'::jsonb
    then
      raise exception
        'No-consultation payload contains unsupported fields.'
        using errcode = '22023';
    end if;


    insert into public.contact_processes (
      counsellor_id,
      consultation_offered,
      consultation_mode_key,
      public_visible
    )
    values (
      v_counsellor_id,
      false,
      null,
      true
    )
    on conflict (counsellor_id)
    do update
    set
      consultation_offered = false,
      consultation_mode_key = null,
      updated_at = now();


    update public.service_fee_policies sfp
    set
      consultation_fee_cents = null,
      consultation_minutes = null,
      updated_at = now()
    from public.service_offerings so
    where so.id = sfp.service_offering_id
      and so.counsellor_id = v_counsellor_id
      and so.active = true
      and so.delivery_mode_key in ('in_person', 'virtual')
      and sfp.active = true;


    perform public.update_my_counsellor_onboarding_section(
      'practical_details',
      'in_progress'
    );

    return;

  end if;


  -- ==========================================================
  -- CONSULTATION OFFERED
  -- ==========================================================

  if (p_payload - array[
        'consultation_offered',
        'consultation_mode_key',
        'consultation_fee_cents',
        'consultation_minutes'
      ]) <> '{}'::jsonb
  then
    raise exception
      'Consultation payload contains unsupported fields.'
      using errcode = '22023';
  end if;


  v_consultation_mode_key :=
    nullif(
      btrim(p_payload ->> 'consultation_mode_key'),
      ''
    );

  if v_consultation_mode_key not in (
    'phone',
    'video',
    'phone_or_video',
    'other'
  ) then
    raise exception
      'Invalid consultation_mode_key.'
      using errcode = '22023';
  end if;


  begin
    v_consultation_fee_cents :=
      (p_payload ->> 'consultation_fee_cents')::integer;
  exception
    when others then
      raise exception
        'consultation_fee_cents must be an integer, including 0 for a free consultation.'
        using errcode = '22023';
  end;

  if v_consultation_fee_cents < 0 then
    raise exception
      'consultation_fee_cents cannot be negative.'
      using errcode = '22023';
  end if;


  begin
    v_consultation_minutes :=
      (p_payload ->> 'consultation_minutes')::integer;
  exception
    when others then
      raise exception
        'consultation_minutes must be an integer.'
        using errcode = '22023';
  end;

  if v_consultation_minutes <= 0
     or v_consultation_minutes > 120
  then
    raise exception
      'consultation_minutes must be between 1 and 120.'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Consultation compatibility fields cannot be synchronized
  -- safely until every current offering has exactly one active
  -- fee policy.
  -- ----------------------------------------------------------

  select count(*)::integer
  into v_active_offering_count
  from public.service_offerings so
  where so.counsellor_id = v_counsellor_id
    and so.active = true
    and so.delivery_mode_key in ('in_person', 'virtual');


  select count(*)::integer
  into v_active_fee_policy_count
  from public.service_fee_policies sfp
  join public.service_offerings so
    on so.id = sfp.service_offering_id
  where so.counsellor_id = v_counsellor_id
    and so.active = true
    and so.delivery_mode_key in ('in_person', 'virtual')
    and sfp.active = true;


  if v_active_offering_count = 0 then
    raise exception
      'Configure at least one service offering before saving consultation preferences.'
      using errcode = '22023';
  end if;


  if v_active_fee_policy_count <> v_active_offering_count
     or exists (
       select 1
       from public.service_offerings so
       join public.service_fee_policies sfp
         on sfp.service_offering_id = so.id
        and sfp.active = true
       where so.counsellor_id = v_counsellor_id
         and so.active = true
         and so.delivery_mode_key in ('in_person', 'virtual')
       group by so.id
       having count(*) <> 1
     )
  then
    raise exception
      'Every active service offering must have exactly one active fee policy before consultation preferences can be saved.'
      using errcode = '23514';
  end if;


  -- Preserve response_time_note and process_note on existing row.
  insert into public.contact_processes (
    counsellor_id,
    consultation_offered,
    consultation_mode_key,
    public_visible
  )
  values (
    v_counsellor_id,
    true,
    v_consultation_mode_key,
    true
  )
  on conflict (counsellor_id)
  do update
  set
    consultation_offered = true,
    consultation_mode_key = excluded.consultation_mode_key,
    updated_at = now();


  -- Compatibility synchronization.
  update public.service_fee_policies sfp
  set
    consultation_fee_cents = v_consultation_fee_cents,
    consultation_minutes = v_consultation_minutes,
    updated_at = now()
  from public.service_offerings so
  where so.id = sfp.service_offering_id
    and so.counsellor_id = v_counsellor_id
    and so.active = true
    and so.delivery_mode_key in ('in_person', 'virtual')
    and sfp.active = true;


  perform public.update_my_counsellor_onboarding_section(
    'practical_details',
    'in_progress'
  );

end;
$$;


ALTER FUNCTION "public"."save_my_consultation_preferences"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_my_contact_enquiries"("p_payload" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $_$
declare
  v_counsellor_id uuid;
  v_account_count integer;

  v_route_id uuid;
  v_practice_id uuid;

  v_route_type_key text;
  v_destination text;
  v_display_label text;
  v_handoff_key text;

  v_normalized_value text;
  v_confirmed_at timestamptz := now();
begin

  -- ----------------------------------------------------------
  -- Resolve exactly one linked counsellor.
  -- NEVER use min(uuid).
  -- ----------------------------------------------------------

  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count <> 1 then
    raise exception
      'Exactly one linked counsellor account is required.'
      using errcode = '42501';
  end if;

  select account.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() account;


  -- ----------------------------------------------------------
  -- Validate envelope.
  -- ----------------------------------------------------------

  if p_payload is null
     or jsonb_typeof(p_payload) <> 'object'
  then
    raise exception
      'Contact payload must be a JSON object.'
      using errcode = '22023';
  end if;

  if (p_payload - array[
        'route_id',
        'practice_id',
        'route_type_key',
        'destination',
        'display_label',
        'handoff_key'
      ]) <> '{}'::jsonb
  then
    raise exception
      'Contact payload contains unsupported fields.'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Optional route id.
  -- ----------------------------------------------------------

  if nullif(btrim(p_payload ->> 'route_id'), '') is not null then
    begin
      v_route_id :=
        btrim(p_payload ->> 'route_id')::uuid;
    exception
      when invalid_text_representation then
        raise exception
          'Invalid route_id.'
          using errcode = '22023';
    end;

    if not exists (
      select 1
      from public.contact_routes cr
      where cr.id = v_route_id
        and cr.counsellor_id = v_counsellor_id
    ) then
      raise exception
        'Contact route does not belong to the counsellor.'
        using errcode = '22023';
    end if;
  end if;


  -- ----------------------------------------------------------
  -- Optional affiliated practice.
  -- ----------------------------------------------------------

  if nullif(btrim(p_payload ->> 'practice_id'), '') is not null then
    begin
      v_practice_id :=
        btrim(p_payload ->> 'practice_id')::uuid;
    exception
      when invalid_text_representation then
        raise exception
          'Invalid practice_id.'
          using errcode = '22023';
    end;

    if not exists (
      select 1
      from public.counsellor_practice_affiliations cpa
      where cpa.counsellor_id = v_counsellor_id
        and cpa.practice_id = v_practice_id
        and (
          cpa.ended_on is null
          or cpa.ended_on >= current_date
        )
    ) then
      raise exception
        'Selected practice is not an active counsellor affiliation.'
        using errcode = '22023';
    end if;
  end if;


  -- ----------------------------------------------------------
  -- Route type.
  --
  -- Database supports more legacy values, but V0.1 authoring
  -- deliberately limits to types whose public handoff semantics
  -- are clear.
  -- ----------------------------------------------------------

  v_route_type_key :=
    nullif(btrim(p_payload ->> 'route_type_key'), '');

  if v_route_type_key not in (
    'secure_form',
    'website',
    'email',
    'phone'
  ) then
    raise exception
      'Unsupported contact route type for counsellor authoring.'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Destination.
  -- ----------------------------------------------------------

  v_destination :=
    nullif(btrim(p_payload ->> 'destination'), '');

  if v_destination is null then
    raise exception
      'A contact destination is required.'
      using errcode = '22023';
  end if;


  -- Secure form / website: require http(s).
  if v_route_type_key in ('secure_form', 'website') then

    if v_destination !~* '^https?://[^[:space:]]+$' then
      raise exception
        'Web contact destinations must use a valid http or https URL.'
        using errcode = '22023';
    end if;

    v_normalized_value := v_destination;


  -- Email: accept address or mailto URI, store mailto URI.
  elsif v_route_type_key = 'email' then

    v_destination :=
      regexp_replace(
        v_destination,
        '^mailto:',
        '',
        'i'
      );

    if v_destination !~*
       '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    then
      raise exception
        'Enter a valid professional email address.'
        using errcode = '22023';
    end if;

    v_normalized_value :=
      'mailto:' || v_destination;


  -- Phone: accept human formatting, store tel URI.
  elsif v_route_type_key = 'phone' then

    v_destination :=
      regexp_replace(
        v_destination,
        '^tel:',
        '',
        'i'
      );

    -- Remove common display punctuation before storage.
    v_destination :=
      regexp_replace(
        v_destination,
        '[[:space:]().-]',
        '',
        'g'
      );

    if v_destination !~ '^\+?[0-9]{7,15}$' then
      raise exception
        'Enter a valid professional phone number.'
        using errcode = '22023';
    end if;

    v_normalized_value :=
      'tel:' || v_destination;

  end if;


  -- ----------------------------------------------------------
  -- Optional public display label.
  -- ----------------------------------------------------------

  v_display_label :=
    nullif(
      btrim(p_payload ->> 'display_label'),
      ''
    );

  if v_display_label is not null
     and char_length(v_display_label) > 120
  then
    raise exception
      'Contact display label cannot exceed 120 characters.'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Explicit handoff semantics.
  -- ----------------------------------------------------------

  v_handoff_key :=
    nullif(
      btrim(p_payload ->> 'handoff_key'),
      ''
    );

  if v_handoff_key not in (
    'external',
    'direct',
    'practice_managed'
  ) then
    raise exception
      'Invalid contact handoff type.'
      using errcode = '22023';
  end if;


  if v_handoff_key = 'practice_managed'
     and v_practice_id is null
  then
    raise exception
      'A practice-managed contact route requires a practice.'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Exactly one preferred route.
  --
  -- Existing non-primary routes are preserved for now.
  -- We are authoring/reconfirming the one BCMC should prefer.
  -- ----------------------------------------------------------

  update public.contact_routes cr
  set
    is_primary = false,
    updated_at = now()
  where cr.counsellor_id = v_counsellor_id
    and cr.is_primary = true
    and (
      v_route_id is null
      or cr.id <> v_route_id
    );


  if v_route_id is null then

    insert into public.contact_routes (
      counsellor_id,
      practice_id,
      route_type_key,
      route_value,
      display_label,
      is_primary,
      handoff_key,
      confirmed_at,
      public_visible,
      active,
      created_at,
      updated_at
    )
    values (
      v_counsellor_id,
      v_practice_id,
      v_route_type_key,
      v_normalized_value,
      v_display_label,
      true,
      v_handoff_key,
      v_confirmed_at,
      true,
      true,
      now(),
      now()
    )
    returning id
    into v_route_id;

  else

    update public.contact_routes cr
    set
      practice_id = v_practice_id,
      route_type_key = v_route_type_key,
      route_value = v_normalized_value,
      display_label = v_display_label,
      is_primary = true,
      handoff_key = v_handoff_key,
      confirmed_at = v_confirmed_at,
      public_visible = true,
      active = true,
      updated_at = now()
    where cr.id = v_route_id
      and cr.counsellor_id = v_counsellor_id;

  end if;


  -- Saving contact information means Section 8 has been worked
  -- on, but completion remains evaluator-driven.
  perform public.update_my_counsellor_onboarding_section(
    'availability_contact',
    'in_progress'
  );


  return v_route_id;

end;
$_$;


ALTER FUNCTION "public"."save_my_contact_enquiries"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_my_counsellor_cultural_familiarity"("p_payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_account_count integer;
  v_counsellor_id uuid;
  v_keys text[];
  v_total_count integer;
  v_distinct_count integer;
  v_valid_count integer;
begin
  -- ==========================================================
  -- Resolve exactly one linked counsellor.
  -- Never trust a browser-supplied counsellor_id.
  -- ==========================================================

  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count <> 1 then
    raise exception
      'Exactly one active counsellor account is required.'
      using errcode = '42501';
  end if;

  select a.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() a;


  -- ==========================================================
  -- Validate payload shape.
  -- Expected:
  --
  -- {
  --   "familiarity_keys": ["south_asian_diaspora", ...]
  -- }
  --
  -- Empty array is intentionally valid.
  -- ==========================================================

  if p_payload is null
     or jsonb_typeof(p_payload) <> 'object'
  then
    raise exception
      'Payload must be a JSON object.'
      using errcode = '22023';
  end if;

  if not (p_payload ? 'familiarity_keys')
     or jsonb_typeof(p_payload -> 'familiarity_keys') <> 'array'
  then
    raise exception
      'familiarity_keys must be a JSON array.'
      using errcode = '22023';
  end if;


  -- Every element must be a JSON string.
  if exists (
    select 1
    from jsonb_array_elements(p_payload -> 'familiarity_keys') e(value)
    where jsonb_typeof(e.value) <> 'string'
  ) then
    raise exception
      'Every familiarity key must be a string.'
      using errcode = '22023';
  end if;


  -- Normalize to trimmed text array.
  select coalesce(
    array_agg(btrim(e.value #>> '{}')),
    '{}'::text[]
  )
  into v_keys
  from jsonb_array_elements(p_payload -> 'familiarity_keys') e(value);


  -- Reject blank keys.
  if exists (
    select 1
    from unnest(v_keys) k
    where k = ''
  ) then
    raise exception
      'Familiarity keys cannot be blank.'
      using errcode = '22023';
  end if;


  -- Reject duplicates rather than silently deduplicating.
  select cardinality(v_keys)
  into v_total_count;

  select count(distinct k)::integer
  into v_distinct_count
  from unnest(v_keys) k;

  if v_total_count <> v_distinct_count then
    raise exception
      'Duplicate familiarity keys are not allowed.'
      using errcode = '22023';
  end if;


  -- Every submitted key must exist and currently be active.
  select count(*)::integer
  into v_valid_count
  from public.cultural_familiarity_taxonomy t
  where t.active = true
    and t.key = any(v_keys);

  if v_valid_count <> v_total_count then
    raise exception
      'One or more cultural familiarity selections are invalid or inactive.'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- Authoritative replacement.
  --
  -- Deselecting a key removes that canonical selection.
  -- Empty array therefore removes all current selections.
  -- ==========================================================

  delete from public.counsellor_cultural_familiarity cf
  where cf.counsellor_id = v_counsellor_id
    and not (cf.familiarity_key = any(v_keys));


  -- Insert newly selected rows.
  --
  -- For existing rows:
  -- - reactivate the canonical selection
  -- - preserve note
  -- - preserve public_visible
  -- - preserve created_at
  --
  -- V0.1 does NOT author the note or public visibility fields.
  insert into public.counsellor_cultural_familiarity (
    counsellor_id,
    familiarity_key,
    active
  )
  select
    v_counsellor_id,
    k,
    true
  from unnest(v_keys) k
  on conflict (counsellor_id, familiarity_key)
  do update
    set active = true;


  -- ==========================================================
  -- Completion
  --
  -- Zero selections is valid.
  -- The onboarding record distinguishes:
  --
  -- zero rows + complete
  --     = counsellor completed the section and chose none
  --
  -- zero rows + not_started
  --     = section has not been completed
  -- ==========================================================

  perform public.update_my_counsellor_onboarding_section(
    'cultural_familiarity',
    'complete'
  );
end;
$$;


ALTER FUNCTION "public"."save_my_counsellor_cultural_familiarity"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_my_counsellor_faith_profile"("p_payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_account_count integer;
  v_counsellor_id uuid;

  v_discussion_comfort_key text;
  v_initiation_key text;
  v_initiation_note text;
  v_integration_key text;
  v_integration_mode_key text;
  v_claims_islamic_counselling boolean;
  v_islamic_counselling_definition text;
begin

  -- ==========================================================
  -- Resolve the authenticated counsellor.
  -- ==========================================================

  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count <> 1 then
    raise exception
      'Exactly one active counsellor account is required.'
      using errcode = '42501';
  end if;

  select a.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() a;


  -- ==========================================================
  -- Validate payload container.
  -- ==========================================================

  if p_payload is null
     or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception
      'Faith profile payload must be a JSON object.'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- Validate required JSON types before extracting values.
  -- ==========================================================

  if jsonb_typeof(p_payload -> 'discussion_comfort_key')
       is distinct from 'string' then
    raise exception
      'discussion_comfort_key must be a string.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_payload -> 'claims_islamic_counselling')
       is distinct from 'boolean' then
    raise exception
      'claims_islamic_counselling must be a boolean.'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- Normalize required values.
  -- ==========================================================

  v_discussion_comfort_key :=
    nullif(btrim(p_payload ->> 'discussion_comfort_key'), '');

  v_claims_islamic_counselling :=
    (p_payload ->> 'claims_islamic_counselling')::boolean;


  if v_discussion_comfort_key not in ('yes', 'no', 'depends') then
    raise exception
      'Invalid discussion_comfort_key.'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- Discussion = NO
  --
  -- Initiation and integration are not applicable.
  -- ==========================================================

  if v_discussion_comfort_key = 'no' then

    v_initiation_key := null;
    v_initiation_note := null;
    v_integration_key := null;
    v_integration_mode_key := null;

    if v_claims_islamic_counselling then
      raise exception
        'Islamic counselling cannot be claimed when religion or spirituality is not discussed in counselling.'
        using errcode = '22023';
    end if;

  else

    -- ========================================================
    -- Initiation is required when discussion is yes/depends.
    -- ========================================================

    if jsonb_typeof(p_payload -> 'initiation_key')
         is distinct from 'string' then
      raise exception
        'initiation_key is required.'
        using errcode = '22023';
    end if;

    v_initiation_key :=
      nullif(btrim(p_payload ->> 'initiation_key'), '');

    if v_initiation_key not in (
      'waits_for_client',
      'may_ask_without_assuming_inclusion',
      'depends',
      'other'
    ) then
      raise exception
        'Invalid initiation_key.'
        using errcode = '22023';
    end if;


    -- initiation_note is only meaningful for "other".
    if v_initiation_key = 'other' then

      if jsonb_typeof(p_payload -> 'initiation_note')
           is distinct from 'string' then
        raise exception
          'A short explanation is required when initiation_key is other.'
          using errcode = '22023';
      end if;

      v_initiation_note :=
        nullif(btrim(p_payload ->> 'initiation_note'), '');

      if v_initiation_note is null then
        raise exception
          'A short explanation is required when initiation_key is other.'
          using errcode = '22023';
      end if;

      if char_length(v_initiation_note) > 250 then
        raise exception
          'initiation_note must be 250 characters or fewer.'
          using errcode = '22023';
      end if;

    else
      v_initiation_note := null;
    end if;


    -- ========================================================
    -- Integration is required when discussion is yes/depends.
    -- ========================================================

    if jsonb_typeof(p_payload -> 'integration_key')
         is distinct from 'string' then
      raise exception
        'integration_key is required.'
        using errcode = '22023';
    end if;

    v_integration_key :=
      nullif(btrim(p_payload ->> 'integration_key'), '');

    if v_integration_key not in ('yes', 'no', 'depends') then
      raise exception
        'Invalid integration_key.'
        using errcode = '22023';
    end if;


    -- ========================================================
    -- Normalize integration mode from the integration answer.
    -- ========================================================

    if v_integration_key = 'no' then

      v_integration_mode_key := 'not_offered';

    elsif v_integration_key = 'depends' then

      v_integration_mode_key := 'depends';

    else

      if jsonb_typeof(p_payload -> 'integration_mode_key')
           is distinct from 'string' then
        raise exception
          'integration_mode_key is required when integration_key is yes.'
          using errcode = '22023';
      end if;

      v_integration_mode_key :=
        nullif(btrim(p_payload ->> 'integration_mode_key'), '');

      if v_integration_mode_key not in (
        'available_on_request',
        'distinct_practice_option'
      ) then
        raise exception
          'Invalid integration_mode_key for an affirmative integration response.'
          using errcode = '22023';
      end if;

    end if;


    -- ========================================================
    -- Islamic counselling claim requires integration.
    -- ========================================================

    if v_claims_islamic_counselling
       and v_integration_key = 'no' then
      raise exception
        'Islamic counselling cannot be claimed when faith integration is not offered.'
        using errcode = '22023';
    end if;

  end if;


  -- ==========================================================
  -- Islamic counselling definition.
  -- ==========================================================

  if v_claims_islamic_counselling then

    if jsonb_typeof(p_payload -> 'islamic_counselling_definition')
         is distinct from 'string' then
      raise exception
        'A definition is required when Islamic counselling is claimed.'
        using errcode = '22023';
    end if;

    v_islamic_counselling_definition :=
      nullif(
        btrim(p_payload ->> 'islamic_counselling_definition'),
        ''
      );

    if v_islamic_counselling_definition is null then
      raise exception
        'A definition is required when Islamic counselling is claimed.'
        using errcode = '22023';
    end if;

    if char_length(v_islamic_counselling_definition) > 500 then
      raise exception
        'islamic_counselling_definition must be 500 characters or fewer.'
        using errcode = '22023';
    end if;

  else
    v_islamic_counselling_definition := null;
  end if;


  -- ==========================================================
  -- Authoritative canonical upsert.
  --
  -- Intentionally preserve fields that are NOT owned by this
  -- V0.1 intake:
  --
  -- specialist_islamic_training
  -- specialist_training_context
  -- additional_context
  -- public_visible
  --
  -- Structured note fields not used by this intake are cleared
  -- where this section owns their meaning.
  -- ==========================================================

  insert into public.faith_practice_profiles (
    counsellor_id,
    discussion_comfort_key,
    discussion_comfort_note,
    initiation_key,
    initiation_note,
    integration_key,
    integration_note,
    integration_mode_key,
    claims_islamic_counselling,
    islamic_counselling_definition
  )
  values (
    v_counsellor_id,
    v_discussion_comfort_key,
    null,
    v_initiation_key,
    v_initiation_note,
    v_integration_key,
    null,
    v_integration_mode_key,
    v_claims_islamic_counselling,
    v_islamic_counselling_definition
  )
  on conflict (counsellor_id)
  do update set
    discussion_comfort_key =
      excluded.discussion_comfort_key,
    discussion_comfort_note =
      excluded.discussion_comfort_note,
    initiation_key =
      excluded.initiation_key,
    initiation_note =
      excluded.initiation_note,
    integration_key =
      excluded.integration_key,
    integration_note =
      excluded.integration_note,
    integration_mode_key =
      excluded.integration_mode_key,
    claims_islamic_counselling =
      excluded.claims_islamic_counselling,
    islamic_counselling_definition =
      excluded.islamic_counselling_definition;


  -- ==========================================================
  -- This RPC only writes a fully valid Faith V0.1 record.
  -- Therefore a successful save completes the section.
  -- ==========================================================

  perform public.update_my_counsellor_onboarding_section(
    'faith',
    'complete'
  );

end;
$$;


ALTER FUNCTION "public"."save_my_counsellor_faith_profile"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_my_counsellor_practice_areas"("p_payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_account_count integer;
  v_counsellor_id uuid;
  v_total_count integer;
  v_primary_count integer;
  v_additional_count integer;
begin

  -- ----------------------------------------------------------
  -- Resolve authenticated caller -> exactly one counsellor.
  -- ----------------------------------------------------------

  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count <> 1 then
    raise exception
      'Exactly one linked counsellor account is required'
      using errcode = '42501';
  end if;

  select a.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() a;


  -- ----------------------------------------------------------
  -- Validate payload envelope.
  -- ----------------------------------------------------------

  if jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception
      'Payload must be a JSON object'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_payload -> 'practice_areas')
       is distinct from 'array' then
    raise exception
      'practice_areas must be an array'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Validate array element structure BEFORE reading fields.
  -- ----------------------------------------------------------

  if exists (
    select 1
    from jsonb_array_elements(
      p_payload -> 'practice_areas'
    ) as item(value)
    where jsonb_typeof(item.value) is distinct from 'object'
  ) then
    raise exception
      'Each practice area must be an object'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Validate required fields and controlled emphasis values.
  -- ----------------------------------------------------------

  if exists (
    select 1
    from jsonb_array_elements(
      p_payload -> 'practice_areas'
    ) as item(value)
    where
      nullif(
        btrim(item.value ->> 'practice_area_key'),
        ''
      ) is null
      or
      nullif(
        btrim(item.value ->> 'emphasis_key'),
        ''
      ) not in ('primary', 'additional')
  ) then
    raise exception
      'Each practice area requires a valid key and emphasis'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Validate duplicates after normalization.
  -- ----------------------------------------------------------

  if exists (
    with submitted as (
      select
        btrim(
          item.value ->> 'practice_area_key'
        ) as practice_area_key
      from jsonb_array_elements(
        p_payload -> 'practice_areas'
      ) as item(value)
    )
    select 1
    from submitted
    group by practice_area_key
    having count(*) > 1
  ) then
    raise exception
      'A concern cannot be selected more than once'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Validate taxonomy membership.
  -- Only active controlled taxonomy values are accepted.
  -- ----------------------------------------------------------

  if exists (
    with submitted as (
      select
        btrim(
          item.value ->> 'practice_area_key'
        ) as practice_area_key
      from jsonb_array_elements(
        p_payload -> 'practice_areas'
      ) as item(value)
    )
    select 1
    from submitted s
    left join public.practice_area_taxonomy t
      on t.key = s.practice_area_key
     and t.active = true
    where t.key is null
  ) then
    raise exception
      'Only active taxonomy concerns may be selected'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Calculate counts only after structural validation.
  -- ----------------------------------------------------------

  with submitted as (
    select
      btrim(
        item.value ->> 'practice_area_key'
      ) as practice_area_key,
      btrim(
        item.value ->> 'emphasis_key'
      ) as emphasis_key
    from jsonb_array_elements(
      p_payload -> 'practice_areas'
    ) as item(value)
  )
  select
    count(*)::integer,
    count(*) filter (
      where emphasis_key = 'primary'
    )::integer,
    count(*) filter (
      where emphasis_key = 'additional'
    )::integer
  into
    v_total_count,
    v_primary_count,
    v_additional_count
  from submitted;


  -- ----------------------------------------------------------
  -- Enforce product limits.
  -- ----------------------------------------------------------

  if v_primary_count < 1 then
    raise exception
      'At least one main concern is required'
      using errcode = '22023';
  end if;

  if v_primary_count > 3 then
    raise exception
      'A maximum of 3 main concerns is allowed'
      using errcode = '22023';
  end if;

  if v_additional_count > 5 then
    raise exception
      'A maximum of 5 other concerns is allowed'
      using errcode = '22023';
  end if;

  if v_total_count > 8 then
    raise exception
      'A maximum of 8 concerns is allowed'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Authoritative synchronization.
  --
  -- Validation above completes before any canonical mutation.
  -- ----------------------------------------------------------

  delete from public.counsellor_practice_areas
  where counsellor_id = v_counsellor_id;


  insert into public.counsellor_practice_areas (
    counsellor_id,
    practice_area_key,
    emphasis_key,
    counsellor_note,
    public_visible,
    active
  )
  select
    v_counsellor_id,
    btrim(
      item.value ->> 'practice_area_key'
    ),
    btrim(
      item.value ->> 'emphasis_key'
    ),
    null,
    true,
    true
  from jsonb_array_elements(
    p_payload -> 'practice_areas'
  ) as item(value);


  -- ----------------------------------------------------------
  -- Complete onboarding section only after canonical save.
  -- Failure here rolls back the entire transaction.
  -- ----------------------------------------------------------

  perform public.update_my_counsellor_onboarding_section(
    'what_you_help_with',
    'complete'
  );

end;
$$;


ALTER FUNCTION "public"."save_my_counsellor_practice_areas"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_my_counsellor_service_declarations"("p_payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_counsellor_id uuid;
  v_account_count integer;
  v_declaration jsonb;
  v_service_type_key text;
  v_client_group_keys text[];
  v_gender_scope_key text;
  v_gender_scope_note text;
  v_selected_service_type_keys text[] := array[]::text[];
  v_removed_service_type_keys text[] := array[]::text[];
begin

  -- ----------------------------------------------------------
  -- Resolve caller -> counsellor.
  -- Exactly one active linked counsellor is required.
  -- ----------------------------------------------------------

  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count <> 1 then
    raise exception
      'Exactly one linked counsellor account is required.'
      using errcode = '42501';
  end if;

  select account.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() as account;


  -- ----------------------------------------------------------
  -- Validate payload envelope.
  -- ----------------------------------------------------------

  if p_payload is null
     or jsonb_typeof(p_payload) <> 'object'
     or jsonb_typeof(p_payload -> 'declarations') <> 'array'
  then
    raise exception
      'Payload must contain a declarations array.'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- PASS 1: validate complete payload before mutation.
  -- ----------------------------------------------------------

  for v_declaration in
    select value
    from jsonb_array_elements(p_payload -> 'declarations')
  loop

    v_service_type_key :=
      nullif(btrim(v_declaration ->> 'service_type_key'), '');

    v_gender_scope_key :=
      nullif(btrim(v_declaration ->> 'client_gender_scope_key'), '');

    v_gender_scope_note :=
      nullif(btrim(v_declaration ->> 'client_gender_scope_note'), '');


    if v_service_type_key is null then
      raise exception
        'Each declaration requires a service_type_key.'
        using errcode = '22023';
    end if;


    if v_service_type_key = any(v_selected_service_type_keys) then
      raise exception
        'Duplicate service_type_key: %',
        v_service_type_key
        using errcode = '22023';
    end if;


    if not exists (
      select 1
      from public.service_types st
      where st.key = v_service_type_key
        and st.active = true
    ) then
      raise exception
        'Unknown or inactive service_type_key: %',
        v_service_type_key
        using errcode = '22023';
    end if;


    if v_gender_scope_key not in (
      'not_specified',
      'all_genders',
      'women_only',
      'men_only',
      'other'
    ) then
      raise exception
        'Invalid client_gender_scope_key for %.',
        v_service_type_key
        using errcode = '22023';
    end if;


    if v_gender_scope_key = 'other'
       and v_gender_scope_note is null then
      raise exception
        'A note is required when client_gender_scope_key is other.'
        using errcode = '22023';
    end if;


    if length(coalesce(v_gender_scope_note, '')) > 180 then
      raise exception
        'Gender eligibility note is too long.'
        using errcode = '22023';
    end if;


    if v_gender_scope_key <> 'other' then
      v_gender_scope_note := null;
    end if;


    select coalesce(
      array_agg(
        distinct submitted.client_group_key
        order by submitted.client_group_key
      ),
      array[]::text[]
    )
    into v_client_group_keys
    from jsonb_array_elements_text(
      coalesce(
        v_declaration -> 'client_group_keys',
        '[]'::jsonb
      )
    ) as submitted(client_group_key);


    if cardinality(v_client_group_keys) = 0 then
      raise exception
        'At least one client group is required for %.',
        v_service_type_key
        using errcode = '22023';
    end if;


    if exists (
      select 1
      from unnest(v_client_group_keys)
        as submitted(client_group_key)
      where not exists (
        select 1
        from public.client_groups cg
        where cg.key = submitted.client_group_key
          and cg.active = true
      )
    ) then
      raise exception
        'Unknown or inactive client group submitted for %.',
        v_service_type_key
        using errcode = '22023';
    end if;


    v_selected_service_type_keys :=
      array_append(
        v_selected_service_type_keys,
        v_service_type_key
      );

  end loop;


  -- Deliberately prevent empty submission from meaning
  -- "delete all declarations".
  if cardinality(v_selected_service_type_keys) = 0 then
    raise exception
      'At least one service declaration is required.'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Compute declarations being removed.
  -- ----------------------------------------------------------

  select coalesce(
    array_agg(
      d.service_type_key
      order by d.service_type_key
    ),
    array[]::text[]
  )
  into v_removed_service_type_keys
  from public.counsellor_service_declarations d
  where d.counsellor_id = v_counsellor_id
    and d.service_type_key <> all(v_selected_service_type_keys);


  -- ----------------------------------------------------------
  -- Remove operational offerings for declarations that are
  -- being deliberately removed.
  --
  -- Existing FK cascades remove offering-owned:
  -- - client groups
  -- - virtual regions
  -- - fee policies
  -- - offering-specific appointment windows
  --
  -- Physical service locations are intentionally preserved.
  -- ----------------------------------------------------------

  if cardinality(v_removed_service_type_keys) > 0 then
    delete from public.service_offerings so
    where so.counsellor_id = v_counsellor_id
      and so.service_type_key = any(v_removed_service_type_keys);
  end if;


  -- ----------------------------------------------------------
  -- Remove deselected declarations.
  -- Declaration client groups cascade from declaration.
  -- ----------------------------------------------------------

  delete from public.counsellor_service_declarations d
  where d.counsellor_id = v_counsellor_id
    and d.service_type_key <> all(v_selected_service_type_keys);


  -- ----------------------------------------------------------
  -- Upsert current declarations and replace their client groups.
  -- ----------------------------------------------------------

  for v_declaration in
    select value
    from jsonb_array_elements(p_payload -> 'declarations')
  loop

    v_service_type_key :=
      btrim(v_declaration ->> 'service_type_key');

    v_gender_scope_key :=
      btrim(v_declaration ->> 'client_gender_scope_key');

    v_gender_scope_note :=
      nullif(
        btrim(v_declaration ->> 'client_gender_scope_note'),
        ''
      );


    if v_gender_scope_key <> 'other' then
      v_gender_scope_note := null;
    end if;


    select coalesce(
      array_agg(
        distinct submitted.client_group_key
        order by submitted.client_group_key
      ),
      array[]::text[]
    )
    into v_client_group_keys
    from jsonb_array_elements_text(
      coalesce(
        v_declaration -> 'client_group_keys',
        '[]'::jsonb
      )
    ) as submitted(client_group_key);


    insert into public.counsellor_service_declarations (
      counsellor_id,
      service_type_key,
      client_gender_scope_key,
      client_gender_scope_note
    )
    values (
      v_counsellor_id,
      v_service_type_key,
      v_gender_scope_key,
      v_gender_scope_note
    )
    on conflict (
      counsellor_id,
      service_type_key
    )
    do update set
      client_gender_scope_key =
        excluded.client_gender_scope_key,
      client_gender_scope_note =
        excluded.client_gender_scope_note,
      updated_at = now();


    delete from
      public.counsellor_service_declaration_client_groups cg
    where cg.counsellor_id = v_counsellor_id
      and cg.service_type_key = v_service_type_key;


    insert into
      public.counsellor_service_declaration_client_groups (
        counsellor_id,
        service_type_key,
        client_group_key
      )
    select
      v_counsellor_id,
      v_service_type_key,
      submitted.client_group_key
    from unnest(v_client_group_keys)
      as submitted(client_group_key);

  end loop;


  perform public.update_my_counsellor_onboarding_section(
    'who_you_work_with',
    'complete'
  );

end;
$$;


ALTER FUNCTION "public"."save_my_counsellor_service_declarations"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_my_counsellor_working_style_responses"("p_payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $_$
declare
  v_account_count integer;
  v_counsellor_id uuid;
  v_questionnaire_version integer;
  v_applicable_question_count integer;
  v_answered_question_count integer;
  v_other_note_max_length constant integer := 500;
begin

  -- ==========================================================
  -- Resolve authenticated caller
  -- ==========================================================

  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count <> 1 then
    raise exception
      'Exactly one active linked counsellor account is required.'
      using errcode = '42501';
  end if;

  select a.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() a;


  -- ==========================================================
  -- Validate payload envelope
  -- ==========================================================

  if p_payload is null
     or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception
      'Payload must be a JSON object.'
      using errcode = '22023';
  end if;

  if not (p_payload ? 'questionnaire_version') then
    raise exception
      'questionnaire_version is required.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_payload -> 'questionnaire_version')
       is distinct from 'number'
     or not (
       (p_payload ->> 'questionnaire_version') ~ '^[0-9]+$'
     ) then
    raise exception
      'questionnaire_version must be an integer.'
      using errcode = '22023';
  end if;

  v_questionnaire_version :=
    (p_payload ->> 'questionnaire_version')::integer;

  if v_questionnaire_version <> 1 then
    raise exception
      'Only questionnaire_version 1 is supported for this intake.'
      using errcode = '22023';
  end if;

  if not (p_payload ? 'responses')
     or jsonb_typeof(p_payload -> 'responses')
          is distinct from 'array' then
    raise exception
      'responses must be an array.'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- Temporary normalized payload state
  -- ==========================================================

  drop table if exists pg_temp._ws_payload_responses;
  drop table if exists pg_temp._ws_payload_contexts;
  drop table if exists pg_temp._ws_saved_responses;

  create temporary table pg_temp._ws_payload_responses (
    row_number integer primary key,
    question_key text not null,
    option_key text not null,
    context_keys jsonb not null,
    clarification_note text
  ) on commit drop;

  create temporary table pg_temp._ws_payload_contexts (
    row_number integer not null,
    context_key text not null
  ) on commit drop;

  create temporary table pg_temp._ws_saved_responses (
    response_id uuid primary key,
    question_key text not null
  ) on commit drop;


  -- ==========================================================
  -- Validate response object structure
  -- ==========================================================

  if exists (
    select 1
    from jsonb_array_elements(
      p_payload -> 'responses'
    ) as item(value)
    where jsonb_typeof(item.value)
            is distinct from 'object'
  ) then
    raise exception
      'Every response entry must be an object.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(
      p_payload -> 'responses'
    ) as item(value)
    where
      jsonb_typeof(item.value -> 'question_key')
        is distinct from 'string'
      or
      jsonb_typeof(item.value -> 'option_key')
        is distinct from 'string'
      or (
        item.value ? 'context_keys'
        and jsonb_typeof(item.value -> 'context_keys')
              is distinct from 'array'
      )
      or (
        item.value ? 'clarification_note'
        and jsonb_typeof(item.value -> 'clarification_note')
              not in ('string', 'null')
      )
  ) then
    raise exception
      'Each response requires string question_key and option_key, optional array context_keys, and optional string/null clarification_note.'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- Normalize response rows
  -- ==========================================================

  insert into pg_temp._ws_payload_responses (
    row_number,
    question_key,
    option_key,
    context_keys,
    clarification_note
  )
  select
    ordinality::integer,
    btrim(item.value ->> 'question_key'),
    btrim(item.value ->> 'option_key'),
    coalesce(
      item.value -> 'context_keys',
      '[]'::jsonb
    ),
    nullif(
      btrim(item.value ->> 'clarification_note'),
      ''
    )
  from jsonb_array_elements(
    p_payload -> 'responses'
  ) with ordinality as item(value, ordinality);


  if exists (
    select 1
    from pg_temp._ws_payload_responses
    where question_key = ''
       or option_key = ''
  ) then
    raise exception
      'question_key and option_key cannot be blank.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_temp._ws_payload_responses
    group by question_key
    having count(*) > 1
  ) then
    raise exception
      'Duplicate question_key values are not allowed.'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- Validate context array element types BEFORE normalization
  -- ==========================================================

  if exists (
    select 1
    from pg_temp._ws_payload_responses r
    cross join jsonb_array_elements(
      r.context_keys
    ) as c(value)
    where jsonb_typeof(c.value)
            is distinct from 'string'
  ) then
    raise exception
      'context_keys must contain only strings.'
      using errcode = '22023';
  end if;


  insert into pg_temp._ws_payload_contexts (
    row_number,
    context_key
  )
  select
    r.row_number,
    btrim(c.value #>> '{}')
  from pg_temp._ws_payload_responses r
  cross join jsonb_array_elements(
    r.context_keys
  ) as c(value);


  if exists (
    select 1
    from pg_temp._ws_payload_contexts
    where context_key = ''
  ) then
    raise exception
      'context_keys cannot contain blank values.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_temp._ws_payload_contexts
    group by row_number, context_key
    having count(*) > 1
  ) then
    raise exception
      'Duplicate context keys are not allowed for a response.'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- Resolve applicable V0.1 question set
  -- ==========================================================

  select count(*)::integer
  into v_applicable_question_count
  from public.working_style_questions q
  where q.questionnaire_version =
          v_questionnaire_version
    and q.active = true
    and q.research_status_key <> 'deprecated'
    and q.service_type_key is null;

  if v_applicable_question_count = 0 then
    raise exception
      'No active applicable questions exist for questionnaire_version %.',
      v_questionnaire_version
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- Validate submitted questions
  -- ==========================================================

  if exists (
    select 1
    from pg_temp._ws_payload_responses r
    left join public.working_style_questions q
      on q.key = r.question_key
     and q.questionnaire_version =
           v_questionnaire_version
     and q.active = true
     and q.research_status_key <> 'deprecated'
     and q.service_type_key is null
    where q.key is null
  ) then
    raise exception
      'Response includes an inactive, deprecated, missing, service-scoped, or wrong-version question.'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- Validate submitted options
  -- ==========================================================

  if exists (
    select 1
    from pg_temp._ws_payload_responses r
    left join public.working_style_question_options o
      on o.question_key = r.question_key
     and o.option_key = r.option_key
     and o.active = true
    where o.option_key is null
  ) then
    raise exception
      'Response includes an inactive or missing option for its question.'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- Ordinary answer rules
  -- ==========================================================

  if exists (
    select 1
    from pg_temp._ws_payload_contexts pc
    join pg_temp._ws_payload_responses r
      on r.row_number = pc.row_number
    join public.working_style_question_options o
      on o.question_key = r.question_key
     and o.option_key = r.option_key
    where o.is_varies = false
  ) then
    raise exception
      'Ordinary answers cannot include context reasons.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_temp._ws_payload_responses r
    join public.working_style_question_options o
      on o.question_key = r.question_key
     and o.option_key = r.option_key
    where o.is_varies = false
      and r.clarification_note is not null
  ) then
    raise exception
      'Ordinary answers cannot include clarification notes.'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- Varies answer rules
  -- ==========================================================

  if exists (
    select 1
    from pg_temp._ws_payload_responses r
    join public.working_style_questions q
      on q.key = r.question_key
    join public.working_style_question_options o
      on o.question_key = r.question_key
     and o.option_key = r.option_key
    where o.is_varies = true
      and q.allows_varies = false
  ) then
    raise exception
      'A varies option was submitted for a question that does not allow varies.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_temp._ws_payload_responses r
    join public.working_style_question_options o
      on o.question_key = r.question_key
     and o.option_key = r.option_key
    where o.is_varies = true
      and not exists (
        select 1
        from pg_temp._ws_payload_contexts pc
        where pc.row_number = r.row_number
      )
  ) then
    raise exception
      'Varies answers require at least one context reason.'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- Validate context taxonomy
  -- ==========================================================

  if exists (
    select 1
    from pg_temp._ws_payload_contexts pc
    left join public.working_style_context_reasons cr
      on cr.key = pc.context_key
     and cr.active = true
    where cr.key is null
  ) then
    raise exception
      'Response includes an inactive or missing context reason.'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- "Other" clarification semantics
  -- ==========================================================

  if exists (
    select 1
    from pg_temp._ws_payload_responses r
    where exists (
      select 1
      from pg_temp._ws_payload_contexts pc
      where pc.row_number = r.row_number
        and pc.context_key = 'other'
    )
    and r.clarification_note is null
  ) then
    raise exception
      'clarification_note is required when context key other is selected.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from pg_temp._ws_payload_responses r
    where exists (
      select 1
      from pg_temp._ws_payload_contexts pc
      where pc.row_number = r.row_number
        and pc.context_key = 'other'
    )
      and char_length(r.clarification_note)
            > v_other_note_max_length
  ) then
    raise exception
      'clarification_note must be % characters or fewer.',
      v_other_note_max_length
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- AUTHORITATIVE SYNC
  --
  -- Remove omitted answers ONLY from the current active,
  -- non-deprecated, profile-level questionnaire version.
  --
  -- Historical/out-of-scope responses remain untouched.
  -- Context rows cascade on response deletion.
  -- ==========================================================

  delete from public.working_style_question_responses r
  using public.working_style_questions q
  where r.counsellor_id = v_counsellor_id
    and r.question_key = q.key
    and q.questionnaire_version =
          v_questionnaire_version
    and q.active = true
    and q.research_status_key <> 'deprecated'
    and q.service_type_key is null
    and not exists (
      select 1
      from pg_temp._ws_payload_responses pr
      where pr.question_key = r.question_key
    );


  -- ==========================================================
  -- Upsert submitted current responses
  --
  -- answered_at remains the original row creation timestamp.
  -- existing updated_at trigger records subsequent edits.
  -- ==========================================================

  with upserted as (
    insert into public.working_style_question_responses (
      counsellor_id,
      question_key,
      option_key,
      clarification_note,
      active
    )
    select
      v_counsellor_id,
      r.question_key,
      r.option_key,
      case
        when exists (
          select 1
          from pg_temp._ws_payload_contexts pc
          where pc.row_number = r.row_number
            and pc.context_key = 'other'
        )
        then r.clarification_note
        else null
      end,
      true
    from pg_temp._ws_payload_responses r

    on conflict (counsellor_id, question_key)
    do update set
      option_key = excluded.option_key,
      clarification_note =
        excluded.clarification_note,
      active = true

    returning id, question_key
  )
  insert into pg_temp._ws_saved_responses (
    response_id,
    question_key
  )
  select
    id,
    question_key
  from upserted;


  -- ==========================================================
  -- Rebuild contexts for submitted answers
  -- ==========================================================

  delete from public.working_style_response_contexts rc
  using pg_temp._ws_saved_responses sr
  where rc.response_id = sr.response_id;


  insert into public.working_style_response_contexts (
    response_id,
    context_key
  )
  select
    sr.response_id,
    pc.context_key
  from pg_temp._ws_payload_contexts pc
  join pg_temp._ws_payload_responses pr
    on pr.row_number = pc.row_number
  join pg_temp._ws_saved_responses sr
    on sr.question_key = pr.question_key;


  -- ==========================================================
  -- Determine questionnaire completion
  -- ==========================================================

  select count(*)::integer
  into v_answered_question_count
  from public.working_style_questions q
  join public.working_style_question_responses r
    on r.question_key = q.key
   and r.counsellor_id = v_counsellor_id
   and r.active = true
  join public.working_style_question_options o
    on o.question_key = r.question_key
   and o.option_key = r.option_key
   and o.active = true
  where q.questionnaire_version =
          v_questionnaire_version
    and q.active = true
    and q.research_status_key <> 'deprecated'
    and q.service_type_key is null;


  -- ==========================================================
  -- Update onboarding only after canonical writes
  -- ==========================================================

  if v_answered_question_count =
       v_applicable_question_count then

    perform public.update_my_counsellor_onboarding_section(
      'how_you_work',
      'complete'
    );

  else

    perform public.update_my_counsellor_onboarding_section(
      'how_you_work',
      'in_progress'
    );

  end if;

end;
$_$;


ALTER FUNCTION "public"."save_my_counsellor_working_style_responses"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_my_location_accessibility"("p_payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_counsellor_id uuid;
  v_account_count integer;
  v_intake_version integer;

  v_location_id uuid;
  v_feature jsonb;
  v_feature_key text;
  v_note text;

  v_confirmed_at timestamptz;

  v_feature_keys text[] := array[]::text[];
begin

  -- Resolve exactly one linked counsellor.
  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count <> 1 then
    raise exception
      'Exactly one linked counsellor account is required.'
      using errcode = '42501';
  end if;

  select account.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() account;


  -- Validate envelope.
  if p_payload is null
     or jsonb_typeof(p_payload) <> 'object'
  then
    raise exception
      'Accessibility payload must be a JSON object.'
      using errcode = '22023';
  end if;

  if (p_payload - array[
        'location_id',
        'features'
      ]) <> '{}'::jsonb
  then
    raise exception
      'Accessibility payload contains unsupported fields.'
      using errcode = '22023';
  end if;


  -- Location.
  if nullif(
       btrim(p_payload ->> 'location_id'),
       ''
     ) is null
  then
    raise exception
      'location_id is required.'
      using errcode = '22023';
  end if;

  begin
    v_location_id :=
      btrim(p_payload ->> 'location_id')::uuid;
  exception
    when invalid_text_representation then
      raise exception
        'Invalid location_id.'
        using errcode = '22023';
  end;


  if not exists (
    select 1
    from public.service_locations sl
    where sl.id = v_location_id
      and sl.counsellor_id = v_counsellor_id
      and sl.active = true
  ) then
    raise exception
      'Accessibility can only be saved for an active service location belonging to the counsellor.'
      using errcode = '22023';
  end if;


  -- Features array. Empty is valid.
  if not (p_payload ? 'features')
     or jsonb_typeof(p_payload -> 'features') <> 'array'
  then
    raise exception
      'features must be an array.'
      using errcode = '22023';
  end if;


  -- Validate everything before mutation.
  for v_feature in
    select value
    from jsonb_array_elements(p_payload -> 'features')
  loop

    if jsonb_typeof(v_feature) <> 'object' then
      raise exception
        'Each accessibility feature must be an object.'
        using errcode = '22023';
    end if;

    if (v_feature - array[
          'feature_key',
          'note'
        ]) <> '{}'::jsonb
    then
      raise exception
        'Accessibility feature contains unsupported fields.'
        using errcode = '22023';
    end if;

    v_feature_key :=
      nullif(
        btrim(v_feature ->> 'feature_key'),
        ''
      );

    if v_feature_key is null then
      raise exception
        'feature_key is required.'
        using errcode = '22023';
    end if;

    if v_feature_key = any(v_feature_keys) then
      raise exception
        'Duplicate accessibility feature in payload.'
        using errcode = '22023';
    end if;

    v_feature_keys :=
      array_append(
        v_feature_keys,
        v_feature_key
      );

    if not exists (
      select 1
      from public.accessibility_features af
      where af.key = v_feature_key
        and af.active = true
    ) then
      raise exception
        'Invalid or inactive accessibility feature.'
        using errcode = '22023';
    end if;

    v_note :=
      nullif(
        btrim(v_feature ->> 'note'),
        ''
      );

    if v_note is not null
       and char_length(v_note) > 280
    then
      raise exception
        'Accessibility feature note cannot exceed 280 characters.'
        using errcode = '22023';
    end if;

  end loop;


  v_confirmed_at := now();


  -- Replace positive features for this location.
  delete from public.location_accessibility la
  where la.location_id = v_location_id;


  for v_feature in
    select value
    from jsonb_array_elements(p_payload -> 'features')
  loop

    v_feature_key :=
      btrim(v_feature ->> 'feature_key');

    v_note :=
      nullif(
        btrim(v_feature ->> 'note'),
        ''
      );

    insert into public.location_accessibility (
      location_id,
      feature_key,
      status_key,
      note,
      confirmed_at
    )
    values (
      v_location_id,
      v_feature_key,
      'available',
      v_note,
      v_confirmed_at
    );

  end loop;


  -- Ensure onboarding exists so we have the active intake version.
  perform public.initialize_my_counsellor_onboarding();

  select onboarding.intake_version
  into strict v_intake_version
  from private.counsellor_onboarding_state onboarding
  where onboarding.counsellor_id = v_counsellor_id;


  -- Record explicit review independently from positive facts.
  insert into private.counsellor_location_accessibility_reviews (
    counsellor_id,
    intake_version,
    location_id,
    reviewed_at,
    updated_at
  )
  values (
    v_counsellor_id,
    v_intake_version,
    v_location_id,
    v_confirmed_at,
    v_confirmed_at
  )
  on conflict (
    counsellor_id,
    intake_version,
    location_id
  )
  do update
  set
    reviewed_at = excluded.reviewed_at,
    updated_at = excluded.updated_at;


  perform public.update_my_counsellor_onboarding_section(
    'practical_details',
    'in_progress'
  );

end;
$$;


ALTER FUNCTION "public"."save_my_location_accessibility"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_my_practical_service_configurations"("p_payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_counsellor_id uuid;
  v_account_count integer;

  v_configuration jsonb;

  v_service_type_key text;
  v_delivery_mode_key text;
  v_location_id uuid;
  v_practice_id uuid;
  v_location_practice_id uuid;

  v_region_keys text[];

  v_gender_scope_key text;
  v_gender_scope_note text;
  v_client_group_keys text[];

  v_offering_id uuid;

  v_configuration_keys text[] := array[]::text[];
  v_configuration_key text;
begin

  -- ----------------------------------------------------------
  -- Resolve caller -> exactly one linked counsellor.
  -- ----------------------------------------------------------

  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count <> 1 then
    raise exception
      'Exactly one linked counsellor account is required.'
      using errcode = '42501';
  end if;

  select account.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() as account;


  -- ----------------------------------------------------------
  -- Validate envelope.
  -- ----------------------------------------------------------

  if p_payload is null
     or jsonb_typeof(p_payload) <> 'object'
     or jsonb_typeof(p_payload -> 'configurations') <> 'array'
  then
    raise exception
      'Payload must contain a configurations array.'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- PASS 1
  -- Validate the complete payload before mutation.
  -- ----------------------------------------------------------

  for v_configuration in
    select value
    from jsonb_array_elements(p_payload -> 'configurations')
  loop

    if jsonb_typeof(v_configuration) <> 'object' then
      raise exception
        'Each service configuration must be an object.'
        using errcode = '22023';
    end if;


    v_service_type_key :=
      nullif(
        btrim(v_configuration ->> 'service_type_key'),
        ''
      );

    v_delivery_mode_key :=
      nullif(
        btrim(v_configuration ->> 'delivery_mode_key'),
        ''
      );


    if v_service_type_key is null then
      raise exception
        'Each configuration requires a service_type_key.'
        using errcode = '22023';
    end if;


    if v_delivery_mode_key not in (
      'in_person',
      'virtual'
    ) then
      raise exception
        'Practical Details V0.1 supports only in_person and virtual delivery.'
        using errcode = '22023';
    end if;


    -- Service must already exist in Who You Work With.
    if not exists (
      select 1
      from public.counsellor_service_declarations d
      where d.counsellor_id = v_counsellor_id
        and d.service_type_key = v_service_type_key
    ) then
      raise exception
        'Service type % has not been declared.',
        v_service_type_key
        using errcode = '22023';
    end if;


    -- ========================================================
    -- IN-PERSON VALIDATION
    -- ========================================================

    if v_delivery_mode_key = 'in_person' then

      -- Keep the browser contract narrow.
      if (v_configuration - array[
            'service_type_key',
            'delivery_mode_key',
            'location_id'
          ]) <> '{}'::jsonb
      then
        raise exception
          'In-person configuration contains unsupported fields.'
          using errcode = '22023';
      end if;


      if nullif(
           btrim(v_configuration ->> 'location_id'),
           ''
         ) is null
      then
        raise exception
          'In-person configuration requires location_id.'
          using errcode = '22023';
      end if;


      begin
        v_location_id :=
          (btrim(v_configuration ->> 'location_id'))::uuid;
      exception
        when invalid_text_representation then
          raise exception
            'Invalid location_id.'
            using errcode = '22023';
      end;


      select l.practice_id
      into v_location_practice_id
      from public.service_locations l
      where l.id = v_location_id
        and l.counsellor_id = v_counsellor_id
        and l.active = true;

      if not found then
        raise exception
          'In-person location must be an active location belonging to the counsellor.'
          using errcode = '22023';
      end if;


      -- Configuration identity:
      -- service + in_person + location.
      v_configuration_key :=
        v_service_type_key
        || '|in_person|'
        || v_location_id::text;


    -- ========================================================
    -- VIRTUAL VALIDATION
    -- ========================================================

    else

      if (v_configuration - array[
            'service_type_key',
            'delivery_mode_key',
            'practice_id',
            'region_keys'
          ]) <> '{}'::jsonb
      then
        raise exception
          'Virtual configuration contains unsupported fields.'
          using errcode = '22023';
      end if;


      v_practice_id := null;

      if nullif(
           btrim(v_configuration ->> 'practice_id'),
           ''
         ) is not null
      then
        begin
          v_practice_id :=
            (btrim(v_configuration ->> 'practice_id'))::uuid;
        exception
          when invalid_text_representation then
            raise exception
              'Invalid practice_id.'
              using errcode = '22023';
        end;


        if not exists (
          select 1
          from public.counsellor_practice_affiliations cpa
          where cpa.counsellor_id = v_counsellor_id
            and cpa.practice_id = v_practice_id
            and cpa.ended_on is null
        ) then
          raise exception
            'Virtual practice must be an active affiliation for the counsellor.'
            using errcode = '22023';
        end if;
      end if;


      if jsonb_typeof(
           coalesce(
             v_configuration -> 'region_keys',
             '[]'::jsonb
           )
         ) <> 'array'
      then
        raise exception
          'region_keys must be an array.'
          using errcode = '22023';
      end if;


      select coalesce(
        array_agg(
          distinct submitted.region_key
          order by submitted.region_key
        ),
        array[]::text[]
      )
      into v_region_keys
      from jsonb_array_elements_text(
        coalesce(
          v_configuration -> 'region_keys',
          '[]'::jsonb
        )
      ) as submitted(region_key);


      if cardinality(v_region_keys) = 0 then
        raise exception
          'Virtual configuration requires at least one region.'
          using errcode = '22023';
      end if;


      if exists (
        select 1
        from unnest(v_region_keys)
          as submitted(region_key)
        where not exists (
          select 1
          from public.service_regions sr
          where sr.key = submitted.region_key
            and sr.active = true
        )
      ) then
        raise exception
          'Unknown or inactive virtual service region.'
          using errcode = '22023';
      end if;


      -- V0.1 permits only one active virtual offering per
      -- counsellor/service, so practice does not form part of
      -- configuration identity.
      v_configuration_key :=
        v_service_type_key || '|virtual';

    end if;


    -- --------------------------------------------------------
    -- Prevent duplicate configurations in submitted payload.
    -- --------------------------------------------------------

    if v_configuration_key = any(v_configuration_keys) then
      raise exception
        'Duplicate service configuration submitted.'
        using errcode = '22023';
    end if;

    v_configuration_keys :=
      array_append(
        v_configuration_keys,
        v_configuration_key
      );

  end loop;


  -- ----------------------------------------------------------
  -- Require every current service declaration to have at least
  -- one submitted delivery configuration.
  --
  -- Practical Details is authoritative for HOW the declared
  -- services are delivered.
  -- ----------------------------------------------------------

  if exists (
    select 1
    from public.counsellor_service_declarations d
    where d.counsellor_id = v_counsellor_id
      and not exists (
        select 1
        from jsonb_array_elements(
          p_payload -> 'configurations'
        ) as submitted(configuration)
        where nullif(
                btrim(
                  submitted.configuration ->> 'service_type_key'
                ),
                ''
              ) = d.service_type_key
      )
  ) then
    raise exception
      'Every declared service requires at least one delivery configuration.'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Remove V0.1-authored operational configurations that are
  -- no longer submitted.
  --
  -- Do not touch legacy hybrid rows.
  --
  -- Existing FK cascades clean:
  -- - offering client groups
  -- - virtual regions
  -- - fee policies
  -- - offering appointment windows
  -- ----------------------------------------------------------

  delete from public.service_offerings so
  where so.counsellor_id = v_counsellor_id
    and so.delivery_mode_key in ('in_person', 'virtual')
    and (
      (
        so.delivery_mode_key = 'in_person'
        and (
          so.service_type_key
          || '|in_person|'
          || so.location_id::text
        ) <> all(v_configuration_keys)
      )
      or
      (
        so.delivery_mode_key = 'virtual'
        and (
          so.service_type_key || '|virtual'
        ) <> all(v_configuration_keys)
      )
    );


  -- ----------------------------------------------------------
  -- PASS 2
  -- Upsert submitted configurations.
  -- ----------------------------------------------------------

  for v_configuration in
    select value
    from jsonb_array_elements(p_payload -> 'configurations')
  loop

    v_service_type_key :=
      btrim(v_configuration ->> 'service_type_key');

    v_delivery_mode_key :=
      btrim(v_configuration ->> 'delivery_mode_key');


    -- --------------------------------------------------------
    -- Load declaration eligibility.
    -- This remains canonical in declarations.
    -- --------------------------------------------------------

    select
      d.client_gender_scope_key,
      d.client_gender_scope_note
    into
      v_gender_scope_key,
      v_gender_scope_note
    from public.counsellor_service_declarations d
    where d.counsellor_id = v_counsellor_id
      and d.service_type_key = v_service_type_key;


    select coalesce(
      array_agg(
        dcg.client_group_key
        order by dcg.client_group_key
      ),
      array[]::text[]
    )
    into v_client_group_keys
    from public.counsellor_service_declaration_client_groups dcg
    where dcg.counsellor_id = v_counsellor_id
      and dcg.service_type_key = v_service_type_key;


    if cardinality(v_client_group_keys) = 0 then
      raise exception
        'Declared service % has no client groups.',
        v_service_type_key
        using errcode = '23514';
    end if;


    -- ========================================================
    -- IN-PERSON UPSERT
    -- ========================================================

    if v_delivery_mode_key = 'in_person' then

      v_location_id :=
        (btrim(v_configuration ->> 'location_id'))::uuid;


      select l.practice_id
      into v_location_practice_id
      from public.service_locations l
      where l.id = v_location_id
        and l.counsellor_id = v_counsellor_id
        and l.active = true;


      select so.id
      into v_offering_id
      from public.service_offerings so
      where so.counsellor_id = v_counsellor_id
        and so.service_type_key = v_service_type_key
        and so.delivery_mode_key = 'in_person'
        and so.location_id = v_location_id
        and so.active = true;


      if v_offering_id is null then

        insert into public.service_offerings (
          counsellor_id,
          practice_id,
          location_id,
          service_type_key,
          delivery_mode_key,
          scope_note,
          active,
          public_visible,
          client_gender_scope_key,
          client_gender_scope_note
        )
        values (
          v_counsellor_id,
          v_location_practice_id,
          v_location_id,
          v_service_type_key,
          'in_person',
          null,
          true,
          true,
          v_gender_scope_key,
          v_gender_scope_note
        )
        returning id
        into v_offering_id;

      else

        update public.service_offerings
        set
          -- Trigger independently derives this from location too.
          practice_id = v_location_practice_id,
          client_gender_scope_key = v_gender_scope_key,
          client_gender_scope_note = v_gender_scope_note,
          active = true,
          public_visible = true,
          updated_at = now()
        where id = v_offering_id;

      end if;


    -- ========================================================
    -- VIRTUAL UPSERT
    -- ========================================================

    else

      v_location_id := null;
      v_practice_id := null;

      if nullif(
           btrim(v_configuration ->> 'practice_id'),
           ''
         ) is not null
      then
        v_practice_id :=
          (btrim(v_configuration ->> 'practice_id'))::uuid;
      end if;


      select coalesce(
        array_agg(
          distinct submitted.region_key
          order by submitted.region_key
        ),
        array[]::text[]
      )
      into v_region_keys
      from jsonb_array_elements_text(
        v_configuration -> 'region_keys'
      ) as submitted(region_key);


      select so.id
      into v_offering_id
      from public.service_offerings so
      where so.counsellor_id = v_counsellor_id
        and so.service_type_key = v_service_type_key
        and so.delivery_mode_key = 'virtual'
        and so.active = true;


      if v_offering_id is null then

        insert into public.service_offerings (
          counsellor_id,
          practice_id,
          location_id,
          service_type_key,
          delivery_mode_key,
          scope_note,
          active,
          public_visible,
          client_gender_scope_key,
          client_gender_scope_note
        )
        values (
          v_counsellor_id,
          v_practice_id,
          null,
          v_service_type_key,
          'virtual',
          null,
          true,
          true,
          v_gender_scope_key,
          v_gender_scope_note
        )
        returning id
        into v_offering_id;

      else

        update public.service_offerings
        set
          practice_id = v_practice_id,
          location_id = null,
          client_gender_scope_key = v_gender_scope_key,
          client_gender_scope_note = v_gender_scope_note,
          active = true,
          public_visible = true,
          updated_at = now()
        where id = v_offering_id;

      end if;


      delete from public.service_offering_virtual_regions vr
      where vr.service_offering_id = v_offering_id;


      insert into public.service_offering_virtual_regions (
        service_offering_id,
        region_key
      )
      select
        v_offering_id,
        submitted.region_key
      from unnest(v_region_keys)
        as submitted(region_key);

    end if;


    -- --------------------------------------------------------
    -- Transitional compatibility copy:
    -- replace offering client groups from declaration.
    -- --------------------------------------------------------

    delete from public.service_offering_client_groups ocg
    where ocg.service_offering_id = v_offering_id;


    insert into public.service_offering_client_groups (
      service_offering_id,
      client_group_key
    )
    select
      v_offering_id,
      submitted.client_group_key
    from unnest(v_client_group_keys)
      as submitted(client_group_key);

  end loop;


  -- ----------------------------------------------------------
  -- Practical Details is NOT complete here.
  --
  -- This RPC configures delivery only.
  -- Fees, consultation, availability and other required
  -- Practical Details data are not yet authored.
  --
  -- Mark the section in progress rather than complete.
  -- ----------------------------------------------------------

  perform public.update_my_counsellor_onboarding_section(
    'practical_details',
    'in_progress'
  );

end;
$$;


ALTER FUNCTION "public"."save_my_practical_service_configurations"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_my_professional_education"("p_payload" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $_$
declare
  v_counsellor_id uuid;
  v_account_count integer;

  v_record_id uuid;
  v_degree_title text;
  v_field_of_study text;
  v_institution_name text;
  v_completion_year integer;
  v_country_code text;
begin
  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count <> 1 then
    raise exception
      'Exactly one linked counsellor account is required.'
      using errcode = '42501';
  end if;

  select account.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() account;

  if p_payload is null
     or jsonb_typeof(p_payload) <> 'object'
  then
    raise exception
      'Education payload must be a JSON object.'
      using errcode = '22023';
  end if;

  if (
    p_payload - array[
      'education_record_id',
      'degree_title',
      'field_of_study',
      'institution_name',
      'completion_year',
      'country_code'
    ]
  ) <> '{}'::jsonb
  then
    raise exception
      'Education payload contains unsupported fields.'
      using errcode = '22023';
  end if;

  if nullif(btrim(p_payload ->> 'education_record_id'), '') is not null then
    begin
      v_record_id :=
        btrim(p_payload ->> 'education_record_id')::uuid;
    exception
      when invalid_text_representation then
        raise exception
          'Invalid education_record_id.'
          using errcode = '22023';
    end;

    if not exists (
      select 1
      from public.education_records e
      where e.id = v_record_id
        and e.counsellor_id = v_counsellor_id
    ) then
      raise exception
        'Education record does not belong to the counsellor.'
        using errcode = '22023';
    end if;
  end if;

  v_degree_title :=
    nullif(btrim(p_payload ->> 'degree_title'), '');

  v_institution_name :=
    nullif(btrim(p_payload ->> 'institution_name'), '');

  v_field_of_study :=
    nullif(btrim(p_payload ->> 'field_of_study'), '');

  if v_degree_title is null then
    raise exception
      'Degree or qualification title is required.'
      using errcode = '22023';
  end if;

  if char_length(v_degree_title) > 200 then
    raise exception
      'Degree or qualification title is too long.'
      using errcode = '22023';
  end if;

  if v_institution_name is null then
    raise exception
      'Institution name is required.'
      using errcode = '22023';
  end if;

  if char_length(v_institution_name) > 200 then
    raise exception
      'Institution name is too long.'
      using errcode = '22023';
  end if;

  if v_field_of_study is not null
     and char_length(v_field_of_study) > 200
  then
    raise exception
      'Field of study is too long.'
      using errcode = '22023';
  end if;

  if nullif(btrim(p_payload ->> 'completion_year'), '') is not null then
    begin
      v_completion_year :=
        btrim(p_payload ->> 'completion_year')::integer;
    exception
      when invalid_text_representation then
        raise exception
          'Completion year must be a valid year.'
          using errcode = '22023';
    end;

    if v_completion_year < 1950
       or v_completion_year > extract(year from current_date)::integer + 10
    then
      raise exception
        'Completion year is outside the accepted range.'
        using errcode = '22023';
    end if;
  end if;

  v_country_code :=
    upper(nullif(btrim(p_payload ->> 'country_code'), ''));

  if v_country_code is not null
     and v_country_code !~ '^[A-Z]{2}$'
  then
    raise exception
      'Country code must use two letters.'
      using errcode = '22023';
  end if;

  if v_record_id is null then
    insert into public.education_records (
      counsellor_id,
      degree_title,
      field_of_study,
      institution_name,
      completion_year,
      country_code,
      public_visible,
      sort_order,
      created_at,
      updated_at
    )
    values (
      v_counsellor_id,
      v_degree_title,
      v_field_of_study,
      v_institution_name,
      v_completion_year,
      v_country_code,
      true,
      100,
      now(),
      now()
    )
    returning id into v_record_id;
  else
    update public.education_records e
    set
      degree_title = v_degree_title,
      field_of_study = v_field_of_study,
      institution_name = v_institution_name,
      completion_year = v_completion_year,
      country_code = v_country_code,
      public_visible = true,
      updated_at = now()
    where e.id = v_record_id
      and e.counsellor_id = v_counsellor_id;
  end if;

  perform public.update_my_counsellor_onboarding_section(
    'professional_background',
    'in_progress'
  );

  return v_record_id;
end;
$_$;


ALTER FUNCTION "public"."save_my_professional_education"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_my_professional_experience"("p_payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_counsellor_id uuid;
  v_account_count integer;
  v_start_year integer;
begin
  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count <> 1 then
    raise exception
      'Exactly one linked counsellor account is required.'
      using errcode = '42501';
  end if;

  select account.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() account;

  if p_payload is null
     or jsonb_typeof(p_payload) <> 'object'
  then
    raise exception
      'Experience payload must be a JSON object.'
      using errcode = '22023';
  end if;

  if (
    p_payload - array[
      'post_masters_practice_start_year'
    ]
  ) <> '{}'::jsonb
  then
    raise exception
      'Experience payload contains unsupported fields.'
      using errcode = '22023';
  end if;

  if nullif(
       btrim(p_payload ->> 'post_masters_practice_start_year'),
       ''
     ) is null
  then
    raise exception
      'Practice start year is required.'
      using errcode = '22023';
  end if;

  begin
    v_start_year :=
      btrim(
        p_payload ->> 'post_masters_practice_start_year'
      )::integer;
  exception
    when invalid_text_representation then
      raise exception
        'Practice start year must be a valid year.'
        using errcode = '22023';
  end;

  if v_start_year < 1950
     or v_start_year > extract(year from current_date)::integer
  then
    raise exception
      'Practice start year is outside the accepted range.'
      using errcode = '22023';
  end if;

  insert into public.professional_experience (
    counsellor_id,
    post_masters_practice_start_year,
    as_of_date,
    public_visible,
    created_at,
    updated_at
  )
  values (
    v_counsellor_id,
    v_start_year,
    current_date,
    true,
    now(),
    now()
  )
  on conflict (counsellor_id)
  do update
  set
    post_masters_practice_start_year =
      excluded.post_masters_practice_start_year,
    as_of_date = current_date,
    public_visible = true,
    updated_at = now();

  insert into private.counsellor_professional_background_reviews (
    counsellor_id,
    intake_version,
    experience_reviewed_at,
    updated_at
  )
  values (
    v_counsellor_id,
    1,
    now(),
    now()
  )
  on conflict (counsellor_id, intake_version)
  do update
  set
    experience_reviewed_at = now(),
    updated_at = now();

  perform public.update_my_counsellor_onboarding_section(
    'professional_background',
    'in_progress'
  );
end;
$$;


ALTER FUNCTION "public"."save_my_professional_experience"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_my_profile_voice_intake"("p_payload" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'private', 'pg_temp'
    AS $$
declare
  v_counsellor_id uuid;
  v_account_count integer;
  v_editable_count integer;
  v_editable_id uuid;
  v_next_version integer;
  v_people text;
  v_first_meeting text;
  v_new_id uuid;
begin
  if p_payload is null
     or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Profile voice payload must be a JSON object.';
  end if;

  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count = 0 then
    raise exception 'No linked counsellor account found.';
  elsif v_account_count > 1 then
    raise exception 'Multiple linked counsellor accounts found.';
  end if;

  select a.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() a;

  v_people := nullif(btrim(p_payload ->> 'people_often_come_to_me_when'), '');
  v_first_meeting := nullif(btrim(p_payload ->> 'first_meeting_expectation'), '');

  -- Required V0.1 field.
  if v_people is null then
    raise exception 'People often come to me when is required.';
  end if;

  -- Character guardrails.
  if char_length(v_people) < 250
     or char_length(v_people) > 700 then
    raise exception 'People often come to me when must be between 250 and 700 characters.';
  end if;

  if v_first_meeting is not null
     and (
       char_length(v_first_meeting) < 250
       or char_length(v_first_meeting) > 800
     ) then
    raise exception 'First meeting expectation must be between 250 and 800 characters when provided.';
  end if;

  select count(*)::integer
  into v_editable_count
  from public.counsellor_profile_voice v
  where v.counsellor_id = v_counsellor_id
    and v.superseded_at is null
    and v.moderation_status in ('draft', 'needs_changes');

  if v_editable_count > 1 then
    raise exception 'Multiple editable profile voice drafts exist. BCMC review is required.';
  end if;

  if v_editable_count = 1 then

    select v.id
    into strict v_editable_id
    from public.counsellor_profile_voice v
    where v.counsellor_id = v_counsellor_id
      and v.superseded_at is null
      and v.moderation_status in ('draft', 'needs_changes');

    update public.counsellor_profile_voice
    set
      people_often_come_to_me_when = v_people,
      first_meeting_expectation = v_first_meeting,
      counsellor_approved_at = null
    where id = v_editable_id
      and counsellor_id = v_counsellor_id;

    v_new_id := v_editable_id;

  else

    -- Advisory lock prevents concurrent first-save calls from allocating
    -- the same version for this counsellor.
    perform pg_advisory_xact_lock(
      hashtext(v_counsellor_id::text)
    );

    -- Recheck after obtaining the lock.
    select count(*)::integer
    into v_editable_count
    from public.counsellor_profile_voice v
    where v.counsellor_id = v_counsellor_id
      and v.superseded_at is null
      and v.moderation_status in ('draft', 'needs_changes');

    if v_editable_count > 1 then
      raise exception 'Multiple editable profile voice drafts exist. BCMC review is required.';
    elsif v_editable_count = 1 then
      select v.id
      into strict v_editable_id
      from public.counsellor_profile_voice v
      where v.counsellor_id = v_counsellor_id
        and v.superseded_at is null
        and v.moderation_status in ('draft', 'needs_changes');

      update public.counsellor_profile_voice
      set
        people_often_come_to_me_when = v_people,
        first_meeting_expectation = v_first_meeting,
        counsellor_approved_at = null
      where id = v_editable_id
        and counsellor_id = v_counsellor_id;

      v_new_id := v_editable_id;

    else
      select coalesce(max(v.version), 0) + 1
      into v_next_version
      from public.counsellor_profile_voice v
      where v.counsellor_id = v_counsellor_id;

      insert into public.counsellor_profile_voice (
        counsellor_id,
        version,
        about,
        people_often_come_to_me_when,
        something_to_know_before_we_meet,
        first_meeting_expectation,
        faith_culture_note,
        moderation_status,
        counsellor_approved_at,
        superseded_at
      )
      values (
        v_counsellor_id,
        v_next_version,
        null,
        v_people,
        null,
        v_first_meeting,
        null,
        'draft',
        null,
        null
      )
      returning id into v_new_id;
    end if;
  end if;

  insert into private.counsellor_profile_voice_reviews (
    counsellor_id,
    intake_version,
    first_meeting_reviewed_at,
    updated_at
  )
  values (
    v_counsellor_id,
    1,
    now(),
    now()
  )
  on conflict (counsellor_id, intake_version)
  do update set
    first_meeting_reviewed_at = excluded.first_meeting_reviewed_at,
    updated_at = now();

  perform public.update_my_counsellor_onboarding_section(
    'your_profile',
    'in_progress'
  );

  return v_new_id;
end;
$$;


ALTER FUNCTION "public"."save_my_profile_voice_intake"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_my_service_fee_policies"("p_payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_counsellor_id uuid;
  v_account_count integer;

  v_policy jsonb;
  v_offering_id uuid;

  v_fee_cents integer;
  v_currency_code text;
  v_session_minutes integer;
  v_fee_note text;
  v_sliding_scale_key text;
  v_rcc_receipts_available boolean;
  v_direct_billing_key text;

  v_existing_policy_id uuid;
  v_matching_inactive_policy_id uuid;
  v_active_policy_count integer;

  v_submitted_offering_ids uuid[] := array[]::uuid[];
begin

  -- ----------------------------------------------------------
  -- Resolve exactly one linked counsellor.
  -- NEVER use min(uuid).
  -- ----------------------------------------------------------

  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count <> 1 then
    raise exception
      'Exactly one linked counsellor account is required.'
      using errcode = '42501';
  end if;

  select a.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() a;


  -- ----------------------------------------------------------
  -- Validate envelope.
  -- ----------------------------------------------------------

  if p_payload is null
     or jsonb_typeof(p_payload) <> 'object'
     or jsonb_typeof(p_payload -> 'policies') <> 'array'
  then
    raise exception
      'Payload must contain a policies array.'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Existing ambiguous state is not safe to silently resolve.
  -- ----------------------------------------------------------

  if exists (
    select 1
    from public.service_offerings so
    join public.service_fee_policies sfp
      on sfp.service_offering_id = so.id
     and sfp.active = true
    where so.counsellor_id = v_counsellor_id
      and so.active = true
      and so.delivery_mode_key in ('in_person', 'virtual')
    group by so.id
    having count(*) > 1
  ) then
    raise exception
      'A service offering has multiple active fee policies and requires BCMC review before intake editing.'
      using errcode = '23514';
  end if;


  -- ==========================================================
  -- PASS 1: validate complete payload before mutation.
  -- ==========================================================

  for v_policy in
    select value
    from jsonb_array_elements(p_payload -> 'policies')
  loop

    if jsonb_typeof(v_policy) <> 'object' then
      raise exception
        'Each fee policy must be an object.'
        using errcode = '22023';
    end if;


    if (v_policy - array[
          'service_offering_id',
          'fee_cents',
          'currency_code',
          'session_minutes',
          'fee_note',
          'sliding_scale_key',
          'rcc_receipts_available',
          'direct_billing_key'
        ]) <> '{}'::jsonb
    then
      raise exception
        'Fee policy contains unsupported fields.'
        using errcode = '22023';
    end if;


    -- Offering id
    if nullif(
         btrim(v_policy ->> 'service_offering_id'),
         ''
       ) is null
    then
      raise exception
        'service_offering_id is required.'
        using errcode = '22023';
    end if;

    begin
      v_offering_id :=
        (btrim(v_policy ->> 'service_offering_id'))::uuid;
    exception
      when invalid_text_representation then
        raise exception
          'Invalid service_offering_id.'
          using errcode = '22023';
    end;


    if v_offering_id = any(v_submitted_offering_ids) then
      raise exception
        'Duplicate service_offering_id in fee payload.'
        using errcode = '22023';
    end if;

    v_submitted_offering_ids :=
      array_append(v_submitted_offering_ids, v_offering_id);


    -- Offering must be current, owned, and V0.1-authored.
    if not exists (
      select 1
      from public.service_offerings so
      join public.counsellor_service_declarations d
        on d.counsellor_id = so.counsellor_id
       and d.service_type_key = so.service_type_key
      where so.id = v_offering_id
        and so.counsellor_id = v_counsellor_id
        and so.active = true
        and so.delivery_mode_key in ('in_person', 'virtual')
    ) then
      raise exception
        'Fee policy may only be saved for an active declared service offering belonging to the counsellor.'
        using errcode = '22023';
    end if;


    -- Fee
    begin
      v_fee_cents := (v_policy ->> 'fee_cents')::integer;
    exception
      when others then
        raise exception
          'fee_cents must be an integer.'
          using errcode = '22023';
    end;

    if v_fee_cents < 0 then
      raise exception
        'fee_cents cannot be negative.'
        using errcode = '22023';
    end if;


    -- Currency
    v_currency_code :=
      upper(
        nullif(
          btrim(v_policy ->> 'currency_code'),
          ''
        )
      );

    if v_currency_code is null
       or char_length(v_currency_code) <> 3
    then
      raise exception
        'currency_code must be a three-letter currency code.'
        using errcode = '22023';
    end if;

    -- BCMC V0.1 operates in BC / CAD.
    if v_currency_code <> 'CAD' then
      raise exception
        'Practical Details V0.1 currently supports CAD only.'
        using errcode = '22023';
    end if;


    -- Session duration
    begin
      v_session_minutes :=
        (v_policy ->> 'session_minutes')::integer;
    exception
      when others then
        raise exception
          'session_minutes must be an integer.'
          using errcode = '22023';
    end;

    if v_session_minutes <= 0
       or v_session_minutes > 240
    then
      raise exception
        'session_minutes must be between 1 and 240.'
        using errcode = '22023';
    end if;


    -- Optional note
    v_fee_note :=
      nullif(
        btrim(v_policy ->> 'fee_note'),
        ''
      );

    if v_fee_note is not null
       and char_length(v_fee_note) > 500
    then
      raise exception
        'fee_note cannot exceed 500 characters.'
        using errcode = '22023';
    end if;


    -- Sliding scale
    v_sliding_scale_key :=
      nullif(
        btrim(v_policy ->> 'sliding_scale_key'),
        ''
      );

    if v_sliding_scale_key not in (
      'available',
      'limited',
      'currently_full',
      'not_offered',
      'ask'
    ) then
      raise exception
        'Invalid sliding_scale_key.'
        using errcode = '22023';
    end if;


    -- RCC receipts must be explicit.
    if not (v_policy ? 'rcc_receipts_available')
       or jsonb_typeof(v_policy -> 'rcc_receipts_available') <> 'boolean'
    then
      raise exception
        'rcc_receipts_available must be explicitly true or false.'
        using errcode = '22023';
    end if;

    v_rcc_receipts_available :=
      (v_policy ->> 'rcc_receipts_available')::boolean;


    -- Direct billing
    v_direct_billing_key :=
      nullif(
        btrim(v_policy ->> 'direct_billing_key'),
        ''
      );

    if v_direct_billing_key not in (
      'yes',
      'no',
      'ask'
    ) then
      raise exception
        'Invalid direct_billing_key.'
        using errcode = '22023';
    end if;

  end loop;


  -- ----------------------------------------------------------
  -- Every current active in-person/virtual offering needs one
  -- submitted fee policy.
  -- ----------------------------------------------------------

  if exists (
    select 1
    from public.service_offerings so
    where so.counsellor_id = v_counsellor_id
      and so.active = true
      and so.delivery_mode_key in ('in_person', 'virtual')
      and not (so.id = any(v_submitted_offering_ids))
  ) then
    raise exception
      'Every active service offering requires fee and payment information.'
      using errcode = '22023';
  end if;


  -- ==========================================================
  -- PASS 2: update / reactivate / insert.
  -- ==========================================================

  for v_policy in
    select value
    from jsonb_array_elements(p_payload -> 'policies')
  loop

    v_offering_id :=
      (btrim(v_policy ->> 'service_offering_id'))::uuid;

    v_fee_cents :=
      (v_policy ->> 'fee_cents')::integer;

    v_currency_code :=
      upper(btrim(v_policy ->> 'currency_code'));

    v_session_minutes :=
      (v_policy ->> 'session_minutes')::integer;

    v_fee_note :=
      nullif(btrim(v_policy ->> 'fee_note'), '');

    v_sliding_scale_key :=
      btrim(v_policy ->> 'sliding_scale_key');

    v_rcc_receipts_available :=
      (v_policy ->> 'rcc_receipts_available')::boolean;

    v_direct_billing_key :=
      btrim(v_policy ->> 'direct_billing_key');


    select count(*)::integer
    into v_active_policy_count
    from public.service_fee_policies sfp
    where sfp.service_offering_id = v_offering_id
      and sfp.active = true;


    select sfp.id
    into v_existing_policy_id
    from public.service_fee_policies sfp
    where sfp.service_offering_id = v_offering_id
      and sfp.active = true
    limit 1;


    if v_active_policy_count = 1 then

      -- Update the current canonical row in place.
      -- Consultation compatibility fields are intentionally untouched.
      update public.service_fee_policies
      set
        fee_cents = v_fee_cents,
        currency_code = v_currency_code,
        session_minutes = v_session_minutes,
        fee_note = v_fee_note,
        sliding_scale_key = v_sliding_scale_key,
        rcc_receipts_available = v_rcc_receipts_available,
        direct_billing_key = v_direct_billing_key,
        public_visible = true,
        active = true,
        confirmed_at = now(),
        confirmation_source_key = 'counsellor',
        updated_at = now()
      where id = v_existing_policy_id;


    else

      -- Because of the existing UNIQUE(offering, session_minutes),
      -- an inactive row for this duration must be re-used rather
      -- than creating a colliding replacement.
      select sfp.id
      into v_matching_inactive_policy_id
      from public.service_fee_policies sfp
      where sfp.service_offering_id = v_offering_id
        and sfp.session_minutes = v_session_minutes
        and sfp.active = false
      limit 1;


      if v_matching_inactive_policy_id is not null then

        update public.service_fee_policies
        set
          fee_cents = v_fee_cents,
          currency_code = v_currency_code,
          fee_note = v_fee_note,
          sliding_scale_key = v_sliding_scale_key,
          rcc_receipts_available = v_rcc_receipts_available,
          direct_billing_key = v_direct_billing_key,
          public_visible = true,
          active = true,
          confirmed_at = now(),
          confirmation_source_key = 'counsellor',
          updated_at = now()
        where id = v_matching_inactive_policy_id;

      else

        insert into public.service_fee_policies (
          service_offering_id,
          fee_cents,
          currency_code,
          session_minutes,
          fee_note,
          sliding_scale_key,
          rcc_receipts_available,
          direct_billing_key,
          consultation_fee_cents,
          consultation_minutes,
          public_visible,
          active,
          confirmed_at,
          confirmation_source_key
        )
        values (
          v_offering_id,
          v_fee_cents,
          v_currency_code,
          v_session_minutes,
          v_fee_note,
          v_sliding_scale_key,
          v_rcc_receipts_available,
          v_direct_billing_key,
          null,
          null,
          true,
          true,
          now(),
          'counsellor'
        );

      end if;

    end if;

  end loop;


  -- Fee completion alone does not complete Practical Details.
  perform public.update_my_counsellor_onboarding_section(
    'practical_details',
    'in_progress'
  );

end;
$$;


ALTER FUNCTION "public"."save_my_service_fee_policies"("p_payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_my_therapeutic_approaches"("p_payload" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_counsellor_id uuid;
  v_account_count integer;
  v_item jsonb;
  v_approach_key text;
  v_relationship_key text;
begin
  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count <> 1 then
    raise exception
      'Exactly one linked counsellor account is required.'
      using errcode = '42501';
  end if;

  select account.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() account;

  if p_payload is null
     or jsonb_typeof(p_payload) <> 'array'
  then
    raise exception
      'Approaches payload must be a JSON array.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from (
      select
        nullif(btrim(value ->> 'approach_key'), '') as approach_key,
        count(*) as row_count
      from jsonb_array_elements(p_payload)
      group by nullif(btrim(value ->> 'approach_key'), '')
    ) duplicates
    where duplicates.approach_key is null
       or duplicates.row_count > 1
  ) then
    raise exception
      'Approaches must contain unique valid approach keys.'
      using errcode = '22023';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_payload)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception
        'Each approach must be a JSON object.'
        using errcode = '22023';
    end if;

    if (
      v_item - array[
        'approach_key',
        'relationship_key'
      ]
    ) <> '{}'::jsonb
    then
      raise exception
        'Approach contains unsupported fields.'
        using errcode = '22023';
    end if;

    v_approach_key :=
      nullif(btrim(v_item ->> 'approach_key'), '');

    v_relationship_key :=
      nullif(btrim(v_item ->> 'relationship_key'), '');

    if v_relationship_key not in ('uses', 'informed_by') then
      raise exception
        'Invalid therapeutic approach relationship.'
        using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.therapeutic_approach_taxonomy t
      where t.key = v_approach_key
        and t.active = true
    ) then
      raise exception
        'Selected therapeutic approach is unavailable.'
        using errcode = '22023';
    end if;
  end loop;

  -- Remove selections no longer present.
  delete from public.counsellor_therapeutic_approaches ca
  where ca.counsellor_id = v_counsellor_id
    and not exists (
      select 1
      from jsonb_array_elements(p_payload) item
      where nullif(
              btrim(item ->> 'approach_key'),
              ''
            ) = ca.approach_key
    );

  -- Insert/update current selections.
  for v_item in
    select value
    from jsonb_array_elements(p_payload)
  loop
    v_approach_key :=
      btrim(v_item ->> 'approach_key');

    v_relationship_key :=
      btrim(v_item ->> 'relationship_key');

    insert into public.counsellor_therapeutic_approaches (
      counsellor_id,
      approach_key,
      relationship_key,
      public_visible,
      active,
      created_at,
      updated_at
    )
    values (
      v_counsellor_id,
      v_approach_key,
      v_relationship_key,
      true,
      true,
      now(),
      now()
    )
    on conflict (counsellor_id, approach_key)
    do update
    set
      relationship_key = excluded.relationship_key,
      public_visible = true,
      active = true,
      updated_at = now();

    -- Intentionally preserve any existing usage_note.
  end loop;

  insert into private.counsellor_professional_background_reviews (
    counsellor_id,
    intake_version,
    approaches_reviewed_at,
    updated_at
  )
  values (
    v_counsellor_id,
    1,
    now(),
    now()
  )
  on conflict (counsellor_id, intake_version)
  do update
  set
    approaches_reviewed_at = now(),
    updated_at = now();

  perform public.update_my_counsellor_onboarding_section(
    'professional_background',
    'in_progress'
  );
end;
$$;


ALTER FUNCTION "public"."save_my_therapeutic_approaches"("p_payload" "jsonb") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."update_my_counsellor_onboarding_section"("p_section_key" "text", "p_status_key" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_counsellor_id uuid;
  v_account_count integer;
  v_intake_version integer;
begin

  -- Validate controlled section.
  if p_section_key not in (
    'practice',
    'who_you_work_with',
    'what_you_help_with',
    'how_you_work',
    'faith',
    'cultural_familiarity',
    'practical_details',
    'availability_contact',
    'professional_background',
    'your_profile'
  ) then
    raise exception
      'Unsupported onboarding section: %',
      p_section_key
      using errcode = '22023';
  end if;


  -- Validate controlled status.
  if p_status_key not in (
    'not_started',
    'in_progress',
    'complete',
    'needs_attention'
  ) then
    raise exception
      'Unsupported section status: %',
      p_status_key
      using errcode = '22023';
  end if;


  -- Resolve authenticated caller.
  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count = 0 then
    raise exception 'No linked counsellor account found.'
      using errcode = '28000';
  end if;

  if v_account_count <> 1 then
    raise exception 'A single linked counsellor account is required.'
      using errcode = '28000';
  end if;

  select a.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() a;


  -- Ensure controlled onboarding records exist.
  perform public.initialize_my_counsellor_onboarding();


  select state.intake_version
  into strict v_intake_version
  from private.counsellor_onboarding_state state
  where state.counsellor_id = v_counsellor_id;


  -- Update section.
  update private.counsellor_onboarding_sections
  set
    status_key = p_status_key,

    completed_at = case
      when p_status_key = 'complete'
        then coalesce(completed_at, now())
      else null
    end,

    updated_at = now()

  where counsellor_id = v_counsellor_id
    and intake_version = v_intake_version
    and section_key = p_section_key;


  -- Update overall onboarding activity state.
  update private.counsellor_onboarding_state
  set
    current_section_key = p_section_key,

    status_key = case
      when status_key in (
        'submitted',
        'complete'
      )
        then status_key
      else 'in_progress'
    end,

    started_at = coalesce(
      started_at,
      now()
    ),

    last_saved_at = now(),
    updated_at = now()

  where counsellor_id = v_counsellor_id;

end;
$$;


ALTER FUNCTION "public"."update_my_counsellor_onboarding_section"("p_section_key" "text", "p_status_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_my_service_location"("p_payload" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_counsellor_id uuid;
  v_account_count integer;

  v_location_id uuid;
  v_practice_id uuid;

  v_city text;
  v_area text;
  v_public_address_level text;
begin

  -- ----------------------------------------------------------
  -- Resolve caller -> exactly one linked counsellor.
  -- ----------------------------------------------------------

  select count(*)::integer
  into v_account_count
  from public.get_my_counsellor_accounts();

  if v_account_count <> 1 then
    raise exception
      'Exactly one linked counsellor account is required.'
      using errcode = '42501';
  end if;

  select account.counsellor_id
  into strict v_counsellor_id
  from public.get_my_counsellor_accounts() as account;


  -- ----------------------------------------------------------
  -- Validate payload envelope.
  -- ----------------------------------------------------------

  if p_payload is null
     or jsonb_typeof(p_payload) <> 'object'
  then
    raise exception
      'Location payload must be a JSON object.'
      using errcode = '22023';
  end if;


  -- Reject fields this V0.1 RPC does not own.
  if (p_payload - array[
        'location_id',
        'practice_id',
        'city',
        'neighbourhood_or_area'
      ]) <> '{}'::jsonb
  then
    raise exception
      'Location payload contains unsupported fields.'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Parse editable fields.
  -- ----------------------------------------------------------

  v_city :=
    nullif(
      btrim(p_payload ->> 'city'),
      ''
    );

  v_area :=
    nullif(
      btrim(p_payload ->> 'neighbourhood_or_area'),
      ''
    );


  if v_city is null then
    raise exception
      'City is required.'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Parse optional location UUID.
  -- ----------------------------------------------------------

  if nullif(
       btrim(p_payload ->> 'location_id'),
       ''
     ) is not null
  then
    begin
      v_location_id :=
        (btrim(p_payload ->> 'location_id'))::uuid;
    exception
      when invalid_text_representation then
        raise exception
          'Invalid location_id.'
          using errcode = '22023';
    end;
  end if;


  -- ----------------------------------------------------------
  -- Parse optional practice UUID.
  -- ----------------------------------------------------------

  if nullif(
       btrim(p_payload ->> 'practice_id'),
       ''
     ) is not null
  then
    begin
      v_practice_id :=
        (btrim(p_payload ->> 'practice_id'))::uuid;
    exception
      when invalid_text_representation then
        raise exception
          'Invalid practice_id.'
          using errcode = '22023';
    end;
  end if;


  -- ----------------------------------------------------------
  -- If practice supplied, counsellor must have an active
  -- affiliation with it.
  -- ----------------------------------------------------------

  if v_practice_id is not null
     and not exists (
       select 1
       from public.counsellor_practice_affiliations cpa
       where cpa.counsellor_id = v_counsellor_id
         and cpa.practice_id = v_practice_id
         and cpa.ended_on is null
     )
  then
    raise exception
      'Practice is not an active affiliation for this counsellor.'
      using errcode = '22023';
  end if;


  -- ----------------------------------------------------------
  -- Public location granularity is system-derived.
  --
  -- Area supplied  -> area
  -- No area         -> city
  --
  -- V0.1 never authors "full".
  -- ----------------------------------------------------------

  if v_area is not null then
    v_public_address_level := 'area';
  else
    v_public_address_level := 'city';
  end if;


  -- ----------------------------------------------------------
  -- CREATE
  -- ----------------------------------------------------------

  if v_location_id is null then

    insert into public.service_locations (
      counsellor_id,
      practice_id,
      label,
      city,
      province,
      country_code,
      neighbourhood_or_area,
      public_address_level,
      public_visible,
      active
    )
    values (
      v_counsellor_id,
      v_practice_id,
      null,
      v_city,
      'BC',
      'CA',
      v_area,
      v_public_address_level,
      true,
      true
    )
    returning id
    into v_location_id;

    return v_location_id;

  end if;


  -- ----------------------------------------------------------
  -- UPDATE
  --
  -- Must belong to caller's counsellor.
  -- ----------------------------------------------------------

  if not exists (
    select 1
    from public.service_locations l
    where l.id = v_location_id
      and l.counsellor_id = v_counsellor_id
  ) then
    raise exception
      'Location does not belong to the current counsellor.'
      using errcode = '42501';
  end if;


  update public.service_locations
  set
    practice_id = v_practice_id,

    -- V0.1 uses structured geography rather than arbitrary
    -- counsellor-authored public labels.
    label = null,

    city = v_city,
    province = 'BC',
    country_code = 'CA',
    neighbourhood_or_area = v_area,
    public_address_level = v_public_address_level,

    -- An authored intake location is an active public-facing
    -- coarse location record. This does NOT publish an exact
    -- street address.
    public_visible = true,
    active = true,

    updated_at = now()
  where id = v_location_id
    and counsellor_id = v_counsellor_id;

  return v_location_id;

end;
$$;


ALTER FUNCTION "public"."upsert_my_service_location"("p_payload" "jsonb") OWNER TO "postgres";


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
    SET "search_path" TO 'pg_catalog', 'public', 'private'
    AS $$
declare
  v_location_practice_id uuid;
begin

  -- ----------------------------------------------------------
  -- IN-PERSON
  -- ----------------------------------------------------------

  if new.delivery_mode_key = 'in_person' then

    if new.location_id is null then
      raise exception
        'In-person service offerings require a location.'
        using errcode = '23514';
    end if;

    select l.practice_id
    into v_location_practice_id
    from public.service_locations l
    where l.id = new.location_id
      and l.counsellor_id = new.counsellor_id
      and l.active = true;

    if not found then
      raise exception
        'Location must be an active location belonging to the counsellor.'
        using errcode = '23514';
    end if;

    -- Location is the canonical source of practice context for
    -- an in-person service. Do not allow an independently supplied
    -- offering practice to drift from the location.
    new.practice_id := v_location_practice_id;


  -- ----------------------------------------------------------
  -- VIRTUAL
  -- ----------------------------------------------------------

  elsif new.delivery_mode_key = 'virtual' then

    if new.location_id is not null then
      raise exception
        'Virtual service offerings cannot have a physical location.'
        using errcode = '23514';
    end if;


  -- ----------------------------------------------------------
  -- LEGACY HYBRID
  --
  -- Preserve compatibility with the existing DB model.
  -- V0.1 authoring RPC below will reject new hybrid configs.
  -- ----------------------------------------------------------

  elsif new.delivery_mode_key = 'hybrid' then

    if new.location_id is not null then
      select l.practice_id
      into v_location_practice_id
      from public.service_locations l
      where l.id = new.location_id
        and l.counsellor_id = new.counsellor_id
        and l.active = true;

      if not found then
        raise exception
          'Location must be an active location belonging to the counsellor.'
          using errcode = '23514';
      end if;
    end if;

  else
    raise exception
      'Unsupported delivery mode.'
      using errcode = '23514';

  end if;


  -- ----------------------------------------------------------
  -- Any non-null practice context must be an active affiliation.
  -- This applies to virtual and legacy hybrid records as well.
  --
  -- For in-person, practice_id has already been derived above.
  -- ----------------------------------------------------------

  if new.practice_id is not null
     and not exists (
       select 1
       from public.counsellor_practice_affiliations cpa
       where cpa.counsellor_id = new.counsellor_id
         and cpa.practice_id = new.practice_id
         and cpa.ended_on is null
     )
  then
    raise exception
      'Practice must be an active affiliation for the counsellor.'
      using errcode = '23514';
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


CREATE OR REPLACE FUNCTION "verification"."set_credential_status"("p_credential_id" "uuid", "p_status_key" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private', 'verification'
    AS $$
begin
  if not (
    private.has_staff_role('verifier')
    or private.has_staff_role('admin')
  ) then
    raise exception 'Insufficient permission to set credential status';
  end if;

  if p_status_key not in ('active','inactive','suspended','unknown') then
    raise exception 'Invalid credential status';
  end if;

  update public.professional_credentials
  set status_key = p_status_key
  where id = p_credential_id;

  if not found then
    raise exception 'Credential not found';
  end if;
end;
$$;


ALTER FUNCTION "verification"."set_credential_status"("p_credential_id" "uuid", "p_status_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "verification"."verify_credential"("p_credential_id" "uuid", "p_status_key" "text", "p_method_key" "text", "p_evidence_file_id" "uuid" DEFAULT NULL::"uuid", "p_recheck_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_internal_note" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'private', 'verification'
    AS $$
declare
  new_event_id uuid;
begin
  if not (
    private.has_staff_role('verifier')
    or private.has_staff_role('admin')
  ) then
    raise exception 'Insufficient permission to verify credentials';
  end if;

  if p_status_key not in ('pending','verified','failed','expired','not_checked') then
    raise exception 'Invalid verification status';
  end if;

  if p_method_key not in (
    'manual_register',
    'document_review',
    'external_confirmation',
    'research_fixture',
    'other'
  ) then
    raise exception 'Invalid verification method';
  end if;

  if not exists (
    select 1
    from public.professional_credentials pc
    where pc.id = p_credential_id
  ) then
    raise exception 'Credential not found';
  end if;

  if p_evidence_file_id is not null
     and not exists (
       select 1
       from verification.evidence_files ef
       where ef.id = p_evidence_file_id
         and (ef.credential_id = p_credential_id or ef.credential_id is null)
     ) then
    raise exception 'Evidence file is not associated with this credential';
  end if;

  insert into verification.credential_verification_events (
    credential_id,
    status_key,
    method_key,
    checked_at,
    checked_by_staff_auth_user_id,
    evidence_file_id,
    recheck_at,
    internal_note
  )
  values (
    p_credential_id,
    p_status_key,
    p_method_key,
    case when p_status_key in ('verified','failed','expired') then now() else null end,
    auth.uid(),
    p_evidence_file_id,
    p_recheck_at,
    p_internal_note
  )
  returning id into new_event_id;

  return new_event_id;
end;
$$;


ALTER FUNCTION "verification"."verify_credential"("p_credential_id" "uuid", "p_status_key" "text", "p_method_key" "text", "p_evidence_file_id" "uuid", "p_recheck_at" timestamp with time zone, "p_internal_note" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "private"."counsellor_eligibility" (
    "counsellor_id" "uuid" NOT NULL,
    "muslim_self_identification" boolean NOT NULL,
    "public_identity_context_consent" boolean DEFAULT false NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "private"."counsellor_eligibility" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."counsellor_location_accessibility_reviews" (
    "counsellor_id" "uuid" NOT NULL,
    "intake_version" integer DEFAULT 1 NOT NULL,
    "location_id" "uuid" NOT NULL,
    "reviewed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "counsellor_location_accessibility_reviews_intake_version_check" CHECK (("intake_version" >= 1))
);


ALTER TABLE "private"."counsellor_location_accessibility_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."counsellor_onboarding_sections" (
    "counsellor_id" "uuid" NOT NULL,
    "intake_version" integer DEFAULT 1 NOT NULL,
    "section_key" "text" NOT NULL,
    "status_key" "text" DEFAULT 'not_started'::"text" NOT NULL,
    "completed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "counsellor_onboarding_sections_intake_version_check" CHECK (("intake_version" >= 1)),
    CONSTRAINT "counsellor_onboarding_sections_status_key_check" CHECK (("status_key" = ANY (ARRAY['not_started'::"text", 'in_progress'::"text", 'complete'::"text", 'needs_attention'::"text"])))
);


ALTER TABLE "private"."counsellor_onboarding_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."counsellor_onboarding_state" (
    "counsellor_id" "uuid" NOT NULL,
    "intake_version" integer DEFAULT 1 NOT NULL,
    "current_section_key" "text",
    "status_key" "text" DEFAULT 'not_started'::"text" NOT NULL,
    "started_at" timestamp with time zone,
    "last_saved_at" timestamp with time zone,
    "submitted_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "counsellor_onboarding_state_intake_version_check" CHECK (("intake_version" >= 1)),
    CONSTRAINT "counsellor_onboarding_state_status_key_check" CHECK (("status_key" = ANY (ARRAY['not_started'::"text", 'in_progress'::"text", 'ready_for_review'::"text", 'submitted'::"text", 'needs_changes'::"text", 'complete'::"text"])))
);


ALTER TABLE "private"."counsellor_onboarding_state" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."counsellor_professional_background_reviews" (
    "counsellor_id" "uuid" NOT NULL,
    "intake_version" integer DEFAULT 1 NOT NULL,
    "experience_reviewed_at" timestamp with time zone,
    "approaches_reviewed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "private"."counsellor_professional_background_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."counsellor_profile_voice_reviews" (
    "counsellor_id" "uuid" NOT NULL,
    "intake_version" integer DEFAULT 1 NOT NULL,
    "first_meeting_reviewed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "private"."counsellor_profile_voice_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."counsellor_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "counsellor_id" "uuid" NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "counsellor_users_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'editor'::"text"])))
);


ALTER TABLE "private"."counsellor_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."credential_private_data" (
    "credential_id" "uuid" NOT NULL,
    "registration_number" "text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "private"."credential_private_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."service_location_private" (
    "location_id" "uuid" NOT NULL,
    "address_line_1" "text",
    "address_line_2" "text",
    "postal_code" "text",
    "access_instructions" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "private"."service_location_private" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."staff_users" (
    "auth_user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "staff_users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'verifier'::"text", 'reviewer'::"text", 'moderator'::"text"])))
);


ALTER TABLE "private"."staff_users" OWNER TO "postgres";


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


COMMENT ON TABLE "public"."counsellor_cultural_familiarity" IS 'A counsellor selection means the counsellor reports familiarity with this context and feels able to engage with it when relevant to counselling. It does not establish cultural identity, competence certification, expertise, specialization or guaranteed understanding.';



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


CREATE TABLE IF NOT EXISTS "public"."counsellor_service_declaration_client_groups" (
    "counsellor_id" "uuid" NOT NULL,
    "service_type_key" "text" NOT NULL,
    "client_group_key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."counsellor_service_declaration_client_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."counsellor_service_declarations" (
    "counsellor_id" "uuid" NOT NULL,
    "service_type_key" "text" NOT NULL,
    "client_gender_scope_key" "text" DEFAULT 'not_specified'::"text" NOT NULL,
    "client_gender_scope_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "counsellor_service_declarations_gender_scope_check" CHECK (("client_gender_scope_key" = ANY (ARRAY['not_specified'::"text", 'all_genders'::"text", 'women_only'::"text", 'men_only'::"text", 'other'::"text"]))),
    CONSTRAINT "counsellor_service_declarations_gender_scope_note_check" CHECK (((("client_gender_scope_key" = 'other'::"text") AND (NULLIF("btrim"("client_gender_scope_note"), ''::"text") IS NOT NULL)) OR (("client_gender_scope_key" <> 'other'::"text") AND ("client_gender_scope_note" IS NULL))))
);


ALTER TABLE "public"."counsellor_service_declarations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."counsellor_therapeutic_approaches" (
    "counsellor_id" "uuid" NOT NULL,
    "approach_key" "text" NOT NULL,
    "usage_note" "text",
    "public_visible" boolean DEFAULT true NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "relationship_key" "text" DEFAULT 'informed_by'::"text" NOT NULL,
    CONSTRAINT "counsellor_therapeutic_approaches_relationship_key_check" CHECK (("relationship_key" = ANY (ARRAY['uses'::"text", 'informed_by'::"text"])))
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
    "gender_self_description" "text",
    CONSTRAINT "counsellors_gender_key_check" CHECK ((("gender_key" IS NULL) OR ("gender_key" = ANY (ARRAY['woman'::"text", 'man'::"text", 'nonbinary'::"text", 'self_described'::"text", 'prefer_not_to_say'::"text"])))),
    CONSTRAINT "counsellors_gender_self_description_check" CHECK (((("gender_key" = 'self_described'::"text") AND (NULLIF("btrim"("gender_self_description"), ''::"text") IS NOT NULL)) OR (("gender_key" IS DISTINCT FROM 'self_described'::"text") AND ("gender_self_description" IS NULL)))),
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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "context_type_key" "text" NOT NULL,
    CONSTRAINT "cultural_familiarity_context_type_check" CHECK (("context_type_key" = ANY (ARRAY['cultural_community_context'::"text", 'family_community_dynamic'::"text"])))
);


ALTER TABLE "public"."cultural_familiarity_taxonomy" OWNER TO "postgres";


COMMENT ON TABLE "public"."cultural_familiarity_taxonomy" IS 'BCMC-controlled descriptive taxonomy for cultural, family and community familiarity. Selection does not assert identity, cultural competence, expertise or guaranteed client fit.';



COMMENT ON COLUMN "public"."cultural_familiarity_taxonomy"."context_type_key" IS 'Semantic grouping for intake/presentation. cultural_community_context = identifiable cultural/community setting; family_community_dynamic = lived dynamic that may span multiple communities.';



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
    "discussion_comfort_key" "text" NOT NULL,
    "discussion_comfort_note" "text",
    "initiation_key" "text",
    "initiation_note" "text",
    "integration_key" "text",
    "integration_note" "text",
    "claims_islamic_counselling" boolean DEFAULT false NOT NULL,
    "islamic_counselling_definition" "text",
    "specialist_islamic_training" boolean DEFAULT false NOT NULL,
    "specialist_training_context" "text",
    "additional_context" "text",
    "public_visible" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "integration_mode_key" "text",
    CONSTRAINT "faith_practice_discussion_dependency_check" CHECK (((("discussion_comfort_key" = 'no'::"text") AND ("initiation_key" IS NULL) AND ("integration_key" IS NULL)) OR (("discussion_comfort_key" = ANY (ARRAY['yes'::"text", 'depends'::"text"])) AND ("initiation_key" IS NOT NULL) AND ("integration_key" IS NOT NULL)))),
    CONSTRAINT "faith_practice_integration_mode_consistency_check" CHECK ((("integration_mode_key" IS NULL) OR (("integration_key" = 'no'::"text") AND ("integration_mode_key" = 'not_offered'::"text")) OR (("integration_key" = 'yes'::"text") AND ("integration_mode_key" = ANY (ARRAY['available_on_request'::"text", 'distinct_practice_option'::"text"]))) OR (("integration_key" = 'depends'::"text") AND ("integration_mode_key" = 'depends'::"text")))),
    CONSTRAINT "faith_practice_integration_mode_key_check" CHECK ((("integration_mode_key" IS NULL) OR ("integration_mode_key" = ANY (ARRAY['not_offered'::"text", 'available_on_request'::"text", 'distinct_practice_option'::"text", 'depends'::"text"])))),
    CONSTRAINT "faith_practice_islamic_claim_consistency_check" CHECK ((("claims_islamic_counselling" = false) OR (("discussion_comfort_key" = ANY (ARRAY['yes'::"text", 'depends'::"text"])) AND ("integration_key" = ANY (ARRAY['yes'::"text", 'depends'::"text"])) AND (NULLIF("btrim"("islamic_counselling_definition"), ''::"text") IS NOT NULL)))),
    CONSTRAINT "faith_practice_profiles_discussion_comfort_key_check" CHECK (("discussion_comfort_key" = ANY (ARRAY['yes'::"text", 'no'::"text", 'depends'::"text"]))),
    CONSTRAINT "faith_practice_profiles_initiation_key_check" CHECK (("initiation_key" = ANY (ARRAY['waits_for_client'::"text", 'may_ask_without_assuming_inclusion'::"text", 'depends'::"text", 'other'::"text"]))),
    CONSTRAINT "faith_practice_profiles_integration_key_check" CHECK (("integration_key" = ANY (ARRAY['yes'::"text", 'no'::"text", 'depends'::"text"])))
);


ALTER TABLE "public"."faith_practice_profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."faith_practice_profiles"."discussion_comfort_key" IS 'V0.2 semantic meaning: whether religion/spirituality can be discussed and worked with clinically as part of the client''s lived experience when relevant. Values yes/no/depends. Required explicit answer; no database default. Legacy column name retained temporarily; this is not a subjective comfort score.';



COMMENT ON COLUMN "public"."faith_practice_profiles"."initiation_key" IS 'V0.2 semantic meaning: how the counsellor usually establishes whether religion/spirituality is relevant. Conditional: required when discussion scope is yes/depends; NULL when discussion scope is no.';



COMMENT ON COLUMN "public"."faith_practice_profiles"."integration_key" IS 'V0.2 semantic meaning: whether, if the client wants it, the client''s religious beliefs, values, practices, coping, or faith framework can be intentionally drawn on as part of therapeutic work. Conditional: required when discussion scope is yes/depends; NULL when discussion scope is no.';



COMMENT ON COLUMN "public"."faith_practice_profiles"."claims_islamic_counselling" IS 'Explicit counsellor service claim only. Never infer from Muslim identity, discussion scope, integration, or training. True requires a nonblank Islamic-counselling definition and later staff review/evidence workflow.';



COMMENT ON COLUMN "public"."faith_practice_profiles"."specialist_islamic_training" IS 'LEGACY/DEPRECATED AS PRACTICE DIMENSION. Training is evidence, not a faith-practice level. Do not use as a public faith tile/filter or infer Islamic counselling from it. Prefer factual training/certification records.';



COMMENT ON COLUMN "public"."faith_practice_profiles"."additional_context" IS 'Deprecated for general faith biography. Future use should be replaced by bounded context tied to a specific structured answer.';



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
    "post_masters_practice_start_year" integer,
    CONSTRAINT "professional_experience_post_masters_years_check" CHECK ((("post_masters_years" IS NULL) OR (("post_masters_years" >= (0)::numeric) AND ("post_masters_years" <= (80)::numeric)))),
    CONSTRAINT "professional_experience_start_year_check" CHECK ((("post_masters_practice_start_year" IS NULL) OR (("post_masters_practice_start_year" >= 1950) AND ("post_masters_practice_start_year" <= 2100))))
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
    "confirmed_at" timestamp with time zone,
    "confirmation_source_key" "text",
    CONSTRAINT "service_fee_policies_confirmation_source_check" CHECK ((("confirmation_source_key" IS NULL) OR ("confirmation_source_key" = ANY (ARRAY['counsellor'::"text", 'practice'::"text", 'bcmc_staff'::"text", 'system'::"text"])))),
    CONSTRAINT "service_fee_policies_consultation_fee_cents_check" CHECK ((("consultation_fee_cents" IS NULL) OR ("consultation_fee_cents" >= 0))),
    CONSTRAINT "service_fee_policies_consultation_minutes_check" CHECK ((("consultation_minutes" IS NULL) OR (("consultation_minutes" > 0) AND ("consultation_minutes" <= 120)))),
    CONSTRAINT "service_fee_policies_currency_code_check" CHECK (("char_length"("currency_code") = 3)),
    CONSTRAINT "service_fee_policies_direct_billing_key_check" CHECK (("direct_billing_key" = ANY (ARRAY['yes'::"text", 'no'::"text", 'ask'::"text"]))),
    CONSTRAINT "service_fee_policies_fee_cents_check" CHECK (("fee_cents" >= 0)),
    CONSTRAINT "service_fee_policies_session_minutes_check" CHECK ((("session_minutes" > 0) AND ("session_minutes" <= 240))),
    CONSTRAINT "service_fee_policies_sliding_scale_key_check" CHECK (("sliding_scale_key" = ANY (ARRAY['available'::"text", 'limited'::"text", 'currently_full'::"text", 'not_offered'::"text", 'ask'::"text"])))
);


ALTER TABLE "public"."service_fee_policies" OWNER TO "postgres";


COMMENT ON COLUMN "public"."service_fee_policies"."confirmed_at" IS 'When the current fee/access facts on this fee-policy record were last explicitly confirmed. Do not substitute counsellor/profile updated_at.';



COMMENT ON COLUMN "public"."service_fee_policies"."confirmation_source_key" IS 'Who supplied or confirmed the current fee-policy facts. This is provenance, not independent verification.';



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
    "client_gender_scope_key" "text" DEFAULT 'not_specified'::"text" NOT NULL,
    "client_gender_scope_note" "text",
    CONSTRAINT "service_offerings_client_gender_scope_key_check" CHECK (("client_gender_scope_key" = ANY (ARRAY['not_specified'::"text", 'all_genders'::"text", 'women_only'::"text", 'men_only'::"text", 'other'::"text"]))),
    CONSTRAINT "service_offerings_client_gender_scope_note_check" CHECK ((("client_gender_scope_key" <> 'other'::"text") OR (NULLIF("btrim"("client_gender_scope_note"), ''::"text") IS NOT NULL))),
    CONSTRAINT "service_offerings_delivery_mode_key_check" CHECK (("delivery_mode_key" = ANY (ARRAY['in_person'::"text", 'virtual'::"text", 'hybrid'::"text"])))
);


ALTER TABLE "public"."service_offerings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."service_offerings"."client_gender_scope_key" IS 'Client-gender scope for this service offering. Separate from counsellor gender. not_specified means BCMC has not collected/confirmed the scope and must not infer it.';



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


CREATE OR REPLACE VIEW "public"."v_counsellor_profiles" AS
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
     LEFT JOIN LATERAL ( SELECT "jsonb_agg"("jsonb_build_object"('fee_policy_id', "sf"."id", 'service_offering_id', "sf"."service_offering_id", 'fee_cents', "sf"."fee_cents", 'currency_code', "sf"."currency_code", 'session_minutes', "sf"."session_minutes", 'fee_note', "sf"."fee_note", 'sliding_scale_key', "sf"."sliding_scale_key", 'rcc_receipts_available', "sf"."rcc_receipts_available", 'direct_billing_key', "sf"."direct_billing_key", 'consultation_fee_cents', "sf"."consultation_fee_cents", 'consultation_minutes', "sf"."consultation_minutes", 'confirmed_at', "sf"."confirmed_at", 'confirmation_source_key', "sf"."confirmation_source_key") ORDER BY "sf"."fee_cents", "sf"."session_minutes", "sf"."id") AS "fee_policies"
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
     LEFT JOIN LATERAL ( SELECT "jsonb_build_object"('post_masters_years', "pe"."post_masters_years", 'post_masters_practice_start_year', "pe"."post_masters_practice_start_year", 'as_of_date', "pe"."as_of_date", 'experience_note', "pe"."experience_note") AS "professional_experience"
           FROM "public"."professional_experience" "pe"
          WHERE (("pe"."counsellor_id" = "c"."id") AND ("pe"."public_visible" = true))
         LIMIT 1) "experience" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_agg"("jsonb_build_object"('training_certification_id', "t"."id", 'record_type_key', "t"."record_type_key", 'title', "t"."title", 'provider_name', "t"."provider_name", 'completion_year', "t"."completion_year", 'expiry_date', "t"."expiry_date", 'evidence_status_key', "t"."evidence_status_key") ORDER BY "t"."sort_order", "t"."completion_year" DESC NULLS LAST, "t"."id") AS "training_certifications"
           FROM "public"."training_certifications" "t"
          WHERE (("t"."counsellor_id" = "c"."id") AND ("t"."public_visible" = true) AND ("t"."active" = true) AND ("t"."evidence_status_key" = ANY (ARRAY['reviewed'::"text", 'verified'::"text"])))) "training" ON (true))
     LEFT JOIN LATERAL ( SELECT "jsonb_agg"("jsonb_build_object"('approach_key', "ta"."key", 'label', "ta"."label", 'short_description', "ta"."short_description", 'relationship_key', "ca"."relationship_key", 'usage_note', "ca"."usage_note") ORDER BY "ta"."sort_order", "ta"."label") AS "therapeutic_approaches"
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
    COALESCE(( SELECT "jsonb_agg"("jsonb_build_object"('delivery_mode_key', ("matched"."so" ->> 'delivery_mode_key'::"text"), 'service_type_key', ("matched"."so" ->> 'service_type_key'::"text"), 'service_type_label', ("matched"."so" ->> 'service_type_label'::"text"), 'fee_cents', ("fp"."value" -> 'fee_cents'::"text"), 'currency_code', ("fp"."value" -> 'currency_code'::"text"), 'session_minutes', ("fp"."value" -> 'session_minutes'::"text"), 'fee_note', ("fp"."value" -> 'fee_note'::"text"), 'sliding_scale_key', ("fp"."value" -> 'sliding_scale_key'::"text"), 'direct_billing_key', ("fp"."value" -> 'direct_billing_key'::"text"), 'rcc_receipts_available', ("fp"."value" -> 'rcc_receipts_available'::"text"), 'consultation_fee_cents', ("fp"."value" -> 'consultation_fee_cents'::"text"), 'consultation_minutes', ("fp"."value" -> 'consultation_minutes'::"text"), 'confirmed_at', ("fp"."value" -> 'confirmed_at'::"text")) ORDER BY ("matched"."so" ->> 'delivery_mode_key'::"text")) AS "jsonb_agg"
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


CREATE TABLE IF NOT EXISTS "public"."working_style_constructs" (
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "research_status_key" "text" DEFAULT 'candidate'::"text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "working_style_constructs_research_status_key_check" CHECK (("research_status_key" = ANY (ARRAY['candidate'::"text", 'approved'::"text", 'deprecated'::"text"]))),
    CONSTRAINT "working_style_constructs_version_check" CHECK (("version" >= 1))
);


ALTER TABLE "public"."working_style_constructs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."working_style_context_reasons" (
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."working_style_context_reasons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."working_style_question_options" (
    "question_key" "text" NOT NULL,
    "option_key" "text" NOT NULL,
    "counsellor_label" "text" NOT NULL,
    "ordinal_position" smallint,
    "is_varies" boolean DEFAULT false NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "working_style_question_options_ordinal_position_check" CHECK ((("ordinal_position" IS NULL) OR (("ordinal_position" >= 1) AND ("ordinal_position" <= 9))))
);


ALTER TABLE "public"."working_style_question_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."working_style_question_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "counsellor_id" "uuid" NOT NULL,
    "question_key" "text" NOT NULL,
    "option_key" "text" NOT NULL,
    "clarification_note" "text",
    "answered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."working_style_question_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."working_style_questions" (
    "key" "text" NOT NULL,
    "construct_key" "text" NOT NULL,
    "questionnaire_version" integer DEFAULT 1 NOT NULL,
    "prompt_text" "text" NOT NULL,
    "help_text" "text",
    "service_type_key" "text",
    "allows_varies" boolean DEFAULT false NOT NULL,
    "research_status_key" "text" DEFAULT 'candidate'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "working_style_questions_questionnaire_version_check" CHECK (("questionnaire_version" >= 1)),
    CONSTRAINT "working_style_questions_research_status_key_check" CHECK (("research_status_key" = ANY (ARRAY['candidate'::"text", 'approved'::"text", 'deprecated'::"text"])))
);


ALTER TABLE "public"."working_style_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."working_style_response_contexts" (
    "response_id" "uuid" NOT NULL,
    "context_key" "text" NOT NULL
);


ALTER TABLE "public"."working_style_response_contexts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "verification"."credential_verification_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "credential_id" "uuid" NOT NULL,
    "status_key" "text" NOT NULL,
    "method_key" "text" NOT NULL,
    "checked_at" timestamp with time zone,
    "checked_by_staff_auth_user_id" "uuid",
    "evidence_file_id" "uuid",
    "recheck_at" timestamp with time zone,
    "internal_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "credential_verification_events_method_key_check" CHECK (("method_key" = ANY (ARRAY['manual_register'::"text", 'document_review'::"text", 'external_confirmation'::"text", 'research_fixture'::"text", 'other'::"text"]))),
    CONSTRAINT "credential_verification_events_status_key_check" CHECK (("status_key" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'failed'::"text", 'expired'::"text", 'not_checked'::"text"])))
);


ALTER TABLE "verification"."credential_verification_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "verification"."evidence_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "counsellor_id" "uuid" NOT NULL,
    "credential_id" "uuid",
    "storage_bucket" "text" DEFAULT 'verification-evidence'::"text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "file_type" "text",
    "original_filename" "text",
    "uploaded_by_auth_user_id" "uuid",
    "retention_class" "text" DEFAULT 'credential_evidence'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "delete_after" timestamp with time zone
);


ALTER TABLE "verification"."evidence_files" OWNER TO "postgres";


CREATE OR REPLACE VIEW "verification"."v_current_credential_verification" WITH ("security_invoker"='true') AS
 SELECT DISTINCT ON ("credential_id") "id",
    "credential_id",
    "status_key",
    "method_key",
    "checked_at",
    "checked_by_staff_auth_user_id",
    "evidence_file_id",
    "recheck_at",
    "created_at"
   FROM "verification"."credential_verification_events" "e"
  ORDER BY "credential_id", COALESCE("checked_at", "created_at") DESC, "created_at" DESC;


ALTER VIEW "verification"."v_current_credential_verification" OWNER TO "postgres";


ALTER TABLE ONLY "private"."counsellor_eligibility"
    ADD CONSTRAINT "counsellor_eligibility_pkey" PRIMARY KEY ("counsellor_id");



ALTER TABLE ONLY "private"."counsellor_location_accessibility_reviews"
    ADD CONSTRAINT "counsellor_location_accessibility_reviews_pkey" PRIMARY KEY ("counsellor_id", "intake_version", "location_id");



ALTER TABLE ONLY "private"."counsellor_onboarding_sections"
    ADD CONSTRAINT "counsellor_onboarding_sections_pkey" PRIMARY KEY ("counsellor_id", "intake_version", "section_key");



ALTER TABLE ONLY "private"."counsellor_onboarding_state"
    ADD CONSTRAINT "counsellor_onboarding_state_pkey" PRIMARY KEY ("counsellor_id");



ALTER TABLE ONLY "private"."counsellor_professional_background_reviews"
    ADD CONSTRAINT "counsellor_professional_background_reviews_pkey" PRIMARY KEY ("counsellor_id", "intake_version");



ALTER TABLE ONLY "private"."counsellor_profile_voice_reviews"
    ADD CONSTRAINT "counsellor_profile_voice_reviews_pkey" PRIMARY KEY ("counsellor_id", "intake_version");



ALTER TABLE ONLY "private"."counsellor_users"
    ADD CONSTRAINT "counsellor_users_counsellor_id_auth_user_id_key" UNIQUE ("counsellor_id", "auth_user_id");



ALTER TABLE ONLY "private"."counsellor_users"
    ADD CONSTRAINT "counsellor_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "private"."credential_private_data"
    ADD CONSTRAINT "credential_private_data_pkey" PRIMARY KEY ("credential_id");



ALTER TABLE ONLY "private"."service_location_private"
    ADD CONSTRAINT "service_location_private_pkey" PRIMARY KEY ("location_id");



ALTER TABLE ONLY "private"."staff_users"
    ADD CONSTRAINT "staff_users_pkey" PRIMARY KEY ("auth_user_id");



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



ALTER TABLE ONLY "public"."counsellor_service_declaration_client_groups"
    ADD CONSTRAINT "counsellor_service_declaration_client_groups_pkey" PRIMARY KEY ("counsellor_id", "service_type_key", "client_group_key");



ALTER TABLE ONLY "public"."counsellor_service_declarations"
    ADD CONSTRAINT "counsellor_service_declarations_pkey" PRIMARY KEY ("counsellor_id", "service_type_key");



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



ALTER TABLE ONLY "public"."working_style_constructs"
    ADD CONSTRAINT "working_style_constructs_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."working_style_context_reasons"
    ADD CONSTRAINT "working_style_context_reasons_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."working_style_definitions"
    ADD CONSTRAINT "working_style_definitions_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."working_style_options"
    ADD CONSTRAINT "working_style_options_pkey" PRIMARY KEY ("definition_key", "option_key");



ALTER TABLE ONLY "public"."working_style_question_options"
    ADD CONSTRAINT "working_style_question_options_pkey" PRIMARY KEY ("question_key", "option_key");



ALTER TABLE ONLY "public"."working_style_question_responses"
    ADD CONSTRAINT "working_style_question_responses_counsellor_id_question_key_key" UNIQUE ("counsellor_id", "question_key");



ALTER TABLE ONLY "public"."working_style_question_responses"
    ADD CONSTRAINT "working_style_question_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."working_style_questions"
    ADD CONSTRAINT "working_style_questions_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."working_style_response_contexts"
    ADD CONSTRAINT "working_style_response_contexts_pkey" PRIMARY KEY ("response_id", "context_key");



ALTER TABLE ONLY "public"."working_style_responses"
    ADD CONSTRAINT "working_style_responses_pkey" PRIMARY KEY ("counsellor_id", "definition_key");



ALTER TABLE ONLY "verification"."credential_verification_events"
    ADD CONSTRAINT "credential_verification_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "verification"."evidence_files"
    ADD CONSTRAINT "evidence_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "verification"."evidence_files"
    ADD CONSTRAINT "evidence_files_storage_bucket_storage_path_key" UNIQUE ("storage_bucket", "storage_path");



CREATE INDEX "idx_counsellor_location_accessibility_reviews_location" ON "private"."counsellor_location_accessibility_reviews" USING "btree" ("location_id");



CREATE INDEX "idx_counsellor_users_auth_user_id" ON "private"."counsellor_users" USING "btree" ("auth_user_id");



CREATE INDEX "idx_counsellor_users_counsellor_id" ON "private"."counsellor_users" USING "btree" ("counsellor_id");



CREATE UNIQUE INDEX "uq_credential_registration_number" ON "private"."credential_private_data" USING "btree" ("registration_number");



CREATE UNIQUE INDEX "counsellor_profile_images_one_current" ON "public"."counsellor_profile_images" USING "btree" ("counsellor_id") WHERE ("is_current" = true);



CREATE INDEX "idx_affiliations_counsellor" ON "public"."counsellor_practice_affiliations" USING "btree" ("counsellor_id");



CREATE INDEX "idx_affiliations_practice" ON "public"."counsellor_practice_affiliations" USING "btree" ("practice_id");



CREATE INDEX "idx_appointment_windows_counsellor" ON "public"."appointment_windows" USING "btree" ("counsellor_id");



CREATE INDEX "idx_appointment_windows_daypart" ON "public"."appointment_windows" USING "btree" ("day_of_week", "daypart_key");



CREATE INDEX "idx_appointment_windows_service" ON "public"."appointment_windows" USING "btree" ("service_offering_id");



CREATE INDEX "idx_availability_history_counsellor_confirmed" ON "public"."counsellor_availability_history" USING "btree" ("counsellor_id", "confirmed_at" DESC);



CREATE INDEX "idx_contact_routes_counsellor" ON "public"."contact_routes" USING "btree" ("counsellor_id", "active", "is_primary" DESC);



CREATE INDEX "idx_counsellor_approaches_approach" ON "public"."counsellor_therapeutic_approaches" USING "btree" ("approach_key");



CREATE INDEX "idx_counsellor_approaches_relationship" ON "public"."counsellor_therapeutic_approaches" USING "btree" ("relationship_key", "active");



CREATE INDEX "idx_counsellor_availability_confirmed_at" ON "public"."counsellor_availability" USING "btree" ("confirmed_at" DESC);



CREATE INDEX "idx_counsellor_availability_status" ON "public"."counsellor_availability" USING "btree" ("status_key");



CREATE INDEX "idx_counsellor_practice_areas_area" ON "public"."counsellor_practice_areas" USING "btree" ("practice_area_key", "emphasis_key");



CREATE INDEX "idx_counsellor_practice_areas_counsellor" ON "public"."counsellor_practice_areas" USING "btree" ("counsellor_id", "emphasis_key");



CREATE INDEX "idx_counsellor_service_declaration_groups_group" ON "public"."counsellor_service_declaration_client_groups" USING "btree" ("client_group_key");



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



CREATE INDEX "idx_service_offerings_client_gender_scope" ON "public"."service_offerings" USING "btree" ("client_gender_scope_key") WHERE ("active" = true);



CREATE INDEX "idx_service_offerings_counsellor" ON "public"."service_offerings" USING "btree" ("counsellor_id");



CREATE INDEX "idx_service_offerings_delivery" ON "public"."service_offerings" USING "btree" ("delivery_mode_key", "active", "public_visible");



CREATE INDEX "idx_service_offerings_service_type" ON "public"."service_offerings" USING "btree" ("service_type_key");



CREATE INDEX "idx_training_certifications_counsellor" ON "public"."training_certifications" USING "btree" ("counsellor_id", "sort_order");



CREATE INDEX "idx_training_certifications_evidence" ON "public"."training_certifications" USING "btree" ("evidence_status_key");



CREATE INDEX "idx_working_style_questions_construct" ON "public"."working_style_questions" USING "btree" ("construct_key", "questionnaire_version", "sort_order");



CREATE INDEX "idx_working_style_responses_definition" ON "public"."working_style_responses" USING "btree" ("definition_key", "option_key");



CREATE INDEX "idx_ws_question_responses_counsellor" ON "public"."working_style_question_responses" USING "btree" ("counsellor_id");



CREATE UNIQUE INDEX "uq_contact_routes_one_primary" ON "public"."contact_routes" USING "btree" ("counsellor_id") WHERE (("is_primary" = true) AND ("active" = true));



CREATE UNIQUE INDEX "uq_counsellor_one_primary_practice" ON "public"."counsellor_practice_affiliations" USING "btree" ("counsellor_id") WHERE (("is_primary" = true) AND ("ended_on" IS NULL));



CREATE UNIQUE INDEX "uq_professional_credentials_primary" ON "public"."professional_credentials" USING "btree" ("counsellor_id") WHERE ("is_primary" = true);



CREATE UNIQUE INDEX "uq_profile_publications_one_current_published" ON "public"."profile_publications" USING "btree" ("counsellor_id") WHERE (("status_key" = 'published'::"text") AND ("superseded_at" IS NULL));



CREATE UNIQUE INDEX "uq_service_offerings_active_in_person_location" ON "public"."service_offerings" USING "btree" ("counsellor_id", "service_type_key", "location_id") WHERE (("active" = true) AND ("delivery_mode_key" = 'in_person'::"text"));



CREATE UNIQUE INDEX "uq_service_offerings_active_virtual" ON "public"."service_offerings" USING "btree" ("counsellor_id", "service_type_key") WHERE (("active" = true) AND ("delivery_mode_key" = 'virtual'::"text"));



CREATE INDEX "idx_credential_verification_events_credential" ON "verification"."credential_verification_events" USING "btree" ("credential_id", "created_at" DESC);



CREATE INDEX "idx_credential_verification_events_recheck" ON "verification"."credential_verification_events" USING "btree" ("recheck_at") WHERE ("recheck_at" IS NOT NULL);



CREATE INDEX "idx_credential_verification_events_status" ON "verification"."credential_verification_events" USING "btree" ("status_key");



CREATE INDEX "idx_evidence_files_counsellor" ON "verification"."evidence_files" USING "btree" ("counsellor_id");



CREATE INDEX "idx_evidence_files_credential" ON "verification"."evidence_files" USING "btree" ("credential_id");



CREATE OR REPLACE TRIGGER "counsellor_eligibility_set_updated_at" BEFORE UPDATE ON "private"."counsellor_eligibility" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "counsellor_onboarding_sections_set_updated_at" BEFORE UPDATE ON "private"."counsellor_onboarding_sections" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "counsellor_onboarding_state_set_updated_at" BEFORE UPDATE ON "private"."counsellor_onboarding_state" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "credential_private_data_set_updated_at" BEFORE UPDATE ON "private"."credential_private_data" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "service_location_private_set_updated_at" BEFORE UPDATE ON "private"."service_location_private" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



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



CREATE OR REPLACE TRIGGER "counsellor_service_declaration_groups_invalidate_practical_deta" AFTER INSERT OR DELETE OR UPDATE ON "public"."counsellor_service_declaration_client_groups" FOR EACH ROW EXECUTE FUNCTION "private"."invalidate_practical_details_from_service_scope"();



CREATE OR REPLACE TRIGGER "counsellor_service_declarations_invalidate_practical_details" AFTER INSERT OR DELETE OR UPDATE ON "public"."counsellor_service_declarations" FOR EACH ROW EXECUTE FUNCTION "private"."invalidate_practical_details_from_service_scope"();



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



CREATE OR REPLACE TRIGGER "working_style_question_responses_set_updated_at" BEFORE UPDATE ON "public"."working_style_question_responses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "working_style_responses_set_updated_at" BEFORE UPDATE ON "public"."working_style_responses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "private"."counsellor_eligibility"
    ADD CONSTRAINT "counsellor_eligibility_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "private"."counsellor_location_accessibility_reviews"
    ADD CONSTRAINT "counsellor_location_accessibility_reviews_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "private"."counsellor_location_accessibility_reviews"
    ADD CONSTRAINT "counsellor_location_accessibility_reviews_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."service_locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "private"."counsellor_onboarding_sections"
    ADD CONSTRAINT "counsellor_onboarding_sections_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "private"."counsellor_onboarding_state"
    ADD CONSTRAINT "counsellor_onboarding_state_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "private"."counsellor_professional_background_reviews"
    ADD CONSTRAINT "counsellor_professional_background_reviews_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "private"."counsellor_profile_voice_reviews"
    ADD CONSTRAINT "counsellor_profile_voice_reviews_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "private"."counsellor_users"
    ADD CONSTRAINT "counsellor_users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "private"."counsellor_users"
    ADD CONSTRAINT "counsellor_users_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "private"."credential_private_data"
    ADD CONSTRAINT "credential_private_data_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "public"."professional_credentials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "private"."service_location_private"
    ADD CONSTRAINT "service_location_private_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."service_locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "private"."staff_users"
    ADD CONSTRAINT "staff_users_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."counsellor_service_declaration_client_groups"
    ADD CONSTRAINT "counsellor_service_declaration_client_gro_client_group_key_fkey" FOREIGN KEY ("client_group_key") REFERENCES "public"."client_groups"("key") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."counsellor_service_declaration_client_groups"
    ADD CONSTRAINT "counsellor_service_declaration_client_groups_declaration_fkey" FOREIGN KEY ("counsellor_id", "service_type_key") REFERENCES "public"."counsellor_service_declarations"("counsellor_id", "service_type_key") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."counsellor_service_declarations"
    ADD CONSTRAINT "counsellor_service_declarations_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."counsellor_service_declarations"
    ADD CONSTRAINT "counsellor_service_declarations_service_type_key_fkey" FOREIGN KEY ("service_type_key") REFERENCES "public"."service_types"("key") ON DELETE RESTRICT;



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
    ADD CONSTRAINT "service_offerings_declaration_fkey" FOREIGN KEY ("counsellor_id", "service_type_key") REFERENCES "public"."counsellor_service_declarations"("counsellor_id", "service_type_key") ON DELETE RESTRICT;



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



ALTER TABLE ONLY "public"."working_style_question_options"
    ADD CONSTRAINT "working_style_question_options_question_key_fkey" FOREIGN KEY ("question_key") REFERENCES "public"."working_style_questions"("key") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."working_style_question_responses"
    ADD CONSTRAINT "working_style_question_responses_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."working_style_question_responses"
    ADD CONSTRAINT "working_style_question_responses_question_key_option_key_fkey" FOREIGN KEY ("question_key", "option_key") REFERENCES "public"."working_style_question_options"("question_key", "option_key") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."working_style_questions"
    ADD CONSTRAINT "working_style_questions_construct_key_fkey" FOREIGN KEY ("construct_key") REFERENCES "public"."working_style_constructs"("key") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."working_style_questions"
    ADD CONSTRAINT "working_style_questions_service_type_key_fkey" FOREIGN KEY ("service_type_key") REFERENCES "public"."service_types"("key") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."working_style_response_contexts"
    ADD CONSTRAINT "working_style_response_contexts_context_key_fkey" FOREIGN KEY ("context_key") REFERENCES "public"."working_style_context_reasons"("key") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."working_style_response_contexts"
    ADD CONSTRAINT "working_style_response_contexts_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "public"."working_style_question_responses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."working_style_responses"
    ADD CONSTRAINT "working_style_responses_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."working_style_responses"
    ADD CONSTRAINT "working_style_responses_definition_key_option_key_fkey" FOREIGN KEY ("definition_key", "option_key") REFERENCES "public"."working_style_options"("definition_key", "option_key") ON DELETE RESTRICT;



ALTER TABLE ONLY "verification"."credential_verification_events"
    ADD CONSTRAINT "credential_verification_event_checked_by_staff_auth_user_i_fkey" FOREIGN KEY ("checked_by_staff_auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "verification"."credential_verification_events"
    ADD CONSTRAINT "credential_verification_events_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "public"."professional_credentials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "verification"."credential_verification_events"
    ADD CONSTRAINT "credential_verification_events_evidence_file_id_fkey" FOREIGN KEY ("evidence_file_id") REFERENCES "verification"."evidence_files"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "verification"."evidence_files"
    ADD CONSTRAINT "evidence_files_counsellor_id_fkey" FOREIGN KEY ("counsellor_id") REFERENCES "public"."counsellors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "verification"."evidence_files"
    ADD CONSTRAINT "evidence_files_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "public"."professional_credentials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "verification"."evidence_files"
    ADD CONSTRAINT "evidence_files_uploaded_by_auth_user_id_fkey" FOREIGN KEY ("uploaded_by_auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE "private"."counsellor_eligibility" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "private"."counsellor_location_accessibility_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "private"."counsellor_onboarding_sections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "counsellor_onboarding_sections_own_insert" ON "private"."counsellor_onboarding_sections" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_onboarding_sections_own_read" ON "private"."counsellor_onboarding_sections" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_onboarding_sections_own_update" ON "private"."counsellor_onboarding_sections" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



ALTER TABLE "private"."counsellor_onboarding_state" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "counsellor_onboarding_state_own_insert" ON "private"."counsellor_onboarding_state" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_onboarding_state_own_read" ON "private"."counsellor_onboarding_state" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_onboarding_state_own_update" ON "private"."counsellor_onboarding_state" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



ALTER TABLE "private"."counsellor_professional_background_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "private"."counsellor_profile_voice_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "private"."counsellor_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "counsellor_users_own_read" ON "private"."counsellor_users" FOR SELECT TO "authenticated" USING ((("auth_user_id" = "auth"."uid"()) OR "private"."is_bcmc_staff"()));



ALTER TABLE "private"."credential_private_data" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "credential_private_own_insert" ON "private"."credential_private_data" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."professional_credentials" "pc"
  WHERE (("pc"."id" = "credential_private_data"."credential_id") AND ("private"."is_counsellor_user"("pc"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "credential_private_own_read" ON "private"."credential_private_data" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."professional_credentials" "pc"
  WHERE (("pc"."id" = "credential_private_data"."credential_id") AND ("private"."is_counsellor_user"("pc"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "credential_private_own_update" ON "private"."credential_private_data" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."professional_credentials" "pc"
  WHERE (("pc"."id" = "credential_private_data"."credential_id") AND ("private"."is_counsellor_user"("pc"."counsellor_id") OR "private"."is_bcmc_staff"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."professional_credentials" "pc"
  WHERE (("pc"."id" = "credential_private_data"."credential_id") AND ("private"."is_counsellor_user"("pc"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "eligibility_own_insert" ON "private"."counsellor_eligibility" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "eligibility_own_read" ON "private"."counsellor_eligibility" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "eligibility_own_update" ON "private"."counsellor_eligibility" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



ALTER TABLE "private"."service_location_private" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_location_private_own_insert" ON "private"."service_location_private" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."service_locations" "l"
  WHERE (("l"."id" = "service_location_private"."location_id") AND ("private"."is_counsellor_user"("l"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "service_location_private_own_read" ON "private"."service_location_private" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."service_locations" "l"
  WHERE (("l"."id" = "service_location_private"."location_id") AND ("private"."is_counsellor_user"("l"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "service_location_private_own_update" ON "private"."service_location_private" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."service_locations" "l"
  WHERE (("l"."id" = "service_location_private"."location_id") AND ("private"."is_counsellor_user"("l"."counsellor_id") OR "private"."is_bcmc_staff"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."service_locations" "l"
  WHERE (("l"."id" = "service_location_private"."location_id") AND ("private"."is_counsellor_user"("l"."counsellor_id") OR "private"."is_bcmc_staff"())))));



ALTER TABLE "private"."staff_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_users_self_read" ON "private"."staff_users" FOR SELECT TO "authenticated" USING ((("auth_user_id" = "auth"."uid"()) OR "private"."has_staff_role"('admin'::"text")));



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


ALTER TABLE "public"."counsellor_service_declaration_client_groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "counsellor_service_declaration_groups_own_delete" ON "public"."counsellor_service_declaration_client_groups" FOR DELETE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_service_declaration_groups_own_insert" ON "public"."counsellor_service_declaration_client_groups" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_service_declaration_groups_own_read" ON "public"."counsellor_service_declaration_client_groups" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



ALTER TABLE "public"."counsellor_service_declarations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "counsellor_service_declarations_own_delete" ON "public"."counsellor_service_declarations" FOR DELETE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_service_declarations_own_insert" ON "public"."counsellor_service_declarations" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_service_declarations_own_read" ON "public"."counsellor_service_declarations" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "counsellor_service_declarations_own_update" ON "public"."counsellor_service_declarations" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



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



ALTER TABLE "public"."working_style_constructs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "working_style_constructs_intake_read" ON "public"."working_style_constructs" FOR SELECT TO "authenticated" USING (((("active" = true) AND ("research_status_key" <> 'deprecated'::"text")) OR "private"."is_bcmc_staff"()));



ALTER TABLE "public"."working_style_context_reasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "working_style_context_reasons_intake_read" ON "public"."working_style_context_reasons" FOR SELECT TO "authenticated" USING ((("active" = true) OR "private"."is_bcmc_staff"()));



ALTER TABLE "public"."working_style_definitions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "working_style_definitions_public_read" ON "public"."working_style_definitions" FOR SELECT TO "authenticated", "anon" USING ((("active" = true) AND ("research_status_key" <> 'deprecated'::"text")));



CREATE POLICY "working_style_definitions_staff_read" ON "public"."working_style_definitions" FOR SELECT TO "authenticated" USING ("private"."is_bcmc_staff"());



ALTER TABLE "public"."working_style_options" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "working_style_options_public_read" ON "public"."working_style_options" FOR SELECT TO "authenticated", "anon" USING ((("active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."working_style_definitions" "d"
  WHERE (("d"."key" = "working_style_options"."definition_key") AND ("d"."active" = true) AND ("d"."research_status_key" <> 'deprecated'::"text"))))));



CREATE POLICY "working_style_options_staff_read" ON "public"."working_style_options" FOR SELECT TO "authenticated" USING ("private"."is_bcmc_staff"());



ALTER TABLE "public"."working_style_question_options" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "working_style_question_options_intake_read" ON "public"."working_style_question_options" FOR SELECT TO "authenticated" USING ((("active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."working_style_questions" "q"
  WHERE (("q"."key" = "working_style_question_options"."question_key") AND ("q"."active" = true) AND ("q"."research_status_key" <> 'deprecated'::"text"))))));



ALTER TABLE "public"."working_style_question_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "working_style_question_responses_own_delete" ON "public"."working_style_question_responses" FOR DELETE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "working_style_question_responses_own_insert" ON "public"."working_style_question_responses" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "working_style_question_responses_own_read" ON "public"."working_style_question_responses" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "working_style_question_responses_own_update" ON "public"."working_style_question_responses" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



ALTER TABLE "public"."working_style_questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "working_style_questions_intake_read" ON "public"."working_style_questions" FOR SELECT TO "authenticated" USING (((("active" = true) AND ("research_status_key" <> 'deprecated'::"text")) OR "private"."is_bcmc_staff"()));



ALTER TABLE "public"."working_style_response_contexts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "working_style_response_contexts_own_delete" ON "public"."working_style_response_contexts" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."working_style_question_responses" "r"
  WHERE (("r"."id" = "working_style_response_contexts"."response_id") AND ("private"."is_counsellor_user"("r"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "working_style_response_contexts_own_insert" ON "public"."working_style_response_contexts" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."working_style_question_responses" "r"
  WHERE (("r"."id" = "working_style_response_contexts"."response_id") AND ("private"."is_counsellor_user"("r"."counsellor_id") OR "private"."is_bcmc_staff"())))));



CREATE POLICY "working_style_response_contexts_own_read" ON "public"."working_style_response_contexts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."working_style_question_responses" "r"
  WHERE (("r"."id" = "working_style_response_contexts"."response_id") AND ("private"."is_counsellor_user"("r"."counsellor_id") OR "private"."is_bcmc_staff"())))));



ALTER TABLE "public"."working_style_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "working_style_responses_own_delete" ON "public"."working_style_responses" FOR DELETE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "working_style_responses_own_insert" ON "public"."working_style_responses" FOR INSERT TO "authenticated" WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "working_style_responses_own_read" ON "public"."working_style_responses" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "working_style_responses_own_update" ON "public"."working_style_responses" FOR UPDATE TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"())) WITH CHECK (("private"."is_counsellor_user"("counsellor_id") OR "private"."is_bcmc_staff"()));



CREATE POLICY "working_style_responses_public_read" ON "public"."working_style_responses" FOR SELECT TO "authenticated", "anon" USING ((("public_visible" = true) AND ("active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."counsellors" "c"
  WHERE (("c"."id" = "working_style_responses"."counsellor_id") AND ("c"."lifecycle_status" = 'active'::"text") AND ("c"."publication_status" = 'published'::"text"))))));



ALTER TABLE "verification"."credential_verification_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "verification"."evidence_files" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "evidence_files_own_insert" ON "verification"."evidence_files" FOR INSERT TO "authenticated" WITH CHECK ((("private"."is_counsellor_user"("counsellor_id") AND ("uploaded_by_auth_user_id" = "auth"."uid"())) OR "private"."has_staff_role"('verifier'::"text") OR "private"."has_staff_role"('admin'::"text")));



CREATE POLICY "evidence_files_own_read" ON "verification"."evidence_files" FOR SELECT TO "authenticated" USING (("private"."is_counsellor_user"("counsellor_id") OR "private"."has_staff_role"('verifier'::"text") OR "private"."has_staff_role"('admin'::"text")));



CREATE POLICY "verification_events_own_read" ON "verification"."credential_verification_events" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."professional_credentials" "pc"
  WHERE (("pc"."id" = "credential_verification_events"."credential_id") AND ("private"."is_counsellor_user"("pc"."counsellor_id") OR "private"."has_staff_role"('verifier'::"text") OR "private"."has_staff_role"('reviewer'::"text") OR "private"."has_staff_role"('admin'::"text"))))));



GRANT USAGE ON SCHEMA "private" TO "authenticated";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "verification" TO "authenticated";



REVOKE ALL ON FUNCTION "private"."has_staff_role"("required_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."has_staff_role"("required_role" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_bcmc_staff"() FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_bcmc_staff"() TO "authenticated";



REVOKE ALL ON FUNCTION "private"."is_counsellor_user"("target_counsellor_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "private"."is_counsellor_user"("target_counsellor_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."complete_my_contact_enquiries"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_my_contact_enquiries"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_my_contact_enquiries"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_my_practical_details"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_my_practical_details"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_my_practical_details"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_my_professional_background"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_my_professional_background"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_my_professional_background"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_my_profile_voice"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_my_profile_voice"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_my_profile_voice"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."credential_verification_label"("p_credential_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."credential_verification_label"("p_credential_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."credential_verification_label"("p_credential_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."credential_verification_label"("p_credential_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_my_professional_education"("p_education_record_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_my_professional_education"("p_education_record_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_my_professional_education"("p_education_record_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_contact_enquiries_completion"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_contact_enquiries_completion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_contact_enquiries_completion"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_counsellor_accounts"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_counsellor_accounts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_counsellor_accounts"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_counsellor_onboarding"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_counsellor_onboarding"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_counsellor_onboarding"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_practical_details_completion"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_practical_details_completion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_practical_details_completion"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_professional_background_completion"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_professional_background_completion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_professional_background_completion"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_profile_voice_completion"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_profile_voice_completion"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_profile_voice_completion"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_profile_voice_intake"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_profile_voice_intake"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_profile_voice_intake"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_public_credential_verification"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_public_credential_verification"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_credential_verification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_credential_verification"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."initialize_my_counsellor_onboarding"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."initialize_my_counsellor_onboarding"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_my_counsellor_onboarding"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_my_availability"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_my_availability"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_my_availability"("p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_my_consultation_preferences"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_my_consultation_preferences"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_my_consultation_preferences"("p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_my_contact_enquiries"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_my_contact_enquiries"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_my_contact_enquiries"("p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_my_counsellor_cultural_familiarity"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_my_counsellor_cultural_familiarity"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_my_counsellor_cultural_familiarity"("p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_my_counsellor_faith_profile"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_my_counsellor_faith_profile"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_my_counsellor_faith_profile"("p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_my_counsellor_practice_areas"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_my_counsellor_practice_areas"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_my_counsellor_practice_areas"("p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_my_counsellor_service_declarations"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_my_counsellor_service_declarations"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_my_counsellor_service_declarations"("p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_my_counsellor_working_style_responses"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_my_counsellor_working_style_responses"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_my_counsellor_working_style_responses"("p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_my_location_accessibility"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_my_location_accessibility"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_my_location_accessibility"("p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_my_practical_service_configurations"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_my_practical_service_configurations"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_my_practical_service_configurations"("p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_my_professional_education"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_my_professional_education"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_my_professional_education"("p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_my_professional_experience"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_my_professional_experience"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_my_professional_experience"("p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_my_profile_voice_intake"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_my_profile_voice_intake"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_my_profile_voice_intake"("p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_my_service_fee_policies"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_my_service_fee_policies"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_my_service_fee_policies"("p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_my_therapeutic_approaches"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_my_therapeutic_approaches"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_my_therapeutic_approaches"("p_payload" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_counsellor_availability"("p_counsellor_id" "uuid", "p_status_key" "text", "p_status_note" "text", "p_confirmed_at" timestamp with time zone, "p_confirmation_source_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_counsellor_availability"("p_counsellor_id" "uuid", "p_status_key" "text", "p_status_note" "text", "p_confirmed_at" timestamp with time zone, "p_confirmation_source_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_counsellor_availability"("p_counsellor_id" "uuid", "p_status_key" "text", "p_status_note" "text", "p_confirmed_at" timestamp with time zone, "p_confirmation_source_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_counsellor_availability"("p_counsellor_id" "uuid", "p_status_key" "text", "p_status_note" "text", "p_confirmed_at" timestamp with time zone, "p_confirmation_source_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_my_counsellor_onboarding_section"("p_section_key" "text", "p_status_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_my_counsellor_onboarding_section"("p_section_key" "text", "p_status_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_my_counsellor_onboarding_section"("p_section_key" "text", "p_status_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."upsert_my_service_location"("p_payload" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_my_service_location"("p_payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_my_service_location"("p_payload" "jsonb") TO "service_role";



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



REVOKE ALL ON FUNCTION "verification"."set_credential_status"("p_credential_id" "uuid", "p_status_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "verification"."set_credential_status"("p_credential_id" "uuid", "p_status_key" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "verification"."verify_credential"("p_credential_id" "uuid", "p_status_key" "text", "p_method_key" "text", "p_evidence_file_id" "uuid", "p_recheck_at" timestamp with time zone, "p_internal_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "verification"."verify_credential"("p_credential_id" "uuid", "p_status_key" "text", "p_method_key" "text", "p_evidence_file_id" "uuid", "p_recheck_at" timestamp with time zone, "p_internal_note" "text") TO "authenticated";



GRANT SELECT,INSERT,UPDATE ON TABLE "private"."counsellor_eligibility" TO "authenticated";



GRANT SELECT,INSERT,UPDATE ON TABLE "private"."counsellor_onboarding_sections" TO "authenticated";



GRANT SELECT,INSERT,UPDATE ON TABLE "private"."counsellor_onboarding_state" TO "authenticated";



GRANT SELECT ON TABLE "private"."counsellor_users" TO "authenticated";



GRANT SELECT,INSERT,UPDATE ON TABLE "private"."credential_private_data" TO "authenticated";



GRANT SELECT,INSERT,UPDATE ON TABLE "private"."service_location_private" TO "authenticated";



GRANT SELECT ON TABLE "private"."staff_users" TO "authenticated";



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



GRANT ALL ON TABLE "public"."counsellor_service_declaration_client_groups" TO "anon";
GRANT ALL ON TABLE "public"."counsellor_service_declaration_client_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."counsellor_service_declaration_client_groups" TO "service_role";



GRANT ALL ON TABLE "public"."counsellor_service_declarations" TO "anon";
GRANT ALL ON TABLE "public"."counsellor_service_declarations" TO "authenticated";
GRANT ALL ON TABLE "public"."counsellor_service_declarations" TO "service_role";



GRANT ALL ON TABLE "public"."counsellor_therapeutic_approaches" TO "service_role";
GRANT SELECT ON TABLE "public"."counsellor_therapeutic_approaches" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."counsellor_therapeutic_approaches" TO "authenticated";



GRANT UPDATE("relationship_key") ON TABLE "public"."counsellor_therapeutic_approaches" TO "authenticated";



GRANT ALL ON TABLE "public"."counsellors" TO "service_role";
GRANT SELECT ON TABLE "public"."counsellors" TO "anon";
GRANT SELECT,INSERT ON TABLE "public"."counsellors" TO "authenticated";



GRANT UPDATE("slug") ON TABLE "public"."counsellors" TO "authenticated";



GRANT UPDATE("display_name") ON TABLE "public"."counsellors" TO "authenticated";



GRANT UPDATE("preferred_name") ON TABLE "public"."counsellors" TO "authenticated";



GRANT UPDATE("pronouns") ON TABLE "public"."counsellors" TO "authenticated";



GRANT UPDATE("gender_key") ON TABLE "public"."counsellors" TO "authenticated";



GRANT UPDATE("gender_self_description") ON TABLE "public"."counsellors" TO "authenticated";



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



GRANT UPDATE("integration_mode_key") ON TABLE "public"."faith_practice_profiles" TO "authenticated";



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



GRANT UPDATE("post_masters_practice_start_year") ON TABLE "public"."professional_experience" TO "authenticated";



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



GRANT ALL ON TABLE "public"."working_style_constructs" TO "service_role";
GRANT SELECT ON TABLE "public"."working_style_constructs" TO "authenticated";



GRANT ALL ON TABLE "public"."working_style_context_reasons" TO "service_role";
GRANT SELECT ON TABLE "public"."working_style_context_reasons" TO "authenticated";



GRANT ALL ON TABLE "public"."working_style_question_options" TO "service_role";
GRANT SELECT ON TABLE "public"."working_style_question_options" TO "authenticated";



GRANT ALL ON TABLE "public"."working_style_question_responses" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."working_style_question_responses" TO "authenticated";



GRANT ALL ON TABLE "public"."working_style_questions" TO "service_role";
GRANT SELECT ON TABLE "public"."working_style_questions" TO "authenticated";



GRANT ALL ON TABLE "public"."working_style_response_contexts" TO "service_role";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."working_style_response_contexts" TO "authenticated";



GRANT SELECT ON TABLE "verification"."credential_verification_events" TO "authenticated";



GRANT SELECT,INSERT ON TABLE "verification"."evidence_files" TO "authenticated";



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







