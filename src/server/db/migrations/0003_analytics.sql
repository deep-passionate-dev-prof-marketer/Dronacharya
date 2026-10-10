CREATE TABLE "class_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"recording_id" text NOT NULL,
	"room_slug" text NOT NULL,
	"teacher_id" text,
	"auditor_id" text NOT NULL,
	"rubric" text NOT NULL,
	"scores" jsonb NOT NULL,
	"total" real,
	"note" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "session_facts" (
	"recording_id" text PRIMARY KEY NOT NULL,
	"room_slug" text NOT NULL,
	"class_id" text,
	"kind" text NOT NULL,
	"subject" text,
	"course" text,
	"topic" text,
	"grade_level" integer,
	"program" text,
	"cohort" text,
	"language" text,
	"teacher_id" text,
	"host_id" text,
	"teacher_name" text,
	"teacher_country" text,
	"teacher_timezone" text,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"duration_min" real NOT NULL,
	"contact_min" real,
	"aborted" boolean DEFAULT false NOT NULL,
	"scheduled_start" timestamp with time zone,
	"scheduled_duration_min" integer,
	"start_delay_min" real,
	"planned_size" integer,
	"attendance_tracked" boolean DEFAULT true NOT NULL,
	"enrolled" integer DEFAULT 0 NOT NULL,
	"attended" integer DEFAULT 0 NOT NULL,
	"enrolled_attended" integer DEFAULT 0 NOT NULL,
	"enrolled_minutes" real DEFAULT 0 NOT NULL,
	"peak_learners" integer DEFAULT 0 NOT NULL,
	"late_count" integer DEFAULT 0 NOT NULL,
	"early_leave_count" integer DEFAULT 0 NOT NULL,
	"avg_minutes_present" real,
	"attention_avg" real,
	"engaged_learners" integer DEFAULT 0 NOT NULL,
	"states" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"transcript_lines" integer DEFAULT 0 NOT NULL,
	"teacher_talk_share" real,
	"learner_questions" integer DEFAULT 0 NOT NULL,
	"polls" integer DEFAULT 0 NOT NULL,
	"poll_votes" integer DEFAULT 0 NOT NULL,
	"mutes" integer DEFAULT 0 NOT NULL,
	"removals" integer DEFAULT 0 NOT NULL,
	"capture_attempts" integer DEFAULT 0 NOT NULL,
	"device_blocks" integer DEFAULT 0 NOT NULL,
	"notes_generated" boolean DEFAULT false NOT NULL,
	"review_score" real,
	"components" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"demo" boolean DEFAULT false NOT NULL,
	"facts_version" integer DEFAULT 1 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_learners" (
	"recording_id" text NOT NULL,
	"learner_id" text NOT NULL,
	"name" text,
	"country" text,
	"timezone" text,
	"grade_level" integer,
	"device_type" text,
	"enrolled" boolean DEFAULT false NOT NULL,
	"status" text NOT NULL,
	"minutes_present" real DEFAULT 0 NOT NULL,
	"attention" real,
	"demo" boolean DEFAULT false NOT NULL,
	CONSTRAINT "session_learners_recording_id_learner_id_pk" PRIMARY KEY("recording_id","learner_id")
);
--> statement-breakpoint
ALTER TABLE "attendance_events" ADD COLUMN "event_id" text;--> statement-breakpoint
ALTER TABLE "classes" ADD COLUMN "cohort" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "class_reviews" ADD CONSTRAINT "class_reviews_auditor_id_users_id_fk" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reviews_recording" ON "class_reviews" USING btree ("recording_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_one_per_auditor" ON "class_reviews" USING btree ("recording_id","auditor_id");--> statement-breakpoint
CREATE INDEX "facts_started" ON "session_facts" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "facts_teacher" ON "session_facts" USING btree ("teacher_id","started_at");--> statement-breakpoint
CREATE INDEX "facts_room" ON "session_facts" USING btree ("room_slug");--> statement-breakpoint
CREATE INDEX "facts_class" ON "session_facts" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "learners_learner" ON "session_learners" USING btree ("learner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_event_id" ON "attendance_events" USING btree ("event_id");