# Database Migrations

This folder contains all the SQL migration files needed to set up your Supabase database for the Task Manager Backend.

## Available Migrations

1. **001_initial_schema.sql** - Initial tasks table, RLS, indexes, and triggers
2. **002_hierarchical_tasks.sql** - Adds parent-child task relationships
3. **003_ai_enhancement_support.sql** - Adds AI enhancement fields and queue
4. **004_chatbot_integration.sql** - Adds chatbot and WhatsApp integration tables
5. **005_fix_status_constraint.sql** - Fixes status constraint to match TypeScript types
6. **000_master_migration.sql** - Combines all migrations for single-run setup

## 🚀 How to Run Migrations

### Option 1: Run Individually (Recommended for Development)

1. **Open Supabase Dashboard**

   - Go to your Supabase project
   - Navigate to SQL Editor

2. **Run migrations in order:**
   ```sql
   -- Copy and paste each migration file content
   -- Run them one by one in numerical order
   ```

### Option 2: Run All at Once (Production)

1. **Combine all migrations:**

   ```bash
   # On your local machine
   cat migrations/*.sql > all_migrations.sql
   ```

2. **Upload to Supabase:**
   - Copy the combined content
   - Paste into SQL Editor
   - Run the entire script

## ⚠️ Important Notes

### Migration Order

**Always run migrations in numerical order** (001, 002, 003, 004). Each migration builds upon the previous ones.

### Existing Data

- Migrations use `IF NOT EXISTS` and `IF NOT EXISTS` clauses
- Safe to run on existing databases
- Will not overwrite existing data

### Rollback

These migrations do not include rollback scripts. If you need to undo changes:

- Use Supabase's database backup/restore feature
- Or manually drop tables/columns as needed

## 🔧 Customization

### Adding New Migrations

1. Create a new file: `005_your_feature.sql`
2. Use the same format and header structure
3. Include proper RLS policies
4. Add appropriate indexes
5. Include comments for documentation

### Modifying Existing Migrations

- **Never modify existing migration files** in production
- Create new migration files for changes
- This maintains migration history and rollback capability

## 📊 Database Schema Overview

After running all migrations, you'll have:

- **`tasks`** - Main task management with hierarchical support
- **`ai_enhancement_queue`** - AI processing queue
- **`chatbot_interactions`** - Bot conversation history
- **`whatsapp_integrations`** - WhatsApp API configuration

## 🛡️ Security Features

- **Row Level Security (RLS)** enabled on all tables
- **User isolation** - users can only access their own data
- **Parent-child access control** - proper permissions for hierarchical tasks
- **Input validation** through CHECK constraints
- **Foreign key relationships** with proper cascade rules

## 🔍 Verification

After running migrations, verify:

1. **Tables exist:**

   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

2. **RLS is enabled:**

   ```sql
   SELECT schemaname, tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public';
   ```

3. **Policies are created:**
   ```sql
   SELECT schemaname, tablename, policyname
   FROM pg_policies
   WHERE schemaname = 'public';
   ```

## 📚 Additional Resources

- [Supabase SQL Editor Guide](https://supabase.com/docs/guides/database/sql-editor)
- [PostgreSQL Migration Best Practices](https://www.postgresql.org/docs/current/ddl.html)
- [Row Level Security Documentation](https://supabase.com/docs/guides/auth/row-level-security)
