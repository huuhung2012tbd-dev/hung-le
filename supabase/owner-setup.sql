-- Run AFTER creating the first owner user in Supabase Authentication > Users.
-- Replace the email below with the exact owner email, then run once.
update public.profiles p
set role='owner', active=true, full_name='HÙNG LÊ'
from auth.users u
where p.id=u.id and lower(u.email)=lower('huuhungle33@gmail.com');

-- Confirm exactly one row was updated. Never promote a public user from client-side code.
select p.id,u.email,p.role,p.active
from public.profiles p join auth.users u on u.id=p.id;
