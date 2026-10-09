CREATE TABLE "attendance_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_slug" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text,
	"role" text,
	"event" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"stream" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"room_slug" text,
	"user_id" text,
	"type" text NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_enrollments" (
	"class_id" text NOT NULL,
	"student_key" text NOT NULL,
	CONSTRAINT "class_enrollments_class_id_student_key_pk" PRIMARY KEY("class_id","student_key")
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" text PRIMARY KEY NOT NULL,
	"room_slug" text NOT NULL,
	"kind" text NOT NULL,
	"subject" text NOT NULL,
	"course" text,
	"topic" text,
	"grade_level" integer,
	"program" text,
	"language" text DEFAULT 'en' NOT NULL,
	"teacher_id" text,
	"scheduled_start" timestamp with time zone NOT NULL,
	"duration_min" integer DEFAULT 60 NOT NULL,
	"class_size" integer DEFAULT 1 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "classes_room_slug_unique" UNIQUE("room_slug")
);
--> statement-breakpoint
CREATE TABLE "consents" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"granted" boolean NOT NULL,
	"decided_by" text NOT NULL,
	"guardian_name" text,
	"country" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engagement_samples" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_slug" text NOT NULL,
	"participant_id" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"parent_id" text NOT NULL,
	"student_id" text NOT NULL,
	"relation" text DEFAULT 'parent' NOT NULL,
	CONSTRAINT "guardians_parent_id_student_id_pk" PRIMARY KEY("parent_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "identities" (
	"provider" text NOT NULL,
	"subject" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "identities_provider_subject_pk" PRIMARY KEY("provider","subject")
);
--> statement-breakpoint
CREATE TABLE "kv_store" (
	"namespace" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kv_store_namespace_key_pk" PRIMARY KEY("namespace","key")
);
--> statement-breakpoint
CREATE TABLE "lecture_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"room_slug" text NOT NULL,
	"recording_id" text,
	"generator" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_votes" (
	"poll_id" text NOT NULL,
	"user_id" text NOT NULL,
	"option_index" integer NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "poll_votes_poll_id_user_id_pk" PRIMARY KEY("poll_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" text PRIMARY KEY NOT NULL,
	"room_slug" text NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "recordings" (
	"id" text PRIMARY KEY NOT NULL,
	"room_slug" text NOT NULL,
	"mode" text NOT NULL,
	"status" text NOT NULL,
	"egress_id" text,
	"file_path" text,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"user_agent" text,
	"ip" text
);
--> statement-breakpoint
CREATE TABLE "transcript_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_slug" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"speaker_id" text,
	"speaker_name" text,
	"text" text NOT NULL,
	"translated" text,
	"lang" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"avatar_color" text,
	"student_code" text,
	"country" text,
	"language_tag" text,
	"grade_level" integer,
	"disabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_student_code_unique" UNIQUE("student_code")
);
--> statement-breakpoint
ALTER TABLE "class_enrollments" ADD CONSTRAINT "class_enrollments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_room_user" ON "attendance_events" USING btree ("room_slug","user_id");--> statement-breakpoint
CREATE INDEX "audit_stream_at" ON "audit_events" USING btree ("stream","at");--> statement-breakpoint
CREATE INDEX "classes_teacher_start" ON "classes" USING btree ("teacher_id","scheduled_start");--> statement-breakpoint
CREATE INDEX "engagement_room_at" ON "engagement_samples" USING btree ("room_slug","at");--> statement-breakpoint
CREATE INDEX "transcript_room_at" ON "transcript_lines" USING btree ("room_slug","at");