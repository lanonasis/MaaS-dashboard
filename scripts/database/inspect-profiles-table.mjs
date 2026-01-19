#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mxtsdgkwzjzlttpotole.supabase.co';
const supabaseKey = 'REDACTED_JWT';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectProfilesTable() {
  console.log('🔍 Inspecting profiles table structure...\n');
  
  try {
    // Query information_schema to get column details
    const { data: columns, error: columnsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'profiles'
          ORDER BY ordinal_position;
        `
      });
    
    if (columnsError) {
      console.error('❌ Error querying columns:', columnsError);
      
      // Fallback: try to select from profiles to see what columns exist
      console.log('\n🔄 Trying fallback method...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(0);
      
      if (error) {
        console.error('❌ Profiles table query error:', error);
      } else {
        console.log('✅ Profiles table exists but is empty');
      }
    } else {
      console.log('✅ Profiles table columns:');
      console.table(columns);
    }
    
    // Try to get current profiles
    console.log('\n📋 Current profiles in table:');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
    } else {
      console.log(`Found ${profiles.length} profiles:`);
      console.table(profiles);
    }
    
  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }
}

inspectProfilesTable();