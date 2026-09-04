import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_agent_proposal_audits_operation" AS ENUM('create_prompt');
  CREATE TYPE "public"."enum_agent_proposal_audits_locale" AS ENUM('en', 'zh-CN');
  CREATE TYPE "public"."enum_agent_proposal_audits_result" AS ENUM('draft_applied');
  ALTER TYPE "public"."enum_users_roles" ADD VALUE 'agent_proposer' BEFORE 'editor';
  CREATE TABLE "agent_proposal_audits" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"idempotency_key" varchar NOT NULL,
  	"request_hash" varchar NOT NULL,
  	"operation" "enum_agent_proposal_audits_operation" NOT NULL,
  	"artifact_key" varchar NOT NULL,
  	"locale" "enum_agent_proposal_audits_locale" NOT NULL,
  	"actor_id" integer NOT NULL,
  	"artifact_id" integer NOT NULL,
  	"locale_variant_id" integer NOT NULL,
  	"source_evidence_id" integer NOT NULL,
  	"result" "enum_agent_proposal_audits_result" NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users" ADD COLUMN "enable_a_p_i_key" boolean;
  ALTER TABLE "users" ADD COLUMN "api_key" varchar;
  ALTER TABLE "users" ADD COLUMN "api_key_index" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "agent_proposal_audits_id" integer;
  ALTER TABLE "agent_proposal_audits" ADD CONSTRAINT "agent_proposal_audits_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agent_proposal_audits" ADD CONSTRAINT "agent_proposal_audits_artifact_id_prompt_artifacts_id_fk" FOREIGN KEY ("artifact_id") REFERENCES "public"."prompt_artifacts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agent_proposal_audits" ADD CONSTRAINT "agent_proposal_audits_locale_variant_id_locale_variants_id_fk" FOREIGN KEY ("locale_variant_id") REFERENCES "public"."locale_variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "agent_proposal_audits" ADD CONSTRAINT "agent_proposal_audits_source_evidence_id_source_evidence_id_fk" FOREIGN KEY ("source_evidence_id") REFERENCES "public"."source_evidence"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "agent_proposal_audits_idempotency_key_idx" ON "agent_proposal_audits" USING btree ("idempotency_key");
  CREATE INDEX "agent_proposal_audits_artifact_key_idx" ON "agent_proposal_audits" USING btree ("artifact_key");
  CREATE INDEX "agent_proposal_audits_locale_idx" ON "agent_proposal_audits" USING btree ("locale");
  CREATE INDEX "agent_proposal_audits_actor_idx" ON "agent_proposal_audits" USING btree ("actor_id");
  CREATE INDEX "agent_proposal_audits_artifact_idx" ON "agent_proposal_audits" USING btree ("artifact_id");
  CREATE INDEX "agent_proposal_audits_locale_variant_idx" ON "agent_proposal_audits" USING btree ("locale_variant_id");
  CREATE INDEX "agent_proposal_audits_source_evidence_idx" ON "agent_proposal_audits" USING btree ("source_evidence_id");
  CREATE INDEX "agent_proposal_audits_updated_at_idx" ON "agent_proposal_audits" USING btree ("updated_at");
  CREATE INDEX "agent_proposal_audits_created_at_idx" ON "agent_proposal_audits" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_agent_proposal_audits_fk" FOREIGN KEY ("agent_proposal_audits_id") REFERENCES "public"."agent_proposal_audits"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_agent_proposal_audits_id_idx" ON "payload_locked_documents_rels" USING btree ("agent_proposal_audits_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM "users_roles" WHERE "value" = 'agent_proposer') THEN
      RAISE EXCEPTION 'cannot roll back agent proposal API while agent_proposer users exist';
    END IF;
  END $$;
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_agent_proposal_audits_fk";
  DROP INDEX "payload_locked_documents_rels_agent_proposal_audits_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "agent_proposal_audits_id";
  ALTER TABLE "agent_proposal_audits" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "agent_proposal_audits" CASCADE;
  ALTER TABLE "users_roles" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_roles";
  CREATE TYPE "public"."enum_users_roles" AS ENUM('editor', 'reviewer', 'publisher', 'admin');
  ALTER TABLE "users_roles" ALTER COLUMN "value" SET DATA TYPE "public"."enum_users_roles" USING "value"::"public"."enum_users_roles";
  ALTER TABLE "users" DROP COLUMN "enable_a_p_i_key";
  ALTER TABLE "users" DROP COLUMN "api_key";
  ALTER TABLE "users" DROP COLUMN "api_key_index";
  DROP TYPE "public"."enum_agent_proposal_audits_operation";
  DROP TYPE "public"."enum_agent_proposal_audits_locale";
  DROP TYPE "public"."enum_agent_proposal_audits_result";`)
}
