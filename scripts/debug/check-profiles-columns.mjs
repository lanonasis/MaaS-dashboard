#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mxtsdgkwzjzlttpotole.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14dHNkZ2t3emp6bHR0cG90b2xlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMDUyNTksImV4cCI6MjA2MjY4MTI1OX0.2KM8JxBEsqQidSvjhuLs8HCX-7g-q6YNswedQ5ZYq3g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testProfilesColumns() {
  console.log('🔍 Testing profiles table columns...\n');
  
  // Test different column combinations to see what exists
  const testCases = [
    { name: 'Basic columns', columns: { id: 'test-id', email: 'test@example.com' } },
    { name: 'With full_name', columns: { id: 'test-id-2', email: 'test2@example.com', full_name: 'Test User' } },
    { name: 'With role', columns: { id: 'test-id-3', email: 'test3@example.com', full_name: 'Test User', role: 'user' } },
    { name: 'Common profile columns', columns: { 
      id: 'test-id-4', 
      email: 'test4@example.com', 
      full_name: 'Test User',
      company_name: null,
      phone: null,
      avatar_url: null
    }},
  ];
  
  for (const testCase of testCases) {
    console.log(`Testing ${testCase.name}...`);
    
    const { data, error } = await supabase
      .from('profiles')
      .insert([testCase.columns])
      .select();
    
    if (error) {
      console.log(`❌ Error with ${testCase.name}:`, error.message);
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        const match = error.message.match(/column "([^"]+)" of relation "profiles" does not exist/);
        if (match) {
          console.log(`   Missing column: ${match[1]}`);
        }
      }
    } else {
      console.log(`✅ Success with ${testCase.name}:`, data);
      
      // Clean up test data
      await supabase
        .from('profiles')
        .delete()
        .eq('id', testCase.columns.id);
      break; // Stop on first success
    }
    console.log('');
  }
}

testProfilesColumns();