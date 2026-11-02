# HÙNG LÊ – Full-stack foundation

This repository is a real application foundation (Next.js + TypeScript + Supabase PostgreSQL/Auth/Storage), not a static HTML-only mockup.

## Included
- Vietnamese storefront landing page, responsive layout and brand palette.
- PostgreSQL schema for products, categories, brands, multiple product images, technical specs, category spec templates, banners, settings, staff profiles, backup runs and audit events.
- Role model: `owner` and `staff`.
- Row Level Security (RLS): staff can add/edit product content but cannot delete products; only owner can manage staff, categories, brands, banners and site-wide settings.
- Public catalogue reads only published products and published banners.
- Product media storage bucket with staff upload/update and owner delete.
- Seed data for the nine approved categories and five brands.
- Admin sign-in starting screen.

## Required external setup
A hosted database and live site cannot be activated from source code alone. The site owner (with an adult where account/payment rules require it) must create the Supabase and hosting accounts, then add secrets privately.

1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Create the first user in Authentication > Users using a secure owner-controlled email/password.
4. Replace `OWNER_EMAIL_HERE` in `supabase/owner-setup.sql` with that exact email and run it. Confirm the resulting role is `owner`.
5. Copy the project URL and anon key into a local `.env.local` based on `.env.example`.
6. Install Node.js LTS, then run:
   ```bash
   npm install
   npm run dev
   ```
7. Open `http://localhost:3000`.
8. Deploy to a hosting provider and set the same environment variables in its project settings.

## Security notes
- Never commit `.env.local`.
- Never put the Supabase service-role key in a `NEXT_PUBLIC_*` variable or browser code.
- Disable public sign-up in Supabase Auth after creating staff through owner-controlled processes.
- RLS is mandatory; do not expose database credentials to visitors.
- Review policies and test owner/staff/public accounts before production.
- This package is a foundation, not a security audit. Production launch requires testing, rate limits, monitoring and recovery drills.

## Daily backups / 30-day retention
The schema includes `backup_runs` metadata but does not itself schedule database backups. Configure database backups/PITR with the selected Supabase plan and separately schedule encrypted exports of product media. Verify retention and restore procedures in the provider dashboard. Do not assume a daily/30-day policy is active until the provider confirms it. Keep backup credentials server-side.

## Current implementation boundary
The storefront queries published products from Supabase and displays them. The admin route currently provides sign-in only; product CRUD screens, staff invitation UI, image manager, banner editor and owner settings UI remain to be implemented and tested before production. The database schema and RLS groundwork for those functions are included.
