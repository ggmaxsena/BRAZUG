-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "armory";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'guildmember',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adventures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "author" TEXT NOT NULL DEFAULT '',
    "image_url" TEXT NOT NULL DEFAULT '',
    "image_data" TEXT,
    "event_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adventures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wow_characters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "character_id" INTEGER,
    "name" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "race" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "guild" TEXT NOT NULL DEFAULT 'BRAZUG',
    "image_url" TEXT,
    "lore" TEXT DEFAULT '',
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "is_dead" BOOLEAN NOT NULL DEFAULT false,
    "death_cause" TEXT,
    "death_location" TEXT,
    "death_level" INTEGER,
    "region" TEXT DEFAULT 'us',
    "realm" TEXT DEFAULT 'doomhowl',
    "prof1_name" TEXT,
    "prof1_lvl" INTEGER,
    "prof2_name" TEXT,
    "prof2_lvl" INTEGER,
    "prof_cooking_lvl" INTEGER,
    "prof_aid_lvl" INTEGER,
    "prof_fishing_lvl" INTEGER,
    "twitch_url" TEXT,
    "youtube_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wow_characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "armory"."Character" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "realm" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "race" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "guild" TEXT,
    "spec" TEXT,
    "avatarUrl" TEXT,
    "last_sync" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "armory"."CharacterItem" (
    "id" SERIAL NOT NULL,
    "character_id" INTEGER NOT NULL,
    "slot" TEXT NOT NULL,
    "item_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "icon" TEXT,

    CONSTRAINT "CharacterItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "armory"."CharacterProfession" (
    "id" SERIAL NOT NULL,
    "character_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "skill_points" INTEGER NOT NULL,
    "max_skill_points" INTEGER NOT NULL,

    CONSTRAINT "CharacterProfession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Character_name_realm_region_key" ON "armory"."Character"("name", "realm", "region");

-- AddForeignKey
ALTER TABLE "wow_characters" ADD CONSTRAINT "wow_characters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wow_characters" ADD CONSTRAINT "wow_characters_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "armory"."Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "armory"."CharacterItem" ADD CONSTRAINT "CharacterItem_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "armory"."Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "armory"."CharacterProfession" ADD CONSTRAINT "CharacterProfession_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "armory"."Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
