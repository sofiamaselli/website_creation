import { createClient } from '@supabase/supabase-js'

export const supabase = createClient('https://rcexvelvrergeemyjivu.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjZXh2ZWx2cmVyZ2VlbXlqaXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk1NDkyMTAsImV4cCI6MjAyNTEyNTIxMH0.D7FJUytHCuLI7pbv-pVkWWHS5ZmPT0NvTF6s_jqw-L0')