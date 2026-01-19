# Quick Start Guide - Memory Visualizer & Workflow Orchestrator

## Prerequisites

- Dashboard app already running
- Supabase project configured
- User account created and authenticated

## Step 1: Set Environment Variables

Add to your `.env` file (or create one if it doesn't exist):

```bash
# Required for AI Workflow Orchestrator
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Your existing Supabase credentials should already be here
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=REDACTED_SUPABASE_ANON_KEY
```

## Step 2: Run Database Migration

### Option A: Using Supabase CLI (Recommended)

```bash
cd /Users/seyederick/DevOps/_project_folders/lan-onasis-monorepo/apps/dashboard
supabase db push
```

### Option B: Manual Migration via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20251109_create_memory_and_workflow_tables.sql`
4. Paste and run the SQL

### Verify Migration Success

Run this query in Supabase SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('memory_entries', 'workflow_runs');
```

You should see both tables listed.

## Step 3: Seed Sample Data (Optional but Recommended)

To test the Memory Visualizer with real data:

1. Go to **Supabase SQL Editor**
2. Make sure you're authenticated (logged in)
3. Copy the contents of `scripts/seed-sample-memories.sql`
4. Paste and run the SQL

This will create 15 sample memory entries of various types.

## Step 4: Restart Development Server

```bash
cd /Users/seyederick/DevOps/_project_folders/lan-onasis-monorepo/apps/dashboard
bun run dev
```

## Step 5: Test the Features

### Test Memory Visualizer

1. Navigate to your dashboard: `http://localhost:5000` (or your configured port)
2. Log in with your credentials
3. Click on the **Memory** tab
4. You should see:
   - Stats showing total memories and unique tags
   - List of memory cards with:
     - Type badges (color-coded)
     - Content snippets
     - Tags
     - Relative timestamps

### Test Workflow Orchestrator

1. Click on the **Orchestrator** tab
2. Enter a workflow goal, for example:
   ```
   Create a comprehensive onboarding checklist for new developers joining the LanOnasis project
   ```
3. Click **Execute Workflow**
4. Wait 3-5 seconds for AI to generate the plan
5. You should see:
   - A structured workflow with 3-7 steps
   - Each step showing action, tool, and reasoning
   - Strategy notes
   - Context showing which memories were used
6. The workflow should also appear in "Workflow History" below

## Troubleshooting

### "No memories found"

**Problem:** Memory Visualizer shows empty state

**Solutions:**
- Run the seed script: `scripts/seed-sample-memories.sql`
- Check if migration ran successfully
- Verify you're logged in
- Check browser console for errors

### "LLM service not configured"

**Problem:** Workflow Orchestrator shows this error

**Solutions:**
- Add `OPENAI_API_KEY` to `.env` file
- Restart development server after adding the key
- Verify API key is valid (starts with `sk-proj-` or `sk-`)

### "Failed to load memories" or "Authentication required"

**Problem:** API requests fail with authentication errors

**Solutions:**
- Clear browser cache and local storage
- Log out and log back in
- Check Supabase credentials in `.env`
- Verify Supabase project is active

### Tables don't exist

**Problem:** Database queries fail

**Solutions:**
- Run the migration: `supabase db push`
- Or manually run the SQL migration file
- Check Supabase dashboard logs for migration errors

### API endpoints not responding

**Problem:** 404 or 500 errors on API calls

**Solutions:**
- Verify development server is running
- Check server console for errors
- Verify routes are registered in `server/routes.ts`
- Check network tab in browser DevTools

## Verification Checklist

- [ ] Environment variables set (especially `OPENAI_API_KEY`)
- [ ] Database migration completed successfully
- [ ] Sample data seeded (optional but helpful)
- [ ] Development server running without errors
- [ ] User logged in successfully
- [ ] Memory tab displays memories or shows proper empty state
- [ ] Orchestrator tab accepts input and generates workflows

## Next Steps

Once everything is working:

1. **Add your own memories**: Use the memory service API to store real memories
2. **Test different workflow goals**: Try various orchestrator prompts
3. **Explore the code**: Check out the implementation details in the components
4. **Customize**: Adjust colors, icons, or layout to match your preferences

## Need Help?

Check these resources:

- `MEMORY_VISUALIZER_README.md` - Detailed implementation documentation
- Browser DevTools Console - For frontend errors
- Server console logs - For backend errors
- Supabase Dashboard Logs - For database errors

## Sample Workflow Goals to Try

```
1. "Analyze our authentication flow and suggest security improvements"
2. "Create a deployment checklist for production release"
3. "Plan a feature for real-time collaboration between users"
4. "Design a data migration strategy from the old system"
5. "Outline a testing strategy for the Memory Service"
```

Each goal should generate a unique, context-aware workflow based on your stored memories!

---

**Happy coding! 🚀**

For questions or issues, refer to `MEMORY_VISUALIZER_README.md` for comprehensive documentation.

