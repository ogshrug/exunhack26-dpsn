# THURIBLES

A fictional underground organisation and its members-only web app, built for Exun 2026 (Build track). Everything in it, including the people, the contracts and the money, is made up.

Public link: https://thuribles.vercel.app

## What is in it

- Landing page with a revolving globe that pings every capital city
- Sign in with a face scan (camera) or a username and password, for both members and admins
- Home with the latest substances, contracts and enslavement records, plus a map of contracts and bunker sites
- Marketplace for contracts, substances, hitmen for hire and enslavement records, with a cart and checkout
- Wallet with transfers between members, bit deposits from BTC or BNB, and reserved amounts for open hits and contracts
- Admin economy dashboard showing the money in circulation and what is moving
- Global chat with replies, reactions and pinned messages
- Board where admins post news and videos
- Sosumi, a 3D city where properties are bought with bits

## Running it locally

You need Node.js 20 or newer and a modern browser. Chrome is recommended because the face scan uses the camera.

1. Clone the repository and open the folder.

   ```
   git clone https://github.com/ogshrug/exunhack26-dpsn.git
   cd exunhack26-dpsn
   ```

2. Install the dependencies.

   ```
   npm install
   ```

3. Copy the example environment file and fill it in.

   ```
   cp .env.example .env.local
   ```

   Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the project URL and public key that were submitted with the entry.

4. Start the dev server.

   ```
   npm run dev
   ```

5. Open http://localhost:5173. The camera works on localhost without HTTPS.

6. Create an account on the register page. Use a username and password if you do not want to use the camera.

To make a production build, run `npm run build`. The output goes to `dist/` and `npm run preview` serves it.

## Backend

The Supabase project this app talks to is the author's own. Its SQL, policies and server functions are not part of this repository, so running the app locally uses that hosted project. Only its structure is described here.

Services used: Postgres with row level security, Auth, Realtime, Storage and Edge Functions.

### Tables

| Table | Columns |
| --- | --- |
| profiles | id, handle, role, face_embedding, balance, created_at |
| credentials | id, pw_hash |
| listings | id, seller_id, category, title, description, price, game, target_character, status, claimed_by, image_url, lat, lng, resale_price, escrow, created_at |
| hires | id, listing_id, client_id, hitman_id, hitman_title, target_name, last_seen, occupation, details, images, price, status, created_at |
| proofs | id, listing_id, user_id, images, note, status, grade, payout, created_at, reviewed_at |
| orders | id, buyer_id, listing_id, title, method, address, price, fee, qty, created_at |
| transactions | id, kind, from_id, to_id, amount, memo, created_at |
| topups | id, user_id, inr, rate, bits, asset, amount, created_at |
| rates | id, usd_inr, btc_usd, bnb_usd, updated_at |
| plots | id, owner_id, price, purchased_at |
| members | id, handle, city, lat, lng, last_seen |
| chat_messages | id, author_id, body, reply_to, pinned, created_at |
| chat_reactions | message_id, user_id, emoji |
| board_posts | id, author_id, audience, title, body, video_url, created_at |
| board_reactions | post_id, user_id, emoji |
| channels, posts, votes, news | older discussion and news tables |

Listing categories are `contract`, `substance`, `hitman` and `enslavement`. Listing status is `open`, `claimed` or `completed`.

### Server side

- Edge Functions: `face-register`, `face-login`, `face-enroll`, `password-register`, `password-login`, `promote`, `exchange-rate`
- Database functions called from the app: `my_balance`, `my_escrow`, `has_face`, `buy_cart`, `hire_hitman`, `resolve_hire`, `accept_contract`, `submit_proof`, `grade_proof`, `topup_bits`, `transfer_bits`, `set_pinned`, `economy_stats`
- Storage buckets: `listing-images` and `board-videos`
- All balance changes happen inside database functions, never from the browser. Members can only read their own wallet and transaction rows, and admins can read everything.

## Stack

React 19, TypeScript, Vite, Tailwind CSS, React Router, three.js with react-three-fiber, MapLibre GL, face-api and Supabase.
