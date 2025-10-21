#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL=https://<project-ref>.supabase.co
const SUPABASE_SERVICE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL=https://<project-ref>.supabase.co
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminProfile() {
  console.log('🔍 Checking for admin user...');

  // Get admin user by email
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  
  if (userError) {
    console.error('❌ Error fetching users:', userError);
    process.exit(1);
  }

  const adminUser = users.users.find(u => u.email === 'admin@example.com');
  
  if (!adminUser) {
    console.error('❌ Admin user not found');
    process.exit(1);
  }

  console.log('✅ Found admin user:', adminUser.id);

  // Check if profile exists
  const { data: existingProfile, error: profileCheckError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', adminUser.id)
    .single();

  if (profileCheckError && profileCheckError.code !== 'PGRST116') {
    console.error('❌ Error checking profile:', profileCheckError);
    process.exit(1);
  }

  if (existingProfile) {
    console.log('✅ Profile already exists:', existingProfile);
    process.exit(0);
  }

  console.log('📝 Creating admin profile...');

  // Create profile
  const { data: newProfile, error: createError } = await supabase
    .from('profiles')
    .insert({
      id: adminUser.id,
      email: adminUser.email,
      full_name: 'System Administrator',
      role: 'admin',
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (createError) {
    console.error('❌ Error creating profile:', createError);
    process.exit(1);
  }

  console.log('✅ Profile created successfully:', newProfile);
}

createAdminProfile().catch(console.error);
