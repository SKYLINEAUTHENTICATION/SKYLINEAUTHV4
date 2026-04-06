--
-- PostgreSQL database dump
--

\restrict nLctwIEIUDT4jv020AAQatnaO525jM6I86EvSeHjetnkGPpv4GCOQAcvVPxzL9x

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.tokens DROP CONSTRAINT IF EXISTS tokens_app_id_applications_id_fk;
ALTER TABLE IF EXISTS ONLY public.sellers DROP CONSTRAINT IF EXISTS sellers_app_id_applications_id_fk;
ALTER TABLE IF EXISTS ONLY public.licenses DROP CONSTRAINT IF EXISTS licenses_app_id_applications_id_fk;
ALTER TABLE IF EXISTS ONLY public.applications DROP CONSTRAINT IF EXISTS applications_owner_id_users_id_fk;
ALTER TABLE IF EXISTS ONLY public.app_users DROP CONSTRAINT IF EXISTS app_users_app_id_applications_id_fk;
ALTER TABLE IF EXISTS ONLY public.accounts DROP CONSTRAINT IF EXISTS accounts_user_id_users_id_fk;
DROP INDEX IF EXISTS public.idx_token_app;
DROP INDEX IF EXISTS public.idx_seller_app;
DROP INDEX IF EXISTS public.idx_license_app;
DROP INDEX IF EXISTS public.idx_chat_sender;
DROP INDEX IF EXISTS public.idx_appuser_app;
DROP INDEX IF EXISTS public."IDX_session_expire";
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_numeric_id_unique;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_unique;
ALTER TABLE IF EXISTS ONLY public.tokens DROP CONSTRAINT IF EXISTS tokens_token_unique;
ALTER TABLE IF EXISTS ONLY public.tokens DROP CONSTRAINT IF EXISTS tokens_pkey;
ALTER TABLE IF EXISTS ONLY public.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.sellers DROP CONSTRAINT IF EXISTS sellers_seller_key_unique;
ALTER TABLE IF EXISTS ONLY public.sellers DROP CONSTRAINT IF EXISTS sellers_pkey;
ALTER TABLE IF EXISTS ONLY public.licenses DROP CONSTRAINT IF EXISTS licenses_pkey;
ALTER TABLE IF EXISTS ONLY public.licenses DROP CONSTRAINT IF EXISTS licenses_license_key_unique;
ALTER TABLE IF EXISTS ONLY public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_pkey;
ALTER TABLE IF EXISTS ONLY public.applications DROP CONSTRAINT IF EXISTS applications_pkey;
ALTER TABLE IF EXISTS ONLY public.app_users DROP CONSTRAINT IF EXISTS app_users_pkey;
ALTER TABLE IF EXISTS ONLY public.app_files DROP CONSTRAINT IF EXISTS app_files_pkey;
ALTER TABLE IF EXISTS ONLY public.announcements DROP CONSTRAINT IF EXISTS announcements_pkey;
ALTER TABLE IF EXISTS ONLY public.accounts DROP CONSTRAINT IF EXISTS accounts_username_unique;
ALTER TABLE IF EXISTS ONLY public.accounts DROP CONSTRAINT IF EXISTS accounts_pkey;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.tokens;
DROP TABLE IF EXISTS public.sessions;
DROP TABLE IF EXISTS public.sellers;
DROP TABLE IF EXISTS public.licenses;
DROP TABLE IF EXISTS public.chat_messages;
DROP TABLE IF EXISTS public.applications;
DROP TABLE IF EXISTS public.app_users;
DROP TABLE IF EXISTS public.app_files;
DROP TABLE IF EXISTS public.announcements;
DROP TABLE IF EXISTS public.accounts;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    username character varying NOT NULL,
    password_hash character varying NOT NULL,
    user_id character varying,
    role character varying(20) DEFAULT 'admin'::character varying NOT NULL,
    email character varying(255),
    credits real DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    expiry_date timestamp without time zone
);


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    author_username character varying NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: app_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_files (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    created_by_username character varying NOT NULL,
    name text NOT NULL,
    version text DEFAULT '1.0.0'::text NOT NULL,
    about text,
    download_url text NOT NULL,
    changelog text,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: app_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    app_id character varying NOT NULL,
    username text NOT NULL,
    password text,
    email text,
    hwid text,
    hwid_list text[] DEFAULT '{}'::text[],
    max_hwid integer DEFAULT 1,
    ip text,
    level integer DEFAULT 1,
    banned boolean DEFAULT false,
    expires_at timestamp without time zone,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    owner_id character varying NOT NULL,
    name text NOT NULL,
    secret text NOT NULL,
    version text DEFAULT '1.0'::text,
    enabled boolean DEFAULT true,
    hwid_lock boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    sender_username character varying NOT NULL,
    sender_role character varying(20) DEFAULT 'admin'::character varying NOT NULL,
    recipient_username character varying,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: licenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.licenses (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    app_id character varying NOT NULL,
    license_key text NOT NULL,
    note text,
    duration integer DEFAULT 1,
    duration_unit text DEFAULT 'day'::text,
    level integer DEFAULT 1,
    max_uses integer DEFAULT 1,
    used_count integer DEFAULT 0,
    enabled boolean DEFAULT true,
    used_by text,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: sellers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sellers (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    app_id character varying NOT NULL,
    seller_key text NOT NULL,
    name text NOT NULL,
    enabled boolean DEFAULT true,
    can_create_licenses boolean DEFAULT true,
    can_delete_licenses boolean DEFAULT false,
    can_create_users boolean DEFAULT true,
    can_delete_users boolean DEFAULT false,
    can_reset_user_hwid boolean DEFAULT false,
    can_ban_users boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


--
-- Name: tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tokens (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    app_id character varying NOT NULL,
    token text NOT NULL,
    used_by text,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    numeric_id character varying(10),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.accounts (id, username, password_hash, user_id, role, email, credits, created_at, expiry_date) FROM stdin;
ab7ff392-8a43-430c-9d2e-307d9986f81c	SKY-SR	$2b$10$CGAGlk9eUhmpMzw14a5MR.46g/atyqVtbWSuH67YWGeops/HGZzN6	a23a8abb-fdda-43d8-a695-e020f0074d67	superadmin	\N	0	2026-04-06 11:04:02.429855	\N
\.


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.announcements (id, author_username, title, content, created_at) FROM stdin;
\.


--
-- Data for Name: app_files; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.app_files (id, created_by_username, name, version, about, download_url, changelog, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: app_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.app_users (id, app_id, username, password, email, hwid, hwid_list, max_hwid, ip, level, banned, expires_at, last_login, created_at) FROM stdin;
\.


--
-- Data for Name: applications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.applications (id, owner_id, name, secret, version, enabled, hwid_lock, created_at) FROM stdin;
\.


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chat_messages (id, sender_username, sender_role, recipient_username, message, created_at) FROM stdin;
\.


--
-- Data for Name: licenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.licenses (id, app_id, license_key, note, duration, duration_unit, level, max_uses, used_count, enabled, used_by, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: sellers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sellers (id, app_id, seller_key, name, enabled, can_create_licenses, can_delete_licenses, can_create_users, can_delete_users, can_reset_user_hwid, can_ban_users, created_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sessions (sid, sess, expire) FROM stdin;
\.


--
-- Data for Name: tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tokens (id, app_id, token, used_by, used, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, first_name, last_name, profile_image_url, numeric_id, created_at, updated_at) FROM stdin;
a23a8abb-fdda-43d8-a695-e020f0074d67	\N	SKY-SR	\N	\N	\N	2026-04-06 11:04:02.42024	2026-04-06 11:04:02.42024
\.


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_username_unique UNIQUE (username);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: app_files app_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_files
    ADD CONSTRAINT app_files_pkey PRIMARY KEY (id);


--
-- Name: app_users app_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: licenses licenses_license_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_license_key_unique UNIQUE (license_key);


--
-- Name: licenses licenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_pkey PRIMARY KEY (id);


--
-- Name: sellers sellers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_pkey PRIMARY KEY (id);


--
-- Name: sellers sellers_seller_key_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_seller_key_unique UNIQUE (seller_key);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: tokens tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT tokens_pkey PRIMARY KEY (id);


--
-- Name: tokens tokens_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT tokens_token_unique UNIQUE (token);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_numeric_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_numeric_id_unique UNIQUE (numeric_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: idx_appuser_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appuser_app ON public.app_users USING btree (app_id);


--
-- Name: idx_chat_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_sender ON public.chat_messages USING btree (sender_username);


--
-- Name: idx_license_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_license_app ON public.licenses USING btree (app_id);


--
-- Name: idx_seller_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seller_app ON public.sellers USING btree (app_id);


--
-- Name: idx_token_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_token_app ON public.tokens USING btree (app_id);


--
-- Name: accounts accounts_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: app_users app_users_app_id_applications_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_app_id_applications_id_fk FOREIGN KEY (app_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: applications applications_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: licenses licenses_app_id_applications_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.licenses
    ADD CONSTRAINT licenses_app_id_applications_id_fk FOREIGN KEY (app_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: sellers sellers_app_id_applications_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_app_id_applications_id_fk FOREIGN KEY (app_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: tokens tokens_app_id_applications_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT tokens_app_id_applications_id_fk FOREIGN KEY (app_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict nLctwIEIUDT4jv020AAQatnaO525jM6I86EvSeHjetnkGPpv4GCOQAcvVPxzL9x

