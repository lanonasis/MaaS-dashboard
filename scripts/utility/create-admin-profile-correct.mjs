#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mxtsdgkwzjzlttpotole.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14dHNkZ2t3emp6bHR0cG90b2xlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMDUyNTksImV4cCI6MjA2MjY4MTI1OX0.2KM8JxBEsqQidSvjhuLs8HCX-7g-q6YNswedQ5ZYq3g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminProfile() {
  console.log('🔍 Finding admin user and creating profile...\n');
  
  try {
    // First, let's see what columns actually exist in profiles
    console.log('📋 Testing minimal profile creation...');
    
    // Get authenticated user (sign in first)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@lanonasis.com',
      password: 'seftecmjsstore8000'
    });
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      return;
    }
    
    console.log('✅ Authenticated as:', authData.user.email);
    console.log('🆔 User ID:', authData.user.id);
    
    // Try to create profile with just the basic columns that we know exist
    const basicProfile = {
      id: authData.user.id,
      email: authData.user.email,
      full_name: 'Admin User'
    };
    
    console.log('📝 Creating profile with basic columns:', basicProfile);
    
    const { data: insertData, error: insertError } = await supabase
      .from('profiles')
      .insert([basicProfile])
      .select();
    
    if (insertError) {
      console.error('❌ Insert error:', insertError);
      
      // Maybe profile already exists, try to update instead
      console.log('\n🔄 Profile might exist, trying update...');
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: 'Admin User' })
        .eq('id', authData.user.id)
        .select();
        
      if (updateError) {
        console.error('❌ Update error:', updateError);
      } else {
        console.log('✅ Profile updated:', updateData);
      }
    } else {
      console.log('✅ Profile created:', insertData);
    }
    
    // Verify the profile exists
    console.log('\n🔍 Verifying profile...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Profile verification error:', profileError);
    } else {
      console.log('✅ Profile verified:', profileData);
    }
    
  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }
}

createAdminProfile();