-- ── 1. Profiles (이메일 조회용) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email) VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 기존 유저 백필
INSERT INTO profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- ── 2. Boards ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS boards (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner full access" ON boards
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "member read access" ON boards
  FOR SELECT USING (
    id IN (SELECT board_id FROM board_members WHERE user_id = auth.uid())
  );


-- ── 3. Board Members ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS board_members (
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (board_id, user_id)
);
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages members" ON board_members
  FOR ALL
  USING  (board_id IN (SELECT id FROM boards WHERE owner_id = auth.uid()))
  WITH CHECK (board_id IN (SELECT id FROM boards WHERE owner_id = auth.uid()));

CREATE POLICY "see own membership" ON board_members
  FOR SELECT USING (user_id = auth.uid());


-- ── 4. Cards 컬럼 추가 + RLS 교체 ─────────────────────────────────────────
ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS board_id  UUID  REFERENCES boards(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS deadline  DATE,
  ADD COLUMN IF NOT EXISTS priority  TEXT  CHECK (priority IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS tags      TEXT[] NOT NULL DEFAULT '{}';

DROP POLICY IF EXISTS "select own cards" ON cards;
DROP POLICY IF EXISTS "insert own cards" ON cards;
DROP POLICY IF EXISTS "update own cards" ON cards;
DROP POLICY IF EXISTS "delete own cards" ON cards;

CREATE POLICY "board member select" ON cards FOR SELECT USING (
  board_id IN (
    SELECT id FROM boards WHERE owner_id = auth.uid()
    UNION SELECT board_id FROM board_members WHERE user_id = auth.uid()
  )
);
CREATE POLICY "board member insert" ON cards FOR INSERT WITH CHECK (
  board_id IN (
    SELECT id FROM boards WHERE owner_id = auth.uid()
    UNION SELECT board_id FROM board_members WHERE user_id = auth.uid()
  )
);
CREATE POLICY "board member update" ON cards FOR UPDATE USING (
  board_id IN (
    SELECT id FROM boards WHERE owner_id = auth.uid()
    UNION SELECT board_id FROM board_members WHERE user_id = auth.uid()
  )
);
CREATE POLICY "board member delete" ON cards FOR DELETE USING (
  board_id IN (
    SELECT id FROM boards WHERE owner_id = auth.uid()
    UNION SELECT board_id FROM board_members WHERE user_id = auth.uid()
  )
);


-- ── 5. Activities ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id   UUID        NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES auth.users(id),
  user_email TEXT        NOT NULL,
  action     TEXT        NOT NULL,
  card_text  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "board member read activities" ON activities
  FOR SELECT USING (
    board_id IN (
      SELECT id FROM boards WHERE owner_id = auth.uid()
      UNION SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "board member insert activities" ON activities
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    board_id IN (
      SELECT id FROM boards WHERE owner_id = auth.uid()
      UNION SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
  );


-- ── 6. 실시간 구독 활성화 ──────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE cards;
ALTER PUBLICATION supabase_realtime ADD TABLE activities;
