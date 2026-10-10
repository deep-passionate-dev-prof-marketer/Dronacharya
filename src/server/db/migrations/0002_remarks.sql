CREATE TABLE "remarks" (
	"id" text PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"room_slug" text,
	"kind" text NOT NULL,
	"stars" integer DEFAULT 0 NOT NULL,
	"note" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "remarks" ADD CONSTRAINT "remarks_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remarks" ADD CONSTRAINT "remarks_teacher_id_users_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "remarks_student_at" ON "remarks" USING btree ("student_id","at");