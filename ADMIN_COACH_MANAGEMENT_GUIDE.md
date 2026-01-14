# Admin Coach Management Guide

## Overview
This guide explains how ADMIN users can modify coach prompts, voices, and manage knowledge base content (books/manuscripts) in the 10XCoach.ai platform.

## Features Implemented

### 1. **Coach Prompt Management**
- **Location**: Admin Panel → Coaches & Knowledge → Click "Prompt" button on any coach
- **How it works**:
  - Admins can edit the system prompt for each coach
  - Prompts are stored in the database (`coaches.personaJson.systemPrompt`)
  - The system uses database prompts with fallback to hardcoded instructions
  - Knowledge base content is automatically appended to prompts when coaches are used

### 2. **Voice Management**
- **Location**: Admin Panel → Coaches & Knowledge → Edit Coach → Voice dropdown
- **Available Voices**:
  - Alloy (Neutral)
  - Ash (Male)
  - Ballad (Neutral)
  - Coral (Female)
  - Echo (Male) - Default
  - Sage (Female)
  - Shimmer (Female)
  - Verse (Male)
  - Marin (Male)
  - Cedar (Male)
- **How it works**:
  - Voice is stored in `coaches.voiceId` field
  - Voice is used in OpenAI Realtime API conversations
  - Falls back to hardcoded `coachVoiceMap` if not set in database

### 3. **Knowledge Base Management** (Books/Manuscripts)
- **Location**: Admin Panel → Coaches & Knowledge → Knowledge Base tab (to be added)
- **API Endpoints**:
  - `GET /api/manage-knowledge-base` - Get all knowledge items
  - `POST /api/manage-knowledge-base` - Create new knowledge item
  - `PUT /api/manage-knowledge-base/:id` - Update knowledge item
  - `DELETE /api/manage-knowledge-base/:id` - Delete knowledge item
- **Database Model**: `KnowledgeBase` table
  - Fields: `id`, `title`, `author`, `type`, `content`, `summary`, `isActive`, `order`
- **How it works**:
  - Knowledge base items (like "Small Business BIG EXIT") are stored in the database
  - Active items are automatically appended to coach prompts when conversations start
  - Content is included in the format: `## [Title] by [Author]\n[Summary or first 2000 chars]...`

## How Prompts Are Constructed

1. **Base Prompt**: Retrieved from `coaches.personaJson.systemPrompt` (if exists)
2. **Fallback**: Uses hardcoded `getCoachInstructions()` from `openAI_conver/coachInstructions.js` if no database prompt
3. **Knowledge Base**: Active knowledge base items are automatically appended
4. **Final Prompt**: Base prompt + Knowledge base content

## Database Schema

### Coach Model
```prisma
model Coach {
  id          Int       @id @default(autoincrement())
  name        String
  voiceId     String?   // OpenAI voice ID (e.g., 'echo', 'ash')
  personaJson Json?     // Contains { systemPrompt: "..." }
  // ... other fields
}
```

### KnowledgeBase Model
```prisma
model KnowledgeBase {
  id          Int       @id @default(autoincrement())
  title       String
  author      String?
  type        String    @default("book")
  content     String    @db.Text
  summary     String?   @db.Text
  isActive    Boolean   @default(true)
  order       Int       @default(0)
  // ... timestamps
}
```

## Implementation Details

### Server-Side (`server/src/index.js`)
- When a conversation starts, the system:
  1. Fetches coach from database
  2. Gets `voiceId` from database (or falls back to `coachVoiceMap`)
  3. Gets `personaJson.systemPrompt` from database (or falls back to hardcoded)
  4. Fetches active knowledge base items
  5. Appends knowledge base content to prompt
  6. Uses the final prompt in OpenAI Realtime API

### Client-Side (`client/src/pages/admin/Coaches.tsx`)
- Admin can:
  - Edit coach details including voice
  - Click "Prompt" button to edit system prompt
  - See notification that knowledge base content will be auto-appended

## Next Steps (To Complete)

1. **Create Knowledge Base Admin Page**:
   - Add a new page at `/manage-knowledge-base`
   - Allow admins to:
     - View all books/manuscripts
     - Add new items (upload "Small Business BIG EXIT" content)
     - Edit existing items
     - Toggle active/inactive
     - Reorder items

2. **Add Knowledge Base Tab to Coaches Page**:
   - Add a tab/section in the Coaches page to manage knowledge base
   - Show which knowledge items are active and will be included in prompts

3. **Prompt Preview Feature**:
   - Show admins a preview of the final prompt (base + knowledge base)
   - Help admins understand what content coaches will have access to

## Files Modified

1. `server/prisma/schema.prisma` - Added `KnowledgeBase` model
2. `server/src/index.js` - Updated to use database prompts and voices, integrate knowledge base
3. `server/src/modules/admin/admin.routes.js` - Added knowledge base API routes
4. `client/src/pages/admin/Coaches.tsx` - Added voice field, improved prompt modal

## Testing

To test the system:
1. Go to Admin Panel → Coaches & Knowledge
2. Edit a coach and set a custom voice
3. Click "Prompt" to edit the system prompt
4. Add knowledge base items via API (or create admin page)
5. Start a conversation with the coach
6. Verify the voice and prompt are used correctly

