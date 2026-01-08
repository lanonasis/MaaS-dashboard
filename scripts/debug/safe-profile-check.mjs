#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mxtsdgkwzjzlttpotole.supabase.co';
const supabaseKey = 'REDACTED_JWT';

const supabase = createClient(supabaseUrl, supabaseKey);

async function safeProfileCheck() {
  console.log('🔍 Safely checking profiles table...\n');
  
  try {
    // Check what columns exist by trying a simple select
    console.log('📋 Testing profiles table access...');
    
    const { data: existingProfiles, error: selectError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.error('❌ Error accessing profiles table:', selectError);
      return;
    }
    
    console.log('✅ Profiles table accessible');
    
    if (existingProfiles && existingProfiles.length > 0) {
      console.log('📊 Sample profile structure:');
      console.log('Available columns:', Object.keys(existingProfiles[0]));
      console.table(existingProfiles[0]);
    } else {
      console.log('📭 Profiles table is empty');
      
      // Let's check if any users exist in auth.users that might need profiles
      console.log('\n🔍 Checking for users without profiles...');
      
      // Try to get current user first by checking if we can authenticate
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.log('ℹ️  Cannot access user list (admin only), but table structure is accessible');
      } else {
        console.log(`Found ${users.users.length} users in auth system`);
      }
    }
    
    // Test minimal profile creation with just the basic required fields
    console.log('\n🧪 Testing minimal profile creation (will be cleaned up)...');
    
    const testProfile = {
      id: '00000000-0000-0000-0000-000000000000', // Test UUID that won't conflict
      email: 'test@example.com'
    };
    
    const { data: insertTest, error: insertError } = await supabase
      .from('profiles')
      .insert([testProfile])
      .select();
    
    if (insertError) {
      console.log('⚠️  Insert test failed:', insertError.message);
      
      // This tells us what columns are actually required/available
      if (insertError.message.includes('column')) {
        console.log('💡 This helps us understand the actual table structure');
      }
    } else {
      console.log('✅ Test insert successful, cleaning up...');
      
      // Clean up test data
      await supabase
        .from('profiles')
        .delete()
        .eq('id', testProfile.id);
      
      console.log('🧹 Test data cleaned up');
    }
    
  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }
}

safeProfileCheck();