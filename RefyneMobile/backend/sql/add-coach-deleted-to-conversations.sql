-- Migration: coach-only soft-delete for conversations
-- Run this in your Supabase SQL Editor before deploying backend changes

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS coach_deleted BOOLEAN NOT NULL DEFAULT false;
